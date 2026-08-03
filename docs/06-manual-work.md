# Parts That the Implementer Must Do Manually

Claude assists with design and implementation, but the items below must not be fully delegated to an agent.

## 1. Product decisions

You must decide:

- Whether the MVP uses Space Dice or Spy Cat.
- The onboarding flow.
- The degree of avatar customization.
- Planet rules.
- The final point calculation formula.
- The interface language.
- The definition of "meaningful comment".
- What content is allowed to be public.

## 2. UI/UX design and creative assets

You must:

- approve wireframes;
- choose the visual direction;
- choose colors, fonts and motion;
- create or license assets;
- verify licenses;
- approve avatar layers;
- approve mascot and personality;
- verify accessibility with eyes and keyboard;
- conduct usability tests with real people.

Claude can code the interface but cannot confirm your brand identity on your behalf.

## 3. Accounts, billing and secrets

You must create and manage:

- LLM API account.
- Email provider.
- OAuth credentials.
- S3/cloud account.
- Domain/DNS.
- Production database.
- Monitoring account.
- Budget and quota.

Do not paste secrets into the chat or commit them. Enter them only in a secret manager or a local `.env` file.

## 4. AI dataset and evaluation

You must:

- select 30–50 valid videos;
- verify usage rights;
- create or approve transcripts;
- write human reference summaries;
- assign key takeaways;
- assign planet labels;
- design a scoring form;
- invite evaluators;
- handle consent;
- manually verify hallucinations.

Claude can help create templates and calculate metrics but cannot replace human ground truth.

## 5. Privacy, legal and ethics

You must review:

- Privacy Policy.
- Terms of Use.
- Consent language.
- Data retention.
- Account deletion.
- Report/appeal content.
- Age restriction.
- LLM provider data policy.
- How research data is used.

Seek review from an instructor or person with legal expertise if used in production.

## 6. Database and production

You must approve:

- destructive migrations;
- data backfills;
- production migrations;
- database restores;
- bucket policy;
- production backup;
- production access.

Do not allow Claude to run production migrations autonomously.

## 7. Security

You must:

- review plugins before trusting them;
- verify new dependencies;
- review security agent reports;
- decide acceptable risk levels;
- test with two accounts;
- manually check for IDOR;
- confirm logs do not contain sensitive data;
- rotate keys if a leak is suspected.

## 8. Git and release

You must:

- review PRs;
- merge;
- create releases;
- deploy to production;
- rollback production;
- accept scope changes.

Do not use auto-merge for a thesis project.

## 9. Research and thesis

You must:

- choose the methodology;
- confirm research questions;
- collect data;
- write the analysis section;
- interpret results;
- acknowledge limitations;
- avoid conclusions that exceed the data;
- prepare the demo and answer the committee.

Claude can draft text, but you must understand and take full responsibility for all content.

## 10. Human approval gates

Mandatory approval before:

- end of phase 00;
- schema and permission model;
- LLM provider;
- transcript source;
- migration with data;
- UI direction;
- score formula;
- high/critical security findings;
- staging deployment;
- production deployment;
- final thesis result.
