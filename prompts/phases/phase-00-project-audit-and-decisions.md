# Phase 00 – Project Audit and Human Decisions

## Goal

Turn the proposal into a set of implementable decisions without coding any features.

## Prompt

You are the WildTails lead. Do the following:

1. Read all project documentation.
2. Create an assumption register.
3. Create a decision register.
4. Identify P0, P1, P2.
5. Confirm or ask the user to confirm:
   - Space Dice as the MVP mini-game;
   - auth strategy;
   - LLM provider;
   - transcript source/fallback;
   - email provider;
   - OAuth scope;
   - deployment target;
   - visual direction;
   - AI budget/quota;
   - data retention.
6. Create proposed ADRs for undecided items.
7. Create a risk register.
8. Create an acceptance map from user stories to tests.
9. Update PROJECT_STATUS.

## Deliverables

- `docs/decisions-register.md`
- `docs/assumptions-register.md`
- `docs/risk-register.md`
- `docs/acceptance-map.md`
- Proposed ADRs.
- Human decision checklist.

## Stop condition

Do not start Phase 01 until the stack, MVP game, auth direction and P0 scope are approved by the user.
