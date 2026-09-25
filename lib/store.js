'use strict';
/**
 * Where the admin panel reads and writes files.
 *
 *   github  (production on Vercel)  every save is a commit to the site's repository,
 *                                   which makes Vercel rebuild and deploy. Nothing to
 *                                   provision; needs GITHUB_TOKEN and GITHUB_REPO.
 *   local   (dev, or a normal VPS)  files on disk; public/ is rebuilt after each save
 *                                   so the change is live immediately.
 *
 * Both expose: read(path) -> {text, sha} | null, write(path, text|Buffer, message) -> {sha, url}
 */
const fs = require('fs');
const path = require('path');
const { config } = require('./config');

const ALLOWED = [/^content\/(site|auth)\.json$/, /^site\/assets\/img\/uploads\/[A-Za-z0-9._-]+$/];
function guard(p) {
  if (!ALLOWED.some(re => re.test(p))) throw new Error(`path not allowed: ${p}`);
  return p;
}

// ---------------------------------------------------------------- GitHub
async function gh(method, url, body) {
  const res = await fetch(`${config.store.githubApi}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.store.githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'fds-admin',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return { status: 404, data: null };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.message ? data.message : `GitHub ${res.status}`;
    const err = new Error(msg); err.status = res.status; throw err;
  }
  return { status: res.status, data };
}

const github = {
  name: 'github',
  async read(p) {
    guard(p);
    const { repo, branch } = { repo: config.store.githubRepo, branch: config.store.githubBranch };
    const { status, data } = await gh('GET', `/repos/${repo}/contents/${p}?ref=${encodeURIComponent(branch)}`);
    if (status === 404 || !data) return null;
    const buf = Buffer.from(String(data.content || '').replace(/\n/g, ''), 'base64');
    return { text: buf.toString('utf8'), buffer: buf, sha: data.sha };
  },
  async write(p, content, message) {
    guard(p);
    const { repo, branch } = { repo: config.store.githubRepo, branch: config.store.githubBranch };
    const body = {
      message, branch,
      content: Buffer.isBuffer(content) ? content.toString('base64') : Buffer.from(String(content), 'utf8').toString('base64'),
      committer: { name: 'Footscray Dental Studio admin', email: 'admin@footscraydentalstudio.com.au' },
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      const existing = await this.read(p);
      if (existing) body.sha = existing.sha;
      try {
        const { data } = await gh('PUT', `/repos/${repo}/contents/${p}`, body);
        return { sha: data.content && data.content.sha, commit: data.commit && data.commit.sha,
                 url: data.commit && data.commit.html_url };
      } catch (e) {
        if (attempt === 0 && (e.status === 409 || e.status === 422)) continue; // sha raced, refetch once
        throw e;
      }
    }
    throw new Error('GitHub write failed after retry');
  },
  describe() { return `GitHub ${config.store.githubRepo}@${config.store.githubBranch}`; },
};

// ---------------------------------------------------------------- local disk
const local = {
  name: 'local',
  async read(p) {
    guard(p);
    const abs = path.join(config.root, p);
    if (!fs.existsSync(abs)) return null;
    const buf = fs.readFileSync(abs);
    return { text: buf.toString('utf8'), buffer: buf, sha: String(fs.statSync(abs).mtimeMs) };
  },
  async write(p, content, message) {
    guard(p);
    const abs = path.join(config.root, p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
    if (config.store.localRebuild && !p.startsWith('content/auth')) {
      // eslint-disable-next-line global-require
      require('../build/apply-content').build();
    }
    return { sha: String(fs.statSync(abs).mtimeMs), commit: null, url: null, message };
  },
  describe() { return `local disk (${config.root})`; },
};

function getStore() {
  if (config.store.kind === 'github') {
    if (!config.store.githubToken || !config.store.githubRepo) {
      throw new Error('CONTENT_STORE is github but GITHUB_TOKEN or GITHUB_REPO is not set');
    }
    return github;
  }
  return local;
}

module.exports = { getStore };
