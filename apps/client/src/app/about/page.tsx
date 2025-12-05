import AboutPageContent from "@/pages/AboutPageContent";
import { useAbout } from "@/hooks/useAbout"; // Import hook Zustand
import { useEffect } from "react";

const AboutPage = () => {
  // Lấy hàm loadData từ store
  const { loadData } = useAbout();

  // Kích hoạt việc tải dữ liệu khi component được mount (Client-side)
  // Logic tải LocalStorage/JSON nằm trong loadData của Zustand Store
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Không cần kiểm tra isLoading ở đây vì AboutPageContent đã xử lý loading
  return (
    <div>
      <AboutPageContent />
    </div>
  );
};
export default AboutPage;