# 未來事件追蹤 — 給 Claude 的專案說明

把國際、兩岸、國防、經貿等未來事件，依分類排在時間軸上。手機優先。
網址：https://fannyc96.github.io/events/

## 規格出處（以這些為準）
- `SPEC.md`：所有需求。**開頭有 2026-11-21 的變更：不需要登入、沒有管理者，任何人都能新增／編輯／刪除／審核。**
  SPEC 裡寫「只有管理者看得到」的地方，一律當成「所有人都看得到、都能用」。
- `prototype-mobile.html`：已定案的手機版原型。這是設計工具的格式，不能直接執行：版面看 `<x-dc>`，排列邏輯看 `<script data-dc-script>` 的 `renderVals()`。
- `seed.sql`：資料表、RLS（開放權限）和 43 筆初始資料。`supabase/open-access.sql` 只用在「已經跑過舊版 seed.sql」的專案。
- 自動搜尋：見 SPEC 第 8 節開頭的變更說明（用訂閱額度、按鈕觸發、不排程）。

## 指令
```bash
npm install
npm run dev      # http://localhost:5173/events/（需要 .env.local）
npm test         # Vitest 單元測試
npm run build    # tsc 型別檢查 + vite build → dist/
npm run search:export   # 自動搜尋用（需要 Node 22+、SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY）
npm run search:import   # 另需 TODAY=YYYY-MM-DD
```

## 技術與架構
- Vite + React 18 + TypeScript（strict），不用路由、不用狀態管理套件。`App.tsx` 用 `useState` 管所有畫面狀態。
- Supabase：前端只用 anon key，權限全靠 RLS。`src/lib/api.ts` 是唯一碰資料庫的地方；寫入成功後呼叫 `reload()` 重抓全部資料（不做樂觀更新）。
- 部署：push 到 `main` → `.github/workflows/deploy.yml`（測試 → build → GitHub Pages）。Vite `base` 是 `/events/`。
- 自動搜尋流程：待審核頁「立即搜尋」→ Supabase Edge Function `supabase/functions/trigger-search`（持有 `GH_DISPATCH_TOKEN`，60 分鐘冷卻）→
  `.github/workflows/auto-search.yml`：`search:export` 匯出既有事件 → claude-code-action（`--model sonnet`，訂閱 token，只允許 WebSearch/WebFetch/Read/Write/Edit）
  依 `automation/prompt.md` 產生 `automation/out/candidates.json` → `search:import` 用 `src/lib/candidates.ts` 驗證＋去重後寫入 `pending`。
  - 調整搜尋：改 `automation/search-config.json`（允許網域、分類說明、次數上限）或 `automation/prompt.md`。
  - Edge Function 是 Deno，不在 tsconfig 範圍內；改了要到 Supabase 重新部署（JWT 驗證要關閉）。

```
src/lib/        純邏輯（不碰 React）：types、categories、dates、layout、form、candidates、api、supabase、searchTrigger
src/hooks/      useEvents、useSearchRun
scripts/        自動搜尋的匯出／匯入（tsx 執行）
automation/     搜尋設定與給 Claude 的指示；out/ 是暫存輸出（不進 git）
supabase/       open-access.sql、functions/trigger-search（Deno Edge Function）
src/components/ 每個畫面一個元件；cardStyle.ts 放卡片樣式
src/styles/global.css  所有 CSS；SPEC 第 3 節的中性色是 CSS 變數
```

