

## Landing Page UI Quality Overhaul

### Files to modify
- `src/pages/LandingPage.tsx`
- `src/components/NeuralLogo.tsx`
- `src/index.css`

### Changes

**1. Remove the floating blue mic button** (lines 216-223 in LandingPage.tsx)
- Delete the entire "Floating Chat Button" block -- it duplicates the yellow Voice Demo button in the card and competes visually with it
- The Voice Demo button in the card already opens the chat modal

**2. Refine the glass card container**
- Remove the `animate-pulse` from the glow background (line 109) -- replace with a static, subtle glow that intensifies on hover
- Remove the `animate-shimmer-diagonal` overlay (line 116) -- visual noise
- Keep only the clean `from-white/5` reflection

**3. Simplify typography**
- Title: reduce from `text-6xl` to `text-5xl`, remove `animate-text-flash` (the constant shimmer is distracting), use a clean static gradient instead
- Remove `text-outline` from tagline, badge, and compliance footer -- rely on backdrop contrast
- Improve description text weight and spacing

**4. Clean up buttons**
- Student Login: remove `animate-gradient-x` from background, use a solid gradient; remove the shine sweep overlay; keep the hover scale and glow
- Parent Login: simplify hover states, remove the aggressive color shift to rose
- Reduce Student Login height from 68px to 60px for better proportion

**5. Polish Dev Panel**
- Wrap the dropdown in framer-motion `AnimatePresence` + `motion.div` for smooth open/close
- Make trigger button more discreet (lower opacity by default)

**6. Fix NeuralLogo SVG ID collisions**
- Prefix gradient IDs with `neural-` (`neural-cyan-gradient`, `neural-vibrant-gradient`)
- Slow spin animations: 4s→6s inner, 8s→12s outer
- Reduce core glow intensity

**7. Add staggered entrance animations**
- Wrap card content sections in framer-motion `motion.div` with staggered `y:10→0, opacity:0→1` (80ms stagger delay per element)

**8. CSS cleanup** (`index.css`)
- Remove `animate-shimmer-diagonal` keyframe and utility (no longer used)
- Keep `animate-text-flash` but it won't be used on the landing page anymore

### Technical details

The framer-motion library is already installed. Entrance animations will use a simple pattern:
```tsx
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
```

The blue floating mic button (lines 216-223) is removed only from LandingPage -- it likely exists in other pages via a shared layout or component, so those remain untouched.

