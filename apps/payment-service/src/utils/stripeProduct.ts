import { StripeProductType } from "@repo/types";
import stripe from "./stripe";

export const createStripeProduct = async (item: StripeProductType) => {
  try {
    const res = await stripe.products.create({
      id: item.id,
      name: item.name,
      description: item.description,
      images: item.images, // 🔥 Quan trọng: Để hiển thị ảnh ở trang thanh toán và lấy lại sau này
      metadata: {          // 🔥 Quan trọng: Lưu thông tin tĩnh của Hotel
        hotelId: item.metadata?.hotelId || "",
        slug: item.metadata?.slug || "",
        address: item.metadata?.address || "",
      },
      default_price_data: {
        currency: "vnd", // Hoặc "vnd"
        unit_amount: item.price * 100, // Stripe tính theo cent/xu
      },
    });
    return res;
  } catch (error) {
    console.log(error);
    throw error; // Nên throw lỗi để controller biết mà xử lý
  }
};

export const getStripeProductPrice = async (productId: number) => {
  try {
    const res = await stripe.prices.list({
      product: productId.toString(),
    });
    return res.data[0]?.unit_amount;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const deleteStripeProduct = async (productId: number) => {
  try {
    const res = await stripe.products.del(productId.toString());
    return res;
  } catch (error) {
    console.log(error);
    return error;
  }
};