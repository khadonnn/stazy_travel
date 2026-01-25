// lib/randomColor.ts

export const hoverColors = [
  // 🔵 Blue family
  "bg-blue-500/10",
  "bg-sky-500/10",
  "bg-cyan-500/10",
  "bg-indigo-500/10",

  // 🟢 Green family
  "bg-emerald-500/10",
  "bg-green-500/10",
  "bg-teal-500/10",
  "bg-lime-500/10",

  // 🟣 Purple / Pink family
  "bg-purple-500/10",
  "bg-violet-500/10",
  "bg-fuchsia-500/10",
  "bg-pink-500/10",
  "bg-rose-500/10",

  // 🟠 Orange / Warm
  "bg-orange-500/10",
  "bg-amber-500/10",
  "bg-yellow-500/10",

  // 🌊 Neutral but modern
  "bg-slate-500/10",
  "bg-zinc-500/10",
  "bg-stone-500/10",
  // 🖤 Professional dark / neutral
  "bg-black/5",
  "bg-black/8",
  "bg-black/10",

  "bg-neutral-900/5",
  "bg-neutral-900/8",

  "bg-zinc-900/5",
  "bg-zinc-900/8",

  "bg-slate-900/5",
  "bg-slate-900/8",

  "bg-stone-900/5",

  // 🔘 Border-like soft gray
  "bg-gray-500/5",
  "bg-gray-500/8",
];

export const getRandomHoverColor = (): string => {
  return (
    hoverColors[Math.floor(Math.random() * hoverColors.length)] ??
    "bg-slate-500/10"
  );
};

// 🎨 Border colors (HEX format for inline styles)
export const borderColors = [
  "#3b82f6", // blue-500
  "#0ea5e9", // sky-500
  "#06b6d4", // cyan-500
  "#6366f1", // indigo-500
  "#10b981", // emerald-500
  "#22c55e", // green-500
  "#14b8a6", // teal-500
  "#84cc16", // lime-500
  "#a855f7", // purple-500
  "#8b5cf6", // violet-500
  "#d946ef", // fuchsia-500
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#eab308", // yellow-500
  "#64748b", // slate-500
  "#71717a", // zinc-500
  "#78716c", // stone-500
];

export const getRandomBorderColor = (): string => {
  return (
    borderColors[Math.floor(Math.random() * borderColors.length)] ?? "#64748b"
  );
};
