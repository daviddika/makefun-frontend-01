// make.fun's public API: read-only GET requests, open to any origin (CORS).
// Full API: https://make.fun/api/openapi.json — agent docs: https://make.fun/llms.txt
//
// Cache: answers are kept in memory and revalidated with ETags. A response
// cached less than 60 s ago is reused without a request; older ones are sent
// with If-None-Match, so an unchanged answer costs a 304, not a full body.

const API = 'https://make.fun/api';
const FRESH_MS = 60000;
const cache = new Map();

async function get(path) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.at < FRESH_MS) return hit.body;
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) {
    hit.at = now;
    return hit.body;
  }
  if (!res.ok) throw new Error(`make.fun API ${res.status} for ${path}`);
  const body = await res.json();
  cache.set(path, { body, etag: res.headers.get('etag'), at: now });
  return body;
}

/** The open bounties, lightest shape the board needs (activity=times). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: ranked entries with judge win rates. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile: record, entries and payouts. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
