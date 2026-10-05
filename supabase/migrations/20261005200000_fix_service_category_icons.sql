-- Normalize service category icons to valid MaterialCommunityIcons names.
update public.service_categories
set icon = case name
  when 'Barber' then 'content-cut'
  when 'Nail Tech' then 'hand-wash-outline'
  else icon
end
where name in ('Barber', 'Nail Tech');
