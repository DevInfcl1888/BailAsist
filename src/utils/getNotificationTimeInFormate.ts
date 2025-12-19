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

  if (minutes < 60) {
    return `${Math.max(minutes, 1)} min ago`;
  }

  if (hours < 24) {
    return hours === 1 ? `${hours} hour ago` : `${hours} hours ago`;
  }

  if (days < 7) {
    return days === 1 ? `${days} day ago` : `${days} days ago`;
  }

  if (weeks < 4) {
    return weeks === 1 ? `${weeks} week ago` : `${weeks} weeks ago`;
  }

  if (weeks < 52) {
    const months = Math.floor(weeks / 4);
    return months === 1 ? `${months} month ago` : `${months} months ago`;
  }

  return years === 1 ? `${years} Year ago` : `${years} Years ago`;
}
