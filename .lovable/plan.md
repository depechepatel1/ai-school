

# IELTS Speaking Studio — Implementation Plan

## Overview
A full-stack AI-powered English language learning app with role-based access, AI chat tutoring via DeepSeek, Edge-optimized voice synthesis, and a visual avatar system. Dark premium design with orange accents matching the uploaded reference.

---

## Phase 1: Design System & Layout Foundation

- Set up the dark premium theme: background `#050505`, orange accent colors, Outfit font family
- Custom scrollbar styling, smooth animations (fade-in, slide-in)
- Responsive layout optimized for iPad (Edge browser) and desktop
- Reusable UI components: glass-morphism cards, gradient buttons, animated transitions

---

## Phase 2: Authentication & Role-Based Access Control (RBAC)

### Database Setup (Supabase)
- **Profiles table**: stores display name, avatar URL, linked to `auth.users`
- **User roles table**: stores roles (`student`, `teacher`, `parent`) per user — separate from profiles for security
- **Classes table**: teacher-created classes with unique join codes
- **Class memberships table**: links students to classes
- **Parent-student links table**: parents linked to specific students
- Row-Level Security (RLS) policies on all tables

### Auth Flow
- Self-registration page where users sign up and select their role (student, teacher, or parent)
- Login page with email/password
- Password reset flow with dedicated reset page
- Role-based routing after login:
  - **Students** → Student Practice interface
  - **Teachers** → Teacher Dashboard
  - **Parents** → Parent Dashboard
- Protected routes that redirect unauthorized users to login

---

## Phase 3: Teacher Dashboard (Placeholder)

- Clean layout with sidebar navigation
- **Class Management**: Create classes with auto-generated join codes, view class rosters
- Placeholder sections for: student analytics, conversation review, progress tracking
- Ability to share class join codes with students

---

## Phase 4: Parent Dashboard (Placeholder)

- Simple layout showing linked student(s)
- Link to a student using a code or student email
- Placeholder sections for: child's progress overview, recent activity, practice reports

---

## Phase 5: Student Practice Interface — The Core Chat App

### Chat UI
- Full-screen dark interface with the looping background video behind a semi-transparent chat overlay
- Message bubbles for student and AI tutor messages
- Markdown rendering for AI responses
- Chat history sidebar showing past conversations (loaded from Supabase)
- Auto-scroll to latest message

### AI Chat Engine (DeepSeek API)
- Supabase Edge Function that proxies requests to `https://api.deepseek.com/v1/chat/completions`
- Uses `DEEPSEEK_API_KEY` from Supabase secrets (not hardcoded)
- System prompt: friendly, patient, encouraging English tutor keeping responses concise
- Streaming responses for real-time feel
- All conversations persisted to Supabase with timestamps

### Chat Persistence
- **Conversations table**: stores conversation metadata per student
- **Messages table**: stores each message (role, content, timestamp) linked to conversations
- Students can browse and continue past conversations

---

## Phase 6: Voice System (Edge-Optimized)

### Text-to-Speech (TTS)
- Custom utility that filters `speechSynthesis.getVoices()` for Edge's high-quality voices
- Priority: voices with "Natural" in the name, matching `en-GB` or `en-US`
- Graceful fallback to default UK/US English voices if Edge Natural voices aren't available
- AI responses automatically spoken aloud (with toggle to mute)

### Speech-to-Text (STT)
- Prominent **Push-to-Talk** button in the chat input area
- Uses `webkitSpeechRecognition` / `SpeechRecognition` API
- Visual feedback while recording (pulsing animation)
- Transcribed text populates the chat input for student review before sending

---

## Phase 7: Visual Avatar System

### Active State (`USE_LIVE2D = false` — default)
- HTML5 `<video>` element as the visual background
- Set to `autoPlay`, `loop`, `muted`, `playsInline` for iPad compatibility
- Placeholder video URL (you'll swap in your real 20-second loop later)
- Positioned behind the chat overlay at lowest z-index

### Dormant State (`USE_LIVE2D = true` — built but hidden)
- `<Live2DAvatar />` component using `pixi.js` v7 and `pixi-live2d-display`
- Cubism Core script loaded in `index.html` head
- Loads a test Live2D model, centered head-and-shoulders
- Audio-driven lip-sync logic ready: `AudioContext` → `AnalyserNode` → maps volume to `ParamMouthOpenY`
- Idle breathing animations when no audio playing
- Hidden behind feature flag, ready for your developer to activate with real model + Aliyun speech

---

## Phase 8: Class Code Join Flow

- When students sign up or from their settings, they can enter a class join code
- Validates the code against the classes table
- Adds the student to the class membership
- Teachers see updated roster in their dashboard

---

## Pages Summary

| Page | Access | Description |
|------|--------|-------------|
| `/login` | Public | Login with email/password |
| `/signup` | Public | Register and choose role |
| `/reset-password` | Public | Password reset form |
| `/student` | Students | Main practice chat interface |
| `/teacher` | Teachers | Dashboard with class management |
| `/parent` | Parents | Dashboard with child overview |

