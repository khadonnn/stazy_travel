// File: app/hotels/page.tsx (Server Component)

import StayPage from "@/pages/StayPage";
import { Suspense } from "react";

const HotelsPage = async () => {
  return (
    <Suspense fallback={<div>Đang tải bộ lọc...</div>}>
      <StayPage />
    </Suspense>
  );
};

export default HotelsPage;
