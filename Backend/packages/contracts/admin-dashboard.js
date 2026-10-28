import {PlatformAdminError} from './platform-admin.js';

export const DASHBOARD_TIMEZONE = 'Asia/Bangkok';
const DAY = 86400000;
const fail = () => new PlatformAdminError(400, 'INVALID_DATE_RANGE', 'Khoảng ngày không hợp lệ (tối đa 366 ngày, múi giờ Asia/Bangkok).');
function midnight(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw fail();
  const timestamp = Date.parse(value + 'T00:00:00+07:00');
  if (!Number.isFinite(timestamp) || new Date(timestamp + 7 * 3600000).toISOString().slice(0, 10) !== value) throw fail();
  return timestamp;
}
const dayString = timestamp => new Date(timestamp + 7 * 3600000).toISOString().slice(0, 10);
export function dashboardRange(query = {}, now = new Date()) {
  const preset = query.preset || (query.from || query.to ? 'custom' : '7d');
  if (!['today', '7d', '30d', 'custom'].includes(preset) || query.timeZone && query.timeZone !== DASHBOARD_TIMEZONE) throw fail();
  const today = dayString(now.getTime());
  const from = preset === 'custom' ? midnight(query.from) : midnight(today) - ({today: 0, '7d': 6, '30d': 29}[preset]) * DAY;
  const to = preset === 'custom' ? midnight(query.to) + DAY : midnight(today) + DAY;
  if (to <= from || to - from > 366 * DAY) throw fail();
  const duration = to - from;
  return {preset, from: dayString(from), to: dayString(to - DAY), start: new Date(from).toISOString(),
    end: new Date(to).toISOString(), previousStart: new Date(from - duration).toISOString(), previousEnd: new Date(from).toISOString(),
    days: duration / DAY, timeZone: DASHBOARD_TIMEZONE};
}
export function metricComparison(current, previous) {
  const delta = current - previous;
  return {current, previous, delta, percent: previous === 0 ? null : Math.round(delta / previous * 10000) / 100};
}
export const dashboardMeta = range => ({range, updatedAt: new Date().toISOString(), timeZone: DASHBOARD_TIMEZONE});
// List views accept the exact same inclusive calendar dates as dashboard links.
export function listDateRange(query = {}) {
  if (!query.from && !query.to) return {start: null, end: null};
  return dashboardRange({preset: 'custom', from: query.from, to: query.to});
}
