// 把資料庫裡所有事件（含 pending / dismissed）匯出成 automation/out/existing.json，給 Claude 避免重複提出。
import { mkdirSync, writeFileSync } from 'node:fs';
import { adminClient, OUT_DIR } from './env';

const { data, error } = await adminClient()
  .from('events')
  .select('category, stakeholder, title, start_date, end_date, status')
  .order('start_date');
if (error) throw new Error(error.message);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/existing.json`, JSON.stringify(data, null, 1));
console.log(`匯出 ${data.length} 筆既有事件 → ${OUT_DIR}/existing.json`);
