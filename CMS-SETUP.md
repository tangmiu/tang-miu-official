# Tang Miu Studio CMS — existing shared Supabase setup

The artist dashboard is at [https://tang-miu-official.vercel.app/admin.html](https://tang-miu-official.vercel.app/admin.html). It uses Supabase Auth, Postgres and Storage in the existing **MEP-4-2-Reunion** Supabase project, as requested. The CMS objects are isolated with the `tangmiu_artist_*` names and the `tangmiu-artist-media` storage bucket.

## Important before changing anything

- **Do not create another Supabase project for Tang Miu.**
- **Do not run `supabase-cms.sql` again on the existing project.** The artist tables, policies, public-content RPC and media bucket already exist. Re-running the non-idempotent setup SQL can fail or cause policy conflicts.
- Do not rename, alter, truncate or delete Reunion tables, data, policies, functions or storage objects.
- The project is shared, so usage counts toward the existing project's plan and quotas. No new project was created for this CMS; this alone does not guarantee that future usage can never incur charges.

## Sign in to the admin dashboard

1. Open [Admin](https://tang-miu-official.vercel.app/admin.html).
2. Sign in with the Supabase Auth account that has been explicitly added to `public.tangmiu_artist_admins`.
3. If the account has not been authorized yet, an existing project owner can create the user in Supabase Authentication and add that user's UUID:

   ```sql
   insert into public.tangmiu_artist_admins (user_id)
   values ('PASTE-AUTH-USER-UUID-HERE')
   on conflict (user_id) do nothing;
   ```

   Only run this after confirming the UUID belongs to the intended artist-site administrator. Do not paste passwords or secret keys into SQL or GitHub.

4. If sign-in succeeds but the dashboard denies access, check that exact user UUID in `public.tangmiu_artist_admins`. Do not change Reunion permissions to solve an artist CMS access issue.

## What the dashboard manages

- Artist profile and official platform links
- Music releases, release links and credits
- Live appearances and creative works
- Image gallery and news
- Press Kit fields
- Homepage SEO title, description and social share image
- Draft/publish workflow, previews, revision history and JSON backups

Save a draft first, preview it, then publish when it is correct. Keep an independent copy of original image files; JSON backups do not contain the image bytes.

## Security and publishing notes

- `cms-config.json` intentionally contains only the public Supabase publishable key. Never replace it with a `service_role` key or a Supabase secret key.
- Database access is controlled by Row Level Security and the `tangmiu_artist_admins` allowlist. Never grant public write access to artist content.
- The `tangmiu-artist-media` bucket is public for reading published images; uploads, updates and deletes must remain restricted to authorized artist admins.
- The public website uses the published CMS payload with the checked-in `data/*.json` files as fallback if Supabase is unavailable.
- Homepage SEO fields are reflected into the document metadata when the page JavaScript runs. The HTML's checked-in metadata remains the initial fallback; social crawlers that do not execute JavaScript may continue to use those static tags. A server-rendered metadata layer would be a separate architecture change.

## Troubleshooting

- If the public site does not show a newly published change, check the dashboard's publish result, then reload the public page without cache.
- If Supabase is unavailable, the public site should fall back to the static files in `data/`.
- Do not delete the current tables or create replacement tables until the existing CMS has been exported and the migration plan reviewed.
