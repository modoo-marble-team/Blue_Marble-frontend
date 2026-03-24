# Plan: Island Speed and Exit Modal Style

## Goal

- Island movement speed should match Travel tile speed (fast).
- Exit Game Modal should match the width and size of other modals (BuyModal, etc.).
- Maintain line breaks, red button color, and dice emoji in the Exit Game Modal.

## Strategy

1.  **Island Speed**: Modify `GameBoard.tsx` to detect Island tile (ID 8) as a "fast" move source.
2.  **Modal Style**: Standardize `ExitGameModal.tsx` using `max-w-105` and `rounded-[44px]`.

## Verification

- Lint check.
- Game logic tests.
- Visual check (simulated).
