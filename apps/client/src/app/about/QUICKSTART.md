# 🚀 Quick Start - About Page

## Start Development Server

```bash
cd apps/client
pnpm dev
```

Navigate to: `http://localhost:3002/about`

## What You'll See

### 📱 **7 Cinematic Scenes** scrolling vertically:

1. **Hero** - Camera dolly-in with wave background
2. **Story** - Floating nature icons with travel narrative
3. **Mission** - Expanding space effect (pinned scroll)
4. **Services** - 3D floating cards with wave path
5. **Values** - 3D rotation reveals with wave connector
6. **Team** - Vertical timeline with alternating cards
7. **Final** - Epic CTA with sparkles and waves

### 🎨 **Visual Elements**

- ✅ Teal (#4fae9b) accent color throughout
- ✅ Animated wave paths (SVG morphing)
- ✅ 3D transforms (rotateX, rotateY, translateZ)
- ✅ Travel/nature icons (Palmtree, Mountain, Waves, Compass)
- ✅ Smooth scroll with GSAP ScrollTrigger
- ✅ Vietnamese content from \_\_aboutData.json

## Customization Quick Tips

### Change Colors

Find and replace `#4fae9b` in all scene files.

### Edit Content

Update: `apps/client/src/data/jsons/__aboutData.json`

### Adjust Speed

Modify `duration` in GSAP animations:

```tsx
gsap.to(element, {
  duration: 2, // Change this value
  ...
});
```

### Add/Remove Scenes

Edit: `apps/client/src/app/about/page.tsx`

## Performance Tips

- All animations use GPU acceleration
- ScrollTrigger optimizes render calls
- `will-change` CSS properties are set
- Cleanup on component unmount

## Troubleshooting

**Scenes not animating?**

- Check browser console for GSAP errors
- Ensure ScrollTrigger is registered

**Jerky scrolling?**

- Verify `about.css` is imported
- Check hardware acceleration in browser

**Data not loading?**

- Verify `__aboutData.json` path
- Check `useAbout()` hook in store

## File Locations

```
apps/client/src/
├── app/about/
│   ├── page.tsx           ← Main page
│   ├── layout.tsx         ← Adds .about-page class
│   ├── about.css          ← Smooth scroll styles
│   └── sections/          ← All 7 scenes
├── components/cinematic/
│   ├── Scene.tsx          ← Reusable scene wrapper
│   └── AboutPreloader.tsx ← Loading screen
├── hooks/
│   └── useAbout.ts        ← Data hook
└── data/jsons/
    └── __aboutData.json   ← Content source
```

## Next Steps

1. ✨ Customize content in `__aboutData.json`
2. 🎨 Adjust colors to match your brand
3. 📸 Add real team photos
4. 🚀 Deploy and share!

---

**Enjoy the cinematic experience!** 🎬
