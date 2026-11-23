// 把資料庫裡所有事件（含 pending / dismissed）匯出成 automation/out/existing.json：
// 給 Claude 避免重複提出，也讓它比對已核准事件的資訊有沒有需要更新（用 id 指定 update_of）。
import { mkdirSync, writeFileSync } from 'node:fs';
import { adminClient, OUT_DIR } from './env';

const { data, error } = await adminClient()
  .from('events')
  .select('id, category, stakeholder, title, start_date, end_date, date_precision, date_label, confirmed, important, location, note, status, update_of')
  .order('start_date');
if (error) throw new Error(error.message);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/existing.json`, JSON.stringify(data, null, 1));
console.log(`匯出 ${data.length} 筆既有事件 → ${OUT_DIR}/existing.json`);
