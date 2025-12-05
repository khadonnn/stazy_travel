// app/actions/chat.ts
'use server';

import { writeFile } from 'fs/promises';
import { join } from 'path';

// === 1. Hàm chính của Server Action ===
export async function processChatRequest(formData: FormData) {
    const message = formData.get('message')?.toString() || '';
    const imageFile = formData.get('image') as File | null;

    // Xử lý lưu File
    let imageUrl = '';
    if (imageFile) {
        // Logic lưu file vật lý (chỉ dùng trong môi trường dev, production nên dùng S3/Cloudinary)
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `${Date.now()}-${imageFile.name}`;
        const path = join(process.cwd(), 'public/uploads', fileName);
        await writeFile(path, buffer);
        imageUrl = `/uploads/${fileName}`;
    }

    // === 2. Phân tích Văn bản (Booking Intent) ===
    if (message.includes('đặt phòng') || message.includes('book')) {
        const bookingIntent = await callConversationalService(message); // Gọi Microservice/LLM
        // Gọi BookingService nếu xác định được intent rõ ràng
        if (bookingIntent.action === 'book' && bookingIntent.is_complete) {
            // Logic gọi Microservice: POST /api/booking-service/book
            const bookingResult = await fetch(
                'http://booking-service/api/book',
                {
                    method: 'POST',
                    body: JSON.stringify(bookingIntent),
                },
            );
            // Trả về kết quả xác nhận đặt phòng
            return {
                type: 'booking_confirm',
                result: await bookingResult.json(),
            };
        }
        // Trả lời yêu cầu cung cấp thêm thông tin
        return {
            type: 'chat_reply',
            text: 'Vui lòng cung cấp thêm thông tin ngày đến và số khách.',
        };
    }

    // === 3. Xử lý Hình ảnh (Image Search) ===
    if (imageUrl) {
        const roomSuggestions = await callSmartSearchService(imageUrl); // Gọi Microservice SmartSearch
        // Trả về các gợi ý phòng
        return { type: 'room_suggestions', suggestions: roomSuggestions };
    }

    // === 4. Xử lý Gợi ý Khác (Recommendation/General Search) ===
    if (message.includes('tìm phòng') || message.includes('gợi ý')) {
        const searchIntent = await callSmartSearchService(message);
        const suggestions = await callRecommendationService(searchIntent); // Gọi RecommendationService
        return { type: 'room_suggestions', suggestions };
    }

    return {
        type: 'chat_reply',
        text: 'Tôi có thể giúp bạn tìm hoặc đặt phòng khách sạn.',
    };
}

// --- Hàm mô phỏng gọi Microservices ---

// Gọi ConversationalService (LLM/NLU) để xử lý câu lệnh
async function callConversationalService(text: string) {
    // API call tới ConversationalService để phân tích
    return {
        action: 'book',
        is_complete: text.includes('view biển'), // Giả lập hoàn thành đủ tham số
        roomType: 'double',
        dates: ['2025-12-10', '2025-12-15'],
    };
}

// Gọi SmartSearchService (Vector Search/Image Analysis)
async function callSmartSearchService(urlOrText: string) {
    // API call tới SmartSearchService (sử dụng Milvus/Vector Embedding)
    return [
        { id: 'R101', name: 'Deluxe Ocean View', matchScore: '98%' },
        { id: 'R203', name: 'Premium Balcony', matchScore: '85%' },
    ];
}

// Gọi RecommendationService (CF/Matrix Factorization)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callRecommendationService(intent: any) {
    // API call tới RecommendationService để lấy gợi ý sau khi tìm kiếm
    return [
        {
            id: 'R500',
            name: 'Executive Suite',
            reason: 'High rating and similar to rooms previously viewed.',
        },
    ];
}
