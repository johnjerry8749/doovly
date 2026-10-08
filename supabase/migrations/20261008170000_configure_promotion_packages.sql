-- Configure the RevenueCat-backed service promotion products.
-- Prices remain in RevenueCat; duration is backend configuration used for fulfillment.
insert into public.promotion_packages
  (code, name, duration_days, product_id, active, sort_order)
values
  ('boost_2days', '2-Day Promotion', 2, 'boost_2days', true, 1),
  ('boost_5days', '5-Day Promotion', 5, 'boost_5days', true, 2),
  ('boost_14days', '14-Day Promotion', 14, 'boost_14days', true, 3),
  ('boost_30days', '30-Day Promotion', 30, 'boost_30days', true, 4)
on conflict (code) do update set
  name = excluded.name,
  duration_days = excluded.duration_days,
  product_id = excluded.product_id,
  active = excluded.active,
  sort_order = excluded.sort_order;