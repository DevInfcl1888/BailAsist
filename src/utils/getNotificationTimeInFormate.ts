export function getNotificationTime(sentAt: string | Date): string {
  if (!sentAt) return "Just now";

  const sentTime = new Date(sentAt).getTime();
  const now = Date.now();

  if (isNaN(sentTime) || sentTime > now) {
    return "Just now";
  }

  const diffMs = now - sentTime;

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const YEAR = 365.25 * DAY; // leap-year safe

  const minutes = Math.floor(diffMs / MINUTE);
  const hours = Math.floor(diffMs / HOUR);
  const days = Math.floor(diffMs / DAY);
  const weeks = Math.floor(diffMs / WEEK);
  const years = Math.floor(diffMs / YEAR);

  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 7) return `${days} day ago`;
  if (weeks < 52) return `${weeks} week ago`;

  return `${Math.max(years, 1)} Yr ago`;
}
