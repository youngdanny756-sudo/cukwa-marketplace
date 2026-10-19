-- CUKWA inbox, notifications, moderation history, and listing insights.
-- Run after the existing products table, marketplace.sql, and chat.sql.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('chat_message', 'listing_approved', 'listing_rejected')),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications(recipient_id, read_at) where read_at is null;

alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "Users read their notifications" on public.notifications;
create policy "Users read their notifications"
  on public.notifications for select
  using (recipient_id::text = auth.uid()::text);
drop policy if exists "Users mark their notifications read" on public.notifications;
create policy "Users mark their notifications read"
  on public.notifications for update
  using (recipient_id::text = auth.uid()::text)
  with check (recipient_id::text = auth.uid()::text);

drop policy if exists "Chat participants can read messages" on public.chat_messages;
create policy "Chat participants can read messages"
  on public.chat_messages for select
  using (
    auth.uid()::text = sender_id::text
    or auth.uid()::text = recipient_id::text
  );

drop policy if exists "Users can send chat messages" on public.chat_messages;
create policy "Users can send chat messages"
  on public.chat_messages for insert
  with check (
    auth.uid()::text = sender_id::text
    and sender_id::text <> recipient_id::text
    and exists (
      select 1 from public.products
      where products.id::text = chat_messages.product_id
        and (
          (products.seller_id::text = recipient_id::text and products.seller_id::text <> sender_id::text)
          or (
            products.seller_id::text = sender_id::text
            and exists (
              select 1 from public.chat_messages prior_message
              where prior_message.product_id = chat_messages.product_id
                and prior_message.sender_id::text = chat_messages.recipient_id::text
                and prior_message.recipient_id::text = chat_messages.sender_id::text
            )
          )
        )
    )
  );

drop policy if exists "Active products are public" on public.products;
drop policy if exists "Active approved products are public" on public.products;
create policy "Active approved products are public"
  on public.products for select
  using (
    (
      status = 'active'
      and approval_status = 'approved'
      and is_draft = false
      and (expires_at is null or expires_at > now())
    )
    or seller_id::text = auth.uid()::text
    or public.is_admin()
  );

drop policy if exists "Owners can create products" on public.products;
create policy "Owners can create products"
  on public.products for insert
  with check (seller_id::text = auth.uid()::text);

drop policy if exists "Owners can update products" on public.products;
create policy "Owners can update products"
  on public.products for update
  using (seller_id::text = auth.uid()::text or public.is_admin())
  with check (seller_id::text = auth.uid()::text or public.is_admin());

drop policy if exists "Owners can delete products" on public.products;
create policy "Owners can delete products"
  on public.products for delete
  using (seller_id::text = auth.uid()::text or public.is_admin());

create index if not exists chat_messages_sender_created_idx
  on public.chat_messages(sender_id, created_at desc);
create index if not exists chat_messages_recipient_created_idx
  on public.chat_messages(recipient_id, created_at desc);

