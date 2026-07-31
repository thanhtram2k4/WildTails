---
name: wildtails-architecture
description: Provides WildTails architecture rules, domain ownership, transaction boundaries, adapters, state-machine requirements, and ADR expectations. Use for cross-domain planning and design reviews.
user-invocable: false
---

Use Modular Monolith + Worker + Real-time Gateway.

Respect domain ownership from `docs/02-architecture.md`.

For every design:

- identify source of truth;
- identify transaction boundary;
- identify failure and retry behavior;
- identify private-data boundary;
- identify external adapter;
- identify observability;
- identify test strategy;
- identify manual approval;
- avoid microservices unless a measured constraint requires them.
