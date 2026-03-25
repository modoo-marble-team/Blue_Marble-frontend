import { describe, expect, it } from 'vitest'
import {
  buildGameResultModalRows,
  countOwnedCitiesByPlayer,
} from './gameBoardResultUtils'

describe('gameBoardResultUtils', () => {
  it('PROPERTY/property/city/transportType=PROPERTY 타일만 플레이어별 보유도시로 집계한다', () => {
    const ownedCityCountByPlayer = countOwnedCitiesByPlayer([
      { owner_id: 'p1', type: 'PROPERTY' },
      { ownerId: 'p1', type: 'property' },
      { owner_id: 'p1', type: 'city' },
      { owner_id: 'p2', transportType: 'PROPERTY' },
      { owner_id: 'p2', type: 'CHANCE' },
      { owner_id: 'p2', type: 'START' },
      { owner_id: null, type: 'PROPERTY' },
      { type: 'PROPERTY' },
    ])

    expect(ownedCityCountByPlayer.get('p1')).toBe(3)
    expect(ownedCityCountByPlayer.get('p2')).toBe(1)
  })

  it('건물 단계가 높아도 도시 수는 타일 개수만 센다', () => {
    const ownedCityCountByPlayer = countOwnedCitiesByPlayer([
      { owner_id: 'p1', type: 'PROPERTY' },
      { owner_id: 'p1', type: 'PROPERTY' },
      { owner_id: 'p1', type: 'PROPERTY' },
    ])

    expect(ownedCityCountByPlayer.get('p1')).toBe(3)
  })

  it('rankings 기반 결과 row에 실제 보유도시 수를 붙인다', () => {
    const rows = buildGameResultModalRows({
      rankings: [
        {
          rank: 1,
          player_id: 'p1',
          nickname: 'Alpha',
          final_assets: 842000,
          is_winner: true,
        },
        {
          rank: 2,
          player_id: 'p2',
          nickname: 'Beta',
          final_assets: 677000,
          is_winner: false,
        },
      ],
      tiles: [
        { owner_id: 'p1', type: 'PROPERTY' },
        { owner_id: 'p1', type: 'city' },
        { owner_id: 'p2', type: 'PROPERTY' },
        { owner_id: 'p2', type: 'EVENT' },
      ],
    })

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'p1',
        nickname: 'Alpha',
        ownedCityCountText: '2개',
      }),
      expect.objectContaining({
        id: 'p2',
        nickname: 'Beta',
        ownedCityCountText: '1개',
      }),
    ])
  })

  it('winner만 있는 결과 payload에서도 보유도시 수를 표시하고 없으면 0개를 사용한다', () => {
    const rows = buildGameResultModalRows({
      winner: {
        playerId: 'p9',
        nickname: 'Winner',
        balance: 330000,
        assets: 455000,
      },
      tiles: [{ owner_id: 'p1', type: 'PROPERTY' }],
    })

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'p9',
        nickname: 'Winner',
        ownedCityCountText: '0개',
      }),
    ])
  })
})
