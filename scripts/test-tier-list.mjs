import assert from 'node:assert/strict'
import { TIER_ROWS, createTierState, distributeTierItems, moveTierItem, tierCounts } from '../app/utils/tier-list.ts'

const initial = createTierState()
assert.deepEqual(TIER_ROWS.map(row => [row.id, row.label, row.color]), [
  ['hang', '夯', '#e5484d'],
  ['top', '顶级', '#f08a3c'],
  ['elite', '人上人', '#f2c94c'],
  ['npc', 'NPC', '#f5cfa8'],
  ['la', '拉', '#ffffff'],
])
assert.deepEqual(tierCounts(initial), { total: 0, pending: 0, ranked: 0 })

const withImages = distributeTierItems(initial, [
  { id: 'a', name: 'a.png', src: 'blob:a', ratio: 1 },
  { id: 'b', name: 'b.png', src: 'blob:b', ratio: 2 },
])
assert.deepEqual(tierCounts(withImages), { total: 2, pending: 2, ranked: 0 })

const inTop = moveTierItem(withImages, 'a', 'pool', 'top', 0)
assert.deepEqual(tierCounts(inTop), { total: 2, pending: 1, ranked: 1 })
const reordered = moveTierItem(inTop, 'a', 'top', 'top', 1)
assert.deepEqual(reordered.top.map(item => item.id), ['a'])
const acrossRows = moveTierItem(reordered, 'a', 'top', 'la', 0)
assert.deepEqual(tierCounts(acrossRows), { total: 2, pending: 1, ranked: 1 })
const backToPool = moveTierItem(acrossRows, 'a', 'la', 'pool', 1)
assert.deepEqual(backToPool.pool.map(item => item.id), ['b', 'a'])
assert.deepEqual(tierCounts(backToPool), { total: 2, pending: 2, ranked: 0 })
assert.deepEqual(moveTierItem(backToPool, 'missing', 'pool', 'top', 0), backToPool)

const invalidDrop = moveTierItem(backToPool, 'a', 'pool', 'invalid', 0)
assert.deepEqual(invalidDrop, backToPool)

console.log('tier-list state and move behavior: PASS')
