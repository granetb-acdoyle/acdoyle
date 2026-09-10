-- Observability columns for the internal read-only dashboard: which persona
-- was dispatched, which payment rail was used, and (for x402) the on-chain
-- settlement tx hash. Additive only — existing columns are untouched.
alter table usage_logs
  add column if not exists persona text,
  add column if not exists payment_method text check (payment_method in ('credit', 'x402')),
  add column if not exists tx_hash text;
