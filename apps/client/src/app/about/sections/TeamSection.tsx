"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { Briefcase, Linkedin, Github } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const team = [
  {
    id: 1,
    name: "Nguyễn Đình Đông Kha",
    role: "MSSV: 24210137",
    description:
      "Chuyên gia trong lĩnh vực khách sạn có nhiều năm kinh nghiệm quản lý và phát triển thương hiệu.",
    avatar: "/khadon.jpg",
    linkedin: "https://linkedin.com/in/nguyendinhdongkha",
    github: "",
    skills: ["Leadership", "Backend ", "Project Management"],
  },
  {
    id: 2,
    name: "Nguyễn Đình Đông Kha",
    role: "MSSV: 24210137",
    description:
      "Kỹ sư phần mềm senior với chuyên môn về hệ thống quản lý khách sạn và công nghệ số.",
    avatar: "/khadon.jpg",
    linkedin: "https://linkedin.com/in/nguyendinhdongkha",
    github: "",
    skills: ["Full-stack", "Database ", "DevOps"],
  },
  {
    id: 3,
    name: "Nguyễn Đình Đông Kha",
    role: "MSSV: 24210137",
    description:
      "Chuyên gia vận hành với kinh nghiệm sâu rộng trong việc tối ưu hóa quy trình và dịch vụ khách hàng.",
    avatar: "/khadon.jpg",
    linkedin: "https://linkedin.com/in/nguyendinhdongkha",
    github: "",
    skills: ["Frontend Dev", "Full-stack ", "Process Optimization"],
  },
  {
    id: 4,
    name: "Nguyễn Đình Đông Kha",
    role: "MSSV: 24210137",
    description:
      "Chuyên gia marketing số với niềm đam mê tạo ra những chiến dịch sáng tạo và hiệu quả.",
    avatar: "/khadon.jpg",
    linkedin: "https://linkedin.com/in/nguyendinhdongkha",
    github: "",
    skills: ["UI design", "Document Writer", "Report Writer"],
  },
  {
    id: 5,
    name: "Nguyễn Đình Đông Kha",
    role: "MSSV: 24210137",
    description:
      "Chuyên gia trải nghiệm khách hàng với sứ mệnh mang lại sự hài lòng tuyệt đối cho mọi khách hàng.",
    avatar: "/khadon.jpg",
    linkedin: "https://linkedin.com/in/nguyendinhdongkha",
    github: "",
    skills: ["UX design", "Tech Writer", "Customer Experience"],
  },
];

const milestones = [
  {
    year: "Tháng 1",
    title: "Khởi tạo & Thiết kế kiến trúc",
    description:
      "Lên ý tưởng, thiết kế giao diện (UI/UX), xây dựng schema cơ sở dữ liệu và phác thảo kiến trúc Microservices.",
  },
  {
    year: "Tháng 2",
    title: "Phát triển Core Booking",
    description:
      "Xây dựng các service nền tảng, hệ thống xác thực và hoàn thiện luồng đặt phòng cốt lõi của Stazy.",
  },
  {
    year: "Tháng 3",
    title: "Tích hợp Hybrid Recommendation",
    description:
      "Nghiên cứu và triển khai mô hình gợi ý lai (Hybrid model) nhằm phân tích hành vi và cá nhân hóa trải nghiệm người dùng.",
  },
  {
    year: "Tháng 4",
    title: "Tích hợp hệ thống & Kiểm thử",
    description:
      "Kết nối frontend với các microservices, xử lý lỗi (bug fixing) và tối ưu hóa hiệu suất toàn hệ thống.",
  },
  {
    year: "Tháng 5",
    title: "Hoàn thiện Hotel Booking AI",
    description:
      "Đóng gói MVP, hoàn thiện quyển báo cáo đồ án và chuẩn bị slide tài liệu để bảo vệ trước hội đồng.",
  },
];

export default function TeamSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (timelineRef.current) {
        gsap.fromTo(
          timelineRef.current.querySelector(".timeline-line"),
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: timelineRef.current,
              start: "top 80%",
              end: "bottom 60%",
              scrub: 0.3,
            },
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 md:py-40">
      <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-20">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
        >
          <span className="text-xs font-medium tracking-widest text-zinc-500 uppercase">
            Đội ngũ của chúng tôi
          </span>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Những con người
            <br />
            <span className="text-zinc-500">đằng sau nền tảng.</span>
          </h2>
        </motion.div>

        {/* Team grid — 5 members, responsive layout */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease, delay: 0.1 + i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all duration-500 hover:-translate-y-[2px] hover:border-white/[0.1] hover:bg-white/[0.04]"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Avatar */}
                <div className="relative h-48 w-full shrink-0 overflow-hidden sm:h-auto sm:w-40">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-950/40 sm:bg-gradient-to-r sm:from-transparent sm:to-zinc-950/20" />
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[15px] font-medium text-zinc-200">
                    {member.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3 text-zinc-600" />
                    <span className="text-xs text-zinc-500">{member.role}</span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                    {member.description}
                  </p>

                  {/* Skills tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {member.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-block rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors duration-300 group-hover:border-white/[0.12] group-hover:text-zinc-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Social links */}
                  <div className="mt-auto flex items-center gap-3 pt-4">
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-zinc-500 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-zinc-300"
                        aria-label={`${member.name} LinkedIn`}
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {member.github && (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-zinc-500 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-zinc-300"
                        aria-label={`${member.name} GitHub`}
                      >
                        <Github className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Timeline / Milestones */}
        <div ref={timelineRef} className="relative mt-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease, delay: 0.2 }}
            className="mb-16"
          >
            <span className="text-xs font-medium tracking-widest text-zinc-500 uppercase">
              Hành trình phát triển
            </span>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Từ ý tưởng đến sản phẩm
            </h3>
          </motion.div>

          <div className="relative pl-8">
            {/* Timeline line */}
            <div className="timeline-line absolute left-0 top-0 h-full w-px origin-top bg-gradient-to-b from-white/10 via-white/[0.06] to-transparent" />

            <div className="space-y-12">
              {milestones.map((milestone, i) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, ease, delay: 0.3 + i * 0.1 }}
                  className="relative"
                >
                  {/* Dot */}
                  <div className="absolute -left-8 top-1 flex h-6 w-6 items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white/20 ring-4 ring-zinc-950" />
                  </div>

                  <div className="flex items-baseline gap-4">
                    <span className="shrink-0 font-mono text-sm text-zinc-600">
                      {milestone.year}
                    </span>
                    <div>
                      <h4 className="text-[15px] font-medium text-zinc-200">
                        {milestone.title}
                      </h4>
                      <p className="mt-1 text-sm text-zinc-500">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
