// // app/chat/route.ts
// import { openai } from "@ai-sdk/openai";
// import { streamText, tool } from "ai";
// import { z } from "zod";

// export const maxDuration = 30;

// export async function POST(req: Request) {
//   const { messages } = await req.json();

//   const result = await streamText({
//     model: openai("gpt-4-turbo"),
//     messages,
//     system: `Bạn là trợ lý ảo Stazy.
//     - Khi khách mô tả nhu cầu, hãy dùng tool 'searchByDescription' để tìm.
//     - Sau khi tìm thấy, hãy hiển thị tóm tắt ngắn gọn.
//     - Nếu khách chốt phòng, dùng tool 'createBookingLink' để gửi link thanh toán.`,

//     tools: {
//       // 🛠️ TOOL 1: TẬN DỤNG SEARCH SERVICE CÓ SẴN
//       searchByDescription: tool({
//         description:
//           "Tìm phòng dựa trên mô tả văn bản (VD: view biển, gần trung tâm, chill).",
//         parameters: z.object({
//           description: z.string().describe("Mô tả nhu cầu của khách hàng"),
//         }),
//         execute: async ({ description }: { description: string }) => {
//           console.log("🔍 Đang gọi Search Service với:", description);

//           try {
//             //  Gọi trực tiếp API Search Service của bạn (Python backend)
//             const res = await fetch("http://localhost:8008/search-by-text", {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({ description }),
//             });

//             if (!res.ok) throw new Error("Search service error");

//             const results = await res.json();

//             // Trả về top 3-5 kết quả để AI đọc
//             // Map lại dữ liệu cho gọn để tiết kiệm token cho AI
//             return results.slice(0, 5).map((item: any) => ({
//               id: item.id,
//               name: item.title || item.name, // Tùy output của python trả về key nào
//               price: item.price,
//               address: item.address,
//               amenities: item.amenities, // AI sẽ dùng cái này để tư vấn thêm
//               featuredImage: item.featuredImage || item.image, // Để hiển thị ảnh
//             }));
//           } catch (error) {
//             return "Xin lỗi, hệ thống tìm kiếm đang bảo trì.";
//           }
//         },
//       }),

//       // 🛠️ TOOL 2: TỰ ĐỘNG TẠO LINK ĐẶT PHÒNG
//       createBookingLink: tool({
//         description:
//           "Tạo đường dẫn thanh toán nhanh khi khách hàng chọn được phòng.",
//         parameters: z.object({
//           hotelId: z.number().describe("ID khách sạn"),
//           checkIn: z
//             .string()
//             .optional()
//             .describe("Ngày nhận phòng (YYYY-MM-DD)"), // AI tự trích xuất ngày
//           nights: z.number().default(1).describe("Số đêm"),
//         }),
//         execute: async ({
//           hotelId,
//           checkIn,
//           nights,
//         }: {
//           hotelId: number;
//           checkIn?: string;
//           nights: number;
//         }) => {
//           // Tạo URL deep link đến trang thanh toán của bạn
//           // Giả sử bạn có trang /book-now hoặc xử lý logic ở /hotels/[id]

//           const params = new URLSearchParams();
//           params.append("autoBook", "true"); // Cờ để frontend biết là cần mở popup thanh toán ngay
//           params.append("nights", nights.toString());
//           if (checkIn) params.append("date", checkIn);

//           const bookingUrl = `/hotels/${hotelId}?${params.toString()}`;

//           return {
//             url: bookingUrl,
//             message: "Link đặt phòng đã sẵn sàng!",
//             hotelId: hotelId,
//           };
//         },
//       }),
//     },
//   });

//   return result.toDataStreamResponse();
// }
