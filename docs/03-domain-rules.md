# Domain Rules

## Journal

- Mặc định PRIVATE.
- Owner luôn có quyền.
- SELECTED_USERS cần permission record.
- Permission có thể hết hạn.
- Revoke có hiệu lực ở request tiếp theo.
- Publish tạo hoặc liên kết Post; không biến private journal thành public mà không có hành động rõ.
- AI summary là version/draft, không overwrite nội dung người dùng âm thầm.

## Goal

- Progress từ 0 đến 100.
- Deadline có thể null.
- Journal/action item có thể liên kết goal.
- Không tự động đánh dấu completed chỉ vì AI đề xuất.

## Planet

- Default planet do system sở hữu.
- Member mới có thể post nếu rule cho phép.
- Moderator chỉ thao tác planet được phân công.
- Admin action phải audit.

## Feed

- Không chỉ xếp theo like.
- Baseline:
  - relevance;
  - content quality;
  - freshness;
  - relationship;
  - diversity;
  - moderation penalty.
- Giới hạn bài liên tiếp cùng tác giả.
- Report hợp lệ giảm hạng.
- Rule-based trước ML.

## Points

- Không có endpoint “set total score” cho client.
- Mọi thay đổi là transaction.
- Transaction phải có source/reference.
- Self-interaction không tạo influence.
- Duplicate interaction không tạo thêm điểm.
- Daily cap có thể cấu hình.
- Leaderboard dùng snapshot theo kỳ.

## AI Auto-Log

- Chỉ job owner xem trạng thái và output.
- Source URL phải validate.
- Transcript có thể nhập thủ công.
- Output parse/validate trước lưu.
- Không publish tự động.
- User edit tạo version.
- Failure phải có error code hữu ích.

## Space Dice

- 4–6 người.
- Server tạo dice result.
- Server chọn question.
- Mỗi turn chỉ một action hợp lệ.
- Timeout do server xử lý.
- Reconnect không cho thực hiện lại action đã hoàn tất.
- Reward chỉ cấp sau khi game final result được persist.
