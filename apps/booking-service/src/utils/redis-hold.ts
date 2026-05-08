import { redisClient } from "./redis";

// =========================================================
// REDIS HOLD UTILITY - GIỮ CHỖ PHÒNG TRONG 10 PHÚT
// =========================================================
// Key format: holds:hotel:{hotelId}:checkIn:{checkIn}:checkOut:{checkOut}
// Value: JSON { userId, userName, createdAt, expiresAt }
// TTL: 600 seconds (10 minutes)
//
// Mục đích:
// - Khi user A bắt đầu đặt phòng → setHold (giữ chỗ 10 phút)
// - Khi user B check availability → getHold (xem có ai đang giữ không)
// - Khi user A hoàn tất đặt phòng → clearHold (xóa giữ chỗ)
// - Khi hold hết hạn (TTL) → Redis tự xóa

const HOLD_TTL_SECONDS = 600; // 10 phút

interface HoldInfo {
  userId: string;
  userName: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Tạo key Redis cho hold reservation
 */
function buildHoldKey(
  hotelId: number,
  checkIn: string | Date,
  checkOut: string | Date,
): string {
  const checkInStr =
    checkIn instanceof Date ? checkIn.toISOString().split("T")[0] : checkIn;
  const checkOutStr =
    checkOut instanceof Date ? checkOut.toISOString().split("T")[0] : checkOut;
  return `holds:hotel:${hotelId}:checkIn:${checkInStr}:checkOut:${checkOutStr}`;
}

/**
 * Đặt hold cho phòng (giữ chỗ 10 phút)
 * - Nếu đã có hold của user khác → throw error
 * - Nếu đã có hold của chính user → gia hạn
 * - Nếu chưa có hold → tạo mới
 */
export async function setHold(
  hotelId: number,
  checkIn: string | Date,
  checkOut: string | Date,
  userId: string,
  userName: string,
): Promise<{ isExisting: boolean; expiresAt: Date }> {
  const key = buildHoldKey(hotelId, checkIn, checkOut);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_TTL_SECONDS * 1000);

  // Kiểm tra hold hiện tại
  const existingHoldRaw = await redisClient.get(key);

  if (existingHoldRaw) {
    const existingHold: HoldInfo = JSON.parse(existingHoldRaw);

    // Nếu hold của chính user → gia hạn
    if (existingHold.userId === userId) {
      const holdData: HoldInfo = {
        userId,
        userName,
        createdAt: existingHold.createdAt,
        expiresAt: expiresAt.toISOString(),
      };
      await redisClient.set(
        key,
        JSON.stringify(holdData),
        "EX",
        HOLD_TTL_SECONDS,
      );
      console.log(`🔄 [Hold] Renewed hold for user ${userId}: ${key}`);
      return { isExisting: true, expiresAt };
    }

    // Nếu hold của user khác → kiểm tra TTL còn bao lâu
    const ttl = await redisClient.ttl(key);
    if (ttl > 0) {
      const holdExpiresAt = new Date(now.getTime() + ttl * 1000);
      throw new RoomHoldError(
        `Phòng đang được giữ chỗ bởi ${existingHold.userName}. Vui lòng thử lại sau ${ttl} giây.`,
        existingHold.userId,
        existingHold.userName,
        holdExpiresAt,
      );
    }
  }

  // Tạo hold mới
  const holdData: HoldInfo = {
    userId,
    userName,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await redisClient.set(key, JSON.stringify(holdData), "EX", HOLD_TTL_SECONDS);
  console.log(
    `🔒 [Hold] Set hold for user ${userId}: ${key} (TTL: ${HOLD_TTL_SECONDS}s)`,
  );

  return { isExisting: false, expiresAt };
}

/**
 * Kiểm tra có ai đang giữ chỗ không (READ-ONLY, không block)
 * Dùng cho /check-availability
 */
export async function getHold(
  hotelId: number,
  checkIn: string | Date,
  checkOut: string | Date,
): Promise<HoldInfo | null> {
  const key = buildHoldKey(hotelId, checkIn, checkOut);
  const holdRaw = await redisClient.get(key);

  if (!holdRaw) {
    return null;
  }

  const hold: HoldInfo = JSON.parse(holdRaw);

  // Lấy TTL chính xác từ Redis
  const ttl = await redisClient.ttl(key);
  if (ttl <= 0) {
    return null; // Hold đã hết hạn
  }

  return {
    ...hold,
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  };
}

/**
 * Xóa hold sau khi đặt phòng thành công
 */
export async function clearHold(
  hotelId: number,
  checkIn: string | Date,
  checkOut: string | Date,
): Promise<void> {
  const key = buildHoldKey(hotelId, checkIn, checkOut);
  const result = await redisClient.del(key);
  console.log(`🔓 [Hold] Cleared hold: ${key} (deleted: ${result})`);
}

/**
 * Custom Error cho Room Hold conflict
 */
export class RoomHoldError extends Error {
  public heldByUserId: string;
  public heldByUserName: string;
  public holdExpiresAt: Date;

  constructor(
    message: string,
    heldByUserId: string,
    heldByUserName: string,
    holdExpiresAt: Date,
  ) {
    super(message);
    this.name = "RoomHoldError";
    this.heldByUserId = heldByUserId;
    this.heldByUserName = heldByUserName;
    this.holdExpiresAt = holdExpiresAt;
  }
}

export { HOLD_TTL_SECONDS };
