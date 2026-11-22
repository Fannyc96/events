# 未來事件自動搜尋：給 Claude 的工作指示

你要替「未來事件追蹤」網站找出**今天以後**才會發生的重要事件，產生候選清單給人工審核。
今天的日期寫在啟動你的那段訊息裡（台灣時間）。

## 步驟

1. 讀 `automation/search-config.json`（分類說明、允許的網域、搜尋次數上限）。
2. 讀 `automation/out/existing.json`：已經在資料庫裡的事件（含已略過的）。**這些不要再提出來**。
3. 依序處理 6 個分類：`international`、`allied`、`adversary`、`cross_strait`、`defense`、`trade_tech`。每個分類：
   - 用 WebSearch 搜尋，**每次都要把 `allowed_domains` 設成設定檔的 `allowedDomains` 整份清單**。
     如果工具回報某些網域無法使用，把那些網域從清單拿掉後繼續，不要因此停下來。
   - 每個分類最多搜尋 `maxSearchesPerCategory` 次；必要時可以用 WebFetch 打開 1–2 篇文章確認日期，但不要更多。
   - 每個分類最多提出 `maxCandidatesPerCategory` 件，寧缺勿濫。找不到就是 0 件。
4. 把所有候選寫成 **一個 JSON 陣列**，用 Write 工具存到 `automation/out/candidates.json`。即使 0 件也要寫 `[]`。
   寫完後用 Read 檢查一次；有錯就用 Edit 修正。標題要乾淨，不要留下自問自答或修改痕跡（例：「二十大？不，二十一大」要寫成「中共二十一大」）。
5. 完成後，用一兩句話說明各分類找到幾件。

## 收錄標準

- 只收**今天以後**（結束日 ≥ 今天）才發生的事件，不收已經發生的新聞。
- 每件都要有來源文章的網址（`source_url`），而且必須是允許網域裡、你真的在搜尋結果中看到的網址。**不可以編造網址或日期。**
- 只收具體、有日期（至少能推到月份或季節）的事件；模糊的趨勢、評論不收。
- Fed FOMC 會議這類固定行程不用收（使用者每年手動輸入）。
- 與 `existing.json` 中同分類、日期相近、內容相同的事件不要重複提出。

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
