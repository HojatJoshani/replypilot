// کمک‌تابع‌های فرمت — همگی فارسی/شمسی.
// نام‌های قدیمی به‌عنوان alias برای توابع فارسی نگه داشته شده‌اند تا کدهای
// موجود بدون تغییر کار کنند ولی خروجی فارسی بدهند.

export {
  toFa,
  faNumber,
  faCompact,
  faDate,
  faDateTime,
  faTimeAgo,
  faTimeUntil,
} from "./i18n";

// alias های سازگار (برای کدهای موجود)
export { faTimeAgo as timeAgo, faDate as fmtDate, faDateTime as fmtDateTime, faCompact as compactNumber };

export function initials(name?: string | null): string {
  if (!name) return "؟";
  return name.trim().charAt(0).toUpperCase();
}

export function splitTags(tags: string): string[] {
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

export function joinTags(tags: string[]): string {
  return tags.join(",");
}
