-- Store Google OAuth tokens per user
create table google_tokens (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expiry_date  bigint,
  updated_at   timestamptz not null default now()
);

alter table google_tokens enable row level security;

create policy "users manage own google tokens" on google_tokens
  for all using (auth.uid() = user_id);

-- Add google_event_id to meal_plans to avoid duplicate calendar events
alter table meal_plans add column if not exists google_event_id text;
