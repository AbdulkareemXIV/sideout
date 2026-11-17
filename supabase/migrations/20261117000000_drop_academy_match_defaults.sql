-- Match format and points per set belong to match mode (module 3), where the coach
-- chooses them for each match. They are not academy settings.

alter table public.academy
  drop column if exists default_best_of,
  drop column if exists default_set_points;
