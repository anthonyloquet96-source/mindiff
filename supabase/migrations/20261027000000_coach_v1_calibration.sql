-- Coach V1, moteur goals-2 (correctifs prioritaires d'Anthony, 26/10/2026) et mode test privé.
--   - résultats d'un cycle : achieved, improving, stable, needs_review, failed, inconclusive ;
--   - cycles successifs d'un même objectif (chain_id, cycle), fenêtre de départ datée, garde-fous ;
--   - contrôle chronologique : un objectif ne peut pas être activé avant la fin de sa fenêtre de départ ;
--   - mode test privé : seuls les volontaires inscrits (consentement versionné, âge confirmé) utilisent le coach.
-- Conservation : données de jeu et objectifs supprimés en cascade avec le joueur (RGPD) ; retours des testeurs
-- conservés jusqu'à la fin du test privé puis supprimés (voir coach/CONFORMITE.md).

alter table public.coaching_goals drop constraint if exists coaching_goals_status_check;
alter table public.coaching_goals drop constraint if exists coaching_goals_outcome_check;
alter table public.coaching_goals add constraint coaching_goals_status_check
  check (status in ('proposed','active','evaluating','achieved','improving','stable','needs_review','failed','inconclusive','archived'));
alter table public.coaching_goals add constraint coaching_goals_outcome_check
  check (outcome in ('achieved','improving','stable','needs_review','failed','inconclusive'));

alter table public.coaching_goals
  add column chain_id text,
  add column cycle integer not null default 1 check (cycle >= 1),
  add column target_quantile numeric check (target_quantile > 0 and target_quantile < 1),
  add column personal_sd numeric check (personal_sd > 0),
  add column baseline_window jsonb,
  add column baseline_end_ms bigint,
  add column guardrails jsonb,
  add column engine_version text;
-- Aucune partie d'évaluation ne peut précéder la fin de la fenêtre de départ
alter table public.coaching_goals add constraint coaching_goals_chronologie
  check (active_at is null or baseline_end_ms is null or extract(epoch from active_at) * 1000 > baseline_end_ms);
create index coaching_goals_chain_idx on public.coaching_goals (chain_id, cycle);

alter table public.goal_evaluations
  add column guardrail_values jsonb,
  add column guardrail_breach boolean;

-- Mode test privé : 5 à 10 volontaires autorisés
create table public.pilot_testers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  invited_by text not null,
  consent_at timestamptz not null,
  consent_version text not null,
  age_confirmed boolean not null check (age_confirmed),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Retours des testeurs, un par cycle d'objectif
create table public.pilot_feedback (
  goal_id text primary key references public.coaching_goals (id) on delete cascade,
  relevance smallint check (relevance between 1 and 5),
  side_effects text[] not null default '{}',
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.pilot_testers enable row level security;
alter table public.pilot_feedback enable row level security;
create policy pilot_testers_own on public.pilot_testers for select to authenticated using (user_id = auth.uid());
create policy pilot_feedback_own on public.pilot_feedback for select to authenticated
  using (goal_id in (select g.id from public.coaching_goals g join public.players p on p.id = g.player_id where p.user_id = auth.uid()));
