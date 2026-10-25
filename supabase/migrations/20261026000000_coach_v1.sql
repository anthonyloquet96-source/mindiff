-- Coach V1 (COACH-003) : joueurs, parties, métriques, objectifs, évaluations, références, synchronisations.
-- RLS sur toutes les tables : un utilisateur ne lit que ce qui concerne ses propres joueurs ; aucune écriture côté
-- client (pas de politique insert/update/delete) : seul le backend (rôle service_role, qui contourne la RLS) écrit.
-- Suppression RGPD : supprimer le joueur efface en cascade ses métriques, objectifs, évaluations et synchronisations.
-- Un compte Supabase ne prouve pas la propriété d'un compte Riot : la liaison user_id ne vaut qu'après RSO (production).

create table public.players (
  id uuid primary key default gen_random_uuid(),
  puuid text not null unique,
  platform text not null check (platform in ('euw1','eun1','na1','kr','br1','la1','la2','oc1','tr1','ru','jp1')),
  user_id uuid references auth.users (id) on delete cascade,
  game_name text,
  tag_line text,
  created_at timestamptz not null default now()
);
create index players_user_idx on public.players (user_id);

create table public.matches (
  match_id text primary key check (match_id ~ '^[A-Z0-9]+_[0-9]+$'),
  platform text not null,
  queue integer,
  game_version text,
  duration_s integer,
  start_ms bigint,
  timeline_status text not null check (timeline_status in ('ok','absente','invalide')),
  -- JSON Riot bruts dans un bucket privé, pour recalculer sans rappeler Riot
  raw_match_path text,
  raw_timeline_path text,
  checksum text,
  normalizer_version text not null,
  fetched_at timestamptz not null default now()
);

create table public.match_metrics (
  match_id text not null references public.matches (match_id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  role text check (role in ('TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY')),
  champion text,
  won boolean,
  valid boolean not null,
  invalid_reason text,
  metrics jsonb not null,
  metric_version text not null,
  computed_at timestamptz not null default now(),
  primary key (match_id, player_id)
);
create index match_metrics_player_idx on public.match_metrics (player_id, computed_at desc);

create table public.coaching_goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  metric text not null,
  role text not null check (role in ('TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY')),
  direction text not null check (direction in ('higher','lower')),
  baseline numeric not null,
  target numeric not null,
  reference jsonb,
  evaluation_games integer not null default 5 check (evaluation_games > 0),
  minimum_valid_games integer not null default 4,
  success_required integer not null default 3,
  version text not null,
  status text not null check (status in ('proposed','active','evaluating','achieved','failed','inconclusive','archived')),
  outcome text check (outcome in ('achieved','failed','inconclusive')),
  score numeric,
  factors jsonb,
  exercise text,
  created_at timestamptz not null default now(),
  active_at timestamptz,
  evaluating_at timestamptz,
  achieved_at timestamptz,
  failed_at timestamptz,
  inconclusive_at timestamptz,
  archived_at timestamptz,
  check (minimum_valid_games <= evaluation_games and success_required <= minimum_valid_games)
);
-- Un seul objectif actif ou en évaluation par joueur
create unique index coaching_goals_one_open on public.coaching_goals (player_id) where status in ('active','evaluating');

create table public.goal_evaluations (
  goal_id uuid not null references public.coaching_goals (id) on delete cascade,
  match_id text not null references public.matches (match_id) on delete cascade,
  counted boolean not null,
  value numeric,
  met boolean,
  reason text,
  evaluated_at timestamptz not null default now(),
  primary key (goal_id, match_id)
);

create table public.metric_references (
  role text not null,
  metric text not null,
  metric_version text not null,
  level text not null,
  region text not null,
  n integer not null check (n >= 0),
  p25 numeric, p50 numeric, p75 numeric, mad numeric,
  computed_at timestamptz not null default now(),
  primary key (role, metric, metric_version, level, region)
);

-- Synchronisations (COACH-005) : une seule en attente ou en cours par joueur
create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  status text not null check (status in ('queued','running','done','failed')),
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  matches_added integer,
  error text
);
create unique index sync_jobs_one_open on public.sync_jobs (player_id) where status in ('queued','running');

-- RLS partout
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_metrics enable row level security;
alter table public.coaching_goals enable row level security;
alter table public.goal_evaluations enable row level security;
alter table public.metric_references enable row level security;
alter table public.sync_jobs enable row level security;

create policy players_own on public.players for select to authenticated using (user_id = auth.uid());
create policy match_metrics_own on public.match_metrics for select to authenticated
  using (player_id in (select id from public.players where user_id = auth.uid()));
create policy matches_own on public.matches for select to authenticated
  using (exists (select 1 from public.match_metrics mm join public.players p on p.id = mm.player_id where mm.match_id = matches.match_id and p.user_id = auth.uid()));
create policy goals_own on public.coaching_goals for select to authenticated
  using (player_id in (select id from public.players where user_id = auth.uid()));
create policy evaluations_own on public.goal_evaluations for select to authenticated
  using (goal_id in (select g.id from public.coaching_goals g join public.players p on p.id = g.player_id where p.user_id = auth.uid()));
create policy sync_jobs_own on public.sync_jobs for select to authenticated
  using (player_id in (select id from public.players where user_id = auth.uid()));
-- Références agrégées (aucune donnée personnelle) : lisibles par tout utilisateur connecté
create policy references_read on public.metric_references for select to authenticated using (true);
