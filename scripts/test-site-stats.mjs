import assert from 'node:assert/strict'
import { aggregateSiteStats, countPostWords, getLatestPostDate, getRelativeDateParts } from '../app/utils/siteStats.ts'

assert.equal(countPostWords({ body: { value: '中文内容 Nuxt 4' } }), 6)
assert.equal(countPostWords({ body: { value: 'abc 123' } }), 2)
assert.equal(countPostWords({ body: null, description: '回退摘要' }), 4)
assert.equal(
  getLatestPostDate([
    { date: '2026-10-02', updated: '2026-10-08' },
    { date: '2026-11-01' },
  ]),
  '2026-11-01T00:00:00.000Z',
)
assert.equal(
  getLatestPostDate([{ date: '2026-10-02', updated: '2026-10-08' }]),
  '2026-10-08T00:00:00.000Z',
)
assert.equal(getLatestPostDate([]), null)
assert.deepEqual(getRelativeDateParts('2026-11-12T00:00:00.000Z', Date.parse('2026-11-13T12:00:00.000Z')), { key: 'days', amount: 1 })
assert.equal(getRelativeDateParts('invalid', Date.now()), null)
assert.deepEqual(aggregateSiteStats([
  { date: '2026-10-01', description: '摘要' },
  { date: '2026-10-02', updated: '2026-10-05', body: { value: '正文' } },
  { date: '2026-11-10', draft: true, description: '草稿不统计' },
]), {
  postCount: 2,
  wordCount: 4,
  latestUpdate: '2026-10-05T00:00:00.000Z',
})
console.log('PASS: site stats aggregation')
