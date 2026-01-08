import { Server } from "socket.io";

// Biến lưu instance của Socket.io để dùng ở nơi khác
let io: Server | null = null;

// Hàm này được gọi 1 lần ở index.ts khi server khởi động
export const setSocketIO = (socketIOInstance: Server) => {
  io = socketIOInstance;
};

// Hàm nghiệp vụ: Gửi thông báo cho Admin
export const notifyAdmin = (data: any) => {
  if (!io) return;
  console.log("🔔 [Socket] Bắn noti cho Admin...");

  io.to("admin-channel").emit("admin-new-booking", {
    message: "Có đơn hàng mới!",
    bookingId: data.bookingId,
    customerName: data.customerName,
    hotelName: data.hotelName,
    totalPrice: data.totalPrice,
    timestamp: new Date(),
  });
};

// Hàm nghiệp vụ: Gửi thông báo cập nhật UI cho User
export const notifyUserSuccess = (bookingId: string, data: any) => {
  if (!io) return;
  console.log(`🔔 [Socket] Báo thành công cho User room: booking-${bookingId}`);

  io.to(`booking-${bookingId}`).emit("booking-success", data);
};
