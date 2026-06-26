---
name: aqg
description: |
  Giúp tự động đọc tài liệu (Sách giáo khoa), tóm tắt nội dung chính, tạo ảnh infographic
  và tạo các câu hỏi trắc nghiệm (1 đáp án / nhiều đáp án) hoặc tự luận ngắn theo đúng định dạng
  chuẩn kỹ thuật tương thích với hệ thống ARENA (Bộ Giáo Dục - Thông tư 27/2021).
license: Apache-2.0
metadata:
  version: v1
  publisher: local
---

# Arena Question Generator Skill (aqg)

Skill này hướng dẫn quy trình tóm tắt và sinh câu hỏi tự động tương thích 100% với hệ thống **ARENA**.

## QUY TRÌNH LÀM VIỆC (WORKFLOW)
1. **ĐỌC HIỂU**: Phân tích kỹ nội dung tài liệu tải lên.
2. **TÓM TẮT & TẠO INFOGRAPHIC**: 
   - Viết tóm tắt ngắn các nội dung chính của tài liệu ở đầu tiên.
   - **TẠO ẢNH INFOGRAPHIC**: Sử dụng công cụ `generate_image` với một prompt mô tả thiết kế infographic giáo dục sinh động, hiện đại và lưu ảnh dạng artifact, sau đó nhúng trực tiếp vào tài liệu đầu ra bằng cú pháp markdown: `![Infographic](absolute_path_to_image)`.
3. **TẠO CÂU HỎI THEO ĐỊNH DẠNG BẮT BUỘC**:
   - Trắc nghiệm 1 đáp án (MCQ).
   - Trắc nghiệm nhiều đáp án (MCQ_MULTIPLE) - Thêm chữ **(chọn nhiều đáp án)** sau câu hỏi.
   - Tự luận ngắn/Điền khuyết (SHORT_ANSWER).

---

## CẤU TRÚC ĐỊNH DẠNG CÂU HỎI (BẮT BUỘC)

### Dạng Trắc nghiệm (ABCD 1 đáp án đúng):
```text
Câu [Số thứ tự]: [Nội dung câu hỏi]
Mức độ: [Nhận biết/Kết nối/Vận dụng]
A. [Lựa chọn 1]
B. [Lựa chọn 2]
C. [Lựa chọn 3]
D. [Lựa chọn 4]
Đáp án: [Ký tự đáp án đúng A/B/C/D]
Hướng dẫn: Gợi ý: [Gợi ý giải]. Lời giải chi tiết: [Lời giải chi tiết]
Độ khó: [1 đến 4]
Thời gian: [30/45/60/90/120]
XP: [10/12/15/20/30]
chủ đề: [Tên chủ đề]
Môn: [Tên môn học]
```

### Dạng Trắc nghiệm (ABCD nhiều đáp án đúng):
```text
Câu [Số thứ tự]: [Nội dung câu hỏi] (chọn nhiều đáp án)
Mức độ: [Nhận biết/Kết nối/Vận dụng]
A. [Lựa chọn 1]
B. [Lựa chọn 2]
C. [Lựa chọn 3]
D. [Lựa chọn 4]
Đáp án: [Ký tự đáp án đúng ngăn cách bởi dấu phẩy, VD: A, C hoặc B, D]
Hướng dẫn: Gợi ý: [Gợi ý giải]. Lời giải chi tiết: [Lời giải chi tiết]
Độ khó: [1 đến 4]
Thời gian: [30/45/60/90/120]
XP: [10/12/15/20/30]
chủ đề: [Tên chủ đề]
Môn: [Tên môn học]
```

### Dạng Tự luận ngắn (Điền khuyết/Trả lời ngắn):
```text
Câu [Số thứ tự]: [Nội dung câu hỏi, có thể dùng dấu ... cho chỗ trống]
Mức độ: [Nhận biết/Kết nối/Vận dụng]
Đáp án: [Nội dung câu trả lời đúng]
Hướng dẫn: Gợi ý: [Gợi ý giải]. Lời giải chi tiết: [Lời giải chi tiết]
Độ khó: [1 đến 4]
Thời gian: [30/45/60/90/120]
XP: [10/12/15/20/30]
chủ đề: [Tên chủ đề]
Môn: [Tên môn học]
```

---

## CẤU TRÚC CHI TIẾT (BẮT BUỘC)
1. **Số thứ tự**: Phải tăng liên tục từ 1 đến hết.
2. **Định dạng Text**: KHÔNG ĐƯỢC in đậm (`**`) hay in nghiêng (`*`) các từ khóa nhãn như `Câu`, `Mức độ`, `Đáp án`, `Hướng dẫn`, `Độ khó`, `Thời gian`, `XP`, `chủ đề`, `Môn`, `A.`, `B.`, `C.`, `D.`.
3. **LaTeX**: Bọc toán/số học trong `$`. Đáp án tự luận là số không cần bọc `$`. Dấu phẩy số thập phân bọc `{}` (VD: `2{,}5`). Số hàng nghìn trở lên dùng dấu cách phân tách lớp.
4. **Đơn vị đo**: Phải có dấu cách giữa số và đơn vị (VD: `4,3 m`).
