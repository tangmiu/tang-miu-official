-- Tang Miu Studio CMS — additive setup for shared Supabase project MEP-4-2-Reunion.
-- This script intentionally uses tangmiu_-prefixed objects and a dedicated bucket.
-- It does not alter or delete existing project tables, policies, functions, or buckets.
create table public.tangmiu_artist_content (
  id integer primary key check (id = 1),
  draft_content jsonb not null default '{}'::jsonb,
  published_content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null
);
create table public.tangmiu_artist_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.tangmiu_artist_content_revisions (
  id bigint generated always as identity primary key,
  content jsonb not null,
  action text not null check (action in ('draft_saved','published','restored')),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.tangmiu_artist_content enable row level security;
alter table public.tangmiu_artist_admins enable row level security;
alter table public.tangmiu_artist_content_revisions enable row level security;

create or replace function public.tangmiu_is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (
  select 1 from public.tangmiu_artist_admins where user_id = auth.uid()
); $$;
revoke all on function public.tangmiu_is_admin() from public, anon, authenticated;

create or replace function public.tangmiu_get_published_content()
returns jsonb language sql stable security definer
set search_path = public, pg_temp
as $$ select published_content from public.tangmiu_artist_content where id = 1; $$;
revoke all on function public.tangmiu_get_published_content() from public;
revoke all on function public.tangmiu_get_published_content() from anon;
revoke all on function public.tangmiu_get_published_content() from authenticated;
grant execute on function public.tangmiu_get_published_content() to anon, authenticated;

create policy tangmiu_admin_manage_content on public.tangmiu_artist_content
  for all to authenticated
  using (exists (select 1 from public.tangmiu_artist_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.tangmiu_artist_admins a where a.user_id = auth.uid()));
create policy tangmiu_admin_read_own_admin_record on public.tangmiu_artist_admins
  for select to authenticated using (user_id = auth.uid());
create policy tangmiu_admin_read_revisions on public.tangmiu_artist_content_revisions
  for select to authenticated
  using (exists (select 1 from public.tangmiu_artist_admins a where a.user_id = auth.uid()));
create policy tangmiu_admin_add_revisions on public.tangmiu_artist_content_revisions
  for insert to authenticated
  with check (exists (select 1 from public.tangmiu_artist_admins a where a.user_id = auth.uid()));

insert into public.tangmiu_artist_content (id, draft_content, published_content)
values (1, '{}'::jsonb, '{}'::jsonb);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tangmiu-artist-media', 'tangmiu-artist-media', true, 10485760,
        array['image/jpeg','image/png','image/webp','image/avif','image/gif']);

create policy tangmiu_public_read_artist_media on storage.objects
  for select to anon, authenticated using (bucket_id = 'tangmiu-artist-media');
create policy tangmiu_admin_upload_artist_media on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tangmiu-artist-media' and exists (select 1 from public.tangmiu_artist_admins a where a.user_id = auth.uid()));
create policy tangmiu_admin_update_artist_media on storage.objects
  for update to authenticated
  using (bucket_id = 'tangmiu-artist-media' and exists (select 1 from public.tangmiu_artist_admins a where a.user_id = auth.uid()))
  with check (bucket_id = 'tangmiu-artist-media' and exists (select 1 from public.tangmiu_artist_admins a where a.user_id = auth.uid()));
create policy tangmiu_admin_delete_artist_media on storage.objects
  for delete to authenticated
  using (bucket_id = 'tangmiu-artist-media' and exists (select 1 from public.tangmiu_artist_admins a where a.user_id = auth.uid()));

grant select, insert, update, delete on public.tangmiu_artist_content to authenticated;
grant select on public.tangmiu_artist_admins to authenticated;
grant select, insert on public.tangmiu_artist_content_revisions to authenticated;
grant usage, select on sequence public.tangmiu_artist_content_revisions_id_seq to authenticated;
