# Claude Code Plugins and Skills

## 1. Official plugins from Anthropic

In Claude Code:

```text
/plugin marketplace add anthropics/claude-code
/plugin install feature-dev@anthropics-claude-code
/plugin install frontend-design@anthropics-claude-code
/plugin install pr-review-toolkit@anthropics-claude-code
/plugin install security-guidance@anthropics-claude-code
/plugin install commit-commands@anthropics-claude-code
/reload-plugins
```

Recommendations:

- `feature-dev`: feature development workflow.
- `frontend-design`: avoids generic AI interfaces.
- `pr-review-toolkit`: reviews tests, types, error handling and code quality.
- `security-guidance`: prompts security risks when editing code.
- `commit-commands`: assists with commits/PRs.

Not recommended to enable long automatic loops when starting out or when no test gate exists.

## 2. Official sample skills

```text
/plugin marketplace add anthropics/skills
/plugin install example-skills@anthropic-agent-skills
/reload-plugins
```

Notable skills:

- `webapp-testing`: tests local applications using Playwright.
- `frontend-design`: assists with interface design.
- `skill-creator`: creates new skills.
- `mcp-builder`: only needed when building a custom MCP server.

Always review content, license and execution permissions before trusting.

## 3. Community collections

May be consulted; do not install everything:

- `VoltAgent/awesome-agent-skills`
- `hesreallyhim/awesome-claude-code`
- `rohitg00/awesome-claude-code-toolkit`
- `affaan-m/everything-claude-code`
- `Mindrally/skills`

Safe process:

1. Select exactly one skill.
2. Read the entire `SKILL.md`.
3. Check scripts, hooks and MCP.
4. Check network calls.
5. Check for destructive commands.
6. Pin to a commit/tag.
7. Test in a trial repository.
8. Only then copy into `.claude/skills/`.

Do not clone and run an install script of unknown origin just because the repository has many stars.

## 4. Post-installation checks

```text
/doctor
/plugin
```

Verify:

- plugin loaded successfully;
- no duplicate agent names;
- no duplicate skill names;
- permissions are not overly broad;
- no unknown MCPs;
- not reading `.env`;
- not self-triggering deploy.
