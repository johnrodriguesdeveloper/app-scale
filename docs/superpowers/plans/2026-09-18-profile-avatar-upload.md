# Profile Avatar Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user upload a profile photo from `/profile`, and show that photo (instead of an initial) everywhere the app currently displays a member's initial circle.

**Architecture:** Client-side resize (canvas, ≤512px JPEG) → upload to the existing Supabase Storage bucket `avatars` at a per-user fixed path (`<user_id>/avatar.jpg`, always overwritten) → `profiles.avatar_url` updated with a cache-busted public URL → a new shared `MemberAvatar` component (built on the already-present, unused shadcn `Avatar`/`AvatarImage`/`AvatarFallback` primitives in `src/components/ui/avatar.tsx`) renders the photo or falls back to the initial everywhere a member is shown.

**Tech Stack:** Next.js (App Router, client components), `@supabase/supabase-js` storage API, `@tanstack/react-query` mutations, Tailwind, radix-ui `Avatar` primitive (already a dependency, already wrapped in `src/components/ui/avatar.tsx`, not yet used anywhere).

**Spec:** [docs/superpowers/specs/2026-09-18-profile-avatar-upload-design.md](../specs/2026-09-18-profile-avatar-upload-design.md)

## Global Constraints

- Max resized dimension: 512px on the longest side, exported as JPEG quality 0.8 (spec: "Upload — implementação").
- Accepted upload types: `image/jpeg`, `image/png`, `image/webp`; max raw file size 8MB, validated client-side before resizing (spec: "Upload — implementação").
- Storage path is fixed per user (`<user_id>/avatar.jpg`) with `upsert: true` — never generate timestamped filenames (spec: "Estratégia de arquivo").
- The public URL stored in `profiles.avatar_url` must include a `?v=<timestamp>` query param so browsers don't serve a stale cached image after a re-upload (spec: "Estratégia de arquivo").
- This repo has **no automated test runner** (no jest/vitest in `package.json`, only `tsc`, `eslint`, and manual/browser verification are established here — see prior commits in this session). Every task's verification step uses `npx tsc --noEmit`, `npx eslint <file>`, and a manual check (browser or a scratch HTML harness) instead of an automated test suite. Do not add a new test framework as part of this plan.
- Follow existing code style: `"use client"` at the top of client modules, `cn()` from `@/lib/utils` for conditional classNames, Portuguese user-facing strings, hooks under `src/features/<domain>/use*.ts` returning plain objects consumed by page components.

---

### Task 1: Storage bucket policies (Supabase migration)

**Files:**
- Create: `supabase/migrations/20260918_avatar_storage_policies.sql`

**Interfaces:**
- Consumes: nothing (pure SQL against the existing `avatars` bucket, which the user confirmed already exists in the live Supabase project).
- Produces: `storage.objects` policies that Task 4's `uploadAvatarMutation` relies on at runtime (public read, owner-scoped write) — no code-level interface.

- [ ] **Step 1: Write the migration SQL**

```sql
-- The `avatars` bucket already exists (confirmed against the live project).
-- These statements are idempotent: they only change what isn't already
-- configured, so this is safe to run even if some of this was set up
-- manually before.

update storage.buckets
set public = true,
    file_size_limit = 8388608, -- 8MB, matches the client-side check in useProfile.ts
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars'
  and (
    public is distinct from true
    or file_size_limit is distinct from 8388608
    or allowed_mime_types is distinct from array['image/jpeg', 'image/png', 'image/webp']
  );

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Avatar images are publicly accessible'
  ) then
    create policy "Avatar images are publicly accessible"
      on storage.objects for select
      using (bucket_id = 'avatars');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can upload their own avatar'
  ) then
    create policy "Users can upload their own avatar"
      on storage.objects for insert
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can update their own avatar'
  ) then
    create policy "Users can update their own avatar"
      on storage.objects for update
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;
```

- [ ] **Step 2: Run the migration against the live Supabase project**

