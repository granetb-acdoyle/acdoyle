-- Atomically decrement credits_remaining on an api_keys row.
-- Guards against going below zero when called concurrently.
create or replace function decrement_credits(key_id uuid)
returns void
language sql
as $$
  update api_keys
  set credits_remaining = credits_remaining - 1
  where id = key_id
    and credits_remaining > 0;
$$;
