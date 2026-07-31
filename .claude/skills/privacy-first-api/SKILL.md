---
name: privacy-first-api
description: Applies WildTails privacy and authorization rules to APIs, queries, search, media, AI jobs, and sharing features. Use whenever code reads or changes user-owned or private content.
user-invocable: true
---

For the current API or module:

1. Identify actor, owner, resource and required policy.
2. Use default deny.
3. Do not trust owner, role or visibility from client.
4. Check permission before returning body or signed URL.
5. Filter private data before search/ranking/cache output.
6. Verify revoke and expiry.
7. Add cross-account negative tests.
8. Add audit event for sensitive change.
9. Confirm logs exclude private body and tokens.
10. Document security impact.