Paste the SQL above into the Supabase project's SQL editor (Dashboard → SQL
Editor) and run it. There is no linked Supabase CLI project in this repo
(`supabase/config.toml` doesn't exist), so migrations here are applied
manually — same as the existing files in `supabase/migrations/`.

- [ ] **Step 3: Verify the policies exist**

Run this query in the same SQL editor and confirm it returns 3 rows (one
per policy created above) plus check the bucket row:

```sql
select policyname from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname in (
    'Avatar images are publicly accessible',
    'Users can upload their own avatar',
    'Users can update their own avatar'
  );

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'avatars';
```

Expected: 3 policy rows, and the bucket row shows `public = true`,
`file_size_limit = 8388608`, `allowed_mime_types = {image/jpeg,image/png,image/webp}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260918_avatar_storage_policies.sql
git commit -m "feat: add storage policies for user avatar uploads"
```

---

### Task 2: Client-side image resize utility

**Files:**
- Create: `src/lib/image.ts`

**Interfaces:**
- Consumes: a browser `File` (from an `<input type="file">`).
- Produces: `resizeImage(file: File): Promise<Blob>` — Task 4's
  `uploadAvatarMutation` calls this before uploading.

- [ ] **Step 1: Write `resizeImage`**

```ts
const MAX_DIMENSION = 512
const JPEG_QUALITY = 0.8

export function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Não foi possível processar a imagem."))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Não foi possível processar a imagem."))
            return
          }
          resolve(blob)
        },
        "image/jpeg",
        JPEG_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Arquivo de imagem inválido."))
    }

    img.src = objectUrl
  })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `src/lib/image.ts`.

- [ ] **Step 3: Manual verification in the browser**

This function needs `Image`/`canvas`/`URL.createObjectURL`, which don't
exist in plain Node — there's no automated way to unit test it without
adding a browser-DOM test dependency (out of scope, see Global
Constraints). Verify it manually once it's wired into the UI in Task 5
(pick a large photo, confirm the uploaded file is small and square-scaled
in Supabase Storage). No standalone verification step here — skip to Task 5
for the real check.

- [ ] **Step 4: Commit**

```bash
git add src/lib/image.ts
git commit -m "feat: add client-side image resize helper for avatar uploads"
```

---

### Task 3: Shared `MemberAvatar` component

**Files:**
- Create: `src/components/MemberAvatar.tsx`
- Test: none (see Global Constraints) — verified visually in Task 5 onward.

**Interfaces:**
- Consumes: `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge` from
  `@/components/ui/avatar` (already exist, unused elsewhere); `cn` from
  `@/lib/utils`.
- Produces:
  ```ts
  interface MemberAvatarProps {
    avatarUrl?: string | null
    name?: string | null
    className?: string
    fallbackClassName?: string
    badge?: React.ReactNode
  }
  function MemberAvatar(props: MemberAvatarProps): JSX.Element
  ```
  Tasks 5–9 import `{ MemberAvatar } from "@/components/MemberAvatar"` and
  pass exactly these five props.

- [ ] **Step 1: Write the component**

```tsx
import type { ReactNode } from "react"
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface MemberAvatarProps {
  avatarUrl?: string | null
  name?: string | null
  className?: string
  fallbackClassName?: string
  badge?: ReactNode
}

export function MemberAvatar({ avatarUrl, name, className, fallbackClassName, badge }: MemberAvatarProps) {
  const initial = name?.trim().charAt(0).toUpperCase() || "?"

  return (
    <Avatar className={cn("size-10", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name || "Avatar"} />}
      <AvatarFallback delayMs={200} className={fallbackClassName}>
        {initial}
      </AvatarFallback>
      {badge && <AvatarBadge>{badge}</AvatarBadge>}
    </Avatar>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/MemberAvatar.tsx`
Expected: no errors.

- [ ] **Step 3: Manual smoke check**

Temporarily drop `<MemberAvatar name="Ana Souza" />` and
`<MemberAvatar avatarUrl="https://picsum.photos/200" name="Ana Souza" />`
into any page you can open in the browser preview, confirm one shows "A"
in a circle and the other shows the photo, then remove the test markup
(don't commit it).

- [ ] **Step 4: Commit**

```bash
git add src/components/MemberAvatar.tsx
git commit -m "feat: add shared MemberAvatar component"
```

---

### Task 4: `useProfile` avatar upload mutation

**Files:**
- Modify: `src/features/profile/useProfile.ts`

**Interfaces:**
- Consumes: `resizeImage` from `@/lib/image` (Task 2); existing `supabase`,
  `queryClient`, `queryKey`, `showModal` already defined in this file.
- Produces: two new return values consumed by Task 5's `profile/page.tsx`:
  - `uploadingAvatar: boolean`
  - `handleAvatarChange: (file: File) => Promise<void>`

- [ ] **Step 1: Add the import and constants**

In `src/features/profile/useProfile.ts`, add near the top (after the
existing imports, before `const queryKey = ["profile"]`):

```ts
import { resizeImage } from "@/lib/image"

const AVATAR_MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]
```

- [ ] **Step 2: Add the mutation**

Insert this right after the closing `})` of the existing `saveMutation`
(after line 130 in the current file, before `const handleLogout = ...`):

```ts
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
        throw new Error("Envie uma imagem JPEG, PNG ou WebP.")
      }
      if (file.size > AVATAR_MAX_BYTES) {
        throw new Error("A imagem deve ter no máximo 8MB.")
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const resized = await resizeImage(file)

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${user.id}/avatar.jpg`, resized, {
          contentType: "image/jpeg",
          upsert: true,
        })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(`${user.id}/avatar.jpg`)

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: `${publicUrl}?v=${Date.now()}` })
        .eq("user_id", user.id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => {
      showModal(
        "error",
        "Erro",
        error instanceof Error ? error.message : "Falha ao atualizar a foto de perfil."
      )
    },
  })
```

- [ ] **Step 3: Expose it from the hook's return statement, and drop the now-unused `getInitials`**

`getInitials` is only consumed by `profile/page.tsx`, which Task 5 will
switch to `MemberAvatar` (which computes its own initial) — so delete the
`getInitials` function (current lines 138-145) and remove `getInitials`
from the return object. Update the return statement to:

```ts
  return {
    profile,
    loading,
    saving: saveMutation.isPending,
    uploadingAvatar: uploadAvatarMutation.isPending,
    editingName,
    setEditingName,
    editingPhone,
    editingBirthDate,
    modalConfig,
    handleDateChange,
    handlePhoneChange,
    handleSaveProfile: () => saveMutation.mutateAsync(),
    handleAvatarChange: (file: File) => uploadAvatarMutation.mutateAsync(file),
    handleLogout,
    closeModal,
  }
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/features/profile/useProfile.ts`
Expected: no errors. (Task 5 must land before this file's only consumer
compiles cleanly end-to-end, since `page.tsx` still references the removed
`getInitials` until then — that's fine, do Task 5 immediately after.)

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/useProfile.ts
git commit -m "feat: add avatar upload mutation to useProfile"
```

---

### Task 5: Wire avatar upload + display into the profile page

**Files:**
- Modify: `src/app/(authenticated)/(member)/profile/page.tsx`

**Interfaces:**
- Consumes: `MemberAvatar` (Task 3); `uploadingAvatar`,
  `handleAvatarChange` from `useProfile()` (Task 4).
- Produces: nothing further downstream — this is a leaf screen.

- [ ] **Step 1: Update imports**

Replace:
```tsx
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Calendar, Loader2, LogOut, Phone, User } from "lucide-react"
import { IconInput } from "@/components/form/icon-input"
import { FeedbackModal } from "@/components/FeedbackModal"
import { useProfile } from "@/features/profile/useProfile"
```
with:
```tsx
import { useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Camera, Loader2, LogOut, Phone, User } from "lucide-react"
import { IconInput } from "@/components/form/icon-input"
import { FeedbackModal } from "@/components/FeedbackModal"
import { MemberAvatar } from "@/components/MemberAvatar"
import { useProfile } from "@/features/profile/useProfile"
```

- [ ] **Step 2: Update the destructured hook result**

Replace:
```tsx
  const {
    profile,
    loading,
    saving,
    editingName,
    setEditingName,
    editingPhone,
    editingBirthDate,
    modalConfig,
    handleDateChange,
    handlePhoneChange,
    handleSaveProfile,
    handleLogout,
    getInitials,
    closeModal,
  } = useProfile()
```
with:
```tsx
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    profile,
    loading,
    saving,
    uploadingAvatar,
    editingName,
    setEditingName,
    editingPhone,
    editingBirthDate,
    modalConfig,
    handleDateChange,
    handlePhoneChange,
    handleSaveProfile,
    handleAvatarChange,
    handleLogout,
    closeModal,
  } = useProfile()
