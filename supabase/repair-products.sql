-- Run this in Supabase SQL Editor to sync the existing products table.

alter table public.products
  add column if not exists image_urls text[] not null default '{}';

alter table public.products
  add column if not exists approval_status text not null default 'approved';

alter table public.products
  add column if not exists moderation_note text;

alter table public.products
  add column if not exists expires_at timestamptz;

alter table public.products
  add column if not exists is_draft boolean not null default false;

alter table public.products
  add column if not exists renewed_at timestamptz;

notify pgrst, 'reload schema';
