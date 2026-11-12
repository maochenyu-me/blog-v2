---
title: 特殊字符与代码块压测：& < > " ' 全都要
description: 一篇专门用来喂 RSS/Atom 校验器的文章。正文里塞满了 & < > 引号、CDATA 边界、嵌套代码块和原始 HTML 片段。
date: 2025-10-20
abbrlink: 57060fdd
category: 工程
tags: [RSS, XML, 测试]
pinned: true
cover: /images/covers/charset.png
aisummary: "文章通过包含特殊字符和代码块来测试 RSS feed 的生成逻辑是否稳定。重点在于 XML 中的特殊字符如 &、<、>、\"、' 必须正确转义，否则会导致解析错误。同时，文章讨论了链接和图片在 feed 中的正确使用方式，以及中文排版中行高和段距的设置建议，以确保阅读体验良好。最后指出，若 feed 在阅读器中显示正常，则说明转义和格式处理正确。"
---

这篇文章没有别的目的，就是用来把 feed 生成逻辑撑到极限。

如果你的 RSS 阅读器能正常显示这一篇，说明转义是对的。

## 裸字符

下面这些字符在 XML 里都是危险的，必须转义：

- 与号：AT&T、Q&A、R&D
- 小于号：`a < b`
- 大于号：`a > b`
- 引号：他说 "这样" 和 '那样'
- CDATA 结束标记本身：`]]>`

如果不转义，`AT&T` 会把整个 feed 撑坏——因为解析器会以为 `&A` 是一个实体引用的开始。

## 代码块里的尖括号

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>喵洛阁 &amp; 朋友</title>
  </head>
  <body>
    <p class="note">如果 a < b 并且 b > c，那么 a < c</p>
    <script>
      const html = '<div class="x">' + text + '</div>'
      if (a && b) console.log('&lt;ok&gt;')
    </script>
  </body>
</html>
```

上面这块 HTML 里 `<`、`>`、`&`、引号全都有。它在页面里应该原样显示，在 feed 里应该被正确转义。

再来一段 TypeScript：

```ts
// 这里的箭头函数、泛型尖括号、比较符号都不应该破坏 XML
type Predicate<T> = (value: T) => boolean

function filterAnd<T>(items: T[], pred: Predicate<T>): T[] {
  const out: T[] = []
  for (const item of items) {
    if (item && pred(item) && (out as unknown[]).length < 100) {
      out.push(item)
    }
  }
  return out
}

const flags = filterAnd([1, 2, 3], (n) => n > 1 && n < 3)
console.log('结果：', flags, '& 完成')
```

## 内联代码与引用

行内代码 `const re = /<(\w+)>/g` 里也有尖括号。

下面是一个引用块，里面同时含 HTML 和 shell：

> 试试 `echo "<hello> & goodbye"` 这条命令。
>
> 它会输出带尖括号和与号的字符串，而 shell 会尝试把它当成重定向或子命令。

## 表格

| 字符 | XML 实体 | 是否必须 |
| --- | --- | --- |
| `&` | `&amp;` | 必须 |
| `<` | `&lt;` | 必须 |
| `>` | `&gt;` | 建议 |
| `"` | `&quot;` | 属性内必须 |
| `'` | `&apos;` | 属性内建议 |

## 链接与图片

站内绝对链接：[归档](/archive)、[标签](/tags)、[关于](/about)。

相对链接在 feed 里必须被改写成基于站点的绝对链接，否则阅读器里点不动。

图片同理：

![占位图](/images/covers/charset.png)

## 一段长文本

Lorem ipsum 不如直接说清楚：这一段就是用来测行高和段距的。中文排版里，1.75 的行高配合 17px 的字号，一行大约能放下 44 个汉字，这个宽度在多数屏幕上读起来是舒服的。再宽一点，眼睛回行会累；再窄一点，一句话要折三次，节奏就散了。

段落间距必须明显大于行距。我用的是 1.2em——看起来差别不大，但眯眼一看就知道哪里断开了。如果段落间距等于行距，整页会糊成一块灰，读者找不到停顿点，读三行就想走。

## 结尾

如果这一篇在 reader 里结构完好、代码块没跑版、图片能加载、链接可点，那 feed 就是对的。
