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
