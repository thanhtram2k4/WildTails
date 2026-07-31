# Claude Code Plugins and Skills

## 1. Plugin chính thức từ Anthropic

Trong Claude Code:

```text
/plugin marketplace add anthropics/claude-code
/plugin install feature-dev@anthropics-claude-code
/plugin install frontend-design@anthropics-claude-code
/plugin install pr-review-toolkit@anthropics-claude-code
/plugin install security-guidance@anthropics-claude-code
/plugin install commit-commands@anthropics-claude-code
/reload-plugins
```

Khuyến nghị:

- `feature-dev`: workflow phát triển feature.
- `frontend-design`: tránh giao diện AI chung chung.
- `pr-review-toolkit`: review test, type, error handling và code quality.
- `security-guidance`: nhắc rủi ro bảo mật khi sửa code.
- `commit-commands`: hỗ trợ commit/PR.

Không khuyến nghị bật vòng lặp tự động dài khi mới bắt đầu hoặc khi chưa có test gate.

## 2. Skills mẫu chính thức

```text
/plugin marketplace add anthropics/skills
/plugin install example-skills@anthropic-agent-skills
/reload-plugins
```

Skill đáng chú ý:

- `webapp-testing`: kiểm thử ứng dụng local bằng Playwright.
- `frontend-design`: hỗ trợ thiết kế giao diện.
- `skill-creator`: tạo skill mới.
- `mcp-builder`: chỉ cần khi tự xây MCP server.

Hãy kiểm tra nội dung, license và quyền thực thi trước khi trust.

## 3. Community collections

Có thể tham khảo, không nên cài toàn bộ:

- `VoltAgent/awesome-agent-skills`
- `hesreallyhim/awesome-claude-code`
- `rohitg00/awesome-claude-code-toolkit`
- `affaan-m/everything-claude-code`
- `Mindrally/skills`

Quy trình an toàn:

1. Chọn đúng một skill.
2. Đọc toàn bộ `SKILL.md`.
3. Kiểm tra scripts, hooks và MCP.
4. Kiểm tra network call.
5. Kiểm tra command phá hủy.
6. Pin commit/tag.
7. Test trong repository thử.
8. Chỉ sau đó mới copy vào `.claude/skills/`.

Không clone và chạy install script không rõ nguồn chỉ vì repository có nhiều star.

## 4. Kiểm tra sau cài

```text
/doctor
/plugin
```

Kiểm tra:

- plugin load thành công;
- không trùng tên agent;
- không trùng skill;
- permission không quá rộng;
- không có MCP lạ;
- không đọc `.env`;
- không tự chạy deploy.