```

- [ ] **Step 3: Replace the avatar block**

Replace this whole block:
```tsx
        <div className="mb-8 flex flex-col items-center">
          <div className="opacity-80">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || "Avatar"}
                width={96}
                height={96}
                className="size-24 rounded-full border-4 border-background object-cover"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full border-4 border-background bg-muted">
                <span className="text-2xl font-bold text-muted-foreground">
                  {profile?.full_name ? getInitials(profile.full_name) : "U"}
                </span>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            (Alteração de foto temporariamente indisponível)
          </p>
        </div>
```
with:
```tsx
        <div className="mb-8 flex flex-col items-center">
          <div className="relative">
            <MemberAvatar
              avatarUrl={profile?.avatar_url}
              name={profile?.full_name}
              className="size-24 border-4 border-background"
              fallbackClassName="text-2xl font-bold"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm disabled:opacity-50"
              aria-label="Trocar foto de perfil"
            >
              {uploadingAvatar ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleAvatarChange(file)
                e.target.value = ""
              }}
            />
          </div>
        </div>
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(authenticated)/(member)/profile/page.tsx" src/features/profile/useProfile.ts`
Expected: no errors (this also closes out Task 4's deferred check).

- [ ] **Step 5: Manual browser verification**

Start the dev server (`npm run dev`), log in, open `/profile`. Confirm:
- Without a photo, the circle shows the first letter of your name.
- Clicking the camera button opens the OS file picker.
- Picking a JPEG/PNG shows the spinner, then the new photo appears without
  a page reload.
- Picking a non-image file (e.g. a `.txt` renamed to look selectable, or
  just check the `accept="image/*"` filter) is rejected — the OS file
  picker already filters by `accept`, so this mostly guards against
  non-image files with a spoofed extension; confirm the error modal
  appears if you force one through (e.g. via devtools) showing "Envie uma
  imagem JPEG, PNG ou WebP."
- Reloading `/profile` still shows the new photo (confirms `avatar_url`
  persisted and Task 1's public-read policy works).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(authenticated)/(member)/profile/page.tsx"
git commit -m "feat: let users upload and change their profile photo"
```

---

### Task 6: Show the photo in the home header

**Files:**
- Modify: `src/app/(authenticated)/(member)/(tabs)/page.tsx`

**Interfaces:**
- Consumes: `MemberAvatar` (Task 3).

- [ ] **Step 1: Update imports**

Remove `import Image from "next/image"` (line 2) and `User` from the
lucide-react import (line 3, since it becomes unused):
```tsx
import { Calendar, ChevronRight, Clock, MapPin } from "lucide-react"
```
Add, alongside the other `@/components/...` imports:
```tsx
import { MemberAvatar } from "@/components/MemberAvatar"
```

- [ ] **Step 2: Replace the header avatar block**

Replace:
```tsx
        <Link href="/profile" className="rounded-full shadow-sm">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={userName}
              width={48}
              height={48}
              className="size-12 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <User className="size-6 text-muted-foreground" />
            </div>
          )}
        </Link>
