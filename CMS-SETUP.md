# Tang Miu Studio CMS setup
The dashboard lives at `/admin.html` and uses Supabase Auth, Postgres, and Storage. It uses only a public publishable/anon key in the browser; authorization is enforced by database RLS.

## One-time setup
1. Create a **new dedicated Supabase project** for the artist website. Do not reuse the Time Is Respect or MEP-4-2 projects.
2. Open Supabase SQL Editor and run all of `supabase-cms.sql`.
3. In Supabase Project Settings → API, copy the Project URL and the **publishable key** (or legacy anon key). Never use a service_role/secret key.
4. Edit `cms-config.json`: set `supabaseUrl` and `supabaseAnonKey`. Commit; Vercel should deploy automatically.
5. In Supabase Authentication → Users, create your own user and strong unique password. Disable public sign-ups if enabled.
6. Copy that user's UUID and run this in SQL Editor:
   ```sql
   insert into public.artist_admins(user_id) values('PASTE-USER-UUID-HERE') on conflict do nothing;
   ```
7. Open `https://tang-miu-official.vercel.app/admin.html`, sign in, choose Import current website content, review it, then Publish.
8. Test the public website in a private/incognito window.

## Workflow
- Save draft saves privately. Preview shows a sample of the current draft. Publish makes it visible to the public site.
- Add/edit/delete releases, live shows, works, gallery entries, news, profile, press kit, and SEO data.
- Uploads go into the public `artist-media` bucket; images are limited to 10 MB and common image formats.
- Export JSON regularly. Revision history records draft/published snapshots; restore makes a revision the current draft before publishing.
- A JSON backup does not contain the original image bytes; keep originals separately.
- The existing website is static HTML. Content/title/meta description update when the page JavaScript runs; some social crawlers may still use static Open Graph metadata until a server-rendered metadata route is added.
- Never place a Supabase service_role/secret key in this repository, Vercel client variables, or browser JavaScript.
