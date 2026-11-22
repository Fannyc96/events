-- 未來事件追蹤：資料表、權限與初始資料
-- 初始資料來自 Future_Events_2026.mw（更新：2026-03-22），共 43 筆
-- 轉換規則：#d → important；標題含「?」→ confirmed=false；@地點／host → location；縮排行 → note
-- 大致日期：春＝3–5 月、上半年＝1–6 月、只寫年份＝整年、「2/28-」＝2/28–4/30
-- 注意：原檔 FOMC 一行日期為 12/08–09，但顯示文字寫「1/27-28」，此處採 12/8-9

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('international','allied','adversary','cross_strait','defense','trade_tech')),
  stakeholder text,
  title text not null,
  start_date date not null,
  end_date date not null,
  date_precision text not null check (date_precision in ('day','range','approx')),
  date_label text not null,
  confirmed boolean not null default true,
  important boolean not null default false,
  location text,
  note text,
  status text not null default 'approved' check (status in ('pending','approved','dismissed')),
  origin text not null default 'manual' check (origin in ('manual','auto','import')),
  source_title text,
  source_url text,
  ai_reason text,            -- 自動搜尋時 AI 對日期可靠度的說明，例如「新聞寫明日期」「依往年推估」
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists events_range_idx on public.events (status, start_date, end_date);

-- 權限（不需登入）：任何人都能看已核准與待審核的事件，也能新增、編輯、刪除。
-- dismissed（已略過）前端看不到，只給自動搜尋腳本（service role，不受 RLS 限制）拿來去重。
-- ⚠️ 取捨：任何知道網址的人都能改或刪資料。
alter table public.events enable row level security;

drop policy if exists "public reads approved" on public.events;
drop policy if exists "admin writes" on public.events;
drop policy if exists "anyone reads visible" on public.events;
drop policy if exists "anyone inserts" on public.events;
drop policy if exists "anyone updates" on public.events;
drop policy if exists "anyone deletes" on public.events;

create policy "anyone reads visible" on public.events
  for select using (status in ('approved', 'pending'));
create policy "anyone inserts" on public.events
  for insert with check (true);
create policy "anyone updates" on public.events
  for update using (status in ('approved', 'pending')) with check (true);
create policy "anyone deletes" on public.events
  for delete using (status in ('approved', 'pending'));

grant select, insert, update, delete on public.events to anon, authenticated;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

insert into public.events
  (category, stakeholder, title, start_date, end_date, date_precision, date_label, confirmed, important, location, note, status, origin)
