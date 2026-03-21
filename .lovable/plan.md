

# Disable HMR to Stop Preview Auto-Refreshing

The Vite dev server's Hot Module Replacement (HMR) causes full-page reloads whenever code changes are saved. Disabling it will keep the preview stable — you'll just need to manually refresh to see new changes.

## Change

**File:** `vite.config.ts`

In the `server` block, set `hmr: false` (currently it's `hmr: { overlay: false }`). This completely disables HMR so the preview won't blank out or reload on its own.

```
server: {
  host: "::",
  port: 8080,
  hmr: false,
},
```

Single property change. No other files affected.

