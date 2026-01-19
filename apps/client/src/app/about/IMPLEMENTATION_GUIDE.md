# 🎬 Cinematic About Page - Implementation Guide

## Overview

A modern, award-winning About page built with **4 cinematic styles** using Next.js 14, TypeScript, GSAP, and Tailwind CSS.

## ✨ The 4 Cinematic Styles

### 1. **Hero Section** - Cinematic Entrance

**Location:** `HeroScene.tsx`

**Features:**

- ✅ Masked text reveal with character-by-character animation
- ✅ 3D floating element with continuous rotation
- ✅ Scroll-reactive rotation based on velocity
- ✅ Smooth entrance overlay fade
- ✅ Teal (#4fae9b) accent glow effects

**Technical Implementation:**

```tsx
// Character splitting for masked reveal
const titleChars = title.split("").map((char, i) => (
  <span className="char" style={{ transformOrigin: "bottom" }}>
    {char}
  </span>
));

// 3D floating element
<div
  style={{
    perspective: "1000px",
    transformStyle: "preserve-3d",
  }}
>
  {/* Rotating element */}
</div>;

// Scroll velocity reaction
ScrollTrigger.create({
  onUpdate: (self) => {
    const velocity = self.getVelocity();
    gsap.to(element, { rotateZ: velocity * 0.01 });
  },
});
```

---

### 2. **Storytelling with Parallax** - Scrollytelling Experience

**Location:** `StoryScene.tsx`

**Features:**

- ✅ Parallax background movement (y-axis translation)
- ✅ Text paragraphs fade in with stagger
- ✅ Timeline with self-drawing line segments
- ✅ Alternating left/right content animation
- ✅ Smooth, immersive scroll experience

**Technical Implementation:**

```tsx
// Parallax background
gsap.to(bgRef.current, {
  yPercent: 30,
  scrollTrigger: {
    trigger: container,
    start: "top bottom",
    end: "bottom top",
    scrub: 1,
  },
});

// Staggered text
gsap.fromTo(
  textElements,
  { opacity: 0, y: 60, scale: 0.95 },
  {
    opacity: 1,
    y: 0,
    scale: 1,
    stagger: 0.5,
  },
);

// Timeline line drawing
gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, origin: "top" });
```

---

### 3. **Horizontal Scroll** - Core Values

**Location:** `ValuesScene.tsx`

**Features:**

- ✅ Pinned container with horizontal scroll
- ✅ Scrub-controlled smooth animation
- ✅ 6 value cards with gradients
- ✅ Responsive: switches to vertical on mobile
- ✅ Hover effects with gradient overlays

**Technical Implementation:**

```tsx
// Horizontal scroll
gsap.to(horizontalContainer, {
  x: -(totalWidth - window.innerWidth),
  scrollTrigger: {
    trigger: container,
    start: "top top",
    end: `+=${totalWidth}`,
    scrub: 1,
    pin: true,
  },
});

// Responsive behavior
const mm = gsap.matchMedia();
mm.add("(min-width: 768px)", () => {
  // Horizontal scroll
});
mm.add("(max-width: 767px)", () => {
  // Vertical stack
});
```

---

### 4. **3D Interactive Team** - Mouse-Reactive Cards

**Location:** `TeamScene.tsx`

**Features:**

- ✅ 3D perspective with `preserve-3d`
- ✅ Mouse-move tilt interaction
- ✅ Staggered entrance with 3D rotation
- ✅ Team member cards with avatar, skills, social links
- ✅ Hover shine effects

**Technical Implementation:**

```tsx
// 3D entrance
gsap.fromTo(
  card,
  {
    opacity: 0,
    y: 100,
    rotateX: -45,
    rotateY: 15
  },
  {
    opacity: 1,
    y: 0,
    rotateX: 0,
    rotateY: 0
  }
);

// Mouse-move tilt
const handleMouseMove = (e: MouseEvent) => {
  const cardX = (e.clientX - rect.left) / rect.width;
  const cardY = (e.clientY - rect.top) / rect.height;

  gsap.to(card, {
    rotateY: cardX * 15,
    rotateX: -cardY * 15,
  });
};

// CSS for 3D
<div style={{
  perspective: "2000px",
  transformStyle: "preserve-3d"
}}>
```

---

## 📦 Components Structure

```
apps/client/src/app/about/
├── page.tsx                    # Main About page
└── sections/
    ├── HeroScene.tsx           # Style 1: Cinematic Hero
    ├── StoryScene.tsx          # Style 2: Storytelling + Parallax
    ├── MissionScene.tsx        # Expanding space animation
    ├── ServicesScene.tsx       # Service cards
    ├── ValuesScene.tsx         # Style 3: Horizontal Scroll
    ├── TeamScene.tsx           # Style 4: 3D Interactive
    └── FinalScene.tsx          # CTA section
```

---

## 🎨 Color Palette

| Element         | Color     | Hex       |
| --------------- | --------- | --------- |
| Primary Accent  | Teal      | `#4fae9b` |
| Background Dark | Slate 950 | `#020617` |
| Background Mid  | Slate 900 | `#0f172a` |
| Text Primary    | White     | `#ffffff` |
| Text Secondary  | Gray 300  | `#d1d5db` |

---

## 🚀 Key GSAP Techniques Used

### ScrollTrigger Features

- ✅ `pin: true` - Pin sections during scroll
- ✅ `scrub: 1` - Smooth scroll-linked animations
- ✅ `start/end` - Precise trigger points
- ✅ `onUpdate` - React to scroll velocity

### 3D Transforms

- ✅ `perspective` - Depth perception
- ✅ `transformStyle: preserve-3d` - 3D children
- ✅ `rotateX/rotateY/rotateZ` - 3D rotations
- ✅ `translateZ` - Depth positioning

### Animation Techniques

- ✅ `stagger` - Sequential reveals
- ✅ `yoyo: true` - Continuous loops
- ✅ `matchMedia` - Responsive animations
- ✅ Timeline sequencing

---

## 📱 Responsive Design

### Desktop (≥768px)

- Horizontal scroll for values
- Full 3D mouse interactions
- Large typography

### Mobile (<768px)

- Vertical stacking
- Touch-optimized
- Reduced motion for performance

---

## ⚡ Performance Optimizations

1. **GPU Acceleration**

   ```css
   transform: translateZ(0);
   will-change: transform, opacity;
   backface-visibility: hidden;
   ```

2. **GSAP Context Cleanup**

   ```tsx
   const ctx = gsap.context(() => {
     // animations
   }, container);
   return () => ctx.revert();
   ```

3. **Lazy Scroll Triggers**
   - Animations only trigger when in viewport
   - `start: "top 70%"` prevents off-screen calculations

---

## 🎯 Data Integration

All content loaded from `__aboutData.json` using `useAbout()` hook:

```tsx
const { aboutData, loadData } = useAbout();

const heroData = aboutData?.heroSection || {
  title: "Default Title",
  description: "Default Description",
};
```

---

## 🛠️ Usage

1. **Run development server:**

   ```bash
   cd apps/client
   pnpm dev
   ```

2. **Navigate to:**

   ```
   http://localhost:3002/about
   ```

3. **Customize content:**
   Edit `apps/client/src/data/jsons/__aboutData.json`

---

## 🎨 Customization Guide

### Change Accent Color

Find and replace `#4fae9b` globally with your brand color.

### Adjust Animation Speed

Modify `duration` values in each scene:

```tsx
gsap.to(element, {
  duration: 2, // Slower
  // or
  duration: 0.5, // Faster
});
```

### Add/Remove Sections

Edit `page.tsx`:

```tsx
<main>
  <HeroScene />
  <YourNewScene />
  <ValuesScene />
</main>
```

---

## 🐛 Troubleshooting

**Q: Animations not triggering?**

- Check ScrollTrigger is registered: `gsap.registerPlugin(ScrollTrigger)`
- Verify start/end positions in console

**Q: 3D effects not working?**

- Ensure `perspective` is set on parent
- Add `transformStyle: "preserve-3d"`

**Q: Performance issues?**

- Reduce `scrub` values
- Limit number of animated elements
- Use `will-change` CSS property

---

## 📚 Resources

- [GSAP ScrollTrigger Docs](https://greensock.com/docs/v3/Plugins/ScrollTrigger)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)

---

**Built with ❤️ for hotel booking platforms**
