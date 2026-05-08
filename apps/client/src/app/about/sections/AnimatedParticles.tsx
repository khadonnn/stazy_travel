"use client";

import { useEffect, useMemo, useState } from "react";
import Particles from "@tsparticles/react";

export default function AnimatedParticles() {
  const [mounted, setMounted] = useState(false);
  const [ParticlesComponent, setParticlesComponent] = useState<
    typeof Particles | null
  >(null);

  useEffect(() => {
    const init = async () => {
      const { initParticlesEngine } = await import("@tsparticles/react");
      const { loadSlim } = await import("@tsparticles/slim");

      await initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      });

      setParticlesComponent(() => Particles);
      setMounted(true);
    };

    // Delay for smooth page load
    const timer = setTimeout(() => {
      init();
    }, 300);

    return () => clearTimeout(timer);
  }, []);
  const options = useMemo(
    () => ({
      fullScreen: false as const,
      fpsLimit: 60,

      particles: {
        number: {
          value: 45,
          density: {
            enable: true,
            area: 1200,
          },
        },

        color: {
          value: ["#ffffff", "#d4d4d8", "#e4e4e7"],
        },

        opacity: {
          value: { min: 0.12, max: 0.28 },
          animation: {
            enable: true,
            speed: 0.25,
            minimumValue: 0.08,
            sync: false,
          },
        },

        size: {
          value: { min: 1, max: 2.4 },
        },

        links: {
          enable: true,
          distance: 140,
          color: "#ffffff",
          opacity: 0.08,
          width: 0.7,
        },

        move: {
          enable: true,
          speed: 0.25,
          direction: "none" as const,
          random: true,
          straight: false,
          outModes: {
            default: "out" as const,
          },
        },
      },

      interactivity: {
        events: {
          onHover: {
            enable: false,
          },
          resize: {
            enable: true,
          },
        },
      },

      detectRetina: true,

      background: {
        color: "transparent",
      },
    }),
    [],
  );

  if (!mounted || !ParticlesComponent) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      style={{ opacity: 0, animation: "particleFadeIn 1.5s ease forwards" }}
    >
      <style>{`
        @keyframes particleFadeIn {
          to { opacity: 1; }
        }
      `}</style>
      <ParticlesComponent
        id="about-particles"
        options={options}
        className="h-full w-full"
      />
    </div>
  );
}
