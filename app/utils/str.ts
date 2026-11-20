/**
 * 字符串工具。
 * 移植自参考站 blog-v3 shared/utils/str.ts 的 getPromptLanguage：
 * 根据命令提示符前缀推断 Copy 组件的代码高亮语言。
 */
const promptLanguageMap: Record<string, string> = {
  '#': 'sh',
  $: 'sh',
  CMD: 'bat',
  PS: 'powershell',
}

export function getPromptLanguage(prompt: string | boolean): string {
  if (typeof prompt === 'boolean')
    return 'text'
  for (const promptPrefix in promptLanguageMap) {
    if (prompt.startsWith(promptPrefix))
      return promptLanguageMap[promptPrefix] ?? 'text'
  }
  return 'text'
}
