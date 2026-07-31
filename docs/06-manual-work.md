# Những phần bắt buộc người thực hiện phải làm thủ công

Claude hỗ trợ thiết kế và triển khai, nhưng các phần dưới đây không được giao hoàn toàn cho agent.

## 1. Quyết định sản phẩm

Bạn phải tự chốt:

- MVP thực sự dùng Space Dice hay Spy Cat.
- Luồng onboarding.
- Mức độ tùy chỉnh avatar.
- Planet rules.
- Cách tính điểm cuối cùng.
- Ngôn ngữ giao diện.
- Tiêu chí “meaningful comment”.
- Nội dung nào được phép công khai.

## 2. Thiết kế UI/UX và tài sản sáng tạo

Bạn phải tự:

- duyệt wireframe;
- chọn visual direction;
- chọn màu, font và motion;
- tạo hoặc mua quyền sử dụng asset;
- kiểm tra license;
- duyệt avatar layers;
- duyệt mascot và personality;
- kiểm tra accessibility bằng mắt và bàn phím;
- thực hiện usability test với người thật.

Claude có thể code giao diện nhưng không thể thay bạn xác nhận bản sắc thương hiệu.

## 3. Tài khoản, billing và secret

Bạn phải tự tạo và quản lý:

- LLM API account.
- Email provider.
- OAuth credentials.
- S3/cloud account.
- Domain/DNS.
- Production database.
- Monitoring account.
- Budget và quota.

Không dán secret vào chat hoặc commit. Chỉ điền vào secret manager hoặc `.env` local.

## 4. AI dataset và đánh giá

Bạn phải tự:

- chọn 30–50 video hợp lệ;
- kiểm tra quyền sử dụng;
- tạo hoặc duyệt transcript;
- viết human reference summary;
- gán key takeaway;
- gán planet label;
- thiết kế form chấm;
- mời người đánh giá;
- xử lý consent;
- xác nhận hallucination bằng tay.

Claude có thể hỗ trợ tạo template và tính metric nhưng không thay thế human ground truth.

## 5. Privacy, pháp lý và đạo đức

Bạn phải tự duyệt:

- Privacy Policy.
- Terms of Use.
- Consent language.
- Data retention.
- Account deletion.
- Nội dung báo cáo/kháng nghị.
- Age restriction.
- LLM provider data policy.
- Cách dùng dữ liệu nghiên cứu.

Nên nhờ giảng viên hoặc người có chuyên môn pháp lý xem lại nếu dùng thật.

## 6. Database và production

Bạn phải tự phê duyệt:

- destructive migration;
- data backfill;
- production migration;
- database restore;
- bucket policy;
- production backup;
- production access.

Không cho Claude tự chạy production migration.

## 7. Security

Bạn phải tự:

- review plugin trước khi trust;
- kiểm tra dependency mới;
- kiểm tra report từ security agent;
- quyết định mức độ chấp nhận rủi ro;
- test bằng hai tài khoản;
- kiểm tra IDOR thủ công;
- xác nhận log không chứa dữ liệu nhạy cảm;
- thay key nếu nghi ngờ lộ.

## 8. Git và release

Bạn phải tự:

- duyệt PR;
- merge;
- tạo release;
- deploy production;
- rollback production;
- chấp nhận thay đổi scope.

Không dùng auto-merge cho đồ án.

## 9. Nghiên cứu và thesis

Bạn phải tự:

- chọn methodology;
- xác nhận research question;
- thu thập dữ liệu;
- viết phần phân tích;
- giải thích kết quả;
- thừa nhận limitation;
- tránh đưa kết luận vượt quá dữ liệu;
- chuẩn bị demo và trả lời hội đồng.

Claude có thể soạn nháp nhưng bạn phải hiểu và chịu trách nhiệm toàn bộ nội dung.

## 10. Human approval gates

Bắt buộc phê duyệt trước:

- kết thúc phase 00;
- schema và permission model;
- LLM provider;
- transcript source;
- migration có dữ liệu;
- UI direction;
- score formula;
- security finding mức high/critical;
- staging deployment;
- production deployment;
- final thesis result.
