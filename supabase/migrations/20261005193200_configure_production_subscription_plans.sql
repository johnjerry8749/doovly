insert into public.subscription_plans (mock_id,name,tagline,monthly_price,yearly_price,popular,sort_order)
values ('basic','Basic','Get started for free',0,0,false,0),('pro','Pro','Unlock more opportunities',2500,25000,true,1)
on conflict (mock_id) do update set name=excluded.name,tagline=excluded.tagline,monthly_price=excluded.monthly_price,yearly_price=excluded.yearly_price,popular=excluded.popular,sort_order=excluded.sort_order,updated_at=now();

update public.subscription_plan_features f set label=v.label,sort_order=v.sort_order
from (values
('b1','basic','Basic profile',0),('b2','basic','Browse service requests',1),('b3','basic','Limited applications (5 per month)',2),('b4','basic','Basic job filters',3),('b5','basic','Community support',4),
('p1','pro','Verified / featured profile',0),('p2','pro','Unlimited applications',1),('p3','pro','Advanced job filters',2),('p4','pro','Priority nearby job alerts',3),('p5','pro','Earnings & performance dashboard',4),('p6','pro','Portfolio boost',5),('p7','pro','Dedicated support',6)) v(mock_id,plan_mock_id,label,sort_order)
join public.subscription_plans p on p.mock_id=v.plan_mock_id
where f.plan_id=p.id and f.mock_id=v.mock_id;

insert into public.subscription_plan_features (mock_id,plan_id,label,sort_order)
select v.mock_id,p.id,v.label,v.sort_order
from (values
('b1','basic','Basic profile',0),('b2','basic','Browse service requests',1),('b3','basic','Limited applications (5 per month)',2),('b4','basic','Basic job filters',3),('b5','basic','Community support',4),
('p1','pro','Verified / featured profile',0),('p2','pro','Unlimited applications',1),('p3','pro','Advanced job filters',2),('p4','pro','Priority nearby job alerts',3),('p5','pro','Earnings & performance dashboard',4),('p6','pro','Portfolio boost',5),('p7','pro','Dedicated support',6)) v(mock_id,plan_mock_id,label,sort_order)
join public.subscription_plans p on p.mock_id=v.plan_mock_id
where not exists (select 1 from public.subscription_plan_features f where f.plan_id=p.id and f.mock_id=v.mock_id);

insert into public.subscription_plan_meta (promo_title,promo_subtitle,yearly_save_percent)
select 'Unlock more opportunities','Upgrade to get advanced tools, more visibility and grow your business faster.',17
where not exists (select 1 from public.subscription_plan_meta);