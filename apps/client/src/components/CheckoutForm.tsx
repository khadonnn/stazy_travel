"use client";

import React from "react";
import { EmbeddedCheckout } from "@stripe/react-stripe-js";

const CheckoutForm = () => {
  // Stripe Embedded Checkout đã có sẵn Loading UI (Skeleton) bên trong
  // nên ta không cần tự handle state loading thủ công nữa để tránh lỗi TypeScript.

  return (
    <div className="w-full bg-white rounded-lg">
      <EmbeddedCheckout className="w-full min-h-[400px]" />
    </div>
  );
};

export default CheckoutForm;