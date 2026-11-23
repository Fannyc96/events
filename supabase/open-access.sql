-- 只在「已經執行過舊版 seed.sql（有 admins 表、只有管理者能寫）」時才需要跑這份。
-- 它只改權限，不會動到資料。全新的專案直接跑 seed.sql 就好，不用跑這份。
--
-- 結果：任何人都能看 approved / pending 的事件，也能新增、編輯、刪除。
-- ⚠️ 取捨：任何知道網址的人都能改或刪資料。

drop policy if exists "public reads approved" on public.events;
drop policy if exists "admin writes" on public.events;
drop policy if exists "anyone reads visible" on public.events;
drop policy if exists "anyone inserts" on public.events;
drop policy if exists "anyone updates" on public.events;
drop policy if exists "anyone deletes" on public.events;

-- 讀取開放所有狀態：Postgres 會要求 UPDATE 後的資料列也符合 SELECT 規則，
-- 若只開放 approved/pending，「略過」（改成 dismissed）會被 RLS 擋下。網站本身只抓 approved/pending。
create policy "anyone reads visible" on public.events
  for select using (true);
create policy "anyone inserts" on public.events
  for insert with check (true);
create policy "anyone updates" on public.events
  for update using (status in ('approved', 'pending')) with check (true);
create policy "anyone deletes" on public.events
  for delete using (status in ('approved', 'pending'));

grant select, insert, update, delete on public.events to anon, authenticated;
-- 自動搜尋腳本用 service role（secret key）讀寫，需要另外授權
grant select, insert, update, delete on public.events to service_role;

-- 不再需要管理者機制
drop policy if exists "admin reads admins" on public.admins;
drop function if exists public.is_admin();
drop table if exists public.admins;
