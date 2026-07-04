// ثابت‌ها و برچسب‌های فارسی مشترک در کل اپلیکیشن.

export const TRIGGER_TYPES = [
  { value: "keyword", label: "تطابق کلمه کلیدی", description: "وقتی پیام شامل کلمات کلیدی خاصی باشد فعال شود" },
  { value: "any_dm", label: "هر دایرکتی", description: "به هر پیام مستقیم ورودی فعال شود" },
  { value: "any_comment", label: "هر کامنتی", description: "به هر کامنتی روی پست‌های شما فعال شود" },
  { value: "story_reply", label: "ریپلای استوری", description: "وقتی کسی به استوری شما پاسخ می‌دهد فعال شود" },
] as const;

export const RESPONSE_TYPES = [
  { value: "static_text", label: "متن ثابت", description: "ارسال یک پاسخ متنی ثابت" },
  { value: "static_media", label: "رسانه ثابت", description: "ارسال یک پاسخ رسانه‌ای ثابت (URL تصویر)" },
  { value: "ai_generated", label: "تولید با هوش مصنوعی", description: "اجازه دهید دستیار هوش مصنوعی پاسخ پویا بسازد" },
] as const;

export const TONES = [
  { value: "friendly", label: "صمیمی و گرم" },
  { value: "professional", label: "حرفه‌ای" },
  { value: "casual", label: "غیررسمی و راحت" },
  { value: "playful", label: "شوخ‌طبع و سرگرم‌کننده" },
] as const;

export const CHANNELS = [
  { value: "dm", label: "دایرکت" },
  { value: "comment", label: "کامنت" },
  { value: "story", label: "ریپلای استوری" },
] as const;

export const PLANS = [
  {
    value: "free",
    label: "شروع",
    price: 0,
    tagline: "برای امتحان کردن",
    features: ["۱ حساب اینستاگرام", "۵۰ پاسخ هوش مصنوعی در ماه", "قوانین پایه خودکارسازی", "تاریخچه ۷ روزه گفتگوها"],
    limits: { accounts: 1, aiReplies: 50, rules: 10 },
  },
  {
    value: "pro",
    label: "رشد",
    price: 29,
    tagline: "برای کسب‌وکارهای در حال رشد",
    features: ["۳ حساب اینستاگرام", "۲۰۰۰ پاسخ هوش مصنوعی در ماه", "قوانین نامحدود خودکارسازی", "ثبت و خروجی سرنخ", "پشتیبانی اولویت‌دار"],
    limits: { accounts: 3, aiReplies: 2000, rules: 999 },
    popular: true,
  },
  {
    value: "business",
    label: "مقیاس",
    price: 79,
    tagline: "برای آژانس‌ها و تیم‌ها",
    features: ["۱۰ حساب اینستاگرام", "پاسخ‌های نامحدود هوش مصنوعی", "صندلی و نقش تیمی", "تحلیل‌های پیشرفته", "دسترسی API", "مدیر اختصاصی"],
    limits: { accounts: 10, aiReplies: 999999, rules: 999 },
  },
] as const;

export const LEAD_STATUSES = [
  { value: "new", label: "جدید", color: "bg-sky-100 text-sky-700" },
  { value: "contacted", label: "در حال تماس", color: "bg-amber-100 text-amber-700" },
  { value: "qualified", label: "تأییدشده", color: "bg-violet-100 text-violet-700" },
  { value: "won", label: "برنده", color: "bg-emerald-100 text-emerald-700" },
  { value: "lost", label: "باخته", color: "bg-rose-100 text-rose-700" },
] as const;

export const CONVERSATION_STATUSES = [
  { value: "auto", label: "پاسخ خودکار", color: "bg-emerald-100 text-emerald-700" },
  { value: "manual", label: "دستی", color: "bg-sky-100 text-sky-700" },
  { value: "escalated", label: "نیازمند پیگیری", color: "bg-amber-100 text-amber-700" },
  { value: "resolved", label: "حل‌شده", color: "bg-muted text-muted-foreground" },
  { value: "failed", label: "ناموفق", color: "bg-rose-100 text-rose-700" },
] as const;

export const ACCOUNT_STATUSES = [
  { value: "active", label: "متصل", color: "bg-emerald-500" },
  { value: "disconnected", label: "قطع‌شده", color: "bg-muted-foreground" },
  { value: "expired", label: "توکن منقضی شده", color: "bg-amber-500" },
] as const;

export function labelFor(list: readonly { value: string; label: string }[], value: string) {
  return list.find((i) => i.value === value)?.label || value;
}
