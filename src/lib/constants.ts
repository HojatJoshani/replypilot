// ثابت‌ها و برچسب‌های فارسی مشترک در کل اپلیکیشن.

export const TRIGGER_TYPES = [
  { value: "keyword", label: "تطابق کلمه کلیدی", description: "وقتی پیام شامل کلمات کلیدی خاصی باشد فعال شود", icon: "Type" },
  { value: "any_dm", label: "هر دایرکتی", description: "به هر پیام مستقیم ورودی فعال شود", icon: "MessageCircle" },
  { value: "any_comment", label: "هر کامنتی", description: "به هر کامنتی روی پست‌های شما فعال شود", icon: "MessageSquare" },
  { value: "story_reply", label: "ریپلای استوری", description: "وقتی کسی به استوری شما پاسخ می‌دهد فعال شود", icon: "Sparkles" },
] as const;

export const RESPONSE_TYPES = [
  { value: "static_text", label: "متن ثابت", description: "ارسال یک پاسخ متنی ثابت", icon: "Type" },
  { value: "static_media", label: "رسانه ثابت", description: "ارسال یک پاسخ رسانه‌ای ثابت (URL تصویر)", icon: "Image" },
  { value: "ai_generated", label: "تولید با هوش مصنوعی", description: "اجازه دهید دستیار هوش مصنوعی پاسخ پویا بسازد", icon: "Bot" },
] as const;

// انواع شرط (Conditions) — فیلترهای اضافی روی یک قانون
export const CONDITION_TYPES = [
  { value: "channel", label: "کانال", description: "فقط روی یک کانال خاص اعمال شود", operators: ["is", "is_not"] },
  { value: "time_window", label: "بازه زمانی", description: "فقط در ساعات مشخص اعمال شود", operators: ["between"] },
  { value: "contact_type", label: "نوع تماس", description: "فقط برای دنبال‌کننده جدید یا موجود", operators: ["is", "is_not"] },
  { value: "message_contains", label: "پیام شامل", description: "پیام شامل کلمه‌ای خاص باشد", operators: ["contains", "not_contains"] },
  { value: "message_length", label: "طول پیام", description: "پیام کوتاه/بلند باشد", operators: ["lt", "gt"] },
] as const;

export const CONDITION_OPERATORS: Record<string, { value: string; label: string }[]> = {
  is: [{ value: "is", label: "هست" }],
  is_not: [{ value: "is_not", label: "نیست" }],
  between: [{ value: "between", label: "بین" }],
  contains: [{ value: "contains", label: "شامل" }],
  not_contains: [{ value: "not_contains", label: "شامل نشود" }],
  lt: [{ value: "lt", label: "کمتر از" }],
  gt: [{ value: "gt", label: "بیشتر از" }],
};

