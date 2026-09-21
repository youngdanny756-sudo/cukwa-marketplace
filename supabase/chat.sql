-- Persistent buyer-seller messages for a product.
-- Run this entire script in the Supabase SQL Editor.

create table if not exists public.chat_messages (
	id uuid primary key default gen_random_uuid(),
	product_id text not null,
	sender_id uuid not null references auth.users(id) on delete cascade,
	recipient_id uuid not null references auth.users(id) on delete cascade,
	message text not null check (char_length(trim(message)) > 0),
	created_at timestamptz not null default now()
);

grant usage on schema public to authenticated;
grant select, insert on public.chat_messages to authenticated;

create index if not exists chat_messages_product_id_idx
	on public.chat_messages(product_id);

create index if not exists chat_messages_conversation_idx
	on public.chat_messages(sender_id, recipient_id, product_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "Chat participants can read messages"
	on public.chat_messages;

create policy "Chat participants can read messages"
	on public.chat_messages for select
	using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users can send chat messages"
	on public.chat_messages;

create policy "Users can send chat messages"
	on public.chat_messages for insert
	with check (auth.uid() = sender_id);

do $$
begin
	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'chat_messages'
	) then
		alter publication supabase_realtime add table public.chat_messages;
	end if;
end;
$$;

