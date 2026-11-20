/**
 * 图标映射工具（移植自 blog-v3，适配 tabler 图标集）
 * blog-v2 的 @nuxt/icon serverBundle 只有 [tabler, ph]，所有图标统一映射到 tabler 系列
 */

/** 常见域名图标映射（tabler:brand-* 系列） */
const domainIcons: Record<string, string> = {
  'github.com': 'tabler:brand-github',
  'github.io': 'tabler:brand-github',
  'creativecommons.org': 'tabler:creative-commons',
  'bilibili.com': 'tabler:brand-bilibili',
  'qq.com': 'tabler:brand-qq',
  'mp.weixin.qq.com': 'tabler:brand-wechat',
  'wechat.com': 'tabler:brand-wechat',
  'microsoft.com': 'tabler:brand-windows',
  'npmjs.com': 'tabler:brand-npm',
  'google.com': 'tabler:brand-google',
  'zhihu.com': 'tabler:brand-zhihu',
  'twitter.com': 'tabler:brand-twitter',
  'x.com': 'tabler:brand-x',
  'youtube.com': 'tabler:brand-youtube',
  'discord.com': 'tabler:brand-discord',
  'telegram.org': 'tabler:brand-telegram',
  'reddit.com': 'tabler:brand-reddit',
  'stackoverflow.com': 'tabler:brand-stackoverflow',
  'vercel.com': 'tabler:brand-vercel',
  'vercel.app': 'tabler:brand-vercel',
  'cloudflare.com': 'tabler:brand-cloudflare',
  'pages.dev': 'tabler:brand-cloudflare',
  'workers.dev': 'tabler:brand-cloudflare',
  'vuejs.org': 'tabler:brand-vue',
  'nuxt.com': 'tabler:brand-nuxt',
  'react.dev': 'tabler:brand-react',
  'nextjs.org': 'tabler:brand-nextjs',
  'svelte.dev': 'tabler:brand-svelte',
  'angular.io': 'tabler:brand-angular',
  'typescriptlang.org': 'tabler:brand-typescript',
  'nodejs.org': 'tabler:brand-nodejs',
  'deno.com': 'tabler:brand-deno',
  'bun.sh': 'tabler:file-code',
  'python.org': 'tabler:brand-python',
  'rust-lang.org': 'tabler:brand-rust',
  'go.dev': 'tabler:brand-golang',
  'docker.com': 'tabler:brand-docker',
  'gitlab.com': 'tabler:brand-gitlab',
  'bitbucket.org': 'tabler:brand-bitbucket',
  'figma.com': 'tabler:brand-figma',
  'notion.so': 'tabler:brand-notion',
  'notion.site': 'tabler:brand-notion',
}

/** 文件名后缀图标映射（tabler 系列） */
const fileIcons: Record<string, string> = {
  '.md': 'tabler:markdown',
  '.mdx': 'tabler:markdown',
  '.json': 'tabler:json',
  '.jsonc': 'tabler:json',
  '.yaml': 'tabler:file-text',
  '.yml': 'tabler:file-text',
  '.toml': 'tabler:file',
  '.vue': 'tabler:brand-vue',
  '.ts': 'tabler:brand-typescript',
  '.tsx': 'tabler:brand-typescript',
  '.js': 'tabler:brand-javascript',
  '.jsx': 'tabler:brand-javascript',
  '.html': 'tabler:brand-html5',
  '.css': 'tabler:brand-css3',
  '.scss': 'tabler:brand-sass',
  '.sass': 'tabler:brand-sass',
  '.less': 'tabler:file',
  '.py': 'tabler:brand-python',
  '.rs': 'tabler:brand-rust',
  '.go': 'tabler:brand-golang',
  '.java': 'tabler:file-code',
  '.c': 'tabler:file-code',
  '.cpp': 'tabler:file-code',
  '.h': 'tabler:file-code',
  '.hpp': 'tabler:file-code',
  '.sh': 'tabler:terminal',
  '.bash': 'tabler:terminal',
  '.zsh': 'tabler:terminal',
  '.fish': 'tabler:terminal',
  '.ps1': 'tabler:terminal',
  '.sql': 'tabler:database',
  '.graphql': 'tabler:file-code',
  '.gql': 'tabler:file-code',
  '.xml': 'tabler:file-code',
  '.svg': 'tabler:photo',
  '.png': 'tabler:photo',
  '.jpg': 'tabler:photo',
  '.jpeg': 'tabler:photo',
  '.gif': 'tabler:photo',
  '.webp': 'tabler:photo',
  '.ico': 'tabler:photo',
  '.pdf': 'tabler:file-type-pdf',
  '.doc': 'tabler:file-word',
  '.docx': 'tabler:file-word',
  '.xls': 'tabler:file-spreadsheet',
  '.xlsx': 'tabler:file-spreadsheet',
  '.ppt': 'tabler:file',
  '.pptx': 'tabler:file',
  '.zip': 'tabler:file-zip',
  '.tar': 'tabler:file-zip',
  '.gz': 'tabler:file-zip',
  '.7z': 'tabler:file-zip',
  '.rar': 'tabler:file-zip',
  '.env': 'tabler:settings',
  '.gitignore': 'tabler:brand-git',
  '.npmrc': 'tabler:brand-npm',
  '.prettierrc': 'tabler:settings',
  '.eslintrc': 'tabler:settings',
  'tsconfig.json': 'tabler:brand-typescript',
  'package.json': 'tabler:file-text',
  'nuxt.config.ts': 'tabler:brand-nuxt',
  'vite.config.ts': 'tabler:brand-vite',
  'next.config.js': 'tabler:brand-nextjs',
  'tailwind.config.js': 'tabler:brand-tailwind',
}