values
  ('international', '美伊', '戰爭持續中，川普初估5週', '2026-02-28', '2026-04-30', 'approx', '2/28-', true, true, null, null, 'approved', 'import'),
  ('international', '美中', '川普訪中? 延長貿易休戰協議1年?', '2026-05-01', '2026-05-31', 'approx', 'May', false, true, null, null, 'approved', 'import'),
  ('international', 'ASEAN', 'Summit', '2026-05-01', '2026-05-31', 'approx', 'May', true, false, '菲（host）', null, 'approved', 'import'),
  ('international', 'Multi', 'Shangri-La Dialogue', '2026-05-29', '2026-05-31', 'range', '5/29-31', true, false, '新加坡', null, 'approved', 'import'),
  ('international', 'G7', 'Summit', '2026-06-14', '2026-06-16', 'range', '6/14-16', true, false, 'France', null, 'approved', 'import'),
  ('international', '中南美', 'Summit of the Americas', '2026-01-01', '2026-12-31', 'approx', '2026', true, false, 'Dominican Republic（host）', null, 'approved', 'import'),
  ('international', 'NATO', 'Summit', '2026-07-07', '2026-07-08', 'range', '7/7-8', true, false, 'Turkey', null, 'approved', 'import'),
  ('international', '美中', '習訪美?', '2026-08-01', '2026-09-30', 'approx', 'Aug/Sep', false, true, null, null, 'approved', 'import'),
  ('international', 'UN', 'General Assembly’s High-Level Debate', '2026-09-22', '2026-09-22', 'day', '9/22', true, false, null, 'successor of the Secretary General?', 'approved', 'import'),
  ('international', 'ASEAN', 'Summit (main one)', '2026-10-01', '2026-10-31', 'approx', 'October', true, false, '菲（host）', null, 'approved', 'import'),
  ('international', '中', '主辦APEC', '2026-11-18', '2026-11-19', 'range', '11/18-19', true, true, '深圳', null, 'approved', 'import'),
  ('international', 'G20', 'summit', '2026-12-14', '2026-12-15', 'range', '12/14-15', true, false, 'Mar-a-Lago', null, 'approved', 'import'),
  ('allied', '巴西', '大選', '2026-10-04', '2026-10-04', 'day', '10/4', true, false, null, null, 'approved', 'import'),
  ('allied', '以', 'Primer Election', '2026-10-01', '2026-10-31', 'approx', 'October', true, false, null, null, 'approved', 'import'),
  ('allied', '美', 'midterm election', '2026-11-03', '2026-11-03', 'day', '11/3', true, true, null, 'all 435 seats in the U.S. House of Representatives and 35 of the 100 seats in the U.S. Senate will be elected', 'approved', 'import'),
  ('allied', '美', 'Olympics', '2028-01-01', '2028-12-31', 'approx', '2028', true, false, 'US', null, 'approved', 'import'),
  ('adversary', 'BRICS', 'Summit', '2026-09-01', '2026-09-30', 'approx', 'Sep?', false, false, 'India（host）', null, 'approved', 'import'),
  ('adversary', '中', '毛澤東逝世50週年', '2026-09-09', '2026-09-09', 'day', '9/9', true, false, null, null, 'approved', 'import'),
  ('adversary', '中', '五中全會？', '2026-01-01', '2026-12-31', 'approx', '2026', false, true, null, null, 'approved', 'import'),
  ('cross_strait', '立院', '國防預算條例委員會審查', '2026-03-23', '2026-03-26', 'range', '3/23, 25, 26', true, true, null, null, 'approved', 'import'),
  ('cross_strait', '台', '立院台美貿易協定verify（併特別預算爭議）', '2026-03-01', '2026-05-31', 'approx', '春', true, true, null, null, 'approved', 'import'),
  ('cross_strait', '藍白合', '新北、宜蘭、嘉義市民調', '2026-03-01', '2026-05-31', 'approx', '春', true, false, null, null, 'approved', 'import'),
  ('cross_strait', '立院', '民眾黨團不在籍投票協商', '2026-03-01', '2026-05-31', 'approx', '春', true, false, null, null, 'approved', 'import'),
  ('cross_strait', '立院', '總統彈劾案投票', '2026-05-19', '2026-05-19', 'day', '5/19', true, false, null, null, 'approved', 'import'),
  ('cross_strait', '鄭習會', '鄭習會、比前往華府優先', '2026-01-01', '2026-06-30', 'approx', '上半年', true, true, null, null, 'approved', 'import'),
  ('cross_strait', '台', '國慶演說', '2026-10-10', '2026-10-10', 'day', '10/10', true, false, null, null, 'approved', 'import'),
  ('cross_strait', '兩岸', '孫中山160週年誕辰，中國政協舉辦紀念大會', '2026-11-12', '2026-11-12', 'day', '11/12', true, false, null, null, 'approved', 'import'),
  ('cross_strait', '台灣', '縣市長選舉', '2026-11-28', '2026-11-28', 'day', '11/28', true, true, null, null, 'approved', 'import'),
  ('trade_tech', '中', '初步批准H200購買許可給字節跳動、騰訊、阿里巴巴及Deepseek', '2026-03-17', '2026-03-17', 'day', '3/17', true, false, null, null, 'approved', 'import'),
  ('trade_tech', '美', 'FED FOMC會議', '2026-04-28', '2026-04-29', 'range', '4/28-29', true, false, null, null, 'approved', 'import'),
  ('trade_tech', '美', 'Fed Chair Jerome Powell EOT', '2026-05-01', '2026-05-31', 'approx', 'May', true, false, null, 'list: 聯準會前理事 Kevin Warsh、白宮國家經濟會議主席 Kevin Hassett、聯準會理事Christopher Waller、BlackRock固定收益投資長Rick Rieder，印象裡2月底可安插人進去', 'approved', 'import'),
  ('trade_tech', '美', 'SpaceX IPO', '2026-06-01', '2026-06-30', 'approx', 'Jun', true, false, null, null, 'approved', 'import'),
  ('trade_tech', '美', 'FED FOMC會議(新任主席上任後首次會議)', '2026-06-16', '2026-06-17', 'range', '6/16-17', true, false, null, null, 'approved', 'import'),
  ('trade_tech', '美', 'USMCA expiration', '2026-07-01', '2026-07-01', 'day', '7/1', true, false, null, null, 'approved', 'import'),
  ('trade_tech', '美', 'FED FOMC會議', '2026-10-27', '2026-10-28', 'range', '10/27-28', true, false, null, null, 'approved', 'import'),
  ('trade_tech', '美', 'FED FOMC會議', '2026-12-08', '2026-12-09', 'range', '12/8-9', true, false, null, null, 'approved', 'import'),
  ('defense', '台美', 'MQ-9B首批交機', '2026-03-17', '2026-03-17', 'day', '3/17', true, false, '美', null, 'approved', 'import'),
  ('defense', '台', '漢光演習兵推，中央聯合應變中心參與6天3階段', '2026-04-10', '2026-04-24', 'range', '4/10-24', true, false, null, null, 'approved', 'import'),
  ('defense', '台', '海鯤號交艦?', '2026-06-01', '2026-06-30', 'approx', 'June', false, false, null, '現置重點於「主機與電力管理系統」及「整合式儎台管理系統（IPMS）」
向美方租借操雷驗證設備，租期至2026/05', 'approved', 'import'),
  ('defense', '台', '濱海作戰指揮部（Littoral Combat Command）deployed', '2026-07-01', '2026-07-31', 'approx', 'July', true, false, null, null, 'approved', 'import'),
  ('defense', '台', '漢光演習', '2026-08-05', '2026-08-14', 'range', '8/5-14', true, true, null, null, 'approved', 'import'),
  ('defense', '台', '台北國防展', '2026-09-01', '2026-09-30', 'approx', 'September', true, true, null, null, 'approved', 'import'),
  ('defense', '美台', 'USTBC Annual Conference', '2026-10-01', '2026-10-31', 'approx', 'October', true, false, null, null, 'approved', 'import');
