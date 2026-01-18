# setup

> pnpm init

```js

 "main": "src/index.js",
 "type": "module"
 "Check-types" : "tsc --noEmit"
 "devDependencies" : { "@repo/typescript-config":"workspace:*" }

```

> pnpm add fastify@^5.5.0
> create src/index.ts

> pnpm add -D typescript @types/node tsx

> create "dev" : "tsx --env-file=.env --watch src/index.ts"
> create .env
> create tsconfig.json

# role claims clerk sessions

{
"role": "user"
}

# kịch bản

1. Bước 1: Gieo thông tin (Establish Context)
   Hãy bắt đầu bằng một yêu cầu cụ thể về địa điểm và ngân sách.

User: "Tìm cho mình khách sạn ở Đà Lạt, giá dưới 2 triệu."

Kỳ vọng AI: Trả về danh sách các khách sạn tại Đà Lạt có giá < 2.000.000đ.

Trạng thái hệ thống: Redis lúc này phải lưu được: {"role": "user", "content": "...Đà Lạt..."}

2. Bước 2: Test bộ nhớ ngắn hạn (Implicit Filter)Đây là bước quan trọng nhất. Bạn đưa ra yêu cầu mới nhưng KHÔNG nhắc lại địa điểm.User: "Tìm cái nào có bồn tắm đi."
   Phân tích:
   Nếu AI "mất trí nhớ": Nó sẽ hỏi "Bạn muốn tìm khách sạn có bồn tắm ở đâu?" hoặc tìm bồn tắm ở... Hà Nội/TP.HCM (Random). => FAIL.
   Nếu AI "có trí nhớ": Nó sẽ tự hiểu là "Tìm khách sạn có bồn tắm tại Đà Lạt và giá rẻ (hoặc trong danh sách vừa tìm)".
   Kỳ vọng AI: "Dựa trên những nơi ở Đà Lạt mình vừa tìm, đây là các khách sạn có bồn tắm..."
3. Bước 3: Test khả năng hiểu tham chiếu (Reference)
   Bạn yêu cầu đặt phòng dựa trên vị trí trong danh sách, không nói tên.

User: "Chốt cái đầu tiên nhé." (Hoặc "Đặt cho mình cái Vintage đi" nếu tên khách sạn có chữ Vintage).

Kỳ vọng AI: Tạo đúng booking link cho khách sạn nằm ở vị trí số 1 trong câu trả lời trước đó.

Điều này chứng tỏ AI không chỉ nhớ "Đà Lạt" mà còn nhớ được danh sách kết quả nó vừa đưa ra cho bạn
