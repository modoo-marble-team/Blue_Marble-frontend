import { describe, expect, it } from 'vitest'
import { TILES, getTollCost } from '../../components/board/board.constants'
import { buildGameRulebookData, formatRulebookMoney } from './gameRulebookModel'

describe('gameRulebookModel', () => {
  it('keeps rulebook city row count aligned with PROPERTY tiles', () => {
    const data = buildGameRulebookData()
    const propertyTileCount = TILES.filter(
      (tile) => tile.type === 'PROPERTY'
    ).length

    expect(data.cityRows).toHaveLength(propertyTileCount)
  })

  it('builds city price and toll data from board constants', () => {
    const data = buildGameRulebookData()
    const cityRowsById = new Map(data.cityRows.map((row) => [row.tileId, row]))

    for (const tile of TILES) {
      if (tile.type !== 'PROPERTY' || typeof tile.price !== 'number') {
        continue
      }

      const row = cityRowsById.get(tile.id)
      expect(row).toBeDefined()
      expect(row?.priceWon).toBe(tile.price)
      expect(row?.tollByLevel.land).toBe(getTollCost(tile.price, 0))
      expect(row?.tollByLevel.villa).toBe(getTollCost(tile.price, 1))
      expect(row?.tollByLevel.hotel).toBe(getTollCost(tile.price, 2))
      expect(row?.tollByLevel.landmark).toBe(getTollCost(tile.price, 3))
    }
  })

  it('applies 5-tier classification and sorts rows by tier then tile id', () => {
    const data = buildGameRulebookData()

    expect(data.tiers).toHaveLength(5)

    const tierSequence = data.cityRows.map((row) => row.tier)
    const sortedTierSequence = [...tierSequence].sort(
      (left, right) => left - right
    )
    expect(tierSequence).toEqual(sortedTierSequence)

    for (let index = 1; index < data.cityRows.length; index += 1) {
      const previous = data.cityRows[index - 1]
      const current = data.cityRows[index]

      if (previous.tier === current.tier) {
        expect(previous.tileId).toBeLessThan(current.tileId)
      }
    }
  })

  it('formats money as 억 + 원 병기', () => {
    expect(formatRulebookMoney(300_000_000)).toBe('3억 (300,000,000원)')
    expect(formatRulebookMoney(150_000_000)).toBe('1.5억 (150,000,000원)')
  })
})
