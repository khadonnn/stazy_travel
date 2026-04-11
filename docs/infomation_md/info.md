sizes: [string, ...string[]]

- dlx (hoặc npx nếu dùng npm)

# product-service

```js
 "devDependencies" : {
  "@repo/typescript-config" : "workspace:*",
  }

  -- pnpm i
  -- pnpm add cors
  -- pnpm add -D  @types/cors
```

## setup route cho AI

/
├── apps/
│ ├── web/ # (Ứng dụng chính đặt phòng khách sạn)
│ ├── booking-service/ # (Backend API cho việc đặt phòng)
│ ├── payment-service/ # (Backend API cho thanh toán)
│ ├── chatbox/ # (Frontend Chatbot)
│ ├── nlp-service/ # (Backend AI - Xử lý ngôn ngữ)
│ └── vision-service/ # (Backend AI - Xử lý hình ảnh)
├── packages/
│ ├── shared-ui/ # (Các component UI dùng chung)
│ ├── shared-config/ # (Cấu hình ESLint, TypeScript dùng chung)
│ └── shared-types/ # (Các file .ts/d.ts định nghĩa types)
└── package.json

## cac model

Mô hình cho NLP & Chatbot Service co tieng viet

- Phân tích Ngôn ngữ Tiếng Việt: **vinai/phobert-base**
- Phân tích Ngôn ngữ Đa ngôn ngữ: **xlm-roberta-base**

B. Tạo Vector nhúng Ngữ nghĩa (Semantic Embedding)
Để tìm kiếm các mô tả khách sạn, đánh giá hoặc câu hỏi thường gặp (FAQ) dựa trên ý nghĩa chứ không chỉ dựa trên từ khóa

- Vector nhúng Đa ngôn ngữ : **sentence-transformers/paraphrase-multilingual-mpnet-base-v2**
- Vector nhúng Tiếng Việt chuyên biệt: **keepitup/multilingual-simcse-vietnamese-base**

2. Mô hình cho Vision Service (Tìm kiếm Hình ảnh)
   Các mô hình này cho phép bạn so sánh hình ảnh hoặc tìm kiếm hình ảnh bằng cách sử dụng văn bản mô tả.
   A. Tìm kiếm Đa phương thức (Multimodal Search)
   Mô hình quan trọng nhất, cho phép so sánh vector của văn bản và hình ảnh trong cùng một không gian.
   Hình ảnh & Văn bản: **openai/clip-vit-base-patch32**
   B. Trích xuất Đặc trưng Hình ảnh (Image Feature Extraction)
   Nếu bạn chỉ cần so sánh hình ảnh với hình ảnh (ví dụ: người dùng tải lên ảnh, tìm khách sạn tương tự về kiến trúc)
   Trích xuất Đặc trưng : **google/vit-base-patch16-224**

# 🎯 Tóm tắt Lựa chọn Khởi đầu

Để bắt đầu một hệ thống thông minh tìm kiếm khách sạn & chatbot:

| Mục đích        | Mô hình Gợi ý                             |
| --------------- | ----------------------------------------- |
| NLP Tiếng Việt  | **vinai/phobert-base**                    |
| Semantic Search | **paraphrase-multilingual-mpnet-base-v2** |
| Image Search    | **openai/clip-vit-base-patch32**          |
