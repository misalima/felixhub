alter table public.class_council_behaviors
  add constraint class_council_behaviors_category_check_v2
  check (category in (
    'excessive_talking',
    'inappropriate_phone_use',
    'peer_conflicts',
    'disrespect_or_coexistence_difficulty',
    'low_participation',
    'recurring_lateness',
    'sleeping_in_class',
    'frequently_out_of_class',
    'activities_not_completed',
    'other'
  )) not valid;

alter table public.class_council_behaviors
  validate constraint class_council_behaviors_category_check_v2;

alter table public.class_council_behaviors
  drop constraint class_council_behaviors_category_check;

alter table public.class_council_behaviors
  rename constraint class_council_behaviors_category_check_v2
  to class_council_behaviors_category_check;
