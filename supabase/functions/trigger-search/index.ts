// Supabase Edge Function：網站「立即搜尋」按鈕呼叫這裡，再由這裡觸發 GitHub Actions 的 auto-search.yml。
// GitHub token 只存在 Supabase 的 Edge Function Secrets（GH_DISPATCH_TOKEN），不會出現在網站上。
//
// GET  → 回傳最近一次搜尋的狀態
// POST → 觸發搜尋；搜尋進行中、或距離上次不到 60 分鐘時拒絕
//
// 部署時要關掉 JWT 驗證（網站用的是 publishable key，不是 JWT）。

const REPO = Deno.env.get('GH_REPO') ?? 'Fannyc96/events';
const WORKFLOW = 'auto-search.yml';
const COOLDOWN_MINUTES = 60;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

interface Run {
  status: string; // queued | in_progress | completed ...
  conclusion: string | null; // success | failure | cancelled ...
  created_at: string;
  updated_at: string;
  html_url: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const token = Deno.env.get('GH_DISPATCH_TOKEN');
  if (!token) return json({ ok: false, message: '伺服器尚未設定 GH_DISPATCH_TOKEN' }, 500);

  const gh = (path: string, init: RequestInit = {}) =>
    fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'events-trigger-search',
        ...(init.headers ?? {}),
      },
    });

  const runsRes = await gh('/runs?per_page=1');
  if (!runsRes.ok) return json({ ok: false, message: `讀取 GitHub 狀態失敗（${runsRes.status}）` }, 502);
  const latest: Run | null = (await runsRes.json()).workflow_runs?.[0] ?? null;
  const lastRun = latest && {
    status: latest.status,
    conclusion: latest.conclusion,
    created_at: latest.created_at,
    updated_at: latest.updated_at,
    html_url: latest.html_url,
  };

  if (req.method === 'GET') return json({ ok: true, lastRun });
  if (req.method !== 'POST') return json({ ok: false, message: 'Method not allowed' }, 405);

  if (latest && latest.status !== 'completed') {
    return json({ ok: false, message: '搜尋正在進行中，請稍候', lastRun }, 409);
  }
  if (latest) {
    const mins = (Date.now() - new Date(latest.created_at).getTime()) / 60000;
    if (mins < COOLDOWN_MINUTES) {
      return json({ ok: false, message: `每小時只能搜尋一次，請 ${Math.ceil(COOLDOWN_MINUTES - mins)} 分鐘後再試`, lastRun }, 429);
    }
  }

  const dispatch = await gh('/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main' }) });
  if (!dispatch.ok) {
    return json({ ok: false, message: `觸發失敗（GitHub ${dispatch.status}）：${await dispatch.text()}` }, 502);
  }
  return json({ ok: true, message: '已開始搜尋，大約 5–10 分鐘完成', lastRun });
});