create or replace function public.get_inbox_conversations()
returns table (
  product_id text,
  other_user_id uuid,
  last_message_id uuid,
  last_message_sender_id uuid,
  last_message text,
  last_message_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with participants as (
    select
      chat_messages.product_id,
      case
        when chat_messages.sender_id::text = auth.uid()::text then chat_messages.recipient_id::text::uuid
        else chat_messages.sender_id::text::uuid
      end as other_user_id,
      chat_messages.id,
      chat_messages.sender_id,
      chat_messages.message,
      chat_messages.created_at
    from public.chat_messages
    where chat_messages.sender_id::text = auth.uid()::text
      or chat_messages.recipient_id::text = auth.uid()::text
  ),
  ranked as (
    select
      participants.*,
      row_number() over (
        partition by participants.product_id, participants.other_user_id
        order by participants.created_at desc, participants.id desc
      ) as row_number
    from participants
  )
  select
    ranked.product_id,
    ranked.other_user_id,
    ranked.id::text::uuid,
    ranked.sender_id::text::uuid,
    ranked.message,
    ranked.created_at
  from ranked
  where ranked.row_number = 1
  order by ranked.created_at desc;
$$;

revoke all on function public.get_inbox_conversations() from public;
grant execute on function public.get_inbox_conversations() to authenticated;

create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_title text;
begin
  select title into listing_title
  from public.products
  where id::text = new.product_id;

  insert into public.notifications (recipient_id, actor_id, type, title, body, data)
  select row_data.recipient_id, row_data.actor_id, row_data.type, row_data.title, row_data.body, row_data.data
  from jsonb_populate_record(
    null::public.notifications,
    jsonb_build_object(
      'recipient_id', new.recipient_id::text,
      'actor_id', new.sender_id::text,
      'type', 'chat_message',
      'title', 'New message',
      'body', coalesce(listing_title, 'A marketplace listing'),
      'data', jsonb_build_object('product_id', new.product_id, 'sender_id', new.sender_id::text)
    )
  ) as row_data;
  return new;
end;
$$;

drop trigger if exists notify_chat_message on public.chat_messages;
create trigger notify_chat_message
  after insert on public.chat_messages
  for each row execute function public.notify_chat_message();

create or replace function public.notify_listing_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.approval_status is distinct from new.approval_status
    and new.approval_status in ('approved', 'rejected') then
    insert into public.notifications (recipient_id, type, title, body, data)
    select row_data.recipient_id, row_data.type, row_data.title, row_data.body, row_data.data
    from jsonb_populate_record(
      null::public.notifications,
      jsonb_build_object(
        'recipient_id', new.seller_id::text,
        'type', case when new.approval_status = 'approved' then 'listing_approved' else 'listing_rejected' end,
        'title', case when new.approval_status = 'approved' then 'Listing approved' else 'Listing needs changes' end,
        'body', coalesce(new.moderation_note, new.title),
        'data', jsonb_build_object('product_id', new.id::text)
      )
    ) as row_data;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_listing_decision on public.products;
create trigger notify_listing_decision
  after update of approval_status on public.products
  for each row execute function public.notify_listing_decision();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

create table if not exists public.listing_views (
  product_id text not null,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, viewer_id)
);

create index if not exists listing_views_product_idx on public.listing_views(product_id);
alter table public.listing_views enable row level security;
grant select, insert on public.listing_views to authenticated;

drop policy if exists "Sellers and admins read listing views" on public.listing_views;
create policy "Sellers and admins read listing views"
  on public.listing_views for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.products
      where products.id::text = listing_views.product_id
        and products.seller_id::text = auth.uid()::text
    )
  );
drop policy if exists "Users record their own listing views" on public.listing_views;
create policy "Users record their own listing views"
  on public.listing_views for insert
  with check (
    viewer_id::text = auth.uid()::text
    and exists (
      select 1 from public.products
      where products.id::text = listing_views.product_id
        and products.status = 'active'
        and products.approval_status = 'approved'
        and products.seller_id::text <> auth.uid()::text
    )
  );

alter table public.listing_reports add column if not exists admin_note text;
alter table public.user_reports add column if not exists admin_note text;

create table if not exists public.report_action_history (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('listing', 'seller')),
  report_id uuid not null,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  note text,
  old_status text,
  new_status text,
  created_at timestamptz not null default now()
);

create index if not exists report_action_history_report_idx
  on public.report_action_history(report_type, report_id, created_at desc);
alter table public.report_action_history enable row level security;
grant select, insert on public.report_action_history to authenticated;

drop policy if exists "Admins read report action history" on public.report_action_history;
create policy "Admins read report action history"
  on public.report_action_history for select using (public.is_admin());

create or replace function public.record_report_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_kind text := tg_argv[0];
begin
  if old.status is distinct from new.status
    or old.admin_note is distinct from new.admin_note then
    insert into public.report_action_history
      (report_type, report_id, admin_id, action, note, old_status, new_status)
    values (
      report_kind,
      new.id,
      auth.uid(),
      case
        when old.status is distinct from new.status then 'status_changed'
        else 'note_updated'
      end,
      new.admin_note,
      old.status,
      new.status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists record_listing_report_action on public.listing_reports;
create trigger record_listing_report_action
  after update on public.listing_reports
  for each row execute function public.record_report_action('listing');
drop trigger if exists record_seller_report_action on public.user_reports;
create trigger record_seller_report_action
  after update on public.user_reports
  for each row execute function public.record_report_action('seller');

notify pgrst, 'reload schema';
