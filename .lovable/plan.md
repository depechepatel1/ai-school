

## Plan

### 1. Delete LandingPage
- Delete `src/pages/LandingPage.tsx` — it's unused (not imported in App.tsx)

### 2. Ensure `/signup` is the default entry point
- `src/pages/Index.tsx`: Change the unauthenticated redirect from `/signup` to `/signup` (already correct, no change needed)

### 3. Create a shared language toggle component
- Create `src/components/LanguageToggle.tsx` — a small button/pill that toggles between English and Chinese
- Create `src/lib/i18n.tsx` — a React context + hook (`useLanguage`) that stores the current language (`"en" | "zh"`) in state (persisted to localStorage)
- Contains a translations dictionary for all UI strings across pages

### 4. Add the language toggle to all pages
The toggle will be placed in a consistent position across all pages. For pages inside PageShell, it goes at the top-right of the glass card content area.

**Files to update:**
- `src/components/PageShell.tsx` — wrap children with `LanguageProvider`; optionally place the toggle inside the glass card
- `src/pages/Login.tsx` — replace hardcoded English strings with `t("key")` calls
- `src/pages/Signup.tsx` — same treatment
- `src/pages/ForgotPassword.tsx` — same
- `src/pages/ResetPassword.tsx` — same (also refactor to use PageShell for consistency)
- `src/pages/StudentPractice.tsx` — same
- `src/pages/TeacherDashboard.tsx` — same
- `src/pages/ParentDashboard.tsx` — same

### 5. Translation scope
All user-facing strings will be translated: headers, labels, placeholders, buttons, role names, footer text, empty states, and feature card titles. Legal content (privacy/terms) is already in Chinese and won't be duplicated in English.

### Technical approach
- `useLanguage()` hook returns `{ lang, setLang, t }` where `t(key)` returns the translated string
- The toggle is a small `中/EN` pill button placed consistently in the top-right of each page header
- The `LanguageProvider` wraps the app at the `App.tsx` level so all pages share the same state
- localStorage key: `"app-lang"`

