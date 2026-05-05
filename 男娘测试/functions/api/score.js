const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function cleanText(value, fallback, maxLength = 80) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function optionalNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeSubmissionId(value) {
  if (typeof value !== 'string') return crypto.randomUUID();
  const trimmed = value.trim();
  if (/^[a-zA-Z0-9_-]{8,120}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) return trimmed;
  return crypto.randomUUID();
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return json({ ok: false, error: 'D1 binding DB is not configured.' }, 503);
  }

  try {
    const stats = await env.DB.prepare(`
      SELECT
        COUNT(*) AS count,
        ROUND(AVG(score), 2) AS averageScore,
        MIN(score) AS minScore,
        MAX(score) AS maxScore,
        MAX(created_at) AS lastSubmittedAt
      FROM score_submissions
      WHERE is_spam = 0
    `).first();

    return json({ ok: true, stats });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ ok: false, error: 'D1 binding DB is not configured.' }, 503);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return json({ ok: false, error: 'Expected application/json.' }, 415);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const score = Number(body.score);
  const scoreMax = Number(body.scoreMax ?? 250);

  if (!Number.isFinite(score) || !Number.isFinite(scoreMax) || scoreMax <= 0 || scoreMax > 1000) {
    return json({ ok: false, error: 'Invalid score payload.' }, 400);
  }

  if (score < 0 || score > scoreMax) {
    return json({ ok: false, error: 'Score is out of range.' }, 400);
  }

  const id = safeSubmissionId(body.clientSubmissionId);
  const now = new Date().toISOString();
  const scorePercent = optionalNumber(body.scorePercent) ?? (score / scoreMax) * 100;

  try {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO score_submissions (
        id,
        score,
        score_max,
        score_percent,
        raw_score,
        raw_percent,
        stability_score,
        consistency_discount,
        is_spam,
        spam_status,
        duration_seconds,
        question_count,
        algorithm_version,
        question_version,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      Math.round(score),
      Math.round(scoreMax),
      scorePercent,
      optionalNumber(body.rawScore),
      optionalNumber(body.rawPercent),
      optionalNumber(body.stabilityScore),
      optionalNumber(body.consistencyDiscount),
      body.isSpam ? 1 : 0,
      Number.isFinite(Number(body.spamStatus)) ? Math.round(Number(body.spamStatus)) : 0,
      optionalNumber(body.durationSeconds),
      Number.isFinite(Number(body.questionCount)) ? Math.round(Number(body.questionCount)) : null,
      cleanText(body.algorithmVersion, 'classic_250_v1'),
      cleanText(body.questionVersion, 'unknown'),
      now
    ).run();

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
