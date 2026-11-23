import assert from 'node:assert/strict'
import {
  isTrustedLink,
  encodeTargetUrl,
  decodeTargetUrl,
  buildSafegoUrl,
  extractDomain,
} from '../app/utils/safego.ts'

// ─── extractDomain ───────────────────────────────────────────
assert.equal(extractDomain('https://example.com/path'), 'example.com')
assert.equal(extractDomain('http://sub.example.com:8080/page'), 'sub.example.com')
assert.equal(extractDomain('https://github.com/user/repo'), 'github.com')
assert.equal(extractDomain('mailto:test@example.com'), '')
assert.equal(extractDomain('javascript:void(0)'), '')
assert.equal(extractDomain('not-a-url'), '')
assert.equal(extractDomain(''), '')
console.log('extractDomain: PASS')

// ─── isTrustedLink ───────────────────────────────────────────
const whitelist = ['kemiaosw.top', '518339.xyz', 'github.com']

// Trusted: exact domain match
assert.equal(isTrustedLink('https://www.kemiaosw.top/about', whitelist), true)
assert.equal(isTrustedLink('https://kemiaosw.top/', whitelist), true)
assert.equal(isTrustedLink('https://pl.518339.xyz/api', whitelist), true)
assert.equal(isTrustedLink('https://github.com/maochenyu-me', whitelist), true)

// Trusted: subdomain contains whitelist entry
assert.equal(isTrustedLink('https://bsz.518339.xyz/js', whitelist), true)
assert.equal(isTrustedLink('https://meting-api.518339.xyz/api', whitelist), true)

// Not trusted: external domains
assert.equal(isTrustedLink('https://evil.com/phishing', whitelist), false)
assert.equal(isTrustedLink('https://notkemiaosw.top/fake', whitelist), false)
assert.equal(isTrustedLink('https://example.com', whitelist), false)

// Edge cases: internal links, anchors, mailto
assert.equal(isTrustedLink('/about', whitelist), true) // internal
assert.equal(isTrustedLink('#section', whitelist), true) // anchor
assert.equal(isTrustedLink('mailto:hi@kemiaosw.top', whitelist), true) // mailto
assert.equal(isTrustedLink('', whitelist), true) // empty

// Empty whitelist: everything external is untrusted
assert.equal(isTrustedLink('https://example.com', []), false)
assert.equal(isTrustedLink('/about', []), true) // internal still trusted
console.log('isTrustedLink: PASS')

// ─── encodeTargetUrl / decodeTargetUrl ───────────────────────
const testUrls = [
  'https://example.com/path?query=value&foo=bar',
  'https://github.com/user/repo/issues/1',
  'https://zh.wikipedia.org/wiki/中文',
  'http://localhost:3000/test',
]

for (const url of testUrls) {
  const encoded = encodeTargetUrl(url)
  assert.equal(typeof encoded, 'string')
  assert.ok(encoded.length > 0)
  // Should be URL-safe (no + / = in base64url)
  assert.ok(!encoded.includes('+'))
  assert.ok(!encoded.includes('/'))
  assert.ok(!encoded.includes('='))
  const decoded = decodeTargetUrl(encoded)
  assert.equal(decoded, url)
}

// Invalid base64 returns null
assert.equal(decodeTargetUrl('not-valid-base64!!!'), null)
assert.equal(decodeTargetUrl(''), null)
console.log('encodeTargetUrl / decodeTargetUrl: PASS')

// ─── buildSafegoUrl ──────────────────────────────────────────
const safegoUrl = buildSafegoUrl('https://example.com/page', 'u')
assert.equal(safegoUrl.startsWith('/safego?u='), true)
const param = new URL(safegoUrl, 'https://localhost').searchParams.get('u')
assert.ok(param)
assert.equal(decodeTargetUrl(param), 'https://example.com/page')

// Custom param name
const customUrl = buildSafegoUrl('https://test.com', 'target')
assert.equal(customUrl.startsWith('/safego?target='), true)
console.log('buildSafegoUrl: PASS')

console.log('\n✅ All safego tests passed!')