/** 语言图标映射（tabler 系列） */
const langIcons: Record<string, string> = {
  'javascript': 'tabler:brand-javascript',
  'js': 'tabler:brand-javascript',
  'typescript': 'tabler:brand-typescript',
  'ts': 'tabler:brand-typescript',
  'vue': 'tabler:brand-vue',
  'html': 'tabler:brand-html5',
  'css': 'tabler:brand-css3',
  'scss': 'tabler:brand-sass',
  'sass': 'tabler:brand-sass',
  'less': 'tabler:file-code',
  'json': 'tabler:json',
  'jsonc': 'tabler:json',
  'yaml': 'tabler:file-text',
  'yml': 'tabler:file-text',
  'toml': 'tabler:file',
  'markdown': 'tabler:markdown',
  'md': 'tabler:markdown',
  'mdx': 'tabler:markdown',
  'python': 'tabler:brand-python',
  'py': 'tabler:brand-python',
  'rust': 'tabler:brand-rust',
  'rs': 'tabler:brand-rust',
  'go': 'tabler:brand-golang',
  'golang': 'tabler:brand-golang',
  'java': 'tabler:file-code',
  'c': 'tabler:file-code',
  'cpp': 'tabler:file-code',
  'c++': 'tabler:file-code',
  'shell': 'tabler:terminal',
  'bash': 'tabler:terminal',
  'sh': 'tabler:terminal',
  'zsh': 'tabler:terminal',
  'powershell': 'tabler:terminal',
  'sql': 'tabler:database',
  'graphql': 'tabler:file-code',
  'xml': 'tabler:file-code',
  'diff': 'tabler:git-compare',
  'dockerfile': 'tabler:brand-docker',
  'docker': 'tabler:brand-docker',
  'mermaid': 'tabler:chart-dots',
  'mmd': 'tabler:chart-dots',
  'text': 'tabler:file-text',
  'txt': 'tabler:file-text',
}

/**
 * 从 URL 提取域名
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * 获取域名图标
 * @param url 链接地址
 * @returns tabler 图标名，未知域名返回 undefined（调用方用 favicon 回退）
 */
export function getDomainIcon(url: string): string | undefined {
  const domain = getDomain(url)
  return domainIcons[domain]
}

/**
 * 获取文件图标
 * @param filename 文件名
 * @returns tabler 图标名，未匹配返回 undefined
 */
export function getFileIcon(filename?: string): string | undefined {
  if (!filename) return undefined
  // 先尝试完整文件名匹配（如 tsconfig.json）
  if (fileIcons[filename]) return fileIcons[filename]
  // 再尝试后缀匹配
  const ext = filename.match(/\.[^.]+$/)?.[0]?.toLowerCase()
  return ext ? fileIcons[ext] : undefined
}

/**
 * 获取语言图标
 * @param language 语言名称
 * @returns tabler 图标名，未匹配返回默认文件图标
 */
export function getLangIcon(language?: string): string {
  if (!language) return 'tabler:file'
  return langIcons[language.toLowerCase()] || 'tabler:file'
}

/**
 * 判断是否为外部链接
 */
export function isExternalLink(url: string): boolean {
  return /^https?:\/\//.test(url) || url.startsWith('//')
}

/**
 * 获取 favicon URL（Google Favicon 服务）
 */
export function getFaviconUrl(url: string, size = 32): string {
  const domain = getDomain(url)
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
}
