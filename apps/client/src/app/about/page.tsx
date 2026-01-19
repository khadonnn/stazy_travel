"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import HeroScene from "./sections/HeroScene";
import StoryScene from "./sections/StoryScene";
// import MissionScene from "./sections/MissionScene"; // Hidden - not relevant
import ServicesScene from "./sections/ServicesScene";
import ValuesScene from "./sections/ValuesScene";
import TeamScene from "./sections/TeamScene";
import FinalScene from "./sections/FinalScene";

export default function AboutPage() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    // Force scroll to top on page load/reload
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    // Clear localStorage cache to force reload from JSON file
    // Remove this after confirming data loads correctly
    localStorage.removeItem("hotel-stazy-about-data");
    console.log("🔄 About data cache cleared - loading fresh data from JSON");

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="overflow-x-hidden bg-black">
      <HeroScene />
      <StoryScene />
      {/* <MissionScene /> */}
      <ServicesScene />
      <ValuesScene />
      <TeamScene />
      <FinalScene />

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-30 right-8 z-50 p-4 rounded-full bg-[#4fae9b] text-white shadow-2xl hover:bg-[#3d8a7a] transition-all duration-300 ${
          showScrollTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-16 pointer-events-none"
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-6 h-6" />
      </button>
    </main>
  );
}
