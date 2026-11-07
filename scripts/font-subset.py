"""把 LXGW WenKai Lite 的 97 个 unicode-range 分片合并为单个子集字体。

为什么需要这一步
----------------
lxgw-wenkai-lite-webfont 把字库切成 97 片，每片一个 @font-face，
各带不同 unicode-range。浏览器按页面实际用字只下载命中的那几片，
但它们**不是同时到达**的。每片到达都会独立触发一次 font-display:swap，
于是字形分多批替换 —— 表现为整页文字「闪几下」。

合并成单片后，一次 swap 完成，视觉上只有一次整体替换。

用法
----
  python scripts/font-subset.py <charset.txt> <out-dir>

输出
----
  <out-dir>/lxgw-wenkai-lite-400.woff2
  <out-dir>/lxgw-wenkai-lite-700.woff2
  <out-dir>/coverage.json   # 覆盖的码位，供构建期校验
"""

import json
import os
import sys
import tempfile

from fontTools.merge import Merger
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

PKG = 'node_modules/lxgw-wenkai-lite-webfont/files'
WEIGHTS = {400: 'regular', 700: 'bold'}


def shards_for(weight_name):
    out = []
    for i in range(1, 200):
        p = f'{PKG}/lxgwwenkailite-{weight_name}-subset-{i}.woff2'
        if os.path.exists(p):
            out.append(p)
    return out


def build(charset, weight_name, out_path, tmpdir):
    """合并分片 → 只保留命中的字符 → 存 woff2。"""
    kept = []
    for idx, p in enumerate(shards_for(weight_name)):
        f = TTFont(p)
        cmap = f.getBestCmap()
        hit = {ord(c) for c in charset if ord(c) in cmap}
        if not hit:
            f.close()
            continue

        opt = Options()
        opt.layout_features = ['*']
        opt.name_IDs = ['*']
        opt.notdef_outline = True
        opt.recalc_bounds = True
        opt.drop_tables += ['FFTM', 'feat', 'morx', 'prop', 'bsln']
        sub = Subsetter(options=opt)
        sub.populate(unicodes=hit)
        sub.subset(f)

        tmp = os.path.join(tmpdir, f'shard-{idx}.ttf')
        f.flavor = None
        f.save(tmp)
        f.close()
        kept.append(tmp)

    if not kept:
        raise SystemExit(f'[{weight_name}] 没有任何分片命中目标字符')

    merged = TTFont(kept[0]) if len(kept) == 1 else Merger().merge(kept)
    merged.flavor = 'woff2'
    merged.save(out_path)
    merged.close()

    # 合并后回读校验，确认每个字符都还在
    check = TTFont(out_path)
    cmap = check.getBestCmap()
    missing = [c for c in charset if ord(c) not in cmap]
    glyphs = check['maxp'].numGlyphs
    check.close()

    size = os.path.getsize(out_path)
    print(f'  {weight_name}: {len(kept)} 片 → {size / 1024:.1f} KB, {glyphs} 字形, 缺失 {len(missing)}')
    if missing:
        print('    缺失字符:', ''.join(missing[:40]))
    return missing


def main():
    charset_file = sys.argv[1]
    out_dir = sys.argv[2]

    charset = sorted(set(open(charset_file, encoding='utf-8').read()))
    charset = [c for c in charset if c.strip() or c == ' ']
    print(f'目标字符 {len(charset)} 个')

    os.makedirs(out_dir, exist_ok=True)
    all_missing = []

    with tempfile.TemporaryDirectory() as tmpdir:
        for weight, name in WEIGHTS.items():
            out = os.path.join(out_dir, f'lxgw-wenkai-lite-{weight}.woff2')
            all_missing += build(charset, name, out, tmpdir)

    covered = sorted({ord(c) for c in charset} - {ord(c) for c in all_missing})
    with open(os.path.join(out_dir, 'coverage.json'), 'w', encoding='utf-8') as fh:
        json.dump({'codepoints': covered}, fh)

    if all_missing:
        print(f'警告：{len(all_missing)} 个字符在字库中不存在（会回退到系统字体）')


if __name__ == '__main__':
    main()
