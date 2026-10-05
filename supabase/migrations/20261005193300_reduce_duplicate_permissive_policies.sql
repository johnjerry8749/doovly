drop policy if exists "Pros can manage own portfolio" on public.portfolio_items;
create policy "Pros can insert own portfolio" on public.portfolio_items for insert to authenticated with check (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));
create policy "Pros can update own portfolio" on public.portfolio_items for update to authenticated using (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id)) with check (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));
create policy "Pros can delete own portfolio" on public.portfolio_items for delete to authenticated using (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));

drop policy if exists "Professionals can manage own services" on public.services;
create policy "Professionals can insert own services" on public.services for insert to authenticated with check (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = (select auth.uid())));
create policy "Professionals can update own services" on public.services for update to authenticated using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = (select auth.uid()))) with check (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = (select auth.uid())));
create policy "Professionals can delete own services" on public.services for delete to authenticated using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = (select auth.uid())));

drop policy if exists "Admins can manage plan features" on public.subscription_plan_features;
create policy "Admins can insert plan features" on public.subscription_plan_features for insert to authenticated with check (public.is_admin());
create policy "Admins can update plan features" on public.subscription_plan_features for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete plan features" on public.subscription_plan_features for delete to authenticated using (public.is_admin());