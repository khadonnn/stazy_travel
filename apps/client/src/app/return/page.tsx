"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";

export default function ReturnPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [customerEmail, setCustomerEmail] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    // Gọi Backend để kiểm tra trạng thái Session
    fetch(`${process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL}/sessions/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "complete" || data.paymentStatus === "paid") {
          setStatus("success");
          setCustomerEmail(data.customer_email);
        } else {
          setStatus("error");
        }
      })
      .catch((err) => {
        console.error("Error fetching session:", err);
        setStatus("error");
      });
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Đang xác thực thanh toán...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 ">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100 z-[99]">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h1>
          <p className="text-gray-600 mb-6">
            Cảm ơn bạn đã đặt phòng. Hóa đơn điện tử đã được gửi tới: <br />
            <span className="font-semibold text-gray-800">{customerEmail}</span>
          </p>
          
          <div className="space-y-3">
            <Link 
              href="/my-bookings" 
              className="block w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              Xem lịch sử đặt phòng <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/" 
              className="block w-full text-gray-600 font-medium py-3 hover:bg-gray-50 rounded-lg transition"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thất bại</h1>
        <p className="text-gray-600 mb-6">
          Rất tiếc, chúng tôi không thể xác thực giao dịch này hoặc đã xảy ra lỗi.
        </p>
        <Link 
          href="/cart" 
          className="block w-full bg-gray-900 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-800 transition"
        >
          Quay lại giỏ hàng
        </Link>
      </div>
    </div>
  );
}