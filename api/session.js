import { kv } from '@vercel/kv';

const SESSION_TTL = 3600; // 1時間

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST /api/session → セッション作成
  if (req.method === 'POST') {
    const code = generateCode();
    const session = {
      code,
      status: 'waiting', // waiting | connected
      hostSDP: null,
      guestSDP: null,
      hostCandidates: [],
      guestCandidates: [],
      createdAt: Date.now(),
    };
    await kv.set(`session:${code}`, session, { ex: SESSION_TTL });
    return res.status(200).json({ code });
  }

  // GET /api/session?code=XXX → セッション取得
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code required' });
    const session = await kv.get(`session:${code}`);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    return res.status(200).json(session);
  }

  // DELETE /api/session?code=XXX → セッション削除（ホストが無効化）
  if (req.method === 'DELETE') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code required' });
    await kv.del(`session:${code}`);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}