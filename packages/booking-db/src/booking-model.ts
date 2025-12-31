import mongoose, { InferSchemaType, model } from "mongoose";
const { Schema } = mongoose;

// 1. Export Enum để dùng ở cả Controller (validate input)
export const BookingStatus = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;

const BookingSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    hotelId: { type: Number, required: true },

    //  SNAPSHOT
    bookingSnapshot: {
      hotel: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        slug: { type: String, required: true },
        address: { type: String },
        image: { type: String },
        stars: { type: Number }
      },
      room: {
        id: { type: Number },
        name: { type: String, required: true },
        priceAtBooking: { type: Number, required: true }
      }
    },

    //  Thời gian
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true },

    // 👥 Số lượng khách (Nên thêm cái này để khách sạn biết chuẩn bị khăn/gối)
    guestCount: { 
        adults: { type: Number, default: 1 },
        children: { type: Number, default: 0 }
    },

    //  Giá cả
    totalPrice: { type: Number, required: true },

    //  Trạng thái
    status: {
      type: String,
      enum: BookingStatus, //  Dùng biến const ở trên
      default: "PENDING",
      required: true
    },

    //  Liên hệ (Sửa thành required)
    payment: {
      stripeSessionId: { type: String }, // Lưu session_id (cs_test_...) để đối soát
      paymentIntentId: { type: String }, // Lưu mã giao dịch thực tế
      status: { type: String, default: "UNPAID" } // UNPAID -> PAID
    },
    contactDetails: {
      fullName: { type: String, required: true }, //  Bắt buộc
      email: { type: String, required: true },    //  Bắt buộc
      phone: { type: String, required: true },    //  Bắt buộc
    },
  },
  { timestamps: true }
);

// Tự động suy diễn kiểu dữ liệu TS từ Schema
export type BookingSchemaType = InferSchemaType<typeof BookingSchema>;

//  Singleton Pattern: Tránh lỗi "OverwriteModelError" khi hot-reload
export const Booking = mongoose.models.Booking || model<BookingSchemaType>("Booking", BookingSchema);