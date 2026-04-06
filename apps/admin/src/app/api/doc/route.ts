import { createSwaggerSpec } from 'next-swagger-doc';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/doc:
 *   get:
 *     tags:
 *       - Internal
 *     summary: Lấy Swagger spec JSON
 *     description: Endpoint trả về OpenAPI 3.0 spec cho toàn bộ Stazy Monorepo
 *     responses:
 *       200:
 *         description: OpenAPI spec JSON
 */
export async function GET() {
    const adminSpec = createSwaggerSpec({
        apiFolder: 'src/app/api',
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'Stazy Full API Docs',
                version: '1.0.0',
                description:
                    'Tài liệu đầy đủ cho tất cả services trong Stazy Monorepo.\n\n' +
                    '**Services:**\n' +
                    '- 🖥️ **Admin** (Next.js) — `http://localhost:3003`\n' +
                    '- 📦 **Product Service** (Express) — `http://localhost:8000`\n' +
                    '- 📅 **Booking Service** (Fastify) — `http://localhost:5000`\n' +
                    '- 💳 **Payment Service** (Hono) — `http://localhost:4000`\n' +
                    '- 🔍 **Search / AI Service** (FastAPI) — `http://localhost:8008`',
            },
            servers: [
                { url: 'http://localhost:3003', description: '🖥️ Admin (Next.js)' },
                { url: 'http://localhost:8000', description: '📦 Product Service (Express)' },
                { url: 'http://localhost:5000', description: '📅 Booking Service (Fastify)' },
                { url: 'http://localhost:4000', description: '💳 Payment Service (Hono)' },
                { url: 'http://localhost:8008', description: '🔍 Search / AI Service (FastAPI)' },
            ],
            tags: [
                // Admin
                { name: 'Admin › Users', description: '(Admin) Quản lý người dùng' },
                { name: 'Admin › Hotels', description: '(Admin) Quản lý & phê duyệt khách sạn' },
                { name: 'Admin › Bookings', description: '(Admin) Xem đặt phòng' },
                { name: 'Admin › Author Requests', description: '(Admin) Phê duyệt yêu cầu tác giả' },
                { name: 'Admin › Stats', description: '(Admin) Thống kê dashboard' },
                // Product Service
                { name: 'Product › Hotels', description: '(product-service:8000) CRUD khách sạn' },
                { name: 'Product › Users', description: '(product-service:8000) CRUD người dùng' },
                { name: 'Product › Categories', description: '(product-service:8000) Quản lý danh mục' },
                // Booking Service
                { name: 'Booking › Bookings', description: '(booking-service:5000) Đặt phòng & lịch sử' },
                { name: 'Booking › Messages', description: '(booking-service:5000) Chat Admin ↔ User' },
                { name: 'Booking › AI Admin', description: '(booking-service:5000) Train AI model' },
                // Payment Service
                { name: 'Payment › Stripe', description: '(payment-service:4000) Thanh toán Stripe' },
                { name: 'Payment › VNPay', description: '(payment-service:4000) Thanh toán VNPay' },
                { name: 'Payment › Webhooks', description: '(payment-service:4000) Stripe webhooks' },
                // Search Service
                { name: 'Search › AI', description: '(search-service:8008) Tìm kiếm & gợi ý AI' },
                // Internal
                { name: 'Internal', description: 'Meta endpoints' },
            ],
            components: {
                securitySchemes: {
                    ClerkAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Clerk session token (lấy từ `getToken()` hoặc cookie `__session`)',
                    },
                },
                schemas: {
                    Error: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    PaginatedMeta: {
                        type: 'object',
                        properties: {
                            total: { type: 'integer' },
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                        },
                    },
                },
            },
            security: [{ ClerkAuth: [] }],
            // ─────────────────────────────────────────────────────────────
            // MANUAL PATHS — Microservices (Express / Fastify / Hono / FastAPI)
            // ─────────────────────────────────────────────────────────────
            paths: {
                // ══════════════════════════════════
                // PRODUCT SERVICE — /hotels
                // ══════════════════════════════════
                '/hotels': {
                    servers: [{ url: 'http://localhost:8000' }],
                    get: {
                        tags: ['Product › Hotels'],
                        summary: 'Lấy danh sách khách sạn công khai (có filter & phân trang)',
                        parameters: [
                            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
                            { in: 'query', name: 'limit', schema: { type: 'integer', default: 12 } },
                            {
                                in: 'query',
                                name: 'category',
                                schema: { type: 'string' },
                                description: 'Tên / slug danh mục',
                            },
                            {
                                in: 'query',
                                name: 'search',
                                schema: { type: 'string' },
                                description: 'Tìm theo tên, địa chỉ',
                            },
                            { in: 'query', name: 'minPrice', schema: { type: 'number' } },
                            { in: 'query', name: 'maxPrice', schema: { type: 'number' } },
                        ],
                        responses: {
                            200: { description: 'Danh sách hotels' },
                        },
                        security: [],
                    },
                    post: {
                        tags: ['Product › Hotels'],
                        summary: 'Tạo khách sạn mới (Author/Admin)',
                        security: [{ ClerkAuth: [] }],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['title', 'price', 'address', 'categoryId'],
                                        properties: {
                                            title: { type: 'string' },
                                            price: { type: 'number' },
                                            address: { type: 'string' },
                                            categoryId: { type: 'integer' },
                                            description: { type: 'string' },
                                            featuredImage: { type: 'string' },
                                            galleryImgs: { type: 'array', items: { type: 'string' } },
                                            maxGuests: { type: 'integer' },
                                            bedrooms: { type: 'integer' },
                                            bathrooms: { type: 'integer' },
                                            amenities: { type: 'array', items: { type: 'string' } },
                                        },
                                    },
                                },
                            },
                        },
                        responses: {
                            201: { description: 'Tạo thành công' },
                            401: { description: 'Chưa đăng nhập' },
                        },
                    },
                },
                '/hotels/my-hotels': {
                    servers: [{ url: 'http://localhost:8000' }],
                    get: {
                        tags: ['Product › Hotels'],
                        summary: 'Lấy danh sách khách sạn của Author đang đăng nhập',
                        security: [{ ClerkAuth: [] }],
                        responses: {
                            200: { description: 'Danh sách hotels của author' },
                            401: { description: 'Chưa đăng nhập' },
                        },
                    },
                },
                '/hotels/admin-view/{id}': {
                    servers: [{ url: 'http://localhost:8000' }],
                    get: {
                        tags: ['Product › Hotels'],
                        summary: 'Lấy chi tiết hotel cho Admin (bao gồm DRAFT/PENDING)',
                        security: [{ ClerkAuth: [] }],
                        parameters: [
                            {
                                in: 'path',
                                name: 'id',
                                required: true,
                                schema: { type: 'integer' },
                                description: 'Hotel ID',
                            },
                        ],
                        responses: {
                            200: { description: 'Chi tiết hotel' },
                            404: { description: 'Không tìm thấy' },
                        },
                    },
                },
                '/hotels/{id}': {
                    servers: [{ url: 'http://localhost:8000' }],
                    get: {
                        tags: ['Product › Hotels'],
                        summary: 'Lấy chi tiết khách sạn công khai',
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                        responses: {
                            200: { description: 'Chi tiết hotel' },
                            404: { description: 'Không tìm thấy' },
                        },
                        security: [],
                    },
                    put: {
                        tags: ['Product › Hotels'],
                        summary: 'Cập nhật khách sạn (Admin only)',
                        security: [{ ClerkAuth: [] }],
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                        requestBody: {
                            content: { 'application/json': { schema: { type: 'object' } } },
                        },
                        responses: {
                            200: { description: 'Cập nhật thành công' },
                            403: { description: 'Không có quyền' },
                        },
                    },
                    delete: {
                        tags: ['Product › Hotels'],
                        summary: 'Xoá khách sạn (Admin only)',
                        security: [{ ClerkAuth: [] }],
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                        responses: {
                            200: { description: 'Xoá thành công' },
                            403: { description: 'Không có quyền' },
                        },
                    },
                },
                '/hotels/{id}/related': {
                    servers: [{ url: 'http://localhost:8000' }],
                    get: {
                        tags: ['Product › Hotels'],
                        summary: 'Lấy khách sạn tương tự',
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                        responses: { 200: { description: 'Danh sách hotels liên quan' } },
                        security: [],
                    },
                },

                // ══════════════════════════════════
                // PRODUCT SERVICE — /users
                // ══════════════════════════════════
                '/users': {
                    servers: [{ url: 'http://localhost:8000' }],
                    get: {
                        tags: ['Product › Users'],
                        summary: 'Lấy danh sách tất cả users (product-service)',
                        security: [{ ClerkAuth: [] }],
                        responses: { 200: { description: 'Danh sách users' } },
                    },
                    post: {
                        tags: ['Product › Users'],
                        summary: 'Tạo user mới (sync từ Clerk webhook)',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['id', 'email'],
                                        properties: {
                                            id: { type: 'string', description: 'Clerk user ID' },
                                            name: { type: 'string' },
                                            email: { type: 'string' },
                                            avatar: { type: 'string' },
                                        },
                                    },
                                },
                            },
                        },
                        responses: { 201: { description: 'Tạo thành công' } },
                        security: [],
                    },
                },
                '/users/{id}': {
                    servers: [{ url: 'http://localhost:8000' }],
                    get: {
                        tags: ['Product › Users'],
                        summary: 'Lấy thông tin user theo ID',
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                        responses: { 200: { description: 'Thông tin user' }, 404: { description: 'Không tìm thấy' } },
                        security: [],
                    },
                    patch: {
                        tags: ['Product › Users'],
                        summary: 'Cập nhật thông tin user',
                        security: [{ ClerkAuth: [] }],
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: { name: { type: 'string' }, avatar: { type: 'string' } },
                                    },
                                },
                            },
                        },
                        responses: { 200: { description: 'Cập nhật thành công' } },
                    },
                    delete: {
                        tags: ['Product › Users'],
                        summary: 'Xoá user',
                        security: [{ ClerkAuth: [] }],
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                        responses: { 200: { description: 'Xoá thành công' } },
                    },
                },
                '/users/{id}/role': {
                    servers: [{ url: 'http://localhost:8000' }],
                    patch: {
                        tags: ['Product › Users'],
                        summary: 'Cập nhật role người dùng (Admin only)',
                        security: [{ ClerkAuth: [] }],
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['role'],
                                        properties: { role: { type: 'string', enum: ['USER', 'AUTHOR', 'ADMIN'] } },
                                    },
                                },
                            },
                        },
                        responses: {
                            200: { description: 'Cập nhật role thành công' },
                            400: { description: 'Role không hợp lệ' },
                            404: { description: 'Không tìm thấy user' },
                        },
                    },
                },
                '/users/{id}/stats': {
                    servers: [{ url: 'http://localhost:8000' }],
                    get: {
                        tags: ['Product › Users'],
                        summary: 'Thống kê của Author/Host (số khách sạn, lượt xem)',
                        security: [{ ClerkAuth: [] }],
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                        responses: {
                            200: {
                                description: 'Stats',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                totalHotels: { type: 'integer' },
                                                approvedHotels: { type: 'integer' },
                                                pendingHotels: { type: 'integer' },
                                                draftHotels: { type: 'integer' },
                                                totalViews: { type: 'integer' },
                                                totalBookings: { type: 'integer' },
                                                totalRevenue: { type: 'number' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },

                // ══════════════════════════════════
                // PRODUCT SERVICE — /categories
                // ══════════════════════════════════
                '/categories': {
                    servers: [{ url: 'http://localhost:8000' }],
                    get: {
                        tags: ['Product › Categories'],
                        summary: 'Lấy danh sách danh mục',
                        responses: { 200: { description: 'Danh sách categories' } },
                        security: [],
                    },
                    post: {
                        tags: ['Product › Categories'],
                        summary: 'Tạo danh mục mới (Admin only)',
                        security: [{ ClerkAuth: [] }],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['name'],
                                        properties: {
                                            name: { type: 'string' },
                                            description: { type: 'string' },
                                            color: { type: 'string' },
                                            icon: { type: 'string' },
                                            thumbnail: { type: 'string' },
                                        },
                                    },
                                },
                            },
                        },
                        responses: { 201: { description: 'Tạo thành công' }, 403: { description: 'Không có quyền' } },
                    },
                },
                '/categories/{id}': {
                    servers: [{ url: 'http://localhost:8000' }],
                    put: {
                        tags: ['Product › Categories'],
                        summary: 'Cập nhật danh mục (Admin only)',
                        security: [{ ClerkAuth: [] }],
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
                        responses: { 200: { description: 'Cập nhật thành công' } },
                    },
                    delete: {
                        tags: ['Product › Categories'],
                        summary: 'Xoá danh mục (Admin only)',
                        security: [{ ClerkAuth: [] }],
                        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
                        responses: { 200: { description: 'Xoá thành công' } },
                    },
                },

                // ══════════════════════════════════
                // BOOKING SERVICE — /bookings
                // ══════════════════════════════════
                '/bookings': {
                    servers: [{ url: 'http://localhost:5000' }],
                    post: {
                        tags: ['Booking › Bookings'],
                        summary: 'Tạo đơn đặt phòng mới',
                        security: [{ ClerkAuth: [] }],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['hotelId', 'checkIn', 'checkOut', 'contactDetails'],
                                        properties: {
                                            hotelId: { type: 'integer', example: 42 },
                                            checkIn: { type: 'string', format: 'date', example: '2026-03-01' },
                                            checkOut: { type: 'string', format: 'date', example: '2026-03-05' },
                                            contactDetails: {
                                                type: 'object',
                                                required: ['fullName', 'email', 'phone'],
                                                properties: {
                                                    fullName: { type: 'string' },
                                                    email: { type: 'string', format: 'email' },
                                                    phone: { type: 'string' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        responses: {
                            201: { description: 'Đặt phòng thành công' },
                            409: { description: 'Phòng đang được giữ bởi người khác (Redis Lock)' },
                            404: { description: 'Không tìm thấy khách sạn' },
                        },
                    },
                    get: {
                        tags: ['Booking › Bookings'],
                        summary: 'Lấy tất cả đặt phòng (Admin only)',
                        security: [{ ClerkAuth: [] }],
                        responses: { 200: { description: 'Danh sách tất cả bookings' } },
                    },
                },
                '/bookings/user-bookings': {
                    servers: [{ url: 'http://localhost:5000' }],
                    get: {
                        tags: ['Booking › Bookings'],
                        summary: 'Lịch sử đặt phòng của user đang đăng nhập',
                        security: [{ ClerkAuth: [] }],
                        responses: {
                            200: {
                                description: 'Danh sách bookings của user',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'string' },
                                                    status: {
                                                        type: 'string',
                                                        enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
                                                    },
                                                    checkIn: { type: 'string', format: 'date-time' },
                                                    checkOut: { type: 'string', format: 'date-time' },
                                                    totalPrice: { type: 'number' },
                                                    nights: { type: 'integer' },
                                                    hotel: { type: 'object' },
                                                    contactDetails: { type: 'object' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                '/bookings/recent': {
                    servers: [{ url: 'http://localhost:5000' }],
                    get: {
                        tags: ['Booking › Bookings'],
                        summary: 'Lấy 5 đặt phòng gần nhất (widget dashboard)',
                        responses: { 200: { description: '5 bookings gần nhất' } },
                        security: [],
                    },
                },
                '/bookings/check-availability': {
                    servers: [{ url: 'http://localhost:5000' }],
                    get: {
                        tags: ['Booking › Bookings'],
                        summary: 'Kiểm tra phòng còn trống không',
                        parameters: [
                            { in: 'query', name: 'hotelId', required: true, schema: { type: 'integer' }, example: 42 },
                            {
                                in: 'query',
                                name: 'checkIn',
                                required: true,
                                schema: { type: 'string', format: 'date' },
                                example: '2026-03-01',
                            },
                            {
                                in: 'query',
                                name: 'checkOut',
                                required: true,
                                schema: { type: 'string', format: 'date' },
                                example: '2026-03-05',
                            },
                        ],
                        responses: {
                            200: {
                                description: 'Kết quả kiểm tra',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                available: { type: 'boolean' },
                                                message: { type: 'string' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        security: [],
                    },
                },

                // ══════════════════════════════════
                // BOOKING SERVICE — /messages
                // ══════════════════════════════════
                '/messages/conversations': {
                    servers: [{ url: 'http://localhost:5000' }],
                    get: {
                        tags: ['Booking › Messages'],
                        summary: 'Sidebar Admin — danh sách cuộc trò chuyện',
                        security: [{ ClerkAuth: [] }],
                        responses: {
                            200: {
                                description: 'Danh sách conversations',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    userId: { type: 'string' },
                                                    userName: { type: 'string' },
                                                    lastMessage: { type: 'string' },
                                                    lastTimestamp: { type: 'string', format: 'date-time' },
                                                    unreadCount: { type: 'integer' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                '/messages/{userId}': {
                    servers: [{ url: 'http://localhost:5000' }],
                    get: {
                        tags: ['Booking › Messages'],
                        summary: 'Lấy tin nhắn của một user',
                        security: [{ ClerkAuth: [] }],
                        parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
                        responses: { 200: { description: 'Danh sách messages' } },
                    },
                },
                '/messages/mark-read': {
                    servers: [{ url: 'http://localhost:5000' }],
                    post: {
                        tags: ['Booking › Messages'],
                        summary: 'Đánh dấu đã đọc tất cả tin nhắn của user (Admin)',
                        security: [{ ClerkAuth: [] }],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['userId'],
                                        properties: { userId: { type: 'string' } },
                                    },
                                },
                            },
                        },
                        responses: { 200: { description: 'Đã đánh dấu đọc' } },
                    },
                },
                '/messages/stats/unread': {
                    servers: [{ url: 'http://localhost:5000' }],
                    get: {
                        tags: ['Booking › Messages'],
                        summary: 'Số tin nhắn chưa đọc (badge đỏ Admin menu)',
                        security: [{ ClerkAuth: [] }],
                        responses: {
                            200: {
                                description: 'Số lượng chưa đọc',
                                content: {
                                    'application/json': {
                                        schema: { type: 'object', properties: { count: { type: 'integer' } } },
                                    },
                                },
                            },
                        },
                    },
                },

                // ══════════════════════════════════
                // BOOKING SERVICE — /admin (AI)
                // ══════════════════════════════════
                '/admin/train-ai': {
                    servers: [{ url: 'http://localhost:5000' }],
                    post: {
                        tags: ['Booking › AI Admin'],
                        summary: 'Trigger train lại AI model thủ công (Admin only)',
                        description:
                            'Chạy Python script `train_real.py` trong search-service. Cần ít nhất 10 interactions. Timeout 10 phút.',
                        security: [{ ClerkAuth: [] }],
                        responses: {
                            200: {
                                description: 'Train thành công',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        duration: { type: 'string', example: '12.34s' },
                                                        totalInteractions: { type: 'integer' },
                                                        output: { type: 'string' },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            400: { description: 'Chưa đủ dữ liệu (< 10 interactions)' },
                        },
                    },
                },
                '/admin/training-status': {
                    servers: [{ url: 'http://localhost:5000' }],
                    get: {
                        tags: ['Booking › AI Admin'],
                        summary: 'Lấy trạng thái training & metrics mới nhất (Admin only)',
                        security: [{ ClerkAuth: [] }],
                        responses: {
                            200: {
                                description: 'Training status',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                totalInteractions: { type: 'integer' },
                                                recentInteractions: { type: 'integer' },
                                                lastTrained: { type: 'string', format: 'date-time', nullable: true },
                                                metrics: {
                                                    nullable: true,
                                                    type: 'object',
                                                    properties: {
                                                        rmse: { type: 'number' },
                                                        precisionAt5: { type: 'number' },
                                                        recallAt5: { type: 'number' },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },

                // ══════════════════════════════════
                // PAYMENT SERVICE — /session
                // ══════════════════════════════════
                '/session/create-checkout-session': {
                    servers: [{ url: 'http://localhost:4000' }],
                    post: {
                        tags: ['Payment › Stripe'],
                        summary: 'Tạo Stripe Embedded Checkout Session',
                        security: [{ ClerkAuth: [] }],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['items', 'user', 'checkInDate', 'checkOutDate'],
                                        properties: {
                                            items: {
                                                type: 'array',
                                                description: 'CartItem[]',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'integer', description: 'Room ID' },
                                                        hotelId: { type: 'integer' },
                                                        title: { type: 'string', description: 'Tên khách sạn' },
                                                        name: { type: 'string', description: 'Tên phòng' },
                                                        price: {
                                                            type: 'integer',
                                                            description: 'Giá (VND, unit_amount)',
                                                        },
                                                        nights: { type: 'integer' },
                                                        featuredImage: { type: 'string' },
                                                        slug: { type: 'string' },
                                                        reviewStar: { type: 'number' },
                                                        address: { type: 'string' },
                                                    },
                                                },
                                            },
                                            user: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    email: { type: 'string', format: 'email' },
                                                    phone: { type: 'string' },
                                                },
                                            },
                                            checkInDate: { type: 'string', format: 'date' },
                                            checkOutDate: { type: 'string', format: 'date' },
                                        },
                                    },
                                },
                            },
                        },
                        responses: {
                            200: {
                                description: 'Session tạo thành công',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                clientSecret: {
                                                    type: 'string',
                                                    description: 'Dùng cho Stripe.js mountEmbeddedCheckout()',
                                                },
                                                bookingId: { type: 'string', format: 'uuid' },
                                            },
                                        },
                                    },
                                },
                            },
                            400: { description: 'Giỏ hàng trống hoặc dữ liệu thiếu' },
                            401: { description: 'Chưa đăng nhập' },
                        },
                    },
                },
                '/session/{session_id}': {
                    servers: [{ url: 'http://localhost:4000' }],
                    get: {
                        tags: ['Payment › Stripe'],
                        summary: 'Kiểm tra trạng thái Stripe Session (return page)',
                        parameters: [
                            {
                                in: 'path',
                                name: 'session_id',
                                required: true,
                                schema: { type: 'string' },
                                description: 'Stripe session ID',
                            },
                        ],
                        responses: {
                            200: {
                                description: 'Trạng thái thanh toán',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                status: { type: 'string', enum: ['open', 'complete', 'expired'] },
                                                paymentStatus: { type: 'string' },
                                                bookingId: { type: 'string' },
                                                customer_email: { type: 'string' },
                                            },
                                        },
                                    },
                                },
                            },
                            404: { description: 'Session không tồn tại' },
                        },
                        security: [],
                    },
                },
                '/session/my-bookings': {
                    servers: [{ url: 'http://localhost:4000' }],
                    get: {
                        tags: ['Payment › Stripe'],
                        summary: 'Lịch sử thanh toán của user hiện tại',
                        security: [{ ClerkAuth: [] }],
                        responses: {
                            200: {
                                description: 'Lịch sử thanh toán',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { type: 'array', items: { type: 'object' } },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },

                // ══════════════════════════════════
                // PAYMENT SERVICE — /payment (VNPay)
                // ══════════════════════════════════
                '/payment/create-qr': {
                    servers: [{ url: 'http://localhost:4000' }],
                    post: {
                        tags: ['Payment › VNPay'],
                        summary: 'Tạo URL thanh toán VNPay',
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            amount: { type: 'integer', example: 500000, description: 'Số tiền (VND)' },
                                            orderId: {
                                                type: 'string',
                                                example: 'BOOKING_001',
                                                description: 'Mã đơn hàng duy nhất',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        responses: {
                            200: {
                                description: 'URL redirect VNPay',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: { url: { type: 'string', format: 'uri' } },
                                        },
                                    },
                                },
                            },
                        },
                        security: [],
                    },
                },

                // ══════════════════════════════════
                // PAYMENT SERVICE — /webhooks
                // ══════════════════════════════════
                '/webhooks/test': {
                    servers: [{ url: 'http://localhost:4000' }],
                    get: {
                        tags: ['Payment › Webhooks'],
                        summary: 'Kiểm tra webhook endpoint hoạt động',
                        responses: { 200: { description: 'OK' } },
                        security: [],
                    },
                },
                '/webhooks/stripe': {
                    servers: [{ url: 'http://localhost:4000' }],
                    post: {
                        tags: ['Payment › Webhooks'],
                        summary: 'Nhận sự kiện từ Stripe (checkout.session.completed → Kafka)',
                        description: 'Gọi bởi Stripe, không gọi trực tiếp. Cần header `stripe-signature`.',
                        parameters: [
                            { in: 'header', name: 'stripe-signature', required: true, schema: { type: 'string' } },
                        ],
                        requestBody: {
                            description: 'Raw Stripe event payload',
                            content: { 'application/json': { schema: { type: 'object' } } },
                        },
                        responses: {
                            200: { description: 'Nhận thành công, đã push Kafka' },
                            400: { description: 'Chữ ký không hợp lệ' },
                        },
                        security: [],
                    },
                },

                // ══════════════════════════════════
                // SEARCH / AI SERVICE (FastAPI :8008)
                // ══════════════════════════════════
                '/': {
                    servers: [{ url: 'http://localhost:8008' }],
                    get: {
                        tags: ['Search › AI'],
                        summary: 'Health check — Search Service',
                        responses: {
                            200: {
                                description: 'Status online',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                status: { type: 'string', example: 'online' },
                                                service: { type: 'string' },
                                                vectors_loaded: { type: 'integer' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        security: [],
                    },
                },
                '/search-by-text': {
                    servers: [{ url: 'http://localhost:8008' }],
                    post: {
                        tags: ['Search › AI'],
                        summary: 'Tìm kiếm hotel bằng mô tả văn bản (CLIP AI)',
                        description: 'Dùng mô hình CLIP-ViT-B-32 encode văn bản → tìm hotels tương đồng về vector.',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['description'],
                                        properties: {
                                            description: {
                                                type: 'string',
                                                example: 'villa ven biển có hồ bơi và view đẹp',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        responses: { 200: { description: 'Top hotels phù hợp nhất' } },
                        security: [],
                    },
                },
                '/search-by-base64': {
                    servers: [{ url: 'http://localhost:8008' }],
                    post: {
                        tags: ['Search › AI'],
                        summary: 'Tìm kiếm hotel bằng ảnh (Base64 — kéo thả)',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['image'],
                                        properties: {
                                            image: { type: 'string', description: 'data:image/png;base64,...' },
                                        },
                                    },
                                },
                            },
                        },
                        responses: { 200: { description: 'Top hotels tương đồng về hình ảnh' } },
                        security: [],
                    },
                },
                '/search-by-image-url': {
                    servers: [{ url: 'http://localhost:8008' }],
                    post: {
                        tags: ['Search › AI'],
                        summary: 'Tìm kiếm hotel bằng URL ảnh',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['image_url'],
                                        properties: {
                                            image_url: {
                                                type: 'string',
                                                format: 'uri',
                                                example: 'https://example.com/hotel.jpg',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        responses: { 200: { description: 'Top hotels tương đồng' } },
                        security: [],
                    },
                },
                '/recommend/{user_id}': {
                    servers: [{ url: 'http://localhost:8008' }],
                    get: {
                        tags: ['Search › AI'],
                        summary: 'Gợi ý khách sạn cá nhân hóa cho user (Collaborative Filtering)',
                        parameters: [
                            {
                                in: 'path',
                                name: 'user_id',
                                required: true,
                                schema: { type: 'string' },
                                description: 'Clerk user ID',
                            },
                        ],
                        responses: {
                            200: { description: 'Danh sách hotels được gợi ý (fallback về top hotels nếu user mới)' },
                        },
                        security: [],
                    },
                },
                '/agent/chat': {
                    servers: [{ url: 'http://localhost:8008' }],
                    post: {
                        tags: ['Search › AI'],
                        summary: 'AI Agent Chat — xử lý yêu cầu tự nhiên từ người dùng',
                        description: 'Nhận câu hỏi tự nhiên, AI sẽ tự quyết định tìm kiếm / đặt phòng / gợi ý.',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['message'],
                                        properties: {
                                            message: {
                                                type: 'string',
                                                example: 'Tìm cho tôi villa ở Đà Nẵng dưới 2 triệu/đêm',
                                            },
                                            user_id: { type: 'string', default: 'guest', example: 'user_abc123' },
                                            history: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        role: { type: 'string', enum: ['user', 'assistant'] },
                                                        content: { type: 'string' },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        responses: { 200: { description: 'Phản hồi từ AI Agent' } },
                        security: [],
                    },
                },
            },
        },
    });

    return NextResponse.json(adminSpec);
}
