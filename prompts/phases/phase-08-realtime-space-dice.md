# Phase 08 – Real-time Space Dice

## Goal

Build a server-authoritative mini-game with reconnect.

## Prompt

1. Pure game-core state machine.
2. Typed Socket.IO events.
3. Room create/join/leave.
4. Ready check.
5. Server dice.
6. Server question selection.
7. Turn timer.
8. Answer submission.
9. Result persistence.
10. Redis snapshot.
11. Reconnect with authoritative snapshot.
12. Duplicate/out-of-turn protection.
13. Reward after persistence.
14. Phaser or simple board UI.
15. Socket integration and load tests.
16. Disconnect/reconnect demo evidence.

## Critical gate

Client-supplied dice/result must be ignored.
