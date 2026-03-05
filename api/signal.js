import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { code, role, type, data } = req.body;
  if (!code || !role || !type) return res.status(400).json({ error: 'Missing fields' });

  const session = await kv.get(`session:${code}`);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // SDPのセット
  if (type === 'sdp') {
    if (role === 'host') session.hostSDP = data;
    if (role === 'guest') {
      session.guestSDP = data;
      session.status = 'connected';
    }
  }

  // ICE candidateの追加
  if (type === 'candidate') {
    if (role === 'host') session.hostCandidates.push(data);
    if (role === 'guest') session.guestCandidates.push(data);
  }

  await kv.set(`session:${code}`, session, { ex: 3600 });
  return res.status(200).json({ ok: true });
}