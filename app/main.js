// Router: hash routes for the four surfaces, each reachable by link and by URL.
//
//   #/                              bounty board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/u/<handle>                    an account's public profile
//
// window.__shotReady is false while a route loads and true once its data has
// rendered, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bountyPage, leaderboardPage, profilePage } from './views.js';

const app = document.getElementById('app');
const state = { query: '', filter: 'open', sort: 'deadline', shown: 25 };
let boardData = null;

function loading(label) {
  window.__shotReady = false;
  app.innerHTML = `<p role="status">Loading ${label}…</p>`;
}

function failed(err, retry) {
  app.innerHTML = `<div class="error"><p><b>Could not load this page.</b></p><p>${err.message}</p>`
    + `<p><button id="retry" type="button">Try again</button></p></div>`;
  document.getElementById('retry').addEventListener('click', retry);
  window.__shotReady = true;
}

function wireBoard() {
  const q = document.getElementById('q');
  const sort = document.getElementById('sort');
  if (q) q.addEventListener('input', () => { state.query = q.value; renderBoard(); keepFocus('q', q.selectionStart); });
  if (sort) sort.addEventListener('change', () => { state.sort = sort.value; renderBoard(); });
  app.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    state.filter = b.dataset.filter;
    renderBoard();
  }));
}

function keepFocus(id, pos) {
  const el = document.getElementById(id);
  if (el) { el.focus(); el.setSelectionRange(pos, pos); }
}

function renderBoard() {
  app.innerHTML = board(boardData.items, state);
  wireBoard();
  window.__shotReady = true;
}

async function render() {
  const hash = location.hash || '#/';
  const bounty = hash.match(/^#\/bounty\/([^/]+)(?:\/leaderboard)?$/);
  const profile = hash.match(/^#\/u\/([^/]+)$/);
  try {
    if (hash.startsWith('#/bounty/') && hash.endsWith('/leaderboard') && bounty) {
      loading('leaderboard');
      const data = await getLeaderboard(decodeURIComponent(bounty[1]));
      document.title = `${data.competition?.title || 'Leaderboard'} · make.fun`;
      app.innerHTML = leaderboardPage(data, state.shown);
      const more = document.getElementById('more');
      if (more) more.addEventListener('click', () => { state.shown += 25; render(); });
    } else if (bounty) {
      loading('bounty');
      const b = await getBounty(decodeURIComponent(bounty[1]));
      document.title = `${b.title} · make.fun`;
      app.innerHTML = bountyPage(b);
    } else if (profile) {
      loading('profile');
      const p = await getProfile(decodeURIComponent(profile[1]));
      document.title = `@${p.handle} · make.fun`;
      app.innerHTML = profilePage(p);
    } else {
      loading('bounties');
      if (!boardData) boardData = await getBounties();
      document.title = 'make.fun bounties — lean frontend';
      renderBoard();
      return;
    }
    window.scrollTo(0, 0);
    window.__shotReady = true;
  } catch (err) {
    failed(err, render);
  }
}

document.getElementById('lookup').addEventListener('submit', (e) => {
  e.preventDefault();
  const handle = document.getElementById('handle').value.trim().replace(/^@/, '');
  if (handle) location.hash = `#/u/${encodeURIComponent(handle)}`;
});

window.addEventListener('hashchange', () => { state.shown = 25; render(); });
render();
