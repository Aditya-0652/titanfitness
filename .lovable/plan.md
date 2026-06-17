# Convert to Static GitHub Pages SPA

This is a large architectural change. Here's the plan before I touch anything.

## 1. Replace the framework

Current stack is **TanStack Start** (SSR + Nitro + server functions). GitHub Pages can only serve static files, so Start has to go.

Switch to: **Vite + React + TanStack Router (file-based, non-Start) + TanStack Query**.

- Remove: `@tanstack/react-start`, `@lovable.dev/vite-tanstack-config`, `nitro`, `src/server.ts`, `src/start.ts`, `src/routes/__root.tsx` shell-component pattern, `src/routes/api/*` if any.
- Replace `vite.config.ts` with a vanilla Vite config + `@tanstack/router-plugin/vite` for file-based routing + `@vitejs/plugin-react`.
- New `index.html` at project root as the SPA entry.
- New `src/main.tsx` that mounts `<RouterProvider />`.
- Rewrite `src/routes/__root.tsx` to a plain `createRootRouteWithContext` route with `<Outlet />` — no `shellComponent`, no `HeadContent`/`Scripts`.
- Update all imports: `@tanstack/react-router` only. Drop `HeadContent`, `Scripts`, `createRootRouteWithContext` from start, `useServerFn`.

## 2. Kill all server functions

`src/lib/inquiries.functions.ts` is rewritten to plain async functions that talk to Supabase from the browser using the **publishable/anon client** (`src/integrations/supabase/client.ts`):

- `submitInquiry(data)` → `supabase.from("inquiries").insert(...)`
- `listInquiries()` → `supabase.from("inquiries").select("*").order(...)`
- `deleteInquiry(id)` → `supabase.from("inquiries").delete().eq("id", id)`
- `listMembers / addMember / updateMember / deleteMember` → same pattern on `members`
- `submitReview / listReviews` → same on `reviews`
- `exportInquiriesXlsx / exportMembersXlsx` → moved fully client-side using `xlsx` in the browser, triggers a download via a Blob.

Owner passcode (`titan-28549`) is **removed** — it cannot protect anything in a static app. The owner page now requires real Supabase Auth login (see §3).

Delete: `src/lib/inquiries.functions.ts` server-fn wrappers replaced; `src/integrations/supabase/client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `client.ts`'s `process.env` fallback removed (only `import.meta.env.VITE_*`).

## 3. New RLS model (the SQL you'll see in the migration)

Recreate policies on `inquiries`, plus tighten `members` and `reviews`. The owner identity is enforced via the existing `user_roles` table + `has_role(uid, 'admin')` function.

```sql
-- inquiries
DROP POLICY IF EXISTS "admins delete inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "admins read inquiries"   ON public.inquiries;
DROP POLICY IF EXISTS "anyone can submit inquiry" ON public.inquiries;

-- Anyone (incl. anon) may insert a contact inquiry, with length checks
CREATE POLICY "public can submit inquiry"
ON public.inquiries FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(name)  BETWEEN 1 AND 100
  AND char_length(phone) BETWEEN 4 AND 20
  AND (email   IS NULL OR char_length(email)   <= 255)
  AND (interest IS NULL OR char_length(interest) <= 50)
  AND (message IS NULL OR char_length(message) <= 1000)
);

-- Only signed-in admins can read / delete
CREATE POLICY "admins read inquiries"
ON public.inquiries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete inquiries"
ON public.inquiries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- members: admin-only ALL already exists; add grants for anon SELECT? NO.
-- Keep members locked to admins.

-- reviews: public can read approved, public can submit; keep as-is.

-- Grants
GRANT INSERT ON public.inquiries TO anon;
GRANT SELECT, INSERT, DELETE ON public.inquiries TO authenticated;
```

The single admin account (`aicoder121@gmail.com`) is already auto-granted the `admin` role by the existing `handle_new_user_role` trigger. You sign in once via Supabase email/password and that's it.

> Important: this means **you must enable Email auth in Lovable Cloud and create the `aicoder121@gmail.com` account**. I'll prompt you after deploy.

## 4. Owner login page

`src/routes/owner.tsx` is rewritten:

- Replaces passcode form with email + password sign-in (`supabase.auth.signInWithPassword`).
- After login, checks `has_role` via a `user_roles` self-select (RLS already permits user to read own role). If not admin → sign out + error.
- All inquiry/member CRUD calls run directly through the anon client; RLS does the gating.

## 5. No more `process.env`

- `src/integrations/supabase/client.ts` keeps only `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`. Server fallback removed.
- Delete `src/lib/config.server.ts`, `src/lib/error-capture.ts`, `src/lib/error-page.ts`, `src/server.ts`, `src/start.ts`.

## 6. GitHub Pages routing

- `vite.config.ts` sets `base: '/<repo-name>/'` via `VITE_BASE_PATH` env var (default `/`), so local dev still works at `/`.
- Router gets `basepath: import.meta.env.BASE_URL`.
- Add `public/404.html` that's a copy of `index.html` so deep-link refreshes work on Pages.
- Add `public/.nojekyll` so Pages serves `_`-prefixed asset paths.

You'll set the repo name as a build env var in the workflow (§7).

## 7. GitHub Actions deploy

Replace the existing `.github/workflows/static.yml` (which currently just uploads the repo unbuilt) with a real build + deploy workflow:

```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
        env:
          VITE_BASE_PATH: /${{ github.event.repository.name }}/
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}
      - run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.d.outputs.page_url }} }
    steps:
      - id: d
        uses: actions/deploy-pages@v5
```

You'll add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as **repo variables** (Settings → Secrets and variables → Actions → Variables).

## 8. After I'm done — how to ship it

1. In Lovable, click the **GitHub** button (top-right "+" menu) → Create Repository. Name it e.g. `titan-fitness`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables** → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (copy from your current `.env`).
4. Push any change to `main` (or hit "Run workflow" on the Actions tab) → site goes live at `https://<your-username>.github.io/titan-fitness/`.
5. Sign in once at `/owner` with `aicoder121@gmail.com` (I'll tell you the temp password to set).

## Trade-offs you should know

- **The Lovable preview will still work**, but it will run via `vite dev` instead of TanStack Start. Some Lovable-managed features tied to Start (auth-attacher etc.) become dead code and are removed.
- **The owner passcode `titan-28549` is gone.** A passcode in a static JS bundle is readable by anyone who opens DevTools — that's why the brief says use Supabase Auth + RLS. Real login replaces it.
- **Anyone with the anon key can attempt inserts/queries**, but RLS is what actually blocks them. The policies above are the security boundary.
- **Lovable Cloud edge functions / server fns become unavailable** in this project from now on. If you later want any server-side logic (e.g. sending email on inquiry), it has to live outside GitHub Pages (a separate Worker, Supabase Edge Function called via fetch, etc.).

Approve and I'll execute end-to-end.
