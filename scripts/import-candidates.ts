// 讀 Claude 產生的候選清單，驗證＋去重後以 pending / auto 寫入資料庫。
// 6 個分類分開搜尋，各自的結果在 automation/out/parts/candidates-<分類>/candidates.json；
// 沒有 parts 資料夾時，讀 automation/out/candidates.json（本機測試用）。
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { planImport, planUpdates, type ExistingEvent, type UpdateTarget } from '../src/lib/candidates';
import { adminClient, OUT_DIR } from './env';

const today = process.env.TODAY;
if (!today) throw new Error('缺少環境變數 TODAY（YYYY-MM-DD）');

const config = JSON.parse(readFileSync('automation/search-config.json', 'utf8')) as { allowedDomains?: string[] };
const PARTS = `${OUT_DIR}/parts`;
const files = existsSync(PARTS)
  ? readdirSync(PARTS)
      .map((d) => `${PARTS}/${d}/candidates.json`)
      .filter((f) => existsSync(f))
  : [`${OUT_DIR}/candidates.json`].filter((f) => existsSync(f));
if (files.length === 0) throw new Error('找不到任何候選清單：所有分類的搜尋都失敗了，請看前面步驟的紀錄');

// 個別分類的檔案壞掉只略過那一份，不影響其他分類
const raws: unknown[] = [];
const fileNotes: string[] = [];
for (const f of files) {
  const name = f.split('/').slice(-2, -1)[0] ?? f;
  try {
    const arr = JSON.parse(readFileSync(f, 'utf8'));
    if (!Array.isArray(arr)) throw new Error('不是 JSON 陣列');
    raws.push(...arr);
    fileNotes.push(`${name}：${arr.length} 件`);
  } catch (e) {
    fileNotes.push(`${name}：⚠️ 檔案無法讀取（${(e as Error).message}）`);
  }
}

const db = adminClient();
// 重新讀一次（不用 existing.json），避免搜尋期間有人新增了事件
const { data: existing, error } = await db
  .from('events')
  .select('id, category, stakeholder, title, start_date, end_date, date_precision, date_label, confirmed, important, location, note, status, update_of');
if (error) throw new Error(error.message);

const domains = config.allowedDomains ?? [];
const isUpdate = (r: unknown) => !!(r as Record<string, unknown> | null)?.update_of;
// 新事件：去重時不看「更新建議」列（它們是既有事件的副本）
const plan = planImport(
  raws.filter((r) => !isUpdate(r)),
  (existing as UpdateTarget[]).filter((e) => !e.update_of) as ExistingEvent[],
  today,
  domains,
);
const updates = planUpdates(raws.filter(isUpdate), existing as UpdateTarget[], today, domains);

const rows = [
  ...plan.accepted.map((c) => ({ ...c, status: 'pending', origin: 'auto' })),
  ...updates.accepted.map((u) => ({ ...u.proposal, status: 'pending', origin: 'auto' })),
];
if (rows.length) {
  const { error: insErr } = await db.from('events').insert(rows);
  if (insErr) throw new Error(insErr.message);
}

const lines = [
  `## 自動搜尋結果（${today}）`,
  '',
  `Claude 提出 ${raws.length} 件：新事件 **${plan.accepted.length}** 件、更新建議 **${updates.accepted.length}** 件加入待審核，略過 ${plan.rejected.length + updates.rejected.length} 件。`,
  '',
  `各分類：${fileNotes.join('、')}`,
  '',
  ...plan.accepted.map((c) => `- ✅ [${c.category}] ${c.stakeholder ?? ''} ${c.title}（${c.date_label}）— ${c.ai_reason}`),
  ...updates.accepted.map((u) => `- 🔄 更新 ${u.proposal.stakeholder ?? ''} ${u.proposal.title}：${u.changed.join('、')} — ${u.proposal.ai_reason}`),
  ...[...plan.rejected, ...updates.rejected].map((r) => {
    const o = (r.raw ?? {}) as Record<string, unknown>;
    return `- ⏭️ ${String(o.stakeholder ?? '')} ${String(o.title ?? '(無標題)')}：${r.reason}`;
  }),
];
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