```
with:
```tsx
        <Link href="/profile" className="rounded-full shadow-sm">
          <MemberAvatar avatarUrl={avatarUrl} name={userName} className="size-12 border border-border" />
        </Link>
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(authenticated)/(member)/(tabs)/page.tsx"`
Expected: no errors, no unused-import warnings.

- [ ] **Step 4: Manual browser verification**

Open the home tab logged in as a user with a photo (set one via Task 5)
and one without. Confirm the header circle shows the photo or the first
letter of the first name respectively, and the link to `/profile` still
works.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(authenticated)/(member)/(tabs)/page.tsx"
git commit -m "feat: show profile photo in home header"
```

---

### Task 7: Show photos in the department member preview

**Files:**
- Modify: `src/app/(authenticated)/(member)/departments/[id]/page.tsx`

**Interfaces:**
- Consumes: `MemberAvatar` (Task 3).

- [ ] **Step 1: Add the import**

Add alongside the existing local imports:
```tsx
import { MemberAvatar } from "@/components/MemberAvatar"
```

- [ ] **Step 2: Replace the member circle**

Replace:
```tsx
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="font-semibold text-primary">
                          {member.profiles?.full_name?.charAt(0).toUpperCase() || "U"}
                        </span>
                      </div>
                      <div className="mr-2 min-w-0 flex-1">
