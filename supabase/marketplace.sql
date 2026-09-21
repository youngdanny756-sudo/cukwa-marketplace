-- CUKWA marketplace launch schema.
-- Run this after your existing products table and chat.sql setup.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  location text,
  phone text,
  whatsapp_number text,
  is_verified boolean not null default false,
  verification_status text not null default 'not_requested' check (verification_status in ('not_requested', 'pending', 'approved', 'rejected')),
  verification_requested_at timestamptz,
  phone_verified_at timestamptz,
  id_verified_at timestamptz,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists location text;
alter table public.products add column if not exists phone text;
alter table public.products add column if not exists status text not null default 'active';
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists image_urls text[] not null default '{}';
alter table public.products add column if not exists approval_status text not null default 'approved';
alter table public.products add column if not exists moderation_note text;
alter table public.products add column if not exists expires_at timestamptz;
alter table public.products add column if not exists is_draft boolean not null default false;
alter table public.products add column if not exists renewed_at timestamptz;

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_number text not null,
  id_document_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  seller_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (product_id, reviewer_id)
);

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.suspicious_listing_flags (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  score integer not null default 0,
  reasons text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists products_location_idx on public.products(location);
create index if not exists products_category_idx on public.products(category);
create index if not exists products_status_idx on public.products(status);
create index if not exists reviews_seller_idx on public.reviews(seller_id);
create index if not exists reports_status_idx on public.listing_reports(status);
create index if not exists verification_status_idx on public.verification_requests(status);
create index if not exists user_reports_status_idx on public.user_reports(status);
create index if not exists suspicious_flags_status_idx on public.suspicious_listing_flags(status);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update on public.listing_reports to authenticated;
grant select, insert, update on public.verification_requests to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert, update on public.user_reports to authenticated;
grant select, insert, update on public.suspicious_listing_flags to authenticated;

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

drop policy if exists "Users upload profile images" on storage.objects;
create policy "Users upload profile images" on storage.objects for insert to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update profile images" on storage.objects;
create policy "Users update profile images" on storage.objects for update to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Public profile images are viewable" on storage.objects;
create policy "Public profile images are viewable" on storage.objects for select to public
using (bucket_id = 'profile-images');

drop policy if exists "Users upload verification documents" on storage.objects;
create policy "Users upload verification documents" on storage.objects for insert to authenticated
with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Admins view verification documents" on storage.objects;
create policy "Admins view verification documents" on storage.objects for select to authenticated
using (bucket_id = 'verification-documents' and public.is_admin());

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.listing_reports enable row level security;
alter table public.verification_requests enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;
alter table public.suspicious_listing_flags enable row level security;

drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable"
  on public.profiles for select using (true);

drop policy if exists "Users can manage their profile" on public.profiles;
create policy "Users can manage their profile"
  on public.profiles for all using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "Active products are public" on public.products;
drop policy if exists "Owners can create products" on public.products;
drop policy if exists "Owners can update products" on public.products;
drop policy if exists "Owners can delete products" on public.products;

create policy "Active products are public"
  on public.products for select using (status = 'active' or seller_id = auth.uid() or public.is_admin());

create policy "Owners can create products"
  on public.products for insert with check (seller_id = auth.uid());

create policy "Owners can update products"
  on public.products for update using (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());

create policy "Owners can delete products"
  on public.products for delete using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "Users manage their favorites" on public.favorites;
create policy "Users manage their favorites"
  on public.favorites for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Reviews are public" on public.reviews;
create policy "Reviews are public"
  on public.reviews for select using (true);

drop policy if exists "Users can create reviews" on public.reviews;
create policy "Users can create reviews"
  on public.reviews for insert with check (reviewer_id = auth.uid());

drop policy if exists "Review authors can edit" on public.reviews;
create policy "Review authors can edit"
  on public.reviews for update using (reviewer_id = auth.uid() or public.is_admin())
  with check (reviewer_id = auth.uid() or public.is_admin());

drop policy if exists "Review authors can delete" on public.reviews;
create policy "Review authors can delete"
  on public.reviews for delete using (reviewer_id = auth.uid() or public.is_admin());

drop policy if exists "Users can create reports" on public.listing_reports;
create policy "Users can create reports"
  on public.listing_reports for insert with check (reporter_id = auth.uid());

drop policy if exists "Users can view own reports" on public.listing_reports;
create policy "Users can view own reports"
  on public.listing_reports for select using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can manage reports" on public.listing_reports;
create policy "Admins can manage reports"
  on public.listing_reports for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Active approved products are public" on public.products;
drop policy if exists "Active products are public" on public.products;
create policy "Active approved products are public"
  on public.products for select
  using ((status = 'active' and approval_status = 'approved' and is_draft = false and (expires_at is null or expires_at > now())) or seller_id = auth.uid() or public.is_admin());

drop policy if exists "Users manage own verification requests" on public.verification_requests;
create policy "Users manage own verification requests"
  on public.verification_requests for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users submit verification requests" on public.verification_requests;
create policy "Users submit verification requests"
  on public.verification_requests for insert with check (user_id = auth.uid());

drop policy if exists "Admins review verification requests" on public.verification_requests;
create policy "Admins review verification requests"
  on public.verification_requests for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users manage their blocks" on public.user_blocks;
create policy "Users manage their blocks"
  on public.user_blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

drop policy if exists "Users submit user reports" on public.user_reports;
create policy "Users submit user reports"
  on public.user_reports for insert with check (reporter_id = auth.uid());

drop policy if exists "Users view own user reports" on public.user_reports;
create policy "Users view own user reports"
  on public.user_reports for select using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage user reports" on public.user_reports;
create policy "Admins manage user reports"
  on public.user_reports for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage suspicious flags" on public.suspicious_listing_flags;
create policy "Admins manage suspicious flags"
  on public.suspicious_listing_flags for all using (public.is_admin()) with check (public.is_admin());
