-- Notifications (Web Push) : abonnements des appareils et suivi des matchs en direct entre deux passages du Worker.
-- Aucune donnée de compte : l'adresse d'abonnement fournie par le navigateur, ses clés de chiffrement, les choix de
-- notifications et, si le joueur active les rappels du coach, le résumé de son objectif (intitulé, poste, cible, avancée).
-- Lu et écrit seulement par le Worker (clé de service) : RLS activé, aucune politique.

create table if not exists push_subs (
  endpoint   text primary key,
  p256dh     text not null,
  auth       text not null,
  matches    text not null default 'big' check (matches in ('big', 'fav', 'off')),
  fav_teams  text[] not null default '{}',
  coach      boolean not null default true,
  goal       jsonb,
  lang       text not null default 'fr' check (lang in ('fr', 'en')),
  created_at timestamptz not null default now(),
  seen_at    timestamptz not null default now(),
  coach_at   timestamptz
);
alter table push_subs enable row level security;

create table if not exists push_live (
  match_id   text primary key,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table push_live enable row level security;
