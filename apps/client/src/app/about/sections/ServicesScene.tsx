"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import Scene from "@/components/cinematic/Scene";
import { Hotel, Users, Shield, Clock } from "lucide-react";
import { useAbout } from "@/hooks/useAbout";

const iconMap: Record<string, any> = {
  booking: Hotel,
  management: Users,
  security: Shield,
  support: Clock,
};

export default function ServicesScene() {
  const { aboutData } = useAbout();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".service-card");

      // Initial entrance animation
      gsap.fromTo(
        cards,
        { opacity: 0, y: 100, scale: 0.8 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "back.out(1.4)",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 70%",
          },
        },
      );

      // Rhythmic wave animation - each card moves in a wave pattern
      cards.forEach((card, i) => {
        // Floating animation with offset delay for wave effect
        gsap.to(card as HTMLElement, {
          y: -20,
          duration: 2 + i * 0.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.2,
        });

        // Subtle scale pulse
        gsap.to(card as HTMLElement, {
          scale: 1.05,
          duration: 1.5 + i * 0.15,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
          delay: i * 0.25,
        });

        // Rotation rhythm
        gsap.to(card as HTMLElement, {
          rotateZ: Math.sin(i) * 2,
          duration: 3 + i * 0.1,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.3,
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const servicesData = aboutData?.services || {
    title: "Hoạt Động & Dịch Vụ",
    items: [
      {
        id: "booking",
        title: "Đặt Phòng Trực Tuyến",
        description: "Hệ thống đặt phòng thông minh",
      },
      {
        id: "management",
        title: "Quản Lý Khách Hàng",
        description: "CRM toàn diện",
      },
      {
        id: "security",
        title: "Bảo Mật Tuyệt Đối",
        description: "Công nghệ bảo mật tiên tiến",
      },
      {
        id: "support",
        title: "Hỗ Trợ 24/7",
        description: "Luôn sẵn sàng phục vụ",
      },
    ],
  };

  return (
    <Scene className="bg-slate-900 text-white">
      <div ref={containerRef} className="max-w-7xl mx-auto px-6">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-16">
          {servicesData.title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {servicesData.items.map((service: any) => {
            const Icon = iconMap[service.id] || Hotel;
            return (
              <div
                key={service.id}
                className="service-card group bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-[#4fae9b]/50 transition-all duration-500"
              >
                <div className="mb-6 inline-flex p-4 rounded-xl bg-[#4fae9b]/10">
                  <Icon className="w-8 h-8 text-[#4fae9b]" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">{service.title}</h3>
                <p className="text-gray-400">{service.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
}
