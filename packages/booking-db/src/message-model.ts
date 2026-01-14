import mongoose, { InferSchemaType, model } from "mongoose";
const { Schema } = mongoose;

// Enum cho người gửi để tránh gõ sai
export const SenderRole = ["user", "admin", "ai"] as const;

const MessageSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    sender: {
      type: String,
      enum: SenderRole,
      required: true,
    },
    text: { type: String },
    images: [{ type: String }],
    isRead: { type: Boolean, default: false, index: true },
    metadata: {
      hotels: [{ type: Schema.Types.Mixed }], // Lưu mảng khách sạn
      bookingLink: { type: String },
      userName: { type: String },
    },
  },
  { timestamps: true } // Tự động có createdAt, updatedAt
);
export type MessageSchemaType = InferSchemaType<typeof MessageSchema>;
export const Message =
  mongoose.models.Message || model<MessageSchemaType>("Message", MessageSchema);