```
with:
```tsx
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <MemberAvatar
                        avatarUrl={member.profiles?.avatar_url}
                        name={member.profiles?.full_name}
                        className="size-10 shrink-0"
                        fallbackClassName="bg-primary/10 text-primary font-semibold"
                      />
                      <div className="mr-2 min-w-0 flex-1">
```
(The rest of that block — the two `<p>` tags with the name and role — is
unchanged.)

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(authenticated)/(member)/departments/[id]/page.tsx"`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Open a department with at least one member who has a photo and one
without. Confirm the preview list (top of the department page, max 5
members) shows the photo or initial correctly and the row still doesn't
overflow (this reuses the `min-w-0`/`shrink-0` fix already in this file).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(authenticated)/(member)/departments/[id]/page.tsx"
git commit -m "feat: show profile photos in department member preview"
```

---

### Task 8: Show photos in the full member list

**Files:**
- Modify: `src/app/(authenticated)/(member)/departments/[id]/members/page.tsx`

**Interfaces:**
- Consumes: `MemberAvatar` (Task 3).

- [ ] **Step 1: Add the import**

Add alongside the existing local imports:
```tsx
import { MemberAvatar } from "@/components/MemberAvatar"
```

- [ ] **Step 2: Replace the member circle**

Replace:
```tsx
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <span className="font-bold text-primary">
                      {member.profiles.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
```
with:
```tsx
                  <MemberAvatar
                    avatarUrl={member.profiles.avatar_url}
                    name={member.profiles.full_name}
                    className="size-10 shrink-0"
                    fallbackClassName="bg-primary/10 text-primary font-bold"
                  />
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(authenticated)/(member)/departments/[id]/members/page.tsx"`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Open "Todos os Membros" for a department. Confirm each card shows the
photo or initial, and the "LÍDER" badge under the name still renders
correctly for leaders.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(authenticated)/(member)/departments/[id]/members/page.tsx"
git commit -m "feat: show profile photos in full member list"
```

---

### Task 9: Show photos in the leaders page

**Files:**
- Modify: `src/app/(authenticated)/(member)/departments/[id]/leaders/page.tsx`

**Interfaces:**
- Consumes: `MemberAvatar` (Task 3), including its `badge` prop for the
  "this person is a leader" indicator.

- [ ] **Step 1: Add the import**

Add alongside the existing local imports:
```tsx
import { MemberAvatar } from "@/components/MemberAvatar"
```

- [ ] **Step 2: Replace the search-result circle**

Replace:
```tsx
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary">
                    <span className="font-bold text-primary-foreground">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
```
with:
```tsx
                  <MemberAvatar
                    avatarUrl={user.avatar_url}
                    name={user.full_name}
                    className="size-10 shrink-0"
                    fallbackClassName="bg-primary text-primary-foreground font-bold"
                  />
```

- [ ] **Step 3: Replace the current-leader circle**

Replace:
```tsx
                    <div className="flex size-10 items-center justify-center rounded-full bg-warning">
                      <ShieldCheck className="size-4 text-white" />
                    </div>
```
with:
```tsx
                    <MemberAvatar
                      avatarUrl={leader.profiles.avatar_url}
                      name={leader.profiles.full_name}
                      className="size-10 shrink-0"
                      fallbackClassName="bg-warning text-white"
                      badge={<ShieldCheck className="text-white" />}
                    />
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(authenticated)/(member)/departments/[id]/leaders/page.tsx"`
Expected: no errors.

- [ ] **Step 5: Manual browser verification**

Open the leaders page for a department. Search for a member without a
photo (shows initial on a solid primary circle) and confirm adding them
still works. Confirm existing leaders show their photo (or the warning-
colored initial) with a small shield badge overlaid in the corner.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(authenticated)/(member)/departments/[id]/leaders/page.tsx"
git commit -m "feat: show profile photos in the leaders page"
```
