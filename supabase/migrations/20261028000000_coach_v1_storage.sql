-- Bucket privé des JSON Riot bruts (coach/v1/store-supabase.mjs) : aucune politique, seul le service_role y accède.
insert into storage.buckets (id, name, public) values ('riot-raw', 'riot-raw', false) on conflict (id) do nothing;
