// The four surfaces, each a function from live API data to HTML.
// Every value from the API is escaped; images the API points at load with
// crossorigin="anonymous" set before src (make.fun images send
// Cross-Origin-Resource-Policy: same-origin).

import { bytes, date, esc, isOpen, money, timeLeft, winRate } from './format.js';

/** The live pot: prize plus entry fees paid into it. */
export function pot(b) {
  return money(b.potUsd ?? b.rewardAmount ?? b.reward_usd) || '—';
}

/** Absolute URL for an avatar the API names (relative or absolute). */
export function avatarUrl(u) {
  if (!u) return '';
  return u.startsWith('http') ? u : 'https://make.fun' + u;
}

function avatarImg(u, handle) {
  const src = avatarUrl(u);
  if (!src) return `<span class="avatar-fallback" aria-hidden="true">${esc((handle || '?')[0].toUpperCase())}</span>`;
  return `<img class="avatar" crossorigin="anonymous" src="${esc(src)}" alt="" loading="lazy">`;
}

function bountyMeta(b) {
  const open = isOpen(b);
  return `<p class="meta"><span class="pot">${esc(pot(b))} pot</span>`
    + (b.entryFeeUsd ? `<span>Fee ${esc(money(b.entryFeeUsd))}</span>` : '<span>No entry fee</span>')
    + `<span>${esc(timeLeft(b.deadline))}</span>`
    + `<span><b>${Number(b.submissionCount ?? 0).toLocaleString('en-US')}</b> ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>`
    + `<span class="badge ${open ? 'open' : 'ended'}">${open ? 'Open' : 'Ended'}</span></p>`;
}

/** Board: every live bounty, filterable and sortable, pot / fee / time left / entries on each card. */
export function board(items, state) {
  const q = state.query.trim().toLowerCase();
  let list = items.filter((b) => {
    if (state.filter === 'open' && !isOpen(b)) return false;
    if (state.filter === 'soon' && (!isOpen(b) || new Date(b.deadline).getTime() - Date.now() > 48 * 3600000)) return false;
    if (state.filter === 'ended' && isOpen(b)) return false;
    if (q && !(b.title + ' ' + (b.category || '') + ' ' + (b.skills || []).join(' ')).toLowerCase().includes(q)) return false;
    return true;
  });
  list = list.slice().sort((a, b) => {
    if (state.sort === 'pot') return Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0);
    if (state.sort === 'entries') return (b.submissionCount || 0) - (a.submissionCount || 0);
    return new Date(a.deadline) - new Date(b.deadline);
  });
  const openCount = items.filter(isOpen).length;
  const cards = list.map((b) => `
    <li class="card">
      <h2><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h2>
      ${bountyMeta(b)}
      <p class="tags">${esc(b.category || '')}${b.skills && b.skills.length ? ' · ' + esc(b.skills.slice(0, 4).join(', ')) : ''}</p>
      <p class="row"><a href="#/bounty/${encodeURIComponent(b.slug)}">Details</a><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a></p>
    </li>`).join('');
  return `<h1>Live bounties</h1>
  <p class="lede">${openCount} open now, ${items.length} listed · pot = prize + entry fees paid in.</p>
  <div class="toolbar" role="search">
    <label class="visually-hidden" for="q">Search bounties</label>
    <input id="q" type="search" placeholder="Search title, category or skill…" value="${esc(state.query)}">
    <label class="visually-hidden" for="sort">Sort by</label>
    <select id="sort">
      <option value="deadline"${state.sort === 'deadline' ? ' selected' : ''}>Closing soonest</option>
      <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Biggest pot</option>
      <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
    </select>
    <button class="chip" data-filter="all" aria-pressed="${state.filter === 'all'}">All</button>
    <button class="chip" data-filter="open" aria-pressed="${state.filter === 'open'}">Open now</button>
    <button class="chip" data-filter="soon" aria-pressed="${state.filter === 'soon'}">Ending &lt; 48h</button>
    <button class="chip" data-filter="ended" aria-pressed="${state.filter === 'ended'}">Ended</button>
  </div>
  <p class="muted" role="status">${list.length} ${list.length === 1 ? 'bounty' : 'bounties'}</p>
  ${list.length ? `<ul class="board">${cards}</ul>` : '<p>No bounties match. Try another search or filter.</p>'}`;
}

/** Rewards table: live amounts per place, from rewardsNow when present. */
export function rewardsTable(b) {
  const rows = (b.rewardsNow || []).map((r) => `<tr><td>#${esc(r.place)}</td><td class="num">${esc(money(r.amountUsd))}</td></tr>`).join('');
  if (rows) return `<table><thead><tr><th scope="col">Place</th><th scope="col" class="num">Prize now</th></tr></thead><tbody>${rows}</tbody></table>`;
  const obj = b.rewards || {};
  const keys = Object.keys(obj).sort((a, c) => Number(a) - Number(c));
  if (!keys.length) return '<p class="muted">No prize table published.</p>';
  return `<table><thead><tr><th scope="col">Place</th><th scope="col" class="num">Prize</th></tr></thead><tbody>`
    + keys.map((k) => `<tr><td>#${esc(k)}</td><td class="num">${esc(money(obj[k]))}</td></tr>`).join('') + '</tbody></table>';
}

