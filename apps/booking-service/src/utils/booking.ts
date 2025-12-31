import { Booking } from "@repo/booking-db"; 
import { BookingSchemaType } from "@repo/booking-db"; 
import { producer } from "./kafka";

// 1. Hàm tạo Booking mới (Giữ nguyên code của bạn)
// Dùng khi User bấm nút "Đặt phòng" -> Tạo trạng thái PENDING
export const createBooking = async (bookingData: Partial<BookingSchemaType>) => {
  const newBooking = new Booking(bookingData);

  try {
    const savedBooking = await newBooking.save();

    await producer.send("booking.created", {
      value: {
        bookingId: savedBooking._id.toString(),
        userId: savedBooking.userId,
        email: savedBooking.contactDetails.email,
        totalPrice: savedBooking.totalPrice,
        hotelName: savedBooking.bookingSnapshot.hotel.name,
        status: savedBooking.status,
      },
    });

    return savedBooking;
  } catch (error) {
    console.error("Create Booking Service Error:", error);
    throw error;
  }
};

// 2. 🔥 HÀM MỚI CẦN THÊM: Cập nhật trạng thái sau khi thanh toán thành công
// Dùng khi Kafka nhận được tin nhắn "payment.successful" từ Payment Service
export const updateBookingStatusToPaid = async (bookingId: string, paymentMeta: { sessionId: string }) => {
  try {
    console.log(`🔄 Updating booking ${bookingId} to PAID...`);

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          status: "CONFIRMED",       // Đổi trạng thái đơn hàng sang Đã xác nhận
          "payment.status": "PAID",  // Đánh dấu đã trả tiền
          "payment.stripeSessionId": paymentMeta.sessionId, // Lưu lại ID phiên thanh toán để tra soát
        }
      },
      { new: true } // Option này để hàm trả về bản ghi MỚI sau khi update (để log ra xem)
    );

    if (!updatedBooking) {
      console.error(`❌ Booking not found: ${bookingId}`);
      return null;
    }

    console.log("✅ Booking updated successfully:", updatedBooking._id);
    return updatedBooking;

  } catch (error) {
    console.error("Update Booking Status Error:", error);
    throw error;
  }
};