## 慣例
- **候選事件的驗證與去重只寫在 `src/lib/candidates.ts`**，改規則要一起改 `candidates.test.ts`。
- **排列規則只寫在 `src/lib/layout.ts`**（細條、兩排卡片、+N、切斷），改規則時要一起改 `layout.test.ts`。
- 日期一律用 `YYYY-MM-DD` 字串，轉 Date 用 `parseDate()`（本地午夜），不要用 `new Date('2026-11-21')`（會變成 UTC）。「今天」以裝置本地時間為準。
- 分類的順序與顏色只在 `src/lib/categories.ts`；中性色在 `global.css` 的 `:root`。顏色都取自 nipponcolors.com。
- 樣式：固定的東西寫 class，依資料變動的值（grid-column、分類色）才用 inline style。
- 範圍只有「雙週」和「年」（2026-11-22 拿掉月視圖，見 SPEC 4.1 的變更）。程式裡 `Scale = 'week'` 代表雙週，週數由 `dates.ts` 的 `WEEK_SPAN` 控制；兩週之間有淡灰分隔線（`.week-divider`）。
- 尺寸照原型：雙週／年每欄 104px、分類標籤 30px、頂部列 52px、欄標題 34px。
- 6 個分類列平分畫面高度，永遠不垂直捲動；卡片排 `minmax(26px, 38px)`，畫面高度 ≤ 805px 時卡片文字只顯示 1 行。
- **主色 `--primary`（暫定 #77969A）**：所有主要按鈕（儲存、編輯、立即搜尋、核准、回到今天）、所有選中狀態（表單 chip、雙週／年、小日曆）、右下 ＋、開關、「今天」欄、連結。不要再寫死其他強調色。
- 頁首（底部的 TopBar、待審核標題列）底色是白練 `--page`。Stakeholder 標籤（事件詳情、待審核卡片一致）：白底＋2px 分類淺色框線。
- 表單：欄位標題、輸入、按鈕文字都是 14px（粗體的維持粗體）；必填欄位加黑色 `*`。為避免 iPhone 點輸入框自動放大，viewport 設了 `maximum-scale=1`。
- **頁首在畫面最下面**（時間軸的 TopBar、待審核頁的標題列都是），含 iPhone 底部安全區；小日曆與 ⋯ 選單從底部往上彈出，＋按鈕與 toast 位於頁首之上。待審核頁的「回時間軸」在標題列右邊，用時間軸圖示（`TimelineIcon`）。
- 底部面板（詳情、表單）的兩個按鈕：一左一右，各約半寬的 60%。
- 詳情：分類名稱用分類主色＋粗體；標題下的 tag 只顯示「未確定」（透明底虛線框）與「重要」（分類淺色底）；資料只列日期（只有 date_label）、地點、備註（無框）。
- 刪除前一定要先確認（`ConfirmDialog`）。
- UI 文字用繁體中文。
- **金鑰不進 git**：`.env.local` 已被 ignore；GitHub 上用 repo Secrets `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。`SUPABASE_SERVICE_ROLE_KEY`、`CLAUDE_CODE_OAUTH_TOKEN` 只能放在 GitHub Secrets；`GH_DISPATCH_TOKEN` 只放在 Supabase Edge Function Secrets。這些絕不能出現在前端。

## 已知取捨
- 權限完全開放：任何知道網址的人都能改或刪資料（使用者的決定）。
- `dismissed` 的事件 API 讀得到（RLS 的 SELECT 必須開放，否則「略過」會被擋），但網站 `fetchEvents` 只抓 approved / pending；自動搜尋用它去重。
- 待審核卡片不顯示新聞摘要（資料表沒有這個欄位，使用者決定不加）。
- 「立即搜尋」任何人都能按（使用者的決定），只靠「進行中不能按、60 分鐘冷卻」限制用量。
- `CLAUDE_CODE_OAUTH_TOKEN` 綁定使用者個人的 Claude 訂閱，搜尋會占用訂閱的使用額度。

## 進度
- [x] 第 1 步：專案骨架、Supabase、GitHub Pages 部署
- [x] 第 2 步：時間軸（週／月／年、小日曆、⋯ 選單、詳情、清單）
- [x] 第 3 步：新增、編輯、刪除（不做登入）
- [x] 第 4 步：待審核頁
- [x] 第 5 步：自動搜尋（按鈕觸發、訂閱額度，見上）
- [ ] **第 6 步（下一步）**：電腦版（寬螢幕欄寬平均分配、詳情與表單改成右側 420px 抽屜、頂部列加「新增事件」文字按鈕）與 PWA
