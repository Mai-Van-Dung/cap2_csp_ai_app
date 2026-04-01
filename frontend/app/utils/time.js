export const relativeTimeFromNow = (isoString) => {
  if (!isoString) return '';
  const now = new Date();
  const then = new Date(isoString.replace(' ', 'T'));
  const diffMs = now - then;
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return `${Math.max(sec, 0)}s ago`;
};
