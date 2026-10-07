const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('./db');
const QRCode = require('qrcode');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const publicOriginFallback = `http://localhost:${port}`;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};
const adminSessions = new Map();
const sessionLifetimeMs = 1000 * 60 * 60 * 12;
function getDb() {
  return db;
}

function publicOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || req.headers.host || `localhost:${port}`;
  return `${forwardedProto || (host.startsWith('localhost') ? 'http' : 'https')}://${host}`;
}

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return index === -1 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path || '/'}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0, sameSite: 'None', secure: true });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  res.end(body);
}

function safePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, publicOriginFallback).pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(root) ? resolved : null;
}

function serve(filePath, res) {
  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mime[extension] || 'application/octet-stream',
    'Cache-Control': ['.png', '.jpg', '.jpeg', '.webp', '.ico'].includes(extension) ? 'public, max-age=31536000, immutable' : 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveStatic(req, res) {
  const filePath = safePath(req.url);
  if (!filePath) return sendText(res, 403, 'Forbidden');
  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isFile()) return serve(filePath, res);
    const relative = filePath.slice(root.length + 1);
    const publicPath = path.resolve(root, 'public', relative);
    fs.stat(publicPath, (publicError, publicStats) => {
      if (publicError || !publicStats.isFile()) return sendText(res, 404, 'Not found');
      serve(publicPath, res);
    });
  });
}

function readBody(req, limit = 250000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON body.')); }
    });
    req.on('error', reject);
  });
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || origin === publicOrigin(req);
}

function adminEmail() {
  return String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
}

function getAdmin(req) {
  const token = cookies(req).admin_session;
  if (!token) return null;
  const session = adminSessions.get(token);
  if (!session || session.expiresAt < Date.now() || session.email !== adminEmail()) {
    if (token) adminSessions.delete(token);
    return null;
  }
  return session;
}

function requireAdmin(req, res) {
  const admin = getAdmin(req);
  if (!admin) {
    sendJson(res, 401, { error: 'Admin login required.' });
    return null;
  }
  return admin;
}

function cleanString(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

function isAllowedImage(value) {
  return /^https?:\/\//i.test(value) || value.startsWith('/') || /^data:image\/(?:png|jpe?g|webp);base64,/i.test(value);
}

function applicationRow(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    email: row.email,
    section: row.section,
    mobile: row.mobile || '',
    status: row.status,
    role: row.role || 'Member',
    reviewNote: row.review_note || '',
    reviewerEmail: row.reviewer_email || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCode: row.member_code || null
  };
}

function contentPayload(row) {
  if (!row) return null;
  try { return JSON.parse(row.content_json); } catch { return null; }
}