/** One bounty's page: summary, description, rewards with live pot, dates, status. */
export function bountyPage(b) {
  const open = isOpen(b);
  return `<p><a href="#/">← All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  <p class="lede">${esc(b.summary || '')}</p>
  ${bountyMeta(b)}
  <dl class="facts">
    <div><dt>Live pot</dt><dd>${esc(pot(b))}</dd></div>
    <div><dt>Entry fee</dt><dd>${b.entryFeeUsd ? esc(money(b.entryFeeUsd)) : 'Free'}</dd></div>
    <div><dt>Deadline</dt><dd>${esc(date(b.deadline))}</dd></div>
    <div><dt>Status</dt><dd>${open ? 'Open for entries' : 'Closed'} (${esc(b.status || '—')})</dd></div>
    <div><dt>Entries</dt><dd>${Number(b.submissionCount ?? 0).toLocaleString('en-US')}</dd></div>
    <div><dt>Published</dt><dd>${esc(date(b.publishedAt))}</dd></div>
  </dl>
  <p class="row"><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View leaderboard →</a>
  <a href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">On make.fun ↗</a></p>
  <h2>Rewards</h2>${rewardsTable(b)}
  <h2>Description</h2><div class="desc">${esc(b.description || 'No description published.')}</div>`;
}

/** A bounty's leaderboard: rank, entrant, entry, judge win rate, size. */
export function leaderboardPage(data, shown) {
  const comp = data.competition || {};
  const cols = (data.columns || []).map((c) => c.title);
  const rows = (data.entries || []).slice(0, shown).map((e) => {
    const v = e.values || {};
    return `<tr><td><b>#${esc(e.rank)}</b></td>
    <td><span class="row">${avatarImg(e.image, e.handle)}<a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a></span></td>
    <td>${esc(e.title || '—')}</td>
    <td class="num">${esc(winRate(v.judge))}</td>
    <td class="num">${esc(bytes(v.bytes))}</td></tr>`;
  }).join('');
  const total = (data.entries || []).length;
  return `<p><a href="#/bounty/${encodeURIComponent(comp.slug)}">← ${esc(comp.title || 'Bounty')}</a> · <a href="#/">All bounties</a></p>
  <h1>${esc(comp.title || 'Leaderboard')}</h1>
  <p class="lede">${esc(data.title || 'Results')} · ${total.toLocaleString('en-US')} entries · ranked by ${esc(cols[0] || 'judge win rate')}.</p>
  ${total ? `<table><thead><tr><th scope="col">Rank</th><th scope="col">Entrant</th><th scope="col">Entry</th>
  <th scope="col" class="num">${esc(cols[0] || 'Win rate')}</th><th scope="col" class="num">${esc(cols[4] || 'Size')}</th></tr></thead>
  <tbody>${rows}</tbody></table>
  ${total > shown ? `<p><button id="more" type="button">Show 25 more (${total - shown} left)</button></p>` : ''}`
  : '<p>No ranked entries yet.</p>'}`;
}

/** An account's public profile: record, entries, payouts. */
export function profilePage(p) {
  const r = p.record || {};
  const paid = (p.payouts || []).reduce((s, x) => s + Number(x.amount_usd || 0), 0);
  const entries = (p.solutions || []).map((s) => {
    const c = s.competition || {};
    return `<tr><td><a href="#/bounty/${encodeURIComponent(c.slug)}">${esc(c.title || c.slug || '—')}</a></td>
    <td class="num">${s.placement ? '#' + esc(s.placement) : '—'}</td>
    <td class="num">${s.prize_usd ? esc(money(s.prize_usd)) : '—'}</td>
    <td>${esc(date(s.entered_at))}</td></tr>`;
  }).join('');
  return `<p><a href="#/">← All bounties</a></p>
  <div class="profile-head">${avatarImg(p.image || (p.avatar && p.avatar.url), p.handle)}
  <div><h1 style="margin:0">@${esc(p.handle)}</h1>
  <p class="muted" style="margin:2px 0">${p.display_name ? esc(p.display_name) + ' · ' : ''}Joined ${esc(date(p.joined_at))}</p>
  ${p.bio ? `<p style="margin:4px 0">${esc(p.bio)}</p>` : ''}</div></div>
  <dl class="facts">
    <div><dt>Entered</dt><dd>${Number(r.competitions_entered ?? 0)}</dd></div>
    <div><dt>Placed</dt><dd>${Number(r.competitions_placed ?? 0)}</dd></div>
    <div><dt>Won</dt><dd>${Number(r.competitions_won ?? 0)}</dd></div>
    <div><dt>Podiums</dt><dd>${Number(r.podium_finishes ?? 0)}</dd></div>
    <div><dt>Best place</dt><dd>${r.best_placement ? '#' + esc(r.best_placement) : '—'}</dd></div>
    <div><dt>Prizes won</dt><dd>${esc(money(r.prize_usd)) || '—'}</dd></div>
    <div><dt>Payouts received</dt><dd>${esc(money(paid)) || '$0'}</dd></div>
  </dl>
  <h2>Entries (${(p.solutions || []).length})</h2>
  ${entries ? `<table><thead><tr><th scope="col">Bounty</th><th scope="col" class="num">Place</th><th scope="col" class="num">Prize</th><th scope="col">Entered</th></tr></thead><tbody>${entries}</tbody></table>` : '<p class="muted">No entries yet.</p>'}`;
}
