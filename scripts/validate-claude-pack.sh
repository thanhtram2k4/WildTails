#!/usr/bin/env bash
set -euo pipefail

required=(
  "CLAUDE.md"
  "PROJECT_STATUS.md"
  ".claude/settings.json"
  ".claude/agents/wildtails-lead.md"
  ".claude/skills/run-phase/SKILL.md"
  "docs/06-manual-work.md"
)

for file in "${required[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing: $file" >&2
    exit 1
  fi
done

python -m json.tool .claude/settings.json >/dev/null

echo "Claude Code pack structure is valid."
