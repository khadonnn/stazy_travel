"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const storyParagraphs = [
  "Từ một ý tưởng nhỏ năm 2020, trong thời kỳ du lịch gặp nhiều khó khăn...",
  "Chúng tôi nhận ra rằng khách sạn không chỉ là nơi lưu trú.",
  "Đó là nơi tạo nên những kỷ niệm, những trải nghiệm khó quên.",
  "Stazy ra đời với sứ mệnh kết nối công nghệ và trải nghiệm con người.",
];

const journeyTimeline = [
  {
    year: "Q4 2025",
    event: "Khởi tạo ý tưởng",
    description: "Nghiên cứu thị trường đặt phòng và chốt đề tài Stazy Hotel",
  },
  {
    year: "12/2025",
    event: "Thiết kế hệ thống",
    description: "Xây dựng kiến trúc Microservices và cơ sở dữ liệu",
  },
  {
    year: "01/2026",
    event: "Phát triển Core",
    description:
      "Tích hợp AI, hiện thực hóa giao diện Next.js và các dịch vụ Backend",
  },
  {
    year: "Tương lai",
    event: "Mở rộng & Bảo vệ",
    description: "Hoàn thiện báo cáo và bảo vệ đồ án",
  },
];

export default function StoryScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Parallax background (Giữ nguyên - cái này cần mượt theo scroll)
      gsap.to(bgRef.current, {
        yPercent: 30,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1, // Cái này giữ scrub để trôi theo chuột
        },
      });

      // 2. Text Paragraphs - CHỈNH SỬA Ở ĐÂY
      const paragraphs = textRef.current?.children;
      if (paragraphs) {
        Array.from(paragraphs).forEach((para) => {
          gsap.fromTo(
            para,
            { opacity: 0, y: 80, scale: 0.95 }, // Tăng y lên 80 để trồi lên từ sâu hơn
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 1.5, // 🐢 Làm chậm lại (cũ là 1s)
              ease: "power3.out",
              scrollTrigger: {
                trigger: para,
                // 👇 QUAN TRỌNG: Chỉ chạy khi phần tử đã lên tới 65% màn hình (gần giữa)
                // Cũ là 85% (gần đáy) nên nó chạy sớm quá.
                start: "top 65%",
                end: "top 20%",
                toggleActions: "play reverse play reverse",
              },
            },
          );
        });
      }

      // 3. Timeline Animation - CHỈNH SỬA Ở ĐÂY
      const timelineItems = gsap.utils.toArray(".timeline-item");
      timelineItems.forEach((item: any, i) => {
        const line = item.querySelector(".timeline-line");
        const content = item.querySelector(".timeline-content");
        const dot = item.querySelector(".timeline-dot");

        // Line
        gsap.fromTo(
          line,
          { scaleY: 0, opacity: 0 },
          {
            scaleY: 1,
            opacity: 1,
            duration: 1.5, // 🐢 Chậm lại
            ease: "power2.out",
            scrollTrigger: {
              trigger: item,
              start: "top 60%", // 👇 Phải scroll qua giữa màn hình mới vẽ line
              end: "bottom 60%",
              toggleActions: "play reverse play reverse",
            },
          },
        );

        // Content (Card bên phải)
        gsap.fromTo(
          content,
          { opacity: 0, x: 50 },
          {
            opacity: 1,
            x: 0,
            duration: 1.2, // 🐢 Chậm lại
            ease: "back.out(1.5)", // Giảm độ nảy một chút cho đỡ giật
            scrollTrigger: {
              trigger: item,
              start: "top 60%", // 👇 Đồng bộ với line
              end: "bottom top",
              toggleActions: "play reverse play reverse",
            },
          },
        );

        // Dot
        gsap.fromTo(
          dot,
          { scale: 0 },
          {
            scale: 1,
            duration: 0.8,
            ease: "back.out(2)",
            scrollTrigger: {
              trigger: item,
              start: "top 65%", // Dot hiện ra chậm hơn line 1 xíu
              toggleActions: "play reverse play reverse",
            },
          },
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-slate-950 text-white py-32 overflow-hidden"
    >
      {/* Background giữ nguyên */}
      <div
        ref={bgRef}
        className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 opacity-50"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%234fae9b\\" fill-opacity=\\"0.05\\"%3E%3Cpath d=\\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Story Text - Tăng khoảng cách margin bottom để người dùng phải scroll nhiều hơn */}
        <div ref={textRef} className="space-y-32 mb-48">
          <h2 className="text-5xl md:text-6xl font-bold mb-20 text-center text-[#4fae9b]">
            Câu Chuyện Của Chúng Tôi
          </h2>
          {storyParagraphs.map((para, i) => (
            <p
              key={i}
              className="text-2xl md:text-4xl text-gray-300 leading-relaxed max-w-4xl mx-auto text-center font-light"
            >
              {para}
            </p>
          ))}
        </div>

        {/* Timeline giữ nguyên cấu trúc render */}
        <div className="mt-32 max-w-3xl mx-auto">
          <h3 className="text-4xl md:text-5xl font-bold text-center mb-24 text-[#4fae9b]">
            Hành Trình Phát Triển
          </h3>

          <div className="space-y-0 relative">
            <div className="absolute left-[19px] top-4 bottom-0 w-0.5 bg-slate-800 -z-10" />

            {journeyTimeline.map((item, i) => (
              <div
                key={i}
                // Tăng padding-bottom để các item cách xa nhau hơn -> scroll lâu hơn mới tới cái tiếp theo
                className="timeline-item relative flex items-start gap-8 pb-32 last:pb-0"
              >
                <div className="relative flex flex-col items-center h-full">
                  <div className="timeline-dot w-10 h-10 rounded-full bg-[#0f172a] border-2 border-[#4fae9b] flex items-center justify-center shadow-[0_0_15px_rgba(79,174,155,0.4)] z-10">
                    <div className="w-3 h-3 rounded-full bg-[#4fae9b]" />
                  </div>

                  <div
                    className={`timeline-line w-0.5 absolute top-10 bottom-[-20px] bg-[#4fae9b] origin-top ${
                      i === journeyTimeline.length - 1
                        ? "bg-gradient-to-b from-[#4fae9b] to-transparent"
                        : ""
                    }`}
                  />
                </div>

                <div className="timeline-content flex-1 pt-1">
                  <div className="bg-slate-900/80 backdrop-blur-md border border-[#4fae9b]/20 rounded-2xl p-6 hover:border-[#4fae9b]/50 hover:shadow-[0_0_30px_rgba(79,174,155,0.1)] transition-all duration-300 group">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[#4fae9b] text-xl font-bold font-mono">
                        {item.year}
                      </span>
                      <div className="h-px flex-1 bg-[#4fae9b]/20 group-hover:bg-[#4fae9b]/50 transition-colors" />
                    </div>
                    <h4 className="text-2xl font-semibold mb-2 text-white">
                      {item.event}
                    </h4>
                    <p className="text-gray-400 font-light">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
