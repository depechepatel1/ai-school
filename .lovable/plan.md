

## Plan: Improve Visualizer Graphics

Upgrade the visual quality of both the target (cyan) and live (green) canvas lines with richer rendering effects.

### Changes to `PronunciationVisualizer.tsx`

**Target contour line (cyan):**
- Increase line width from 3 to 4px
- Add gradient fill beneath the contour line (cyan to transparent) for a "filled area" effect
- Increase glow blur from 10 to 18px
- Add subtle animated pulse on the progress dot (radius oscillation + outer glow ring)
- Draw faint grid lines (horizontal at 25%, 50%, 75%) for depth

**Live input line (green):**
- Increase line width from 3 to 4px
- Increase glow blur from 8 to 16px
- Add a trailing fade effect: older segments become progressively more transparent
- Draw a pulsing dot at the current head of the line
- Add a subtle gradient fill beneath the live line (green to transparent)
- Mismatch segments: increase red glow intensity and add a brief "flash" effect

**Shared improvements:**
- Replace flat midline with a subtle dashed line
- Add a very faint radial gradient background vignette on each canvas for depth
- Smoother bezier curves using cubic bezier instead of quadratic for both lines

### Technical details

Trailing fade on live line:
```
opacity = Math.max(0.15, 1 - (headIndex - i) / trailLength)
ctx.globalAlpha = opacity
```

Under-line gradient fill:
```
ctx.lineTo(lastX, h)
ctx.lineTo(firstX, h)
ctx.closePath()
fillStyle = linear gradient from lineColor at 0.3 alpha to transparent
```

Head dot pulse:
```
radius = 5 + Math.sin(Date.now() * 0.008) * 2
```

Dashed midline:
```
ctx.setLineDash([8, 12])
ctx.strokeStyle = "rgba(255,255,255,0.06)"
```

