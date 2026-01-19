"use client";

import { useEffect, useRef } from "react";
import Image from "next/image"; // ✅ Import Next.js Image
import { gsap } from "@/lib/gsap";
import { useAbout } from "@/hooks/useAbout";
import { CometCard } from "@/components/ui/comet-card";

export default function TeamScene() {
  const { aboutData } = useAbout();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".team-comet-card");

      gsap.fromTo(
        cards,
        { opacity: 0, y: 60, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 70%",
          },
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const teamData = aboutData?.team || {
    title: "Đội Ngũ Của Chúng Tôi",
    subtitle: "Những người tạo nên Stazy",
    members: [
      {
        id: 1,
        name: "Nguyễn Đình Đông Kha",
        role: "MSSV: 24210137",
        description:
          "Chuyên gia trong lĩnh vực khách sạn với hơn 15 năm kinh nghiệm",
        avatar: "/khadon.jpg",
        skills: ["Leadership", "Backend Development", "Project Management"],
      },
      {
        id: 2,
        name: "Nguyễn Đình Đông Kha",
        role: "MSSV: 24210137",
        description: "Kỹ sư phần mềm senior với chuyên môn về hệ thống quản lý",
        avatar: "/khadon.jpg",
        skills: ["Full-stack Development", "Backend Development", "DevOps"],
      },
      {
        id: 3,
        name: "Nguyễn Đình Đông Kha",
        role: "MSSV: 24210137",
        description: "Chuyên gia vận hành với kinh nghiệm sâu rộng",
        avatar: "/khadon.jpg",
        skills: [
          "Frontend Dev",
          "Full-stack Development",
          "Process Optimization",
        ],
      },
      {
        id: 4,
        name: "Nguyễn Đình Đông Kha",
        role: "MSSV: 24210137",
        description:
          "Chuyên gia marketing số với niềm đam mê tạo ra chiến dịch sáng tạo",
        avatar: "/khadon.jpg",
        skills: ["Backend Developer", "Document Writer", "Report Writer"],
      },
      {
        id: 5,
        name: "Nguyễn Đình Đông Kha",
        role: "MSSV: 24210137",
        description: "Chuyên gia trải nghiệm khách hàng",
        avatar: "/khadon.jpg",
        skills: ["Backend Developer", "Tech Writer", "Customer Experience"],
      },
    ],
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-slate-950 text-white py-32 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950 opacity-80" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-7xl font-bold mb-4">
            {teamData.title}
          </h2>
          <p className="text-xl text-gray-400">{teamData.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 justify-items-center">
          {teamData.members.map((member: any) => (
            <div key={member.id} className="team-comet-card group">
              <CometCard>
                <div
                  // ✅ FIX RUNG:
                  // 1. transform-gpu: Ép dùng GPU
                  // 2. subpixel-antialiased: Khử răng cưa chữ
                  // 3. transition-all duration-500: Làm mượt mọi chuyển động
                  className="flex w-full max-w-[380px] cursor-pointer flex-col items-stretch rounded-2xl border-0 bg-slate-900/80 backdrop-blur-sm p-3 md:p-4 
                             hover:bg-slate-800 transition-all duration-500 ease-out transform-gpu subpixel-antialiased"
                >
                  {/* Avatar Section */}
                  <div className="mx-2 flex-1">
                    <div className="relative mt-2 aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-800">
                      {member.avatar ? (
                        // ✅ Dùng Next Image thay cho img thường
                        <Image
                          src={member.avatar || "/khadon.jpg"}
                          alt={member.name}
                          unoptimized
                          fill // Tự động điền đầy khung cha
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          // group-hover:scale-105: Phóng to nhẹ nhàng khi hover, duration dài (700ms) để không bị giật
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#4fae9b] to-teal-700">
                          <span className="text-6xl font-bold text-white">
                            {member.name?.charAt(0) || "S"}
                          </span>
                        </div>
                      )}

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-80" />
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="mt-3 flex-shrink-0 p-4 space-y-3 relative z-10">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        {member.name}
                      </h3>
                      <p className="text-sm text-[#4fae9b] opacity-90 font-mono">
                        {member.role}
                      </p>
                    </div>

                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">
                      {member.description}
                    </p>

                    {member.skills && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {member.skills
                          .slice(0, 3)
                          .map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded-md bg-[#4fae9b]/10 text-[#4fae9b] text-xs font-medium border border-[#4fae9b]/20"
                            >
                              {skill}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </CometCard>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-sm text-gray-500">
            Hover over cards to see the interactive comet effect ✨
          </p>
        </div>
      </div>
    </div>
  );
}
