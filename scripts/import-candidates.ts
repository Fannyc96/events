// 讀 Claude 產生的 automation/out/candidates.json，驗證＋去重後以 pending / auto 寫入資料庫。
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { planImport, type ExistingEvent } from '../src/lib/candidates';
import { adminClient, OUT_DIR } from './env';

const today = process.env.TODAY;
if (!today) throw new Error('缺少環境變數 TODAY（YYYY-MM-DD）');

const config = JSON.parse(readFileSync('automation/search-config.json', 'utf8')) as { allowedDomains?: string[] };
const file = `${OUT_DIR}/candidates.json`;
if (!existsSync(file)) throw new Error(`找不到 ${file}：Claude 沒有產生候選清單，請看上一步的紀錄`);

let raws: unknown;
try {
  raws = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  throw new Error(`${file} 不是合法的 JSON：${(e as Error).message}`);
}
if (!Array.isArray(raws)) throw new Error(`${file} 必須是 JSON 陣列`);

const db = adminClient();
// 重新讀一次（不用 existing.json），避免搜尋期間有人新增了事件
const { data: existing, error } = await db.from('events').select('category, stakeholder, title, start_date, end_date');
if (error) throw new Error(error.message);

const plan = planImport(raws, existing as ExistingEvent[], today, config.allowedDomains ?? []);

if (plan.accepted.length) {
  const rows = plan.accepted.map((c) => ({ ...c, status: 'pending', origin: 'auto' }));
  const { error: insErr } = await db.from('events').insert(rows);
  if (insErr) throw new Error(insErr.message);
}

const lines = [
  `## 自動搜尋結果（${today}）`,
  '',
  `Claude 提出 ${raws.length} 件，加入待審核 **${plan.accepted.length}** 件，略過 ${plan.rejected.length} 件。`,
  '',
  ...plan.accepted.map((c) => `- ✅ [${c.category}] ${c.stakeholder ?? ''} ${c.title}（${c.date_label}）— ${c.ai_reason}`),
  ...plan.rejected.map((r) => {
    const o = (r.raw ?? {}) as Record<string, unknown>;
    return `- ⏭️ ${String(o.stakeholder ?? '')} ${String(o.title ?? '(無標題)')}：${r.reason}`;
  }),
];
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
