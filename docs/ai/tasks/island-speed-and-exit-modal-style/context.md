# Context: Island Speed and Exit Modal Style

## Background

- Players reported that leaving the island feels slow compared to the travel tile.
- There's a need for UI consistency across all modals, especially the exit confirmation.

## Technical Details

- **Island ID**: 8 (specifically `fromIndex === 8` when moving out).
- **Travel Tile IDs**: 16, 20.
- **Modal Widths**:
  - `BuyModal`: `max-w-105` (420px)
  - `ExitGameModal`: `max-w-125` (500px) -> Needs to be `max-w-105`.
- **Primary Color for Exit**: `#E10606` (Red).

## Impact

- `src/components/board/GameBoard.tsx`
- `src/components/game/modals/ExitGameModal.tsx`
