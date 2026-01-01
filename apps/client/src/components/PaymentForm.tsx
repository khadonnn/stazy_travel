"use client";

import React from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { paymentFormSchema, PaymentMethod } from "@/types/cart";
import type { PaymentFormInputs, FullPaymentData } from "@/types/payment";
import { useCartStore } from "@/store/useCartStore";
import { useBookingStore } from "@/store/useBookingStore";
import z from "zod";

const MOCK_PAYMENT_DATA: PaymentFormInputs = {
  cardHolder: "MOCK USER",
  cardNumber: "4111 1111 1111 1111",
  expirationDate: "12/28",
  cvv: "123",
  paymentMethod: PaymentMethod.CreditCard,
};

const paymentLogos = [
  { src: "/visa.svg", alt: PaymentMethod.CreditCard, label: "Thẻ tín dụng" },
  { src: "/momo.svg", alt: PaymentMethod.MOMO, label: "MOMO" },
  { src: "/vnpay.svg", alt: PaymentMethod.VNPAY, label: "VNPAY" },
  { src: "/stripe.svg", alt: PaymentMethod.STRIPE, label: "Stripe" },
  { src: "/zalo.svg", alt: PaymentMethod.ZaloPay, label: "ZaloPay" },
];

interface PaymentFormProps {
  onMethodSelect?: (method: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onMethodSelect }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isSignedIn, isLoaded } = useUser();

  const { setPaymentData, items, clearCart } = useCartStore();
  const { checkInDate, checkOutDate, bookingDetails } = useBookingStore();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    getValues, // 🔥 1. Thêm cái này để lấy dữ liệu mà không cần validate
    formState: { errors },
  } = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema as any),
    defaultValues: MOCK_PAYMENT_DATA,
  });

  // Theo dõi phương thức đang chọn
  const selectedMethod = useWatch({
    control,
    name: "paymentMethod",
    defaultValue: PaymentMethod.CreditCard,
  });

  // 🔥 2. Hàm xử lý riêng cho nút bấm (Bypass Validation khi chọn Stripe)
  const handleButtonClick = (e: React.MouseEvent) => {
    const currentMethod = getValues("paymentMethod");

    // Nếu là Stripe -> Chặn submit form mặc định -> Chuyển trang thủ công
    if (currentMethod === PaymentMethod.STRIPE) {
      e.preventDefault(); // Ngăn validation của Zod chạy

      // Lưu tạm method vào store (dù thiếu thông tin thẻ cũng không sao vì Stripe không cần)
      setPaymentData({
        ...MOCK_PAYMENT_DATA, // Merge mock data để TS không báo lỗi thiếu trường
        paymentMethod: PaymentMethod.STRIPE,
      });

      // Ưu tiên dùng Callback nếu có (để CartPage xử lý state)
      if (onMethodSelect) {
        onMethodSelect(PaymentMethod.STRIPE);
      } else {
        // Fallback: Chuyển trang bằng router
        router.push(`${pathname}?step=4`);
      }
    }
    // Nếu KHÔNG phải Stripe -> Để yên cho form submit tự nhiên (để nó Validate thẻ)
  };

  const handlePaymentForm: SubmitHandler<PaymentFormInputs> = async (data) => {
    // Hàm này chỉ chạy khi Validation thành công (Dành cho Thẻ tín dụng, Momo...)

    setPaymentData(data);

    // Logic cũ xử lý thanh toán Credit Card / Momo...
    if (!isLoaded) return;
    if (!isSignedIn) {
      toast.error("Vui lòng đăng nhập!");
      return;
    }

    if (!bookingDetails) {
      toast.error("Thiếu thông tin khách hàng.");
      return;
    }

    // ... (Giữ nguyên logic gọi API thanh toán Credit Card cũ của bạn) ...
    // ...
    toast.success("Đang xử lý thanh toán thẻ...");
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={handleSubmit(handlePaymentForm)}
    >
      <div className="flex flex-col gap-3">
        <label className="text-md text-gray-500 font-medium">
          Phương thức thanh toán
        </label>
        <Select
          onValueChange={(value) => setValue("paymentMethod", value as any)}
          defaultValue={PaymentMethod.CreditCard}
        >
          <SelectTrigger className="border-b border-gray-300 bg-transparent">
            <SelectValue placeholder="Chọn phương thức" />
          </SelectTrigger>
          <SelectContent>
            {paymentLogos.map((logo) => (
              <SelectItem key={logo.alt} value={logo.alt}>
                <div className="flex items-center gap-2">
                  <Image
                    src={logo.src}
                    alt={logo.label}
                    width={30}
                    height={15}
                    style={{ width: "30px", height: "auto" }}
                  />
                  <span>{logo.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chỉ hiện form thẻ khi chọn Credit Card */}
      {selectedMethod === PaymentMethod.CreditCard && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col gap-1">
            <label className="text-md text-gray-500 font-medium">
              Họ và tên trên thẻ
            </label>
            <input
              {...register("cardHolder")}
              placeholder="Nhập họ và tên"
              className="bg-transparent border-b border-gray-300 py-2 outline-none text-md"
            />
            {errors.cardHolder && (
              <p className="text-xs text-red-500">
                {errors.cardHolder.message}
              </p>
            )}
          </div>
          {/* ... Các ô input khác của thẻ giữ nguyên ... */}
          <div className="flex flex-col gap-1">
            <label className="text-md text-gray-500 font-medium">Số thẻ</label>
            <input
              {...register("cardNumber")}
              className="bg-transparent border-b border-gray-300 py-2 outline-none text-md"
              placeholder="1234..."
            />
            {errors.cardNumber && (
              <p className="text-xs text-red-500">
                {errors.cardNumber.message}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-md text-gray-500 font-medium">
                Hạn sử dụng
              </label>
              <input
                {...register("expirationDate")}
                className="bg-transparent border-b border-gray-300 py-2 outline-none text-md"
                placeholder="MM/YY"
              />
              {errors.expirationDate && (
                <p className="text-xs text-red-500">
                  {errors.expirationDate.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-md text-gray-500 font-medium">CVV</label>
              <input
                {...register("cvv")}
                className="bg-transparent border-b border-gray-300 py-2 outline-none text-md"
                placeholder="123"
              />
              {errors.cvv && (
                <p className="text-xs text-red-500">{errors.cvv.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Thông báo cho Stripe */}
      {selectedMethod === PaymentMethod.STRIPE && (
        <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm border border-blue-100">
          Bạn sẽ được chuyển đến cổng thanh toán an toàn của Stripe ở bước tiếp
          theo.
        </div>
      )}

      <button
        type="submit"
        onClick={handleButtonClick} // 🔥 3. Gắn hàm xử lý sự kiện vào đây
        className="w-full bg-green-600 hover:bg-green-700 transition-all text-white p-3 rounded-lg flex items-center justify-center gap-2 font-medium cursor-pointer mt-2"
      >
        {selectedMethod === PaymentMethod.STRIPE
          ? "Tiếp tục"
          : "Thanh toán ngay"}
        <ShoppingCart className="w-4 h-4" />
      </button>
    </form>
  );
};

export default PaymentForm;
