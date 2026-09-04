-- Pending on-chain top-up intents. Each intent gets a unique expected_amount
-- (whole dollar amount + random thousandths suffix) so an incoming USDC
-- transfer can be matched back to exactly one intent by amount alone.
create table if not exists topup_intents (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references api_keys(id) on delete cascade,
  expected_amount numeric(12, 3) not null,
  credits_to_grant integer not null,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'expired')),
  fulfilled_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Speeds up the webhook's "find a pending intent near this amount" lookup.
create index if not exists topup_intents_pending_amount_idx
  on topup_intents (expected_amount)
  where status = 'pending';

-- Atomically increment credits_remaining on an api_keys row. Mirrors
-- decrement_credits (see 20260904131500_decrement_credits_function.sql).
create or replace function increment_credits(key_id uuid, amount integer)
returns void
language sql
as $$
  update api_keys
  set credits_remaining = credits_remaining + amount
  where id = key_id;
$$;
