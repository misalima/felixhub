alter table public.class_councils
  alter column criteria set default '{"low_grade_threshold": 6, "low_grade_subject_alert_count": 4, "low_attendance_threshold": 80}'::jsonb;

update public.class_councils
set criteria = jsonb_set(criteria, '{low_attendance_threshold}', '80'::jsonb, true)
where coalesce((criteria ->> 'low_attendance_threshold')::numeric, 0) <> 80;
