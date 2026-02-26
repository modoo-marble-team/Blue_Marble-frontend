import React from 'react'

interface GameResultModalProps {
  open: boolean
  winnerName?: string
  title?: string
  subtitle?: string
  backToLobbyLabel?: string
  onBackToLobby?: () => void
  results?: {
    id: string
    nickname: string
    totalAssetText: string
    ownedCityCountText: string
  }[]
}

const DEFAULT_TITLE = 'GAME OVER'
const DEFAULT_BACK_LABEL = '로비로 돌아가기'

const DEFAULT_RESULTS: NonNullable<GameResultModalProps['results']> = [
  {
    id: 'p1',
    nickname: 'GoormEE',
    totalAssetText: '2,500M',
    ownedCityCountText: '8개',
  },
  {
    id: 'p2',
    nickname: 'MarbleKing',
    totalAssetText: '1,900M',
    ownedCityCountText: '6개',
  },
  {
    id: 'p3',
    nickname: 'Player 3',
    totalAssetText: '1,500M',
    ownedCityCountText: '5개',
  },
  {
    id: 'p4',
    nickname: 'Player 4',
    totalAssetText: '1,400M',
    ownedCityCountText: '4개',
  },
]

const GameResultModal: React.FC<GameResultModalProps> = ({
  open,
  winnerName = 'GoormEE',
  title = DEFAULT_TITLE,
  subtitle,
  backToLobbyLabel = DEFAULT_BACK_LABEL,
  onBackToLobby,
  results = DEFAULT_RESULTS,
}) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,36,56,0.52)] backdrop-blur-[2px]">
      <div
        className="w-full rounded-[36px] px-7 pb-7 pt-6"
        style={{ maxWidth: '920px' }}
      >
        <div className="mb-5 text-center">
          <div className="mb-1 text-[64px] leading-none">🏆</div>
          <h2 className="text-[48px] font-black leading-none tracking-tight text-white">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-3 text-[34px] font-bold text-white">{subtitle}</p>
          ) : (
            <p className="mt-3 text-[34px] font-bold text-white">
              <span className="text-[#FFD23F]">{winnerName}</span>
              <span>님이 승리했습니다!</span>
            </p>
          )}
        </div>

        <div className="space-y-3">
          {results.map((player, index) => {
            const rank = index + 1
            const isWinner = rank === 1

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-[18px] border bg-white px-5 py-4 shadow-sm ${
                  isWinner
                    ? 'border-[#F5C542] ring-2 ring-[#F5C542]'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-[14px] text-[26px] font-black ${
                      rank === 1
                        ? 'bg-[#FFD23F] text-[#6B4E00]'
                        : rank === 2
                          ? 'bg-[#DCE4EF] text-[#586983]'
                          : rank === 3
                            ? 'bg-[#F8D6B2] text-[#A95B22]'
                            : 'bg-[#EEF2F8] text-[#8AA0BC]'
                    }`}
                  >
                    {rank}
                  </div>

                  <div>
                    <div className="text-[34px] font-black leading-tight text-[#1F2A44]">
                      {player.nickname}
                      {isWinner ? <span className="ml-2">👑</span> : null}
                    </div>
                    <div className="mt-1 text-[18px] font-bold text-[#8AA0BC]">
                      총자산 · 보유 도시 {player.ownedCityCountText}
                    </div>
                  </div>
                </div>

                <div className="text-[40px] font-black tracking-tight text-[#245FE5]">
                  {player.totalAssetText}
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onBackToLobby}
          className="mx-auto mt-6 flex h-15 w-full items-center justify-center rounded-[18px] bg-[#245FE5] text-[30px] font-black tracking-tight text-white shadow-lg transition-colors hover:bg-[#1F56D1]"
          style={{ maxWidth: '760px' }}
        >
          🏠 {backToLobbyLabel}
        </button>
      </div>
    </div>
  )
}

export default GameResultModal