function newMemberCode() {
  const year = new Date().getFullYear();
  return `SV-${year}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function getManifesto() {
  const row = getDb().prepare('SELECT content_json FROM site_content WHERE content_key = ?').get('manifesto');
  return contentPayload(row);
}

async function handleApi(req, res) {
  const url = new URL(req.url, publicOriginFallback);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/health') return sendJson(res, 200, { ok: true });

  if (req.method === 'POST' && pathname === '/api/applications') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Cross-origin submissions are not accepted.' });
    try {
      const body = await readBody(req);
      const firstName = cleanString(body.firstName, 120);
      const email = cleanString(body.email, 255).toLowerCase();
      const section = cleanString(body.section, 120);
      const mobile = cleanString(body.mobile, 64);
      if (!firstName || !/^\S+@\S+\.\S+$/.test(email) || !section) return sendJson(res, 400, { error: 'Please provide your name, a valid email, and your section.' });
      getDb().prepare('INSERT INTO applications (first_name, email, section, mobile) VALUES (?, ?, ?, ?)').run(firstName, email, section, mobile || null);
      return sendJson(res, 201, { ok: true, message: 'Application received. The council team will review it soon.' });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/content/manifesto') {
    try { return sendJson(res, 200, { content: await getManifesto() }); } catch (error) { return sendJson(res, 500, { error: error.message }); }
  }

  if (req.method === 'POST' && pathname === '/api/analytics/manifesto-download') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Cross-origin analytics events are not accepted.' });
    const result = getDb().prepare("UPDATE site_metrics SET metric_value = metric_value + 1, updated_at = CURRENT_TIMESTAMP WHERE metric_key = 'manifesto_downloads'").run();
    if (!result.changes) return sendJson(res, 500, { error: 'Manifesto analytics metric is unavailable.' });
    const row = getDb().prepare("SELECT metric_value FROM site_metrics WHERE metric_key = 'manifesto_downloads'").get();
    return sendJson(res, 200, { ok: true, downloads: row.metric_value });
  }

  if (req.method === 'GET' && pathname === '/api/feedback/manifesto') {
    const rows = getDb().prepare('SELECT id, name, message, created_at FROM manifesto_feedback ORDER BY created_at DESC, id DESC LIMIT 50').all();
    return sendJson(res, 200, { comments: rows.map((row) => ({ id: row.id, name: row.name, message: row.message, createdAt: row.created_at })) });
  }

  if (req.method === 'POST' && pathname === '/api/feedback/manifesto') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Cross-origin feedback submissions are not accepted.' });
    try {
      const body = await readBody(req, 8000);
      const name = cleanString(body.name, 80) || 'Anonymous';
      const message = cleanString(body.message, 1200);
      if (!message) return sendJson(res, 400, { error: 'Please write a comment before submitting.' });
      const result = getDb().prepare('INSERT INTO manifesto_feedback (name, message) VALUES (?, ?)').run(name, message);
      return sendJson(res, 201, { ok: true, comment: { id: result.lastInsertRowid, name, message } });
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  if (req.method === 'POST' && pathname === '/api/admin/login') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Cross-origin login is not accepted.' });
    try {
      const body = await readBody(req, 10000);
      const email = cleanString(body.email, 255).toLowerCase();
      if (!email || !adminEmail() || email !== adminEmail()) return sendJson(res, 403, { error: 'That email is not authorized for admin access.' });
      const token = crypto.randomBytes(32).toString('hex');
      adminSessions.set(token, { email, expiresAt: Date.now() + sessionLifetimeMs });
      setCookie(res, 'admin_session', token, { maxAge: Math.floor(sessionLifetimeMs / 1000), sameSite: 'None', secure: true });
      return sendJson(res, 200, { ok: true, email });
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  if (req.method === 'POST' && pathname === '/api/admin/logout') {
    const token = cookies(req).admin_session;
    if (token) adminSessions.delete(token);
    clearCookie(res, 'admin_session');
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'GET' && pathname === '/api/admin/session') {
    const admin = getAdmin(req);
    return sendJson(res, 200, { authenticated: Boolean(admin), email: admin?.email || null });
  }

  if (pathname.startsWith('/api/admin/')) {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'GET' && pathname === '/api/admin/analytics/manifesto') {
      const row = getDb().prepare("SELECT metric_value, updated_at FROM site_metrics WHERE metric_key = 'manifesto_downloads'").get();
      return sendJson(res, 200, { downloads: row?.metric_value || 0, updatedAt: row?.updated_at || null });
    }

    if (req.method === 'GET' && pathname === '/api/admin/feedback/manifesto') {
      const rows = getDb().prepare('SELECT id, name, message, created_at FROM manifesto_feedback ORDER BY created_at DESC, id DESC LIMIT 200').all();
      return sendJson(res, 200, { comments: rows.map((row) => ({ id: row.id, name: row.name, message: row.message, createdAt: row.created_at })) });
    }

    const feedbackDeleteMatch = pathname.match(/^\/api\/admin\/feedback\/manifesto\/(\d+)$/);
    if (req.method === 'DELETE' && feedbackDeleteMatch) {
      const result = getDb().prepare('DELETE FROM manifesto_feedback WHERE id = ?').run(Number(feedbackDeleteMatch[1]));
      if (!result.changes) return sendJson(res, 404, { error: 'Comment not found.' });
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/admin/applications') {
      const status = cleanString(url.searchParams.get('status') || '', 20);
      const rows = getDb().prepare(`
        SELECT a.*, m.member_code, m.role
        FROM applications a
        LEFT JOIN memberships m ON m.application_id = a.id
        ${status ? 'WHERE a.status = ?' : ''}
        ORDER BY a.created_at DESC
      `).all(...(status ? [status] : []));
      return sendJson(res, 200, { applications: rows.map(applicationRow) });
    }

    if (req.method === 'GET' && pathname === '/api/admin/memberships') {
      const rows = getDb().prepare('SELECT * FROM memberships ORDER BY approved_at DESC').all();
      return sendJson(res, 200, { memberships: rows.map((row) => ({ id: row.id, memberCode: row.member_code, firstName: row.first_name, email: row.email, section: row.section, mobile: row.mobile || '', role: row.role || 'Member', status: row.status, approvedAt: row.approved_at })) });
    }

    if (req.method === 'GET' && pathname === '/api/admin/content/manifesto') {
      return sendJson(res, 200, { content: await getManifesto() });
    }

    if (req.method === 'PUT' && pathname === '/api/admin/content/manifesto') {
      const body = await readBody(req, 2500000);
      const content = {
        kicker: cleanString(body.kicker, 160),
        title: cleanString(body.title, 300),
        intro: cleanString(body.intro, 5000),
        sections: Array.isArray(body.sections) ? body.sections.slice(0, 20).map((section) => ({ heading: cleanString(section.heading, 160), body: cleanString(section.body, 5000) })).filter((section) => section.heading || section.body) : [],
        closing: cleanString(body.closing, 3000),
        photos: Array.isArray(body.photos) ? body.photos.slice(0, 8).map((photo) => cleanString(photo, 500000)).filter(isAllowedImage) : []
      };
      getDb().prepare('INSERT INTO site_content (content_key, content_json) VALUES (?, ?) ON CONFLICT(content_key) DO UPDATE SET content_json = excluded.content_json').run('manifesto', JSON.stringify(content));
      return sendJson(res, 200, { ok: true, content });
    }

    const decisionMatch = pathname.match(/^\/api\/admin\/applications\/(\d+)\/decision$/);
    if (req.method === 'POST' && decisionMatch) {
      const applicationId = Number(decisionMatch[1]);
      const body = await readBody(req, 20000);
      const decision = body.decision === 'accepted' ? 'accepted' : body.decision === 'rejected' ? 'rejected' : null;
      if (!decision) return sendJson(res, 400, { error: 'Decision must be accepted or rejected.' });
      const reviewNote = cleanString(body.reviewNote, 2000);
      const role = cleanString(body.role, 120) || 'Member';
      try {
        const decisionTransaction = getDb().transaction(() => {
          const application = getDb().prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
          if (!application) return null;
          let memberCode = null;
          if (decision === 'accepted') {
            const existing = getDb().prepare('SELECT member_code FROM memberships WHERE application_id = ?').get(applicationId);
            memberCode = existing?.member_code || newMemberCode();
            if (!existing) {
              getDb().prepare('INSERT INTO memberships (application_id, member_code, first_name, email, section, mobile, role) VALUES (?, ?, ?, ?, ?, ?, ?)').run(applicationId, memberCode, application.first_name, application.email, application.section, application.mobile || null, role);
            } else {
              getDb().prepare('UPDATE memberships SET role = ? WHERE application_id = ?').run(role, applicationId);
            }
          }
          getDb().prepare('UPDATE applications SET status = ?, review_note = ?, reviewer_email = ? WHERE id = ?').run(decision, reviewNote || null, admin.email, applicationId);
          return memberCode;
        });
        const memberCode = decisionTransaction();
        if (memberCode === null && !getDb().prepare('SELECT id FROM applications WHERE id = ?').get(applicationId)) return sendJson(res, 404, { error: 'Application not found.' });
        return sendJson(res, 200, { ok: true, decision, memberCode });
      } catch (error) {
        return sendJson(res, 400, { error: error.message });
      }
    }
  }

  const membershipMatch = pathname.match(/^\/api\/memberships\/([A-Za-z0-9-]+)$/);
  if (req.method === 'GET' && membershipMatch) {
    const rows = [getDb().prepare('SELECT member_code, first_name, section, role, status, approved_at FROM memberships WHERE member_code = ?').get(membershipMatch[1])].filter(Boolean);
    const member = rows[0];
    if (!member || member.status !== 'active') return sendJson(res, 404, { error: 'Membership not found or inactive.' });
    return sendJson(res, 200, { member: { memberCode: member.member_code, firstName: member.first_name, section: member.section, role: member.role || 'Member', status: member.status, approvedAt: member.approved_at } });
  }

  const qrMatch = pathname.match(/^\/api\/memberships\/([A-Za-z0-9-]+)\/qr$/);
  if (req.method === 'GET' && qrMatch) {
    const rows = [getDb().prepare('SELECT member_code, status FROM memberships WHERE member_code = ?').get(qrMatch[1])].filter(Boolean);
    if (!rows[0] || rows[0].status !== 'active') return sendJson(res, 404, { error: 'Membership not found or inactive.' });
    const verifyUrl = `${publicOrigin(req)}/verify.html?code=${encodeURIComponent(qrMatch[1])}`;
    const dataUrl = await QRCode.toDataURL(verifyUrl, { width: 260, margin: 1, color: { dark: '#2419dc', light: '#ffffff' } });
    return sendJson(res, 200, { dataUrl, verifyUrl });
  }

  return sendJson(res, 404, { error: 'API route not found.' });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) return await handleApi(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method not allowed');
    return serveStatic(req, res);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: 'Unexpected server error.' });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Sri Vishnu site listening on 0.0.0.0:${port}`));