// انواع اقدام (Actions) — چند اقدام همزمان روی یک قانون
export const ACTION_TYPES = [
  { value: "reply_text", label: "پاسخ متنی", description: "ارسال یک پیام متنی", icon: "Type" },
  { value: "reply_media", label: "پاسخ رسانه", description: "ارسال یک تصویر/رسانه", icon: "Image" },
  { value: "ai_reply", label: "پاسخ هوش مصنوعی", description: "تولید پاسخ با هوش مصنوعی", icon: "Bot" },
  { value: "tag_lead", label: "ثبت به‌عنوان سرنخ", description: "افزودن به لیست سرنخ‌ها با برچسب", icon: "UserPlus" },
  { value: "escalate", label: "ارجاع به انسان", description: "پرچم‌گذاری برای پیگیری انسانی", icon: "AlertTriangle" },
  { value: "resolve", label: "حل‌شده علامت بزن", description: "علامت‌گذاری گفتگو به‌عنوان حل‌شده", icon: "CheckCircle" },
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

export const CONTACT_TYPES = [
  { value: "new", label: "تماس جدید" },
  { value: "existing", label: "تماس موجود" },
] as const;

// قالب‌های سناریو آماده — برای راه‌اندازی سریع یک‌کلیکی
export const SCENARIO_TEMPLATES = [
  {
    id: "welcome_dm",
    name: "خوش‌آمدگویی به دایرکت‌های جدید",
    description: "به هر دایرکت جدید یک پیام خوش‌آمد گرم بفرست و سرنخ ثبت کن.",
    icon: "Hand",
    color: "from-rose-400 to-pink-500",
    category: "سلام و احوال‌پرسی",
    rule: {
      name: "خوش‌آمدگویی",
      triggerType: "any_dm",
      triggerKeywords: "",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "سلام! 💛 به صفحه ما خوش آمدید. چطور می‌تونیم کمکتون کنیم؟",
      conditionsJson: JSON.stringify([{ type: "contact_type", operator: "is", value: "new" }]),
      actionsJson: JSON.stringify([
        { type: "reply_text", value: "سلام! 💛 به صفحه ما خوش آمدید. چطور می‌تونیم کمکتون کنیم؟" },
        { type: "tag_lead", value: "new_lead" },
      ]),
    },
  },
  {
    id: "price_inquiry",
    name: "سؤال قیمت → هوش مصنوعی",
    description: "وقتی مشتری درباره قیمت می‌پرسد، هوش مصنوعی با اطلاعات کسب‌وکار شما پاسخ می‌دهد.",
    icon: "DollarSign",
    color: "from-emerald-400 to-teal-500",
    category: "فروش",
    rule: {
      name: "پاسخ به سؤال قیمت",
      triggerType: "keyword",
      triggerKeywords: "قیمت,قیمتش,چنده,بها,نرخ,نرخش,گیرون,چقدر,cost,price,how much",
      triggerMatchMode: "any",
      responseType: "ai_generated",
      staticResponse: null,
      conditionsJson: null,
      actionsJson: JSON.stringify([
        { type: "ai_reply", value: "" },
        { type: "tag_lead", value: "pricing" },
      ]),
    },
  },
  {
    id: "business_hours",
    name: "ساعات کاری",
    description: "به سؤالات درباره ساعات کاری، پاسخ ثابت بده.",
    icon: "Clock",
    color: "from-sky-400 to-blue-500",
    category: "اطلاعات کسب‌وکار",
    rule: {
      name: "ساعات کاری",
      triggerType: "keyword",
      triggerKeywords: "ساعت,ساعت کار,کارتون,باز,تعطیل,وقت,زمان,hours,open,close,time",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "ما شنبه تا چهارشنبه ۱۰ تا ۲۰ آماده‌ایم 🕙 جمعه‌ها تعطیلیم. به‌زودی می‌بینیمتون! 💛",
      conditionsJson: null,
      actionsJson: null,
    },
  },
  {
    id: "booking",
    name: "رزرو نوبت",
    description: "درخواست‌های رزرو را دریافت کن و سرنخ ثبت کن.",
    icon: "Calendar",
    color: "from-violet-400 to-purple-500",
    category: "فروش",
    rule: {
      name: "رزرو نوبت",
      triggerType: "keyword",
      triggerKeywords: "رزرو,نوبت,وقت,دریافت,book,appointment,reserve",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "چه عالی، دوست داریم ببینیمتون! 💆‍♀️ لطفاً تاریخ موردنظر + خدمت موردنظرتون رو بفرستید تا موجود بودن رو تأیید کنیم.",
      conditionsJson: null,
      actionsJson: JSON.stringify([
        { type: "reply_text", value: "چه عالی، دوست داریم ببینیمتون! 💆‍♀️ لطفاً تاریخ موردنظر + خدمت موردنظرتون رو بفرستید تا موجود بودن رو تأیید کنیم." },
        { type: "tag_lead", value: "booking" },
      ]),
    },
  },
  {
    id: "shipping",
    name: "اطلاعات ارسال",
    description: "به سؤالات ارسال، پاسخ آماده بده.",
    icon: "Package",
    color: "from-amber-400 to-orange-500",
    category: "اطلاعات کسب‌وکار",
    rule: {
      name: "اطلاعات ارسال",
      triggerType: "keyword",
      triggerKeywords: "ارسال,پست,سفارش,تحویل,shipping,deliver,send",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "ارسال به سراسر ایران 📦 تهران = ارسال همان‌روز، شهرهای دیگر ۲ تا ۴ روز کاری. ارسال رایگان برای سفارش‌های بالای ۱.۵ میلیون تومان!",
      conditionsJson: null,
      actionsJson: null,
    },
  },
  {
    id: "complaint_escalate",
    name: "ارجاع شکایات به انسان",
    description: "وقتی مشتری شکایت می‌کند، پیام نگه‌دار و به تیم انسانی ارجاع بده.",
    icon: "AlertTriangle",
    color: "from-red-400 to-rose-500",
    category: "پشتیبانی",
    rule: {
      name: "ارجاع شکایت",
      triggerType: "keyword",
      triggerKeywords: "شکایت,ناراضی,بد,خراب,مشکل,گله,refund,return,complaint,bad,problem,issue",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "از اینکه این تجربه رو داشتید متأسفیم 😔 پیام شما فوراً به تیم ما ارجاع داده شد و در اولین فرصت پاسخ خواهیم داد.",
      conditionsJson: null,
      actionsJson: JSON.stringify([
        { type: "reply_text", value: "از اینکه این تجربه رو داشتید متأسفیم 😔 پیام شما فوراً به تیم ما ارجاع داده شد و در اولین فرصت پاسخ خواهیم داد." },
        { type: "escalate", value: "complaint" },
      ]),
    },
  },
  {
    id: "greeting",
    name: "پاسخ به سلام",
    description: "به سلام‌ها پاسخ گرم بده.",
    icon: "Hand",
    color: "from-pink-400 to-rose-500",
    category: "سلام و احوال‌پرسی",
    rule: {
      name: "پاسخ به سلام",
      triggerType: "keyword",
      triggerKeywords: "سلام,درود,خوبی,hi,hello,hey,salam",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "سلام! 💛 خوش آمدید. چطور می‌تونیم کمکتون کنیم؟",
      conditionsJson: null,
      actionsJson: null,
    },
  },
  {
    id: "after_hours",
    name: "پیام خارج از ساعات کاری",
    description: "وقتی خارج از ساعات کاری پیام می‌رسد، پاسخ نگه‌دار بده.",
    icon: "Moon",
    color: "from-indigo-400 to-violet-500",
    category: "زمان‌بندی",
    rule: {
      name: "خارج از ساعات کاری",
      triggerType: "any_dm",
      triggerKeywords: "",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "ممنون از پیامتون! 💛 ما الان خارج از ساعات کاری هستیم، اما اولین فردا صبح پاسخ خواهیم داد.",
      conditionsJson: JSON.stringify([{ type: "time_window", operator: "between", value: "20:00-10:00" }]),
      actionsJson: null,
    },
  },
  {
    id: "ai_fallback",
    name: "پشتیبان هوش مصنوعی (همه چیز)",
    description: "هر پیامی که هیچ قانونی تطابق نداشت را هوش مصنوعی پاسخ می‌دهد.",
    icon: "Bot",
    color: "from-fuchsia-400 to-pink-500",
    category: "پشتیبان",
    rule: {
      name: "پشتیبان هوش مصنوعی",
      triggerType: "any_dm",
      triggerKeywords: "",
      triggerMatchMode: "any",
      responseType: "ai_generated",
      staticResponse: null,
      conditionsJson: null,
      actionsJson: null,
    },
  },
] as const;

export const TEMPLATE_CATEGORIES = [
  { value: "all", label: "همه" },
  { value: "سلام و احوال‌پرسی", label: "سلام و احوال‌پرسی" },
  { value: "فروش", label: "فروش" },
  { value: "اطلاعات کسب‌وکار", label: "اطلاعات کسب‌وکار" },
  { value: "پشتیبانی", label: "پشتیبانی" },
  { value: "زمان‌بندی", label: "زمان‌بندی" },
  { value: "پشتیبان", label: "پشتیبان" },
] as const;

// قیمت‌ها به تومان — رقابتی با محصولات ایرانی (دایرکت‌ام ۸۲۵K، الپیدان ۴۹۰K، نوین‌هاب ۸۶۳K)
export const PLANS = [
  {
    value: "free",
    label: "رایگان",
    price: 0,
    priceLabel: "۰ تومان",
    tagline: "برای امتحان کردن آریا",
    features: [
      "۱ حساب اینستاگرام",
      "۱۰۰ پاسخ هوش مصنوعی در ماه",
      "۵ قانون خودکارسازی",
      "تاریخچه ۷ روزه گفتگوها",
      "گالری قالب‌های آماده",
    ],
    limits: { accounts: 1, aiReplies: 100, rules: 5 },
  },
  {
    value: "pro",
    label: "حرفه‌ای",
    price: 390000,
    priceLabel: "۳۹۰٬۰۰۰ تومان",
    tagline: "محبوب‌ترین — برای کسب‌وکارهای در حال رشد",
    features: [
      "۲ حساب اینستاگرام",
      "۳٬۰۰۰ پاسخ هوش مصنوعی در ماه",
      "قوانین نامحدود خودکارسازی",
      "سازنده بصری سناریو (وقتی/اگر/آنگاه)",
      "ثبت و خروجی سرنخ (CSV)",
      "تحلیل‌ها و آمار کامل",
      "پشتیبانی اولویت‌دار",
    ],
    limits: { accounts: 2, aiReplies: 3000, rules: 999 },
    popular: true,
  },
  {
    value: "business",
    label: "سازمانی",
    price: 890000,
    priceLabel: "۸۹۰٬۰۰۰ تومان",
    tagline: "برای آژانس‌ها و تیم‌های حرفه‌ای",
    features: [
      "۵ حساب اینستاگرام",
      "پاسخ‌های نامحدود هوش مصنوعی",
      "قوانین نامحدود",
      "صندلی و نقش تیمی (تا ۵ نفر)",
      "تحلیل‌های پیشرفته",
      "دسترسی API",
      "مدیر اختصاصی",
      "آموزش اختصاصی",
    ],
    limits: { accounts: 5, aiReplies: 999999, rules: 999 },
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
