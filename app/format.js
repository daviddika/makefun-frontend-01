// Small helpers for showing API values as text.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('250.00', 0.5, null) as '$250' or '$0.50'; empty when unknown. */
export function money(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

/** A deadline as a short UTC date. */
export function date(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
  }) + ' UTC';
}

/** Time until a deadline: '2d 4h left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'ended';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

/** True while a bounty still takes entries: judge by deadline, not status alone. */
export function isOpen(b) {
  return Boolean(b && b.deadline && new Date(b.deadline).getTime() > Date.now());
}

/** A judge win-rate in micro units (956066) as '95.6%'. */
export function winRate(micro) {
  const n = Number(micro);
  return Number.isFinite(n) ? (n / 10000).toFixed(1) + '%' : '—';
}

/** A byte count as '936 KB'. */
export function bytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v >= 1048576 ? (v / 1048576).toFixed(1) + ' MB' : Math.round(v / 1024) + ' KB';
}
