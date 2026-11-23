# 未來事件自動搜尋：給 Claude 的工作指示

你要替「未來事件追蹤」網站找出**今天（含）以後**才會發生的重要事件，產生候選清單給人工審核。
今天的日期、以及**這次只負責的一個分類**，寫在啟動你的那段訊息裡（台灣時間）。
6 個分類各由一個獨立的你同時處理，所以你只要專心做好被指定的那一個分類，其他分類不用管。

**搜尋範圍：今天起到未來 `lookaheadMonths` 個月**（見設定檔；若啟動訊息另外指定了月數，以啟動訊息為準）。不要只搜當月，範圍內每個月都要涵蓋到。

## 步驟

1. 讀 `automation/search-config.json`（分類說明、搜尋次數、搜尋範圍月數）。
2. 讀 `automation/out/existing.json`：已經在資料庫裡的事件（含已略過的）。**這些不要再提出來**。
3. 只處理啟動訊息指定的那一個分類（`category` 一律填它）。做法：
   - 用 WebSearch 搜尋，**不限網域**（不要設 `allowed_domains`）。來源優先採用官方網站（政府、國際組織、主辦單位）與主要媒體；
     避免內容農場、論壇、社群貼文。
   - **至少搜尋 `minSearchesPerCategory` 次、最多 `maxSearchesPerCategory` 次**。不要搜到一點就停；搜滿最少次數之前不要寫檔。
   - **每次用不同的關鍵字或子主題**，把分類說明裡的各項分開搜。例如 defense 分開搜「台灣軍演」「美日軍演」「軍購交付」；international 分開搜各個峰會、元首互訪、停火談判。
   - **語言**：台灣相關的分類（`cross_strait`、`defense`）要用**中文關鍵字**搜尋；其他分類中文、英文關鍵字都要用。
   - 關鍵字要帶上搜尋範圍內的月份或年份（例：「2026年12月」「January 2027」），範圍內的每個月都要涵蓋到。
   - 必要時可以用 WebFetch 打開 1–2 篇文章確認日期，但不要更多。
   - 最多提出 `maxCandidatesPerCategory` 件。值得追蹤的都提出來，由人工審核決定要不要留；真的找不到才是 0 件。
4. 把這個分類的候選寫成 **一個 JSON 陣列**，用 Write 工具存到 `automation/out/candidates.json`。即使 0 件也要寫 `[]`。
   寫完後用 Read 檢查一次；有錯就用 Edit 修正。標題要乾淨，不要留下自問自答或修改痕跡（例：「二十大？不，二十一大」要寫成「中共二十一大」）。

## 收錄標準

- 只收**今天（含今天）以後**才發生的事件（結束日 ≥ 今天），不收已經結束的事。
- 每件都要有來源文章的網址（`source_url`），必須是你真的在搜尋結果中看到的網址。**不可以編造網址或日期。**
- **日期還不確定但值得追蹤的事件也要收**：例如預計中的元首互訪、傳聞中的會談、依往年慣例推估的會議、只知道「年底前」「明年上半年」的期限。
  用 `approx`、`confirmed: false`，日期填合理推估的區間，並在 `ai_reason` 說明推估依據。
- 只有完全沒有時間線索的趨勢、評論、分析才不收。
- 與 `existing.json` 中同分類、日期相近、內容相同的事件不要重複提出。

## 分類規則

各分類的範圍見設定檔的 `categories`。容易混淆的幾條：

- **互訪與會談**依參與國家分類：
  - 中、俄、伊朗、北韓**彼此之間**（如習普會）→ `adversary`
  - 這四國任一國與**其他國家**（如美中、俄印）→ `international`
  - **完全不涉及**這四國（如美日、日韓）→ `allied`
- **軍演**：台灣自己的軍演、盟國的軍演 → 都放 `defense`。
- **台灣矚目社會案件**的行政與法律程序日期（開庭、宣判、羈押庭等）→ `cross_strait`。

## 每件候選的欄位

```json
{
  "category": "international | allied | adversary | cross_strait | defense | trade_tech",
  "stakeholder": "簡短的主角，例：美中、G7、立院、台、中、NATO",
  "title": "事件名稱，簡短，例：Summit、漢光演習、外長會議、國情咨文",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD（單日與 start_date 相同）",
  "date_precision": "day（單日）| range（多日）| approx（大致區間）",
  "date_label": "只有 approx 才需要，例：Aug/Sep、春、上半年、Dec；其他留空字串",
  "confirmed": true,
  "important": false,
  "location": "地點，沒有就 null",
  "note": "補充說明（繁體中文，一兩句），沒有就 null",
  "source_title": "媒體名稱・M/D，例：Reuters・11/20",
  "source_url": "https://...",
  "ai_reason": "日期可靠度的簡短說明（繁體中文），例：新聞寫明日期、官方公告、依往年推估、新聞只寫「12 月」"
}
```

- 日期不確定時用 `approx`，`start_date`／`end_date` 填可能的區間（例：只知道 12 月 → 12-01 到 12-31），並在 `ai_reason` 說明理由。
- `confirmed`：官方已公布日期才是 `true`；推估、傳聞、「預計」都是 `false`。
- `important`：只有對台灣或國際局勢有重大影響的才設 `true`（例：美中元首會、台灣大選、大型軍演）。
- 用語比照 `existing.json` 裡既有事件的風格（中英混用可以）。
