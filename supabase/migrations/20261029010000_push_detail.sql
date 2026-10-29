-- Notifications : niveau de détail choisi par l'appareil (« essentiel » ou « detaille » : chaque tour, combats gagnés).
alter table push_subs add column if not exists detail text not null default 'essentiel' check (detail in ('essentiel', 'detaille'));
