export function shortId(uid) {
  return uid ? uid.slice(0, 6) + '…' + uid.slice(-4) : '';
}

export function dateTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function timeAgo(ms) {
  if (!ms) return '—';
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + ' min ago';
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + ' h ago';
  return Math.round(hours / 24) + ' d ago';
}

export function errorText(error) {
  return error?.message?.replace(/^.*?: /, '') || 'Something went wrong';
}
