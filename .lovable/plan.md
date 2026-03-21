

# Batch 5: Edge Function Hardening

## What
Targeted input validation and error handling improvements across 8 edge functions. No frontend changes.

## Changes by file

### 1. `admin-manage-users/index.ts`
- Validate `action` is one of the known values (`change_role`, `delete_user`, `list_members`, `remove_member`, `add_member`) before the switch — return 400 for unknown actions early
- Convert `audit()` from fire-and-forget to async/awaited with error logging (still continues on failure)
- Replace `Deno.env.get("...")!` with guarded checks returning 500

### 2. `deepseek-chat/index.ts`
- Add total conversation size check (sum of all message content lengths > 50,000 chars → 400)
- Wrap AI gateway fetch in try-catch, return 502 on network failure
- Already validates LOVABLE_API_KEY without `!` — no change needed there

### 3. `check-video-headers/index.ts`
- Add auth check: extract Authorization header, create Supabase client, call getUser(). Return 401 if no valid user
- Replace `Deno.env.get("SUPABASE_URL")!` with guarded check

### 4. `upload-analysis-video/index.ts`
- Replace hardcoded Cloudinary URL with `Deno.env.get("ANALYSIS_VIDEO_URL")` + validation
- Replace remaining `!` assertions on env vars with guarded checks

### 5. All other admin-gated functions (`upload-video-file`, `upload-videos`, `upload-curriculum`, `import-curriculum`, `create-dev-accounts`)
- Replace `Deno.env.get("...")!` pattern with guarded checks returning 500 `"Server misconfiguration"`

### 6. `punctuate/index.ts`
- Already handles env vars with `?? ""` and has auth — only add guard for empty SUPABASE_URL/ANON_KEY returning 500

## Not changed
- No frontend/React files
- No database migrations
- `supabase/config.toml` unchanged
- Note: `ANALYSIS_VIDEO_URL` secret will need to be added via the secrets tool with the current Cloudinary URL value

## Deployment
All 8 edge functions will be redeployed after changes.

