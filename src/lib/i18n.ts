// مرکز ترجمه و کمک‌تابع‌های فارسی/راست‌چین برای کل اپلیکیشن.

const faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** تبدیل ارقام انگلیسی به فارسی در یک رشته یا عدد. */
export function toFa(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(value).replace(/[0-9]/g, (d) => faDigits[Number(d)]);
}

/** فرمت عدد با جداکننده هزارگان فارسی. */
export function faNumber(n: number): string {
  return toFa(n.toLocaleString("en-US"));
}

/** عدد فشرده (مثل ۱۸٫۴هـ) به فارسی. */
export function faCompact(n: number): string {
  const compact = Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const map: Record<string, string> = { K: "هـ", M: "م", B: "میلیارد" };
  const unit = map[compact.replace(/[\d.]/g, "")] || "";
  return toFa(compact.replace(/[KMB]/, "")) + unit;
}

/** تاریخ شمسی کامل با استفاده از Intl (تقویم هجری شمسی). */
export function faDate(date: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", opts || { year: "numeric", month: "long", day: "numeric" }).format(new Date(date));
  } catch {
    return "—";
  }
}

/** تاریخ شمسی + ساعت. */
export function faDateTime(date: string | Date | null | undefined): string {
  return faDate(date, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** زمان نسبی به فارسی (مثل «۳ دقیقه پیش»). */
export function faTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);
  if (sec < 60) return "همین حالا";
  if (min < 60) return `${toFa(min)} دقیقه پیش`;
  if (hour < 24) return `${toFa(hour)} ساعت پیش`;
  if (day < 30) return `${toFa(day)} روز پیش`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${toFa(month)} ماه پیش`;
  return `${toFa(Math.floor(day / 365))} سال پیش`;
}

/** زمان نسبی کوتاه برای توکن (مثل «۴۸ روز دیگر»). */
export function faTimeUntil(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date).getTime();
  const now = Date.now();
  const diff = d - now;
  if (diff <= 0) return "منقضی شده";
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hour = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (day > 0) return `${toFa(day)} روز دیگر`;
  return `${toFa(hour)} ساعت دیگر`;
}

// ===== واژه‌نامه متمرکز فارسی =====
export const t = {
  brand: "ریپلای‌پایلوت",
  brandSub: "خودکارسازی اینستاگرام",

  // ناوبری
  nav: {
    dashboard: "داشبورد",
    inbox: "صندوق پیام‌ها",
    rules: "قوانین خودکارسازی",
    aiConfig: "دستیار هوش مصنوعی",
    leads: "سرنخ‌ها",
    analytics: "تحلیل‌ها",
    billing: "اشتراک و پرداخت",
    settings: "تنظیمات",
    workspace: "فضای کار",
    account: "حساب کاربری",
  },

  // عمومی
  common: {
    save: "ذخیره",
    cancel: "لغو",
    delete: "حذف",
    edit: "ویرایش",
    add: "افزودن",
    search: "جستجو",
    loading: "در حال بارگذاری…",
    send: "ارسال",
    sending: "در حال ارسال…",
    active: "فعال",
    inactive: "غیرفعال",
    all: "همه",
    yes: "بله",
    no: "خیر",
    confirm: "تأیید",
    close: "بستن",
    refresh: "به‌روزرسانی",
    export: "خروجی گرفتن",
    create: "ایجاد",
    update: "به‌روزرسانی",
    back: "بازگشت",
    new: "جدید",
    total: "مجموع",
    viewAll: "مشاهده همه",
    demoMode: "حالت دمو",
    next: "بعدی",
    previous: "قبلی",
    finish: "پایان",
    skip: "رد کردن",
    start: "شروع",
    skipForNow: "فعلاً رد کن",
  },

  // ویزارد راه‌اندازی
  onboarding: {
    title: "بیایید ریپلای‌پایلوت را راه‌اندازی کنیم!",
    subtitle: "در ۴ گام ساده، خودکارسازی اینستاگرام‌تون رو فعال کنید.",
    step: "گام",
    of: "از",
    // گام ۱: اطلاعات کسب‌وکار
    step1Title: "کسب‌وکارتون رو معرفی کنید",
    step1Desc: "هوش مصنوعی برای پاسخ درست، باید کسب‌وکار شما رو بشناسه.",
    step1BusinessName: "نام کسب‌وکار",
    step1BusinessNamePlaceholder: "مثلاً: استودیو پوست گلو",
    step1Tone: "لحن ارتباطی",
    step1Description: "کسب‌وکارتون چه کاری انجام می‌ده؟",
    step1DescriptionPlaceholder: "مثلاً: یک استودیوی تخصصی مراقبت پوست که فیشال، پیلینگ و محصولات پوستی ارائه می‌دهد…",
    step1Skip: "بعداً تنظیم می‌کنم",
    // گام ۲: انتخاب قالب
    step2Title: "سناریوهای آماده انتخاب کنید",
    step2Desc: "هر کدوم از این سناریوها رو که انتخاب کنید، به‌صورت خودکار ساخته می‌شود. بعداً می‌تونید ویرایش کنید.",
    step2Selected: "انتخاب‌شده",
    step2PickAtLeast: "حداقل یک سناریو انتخاب کنید",
    // گام ۳: تست
    step3Title: "تست کنید!",
    step3Desc: "یک پیام شبیه‌سازی‌شده بفرستید و ببینید خودکارسازی چطور پاسخ می‌دهد.",
    step3Send: "ارسال پیام تست",
    step3Waiting: "در انتظار پاسخ…",
    step3Reply: "پاسخ دریافت شد!",
    step3TryAgain: "دوباره امتحان کنید",
    // گام ۴: پایان
    step4Title: "همه چیز آماده است! 🎉",
    step4Desc: "خودکارسازی فعال است. حالا می‌تونید به داشبورد برید و گفتگوها رو ببینید.",
    step4GoDashboard: "رفتن به داشبورد",
    step4GoRules: "مدیریت قوانین",
    // پیشرفت
    progress: "پیشرفت",
    welcome: "خوش آمدید به ریپلای‌پایلوت",
    letsStart: "شروع کنیم!",
  },
  login: {
    welcome: "خوش برگشتی!",
    welcomeSub: "وارد شوید تا کسب‌وکار اینستاگرامتون خودکار بشه",
    createTitle: "بیایید شروع کنیم!",
    createSub: "کسب‌وکار اینستاگرام‌تون رو در چند دقیقه خودکار کنید",
    heroTitle: "دیگه هیچ دایرکتی",
    heroTitleAccent: "بدون جواب نمیمونه",
    heroTitleEnd: "✨",
    heroDesc: "تصور کنید هر دایرکت، کامنت و ریپلای استوری — همگی در چند ثانیه پاسخ داده می‌شوند. ریپلای‌پایلوت این کار رو با قوانین هوشمند و یک دستیار هوش مصنوعی که کسب‌وکار شما رو می‌شناسه، ۲۴ ساعته انجام میده.",
    feat1: "پاسخ آنی — حتی وقتی خوابید 🌙",
    feat2: "دایرکت، کامنت و استوری رو یکجا مدیریت کنید",
    feat3: "هوش مصنوعی که لحن برند شما رو می‌فهمه",
    heroFoot: "اعتماد هزاران فروشگاه، خالق محتوا و ارائه‌دهنده خدمات",
    email: "ایمیل",
    password: "رمز عبور",
    name: "نام شما",
    businessName: "نام کسب‌وکار",
    signIn: "ورود به داشبورد",
    signUp: "ساخت حساب رایگان",
    or: "یا",
    demo: "🎬 مشاهده دمو زنده — بدون ثبت‌نام",
    haveAccount: "حساب کاربری دارید؟ ",
    noAccount: "حساب کاربری ندارید؟ ",
    invalid: "اطلاعات نادرست است. دکمه دمو رو امتحان کنید.",
    welcomeToast: "به ریپلای‌پایلوت خوش آمدید! 💛",
    demoToast: "ورود با حساب دمو — استودیو پوست گلو 💛",
    demoBadge: "حساس نباشید، دمو رو امتحان کنید!",
    demoBadgeDesc: "بدون نیاز به ثبت‌نام، تمام امکانات رو زنده ببینید",
  },

  // داشبورد
  dashboard: {
    title: "داشبورد",
    subtitle: "نمای کلی عملکرد خودکارسازی شما",
    kpi: {
      accounts: "حساب‌های متصل",
      activeRules: "قوانین فعال",
      convToday: "گفتگوهای امروز",
      conv30d: "گفتگوهای ۳۰ روز",
      aiReplies30d: "پاسخ‌های هوش مصنوعی (۳۰ روز)",
      escalated: "نیازمند پیگیری",
      leadsNew: "سرنخ‌های جدید",
      aiUsage: "مصرف هوش مصنوعی",
    },
    aiUsageTitle: "مصرف پاسخ‌های هوش مصنوعی",
    aiUsageDesc: "در این دوره صورت‌حساب",
    approachingLimit: "نزدیک محدودیت",
    unlimited: "نامحدود",
    accountHealth: "سلامت حساب‌ها",
    accountHealthDesc: "وضعیت اتصال و توکن حساب‌های اینستاگرام",
    renewingSoon: "به‌زودی تمدید می‌شود",
    expired: "منقضی شده",
    connected: "متصل",
    recentConversations: "گفتگوهای اخیر",
    tryLive: "به‌صورت زنده امتحان کنید 🎬",
    tryLiveDesc: "یک پیام ورودی اینستاگرام شبیه‌سازی کنید و ببینید ریپلای‌پایلوت چطور پاسخ می‌دهد.",
    channel: "کانال",
    message: "پیام",
    sendWatch: "ارسال و مشاهده",
    running: "پیام تزریق شد — خودکارسازی در حال اجراست…",
    reply: "پاسخ هوش مصنوعی",
    quickActions: "اقدامات سریع",
    newRule: "قانون جدید",
    configAi: "تنظیم هوش مصنوعی",
    viewLeads: "مشاهده سرنخ‌ها",
    analytics: "تحلیل‌ها",
    noAccount: "هنوز هیچ حساب اینستاگرامی متصل نشده است",
    noAccountDesc: "برای شروع خودکارسازی، حساب کسب‌وکار اینستاگرام خود را متصل کنید.",
    connectInstagram: "اتصال به اینستاگرام",
    openEscalations: "گفتگوهای باز نیازمند پیگیری",
  },

  // صندوق پیام‌ها
  inbox: {
    title: "صندوق پیام‌ها",
    subtitle: "گفتگوهای اخیر و نحوه پاسخ سیستم",
    search: "جستجو در گفتگوها…",
    allChannels: "همه کانال‌ها",
    allStatuses: "همه وضعیت‌ها",
    needsFollowup: "نیازمند پیگیری",
    noConversation: "یک گفتگو را انتخاب کنید",
    noConversationDesc: "برای مشاهده جزئیات، از لیست یک گفتگو انتخاب کنید.",
    noConversations: "هنوز گفتگویی وجود ندارد",
    reply: "پاسخ",
    resolve: "حل‌شده",
    followup: "پیگیری",
    reopen: "بازگشایی",
    replyPlaceholder: "پیام پاسخ خود را بنویسید…",
    needsHuman: "نیازمند پیگیری انسانی",
    suggested: "پیشنهاد:",
    viewOnIg: "مشاهده در اینستاگرام",
    sendReply: "ارسال پاسخ",
    me: "من",
    customer: "مشتری",
    aiReply: "هوش مصنوعی",
    ruleReply: "قانون",
  },

  // قوانین
  rules: {
    title: "قوانین خودکارسازی",
    subtitle: "برای تغییر اولویت، کارت‌ها را بکشید. قوانین بالاتر برنده هستند.",
    newRule: "قانون جدید",
    fromTemplate: "از قالب آماده",
    priority: "اولویت",
    dragToReorder: "برای تغییر ترتیب بکشید",
    pauseRule: "توقف/فعال‌سازی قانون",
    editRule: "ویرایش قانون",
    deleteRule: "حذف قانون",
    deleteConfirm: "آیا از حذف این قانون مطمئن هستید؟",
    name: "نام قانون",
    namePlaceholder: "مثلاً: سؤال قیمت → هوش مصنوعی",
    triggerType: "نوع راه‌انداز",
    triggerKeywords: "کلمات کلیدی",
    triggerKeywordsHelp: "با کاما جدا کنید، مثلاً: price, cost, چند, قیمت",
    matchMode: "نحوه تطابق",
    matchAny: "هر کلمه (ANY)",
    matchAll: "همه کلمات (ALL)",
    responseType: "نوع پاسخ",
    staticText: "متن ثابت",
    staticMedia: "رسانه ثابت",
    aiGenerated: "تولید با هوش مصنوعی",
    staticResponse: "متن پاسخ",
    mediaUrl: "آدرس رسانه (URL تصویر)",
    aiOverride: "دستورالعمل اضافی برای هوش مصنوعی",
    aiOverrideHelp: "وقتی این قانون فعال شد، به هوش مصنوعی دستورالعمل اضافی داده می‌شود.",
    active: "فعال",
    // سازنده بصری WHEN/IF/THEN
    when: "وقتی",
    whenDesc: "چه چیزی این قانون را فعال می‌کند؟",
    ifConditions: "اگر (شرط‌ها)",
    ifDesc: "فیلترهای اضافی (اختیاری)",
    addCondition: "افزودن شرط",
    noConditions: "بدون شرط — همیشه وقتی راه‌انداز فعال شود اجرا می‌گردد",
    then: "آنگاه (اقدام‌ها)",
    thenDesc: "چه کارهایی انجام شود",
    addAction: "افزودن اقدام",
    conditions: "شرط‌ها",
    actions: "اقدام‌ها",
    conditionType: "نوع شرط",
    operator: "عملگر",
    value: "مقدار",
    actionType: "نوع اقدام",
    actionValue: "مقدار اقدام",
    // گالری قالب
    templateGallery: "گالری سناریوهای آماده",
    templateGalleryDesc: "یک سناریوی از پیش ساخته‌شده را با یک کلیک اضافه کنید و سپس سفارشی کنید.",
    templateCategories: "دسته‌بندی",
    useTemplate: "استفاده از این قالب",
    templateAdded: "قالب اضافه شد!",
    templateAll: "همه",
    // تستر
    tester: "تستر قانون",
    testerDesc: "یک پیام را امتحان کنید تا ببینید کدام قانون تطابق دارد و چه اقداماتی انجام می‌شود.",
    testMessage: "پیام آزمایشی",
    test: "امتحان کن",
    testAsNew: "به‌عنوان تماس جدید",
    matched: "قانون تطابقی:",
    noMatch: "هیچ قانونی تطابق نداشت — پاسخ با هوش مصنوعی (پشتیبان)",
    matchedKeywords: "کلمات تطابقی",
    intent: "نیت",
    escalate: "نیازمند ارجاع",
    suggestedAction: "اقدام پیشنهادی",
    actionsExecuted: "اقدامات اجراشده",
    noRules: "هنوز قانونی وجود ندارد",
    noRulesDesc: "اولین قانون خودکارسازی خود را بسازید یا از قالب آماده شروع کنید.",
    saved: "قانون ذخیره شد",
    deleted: "قانون حذف شد",
    priorityUpdated: "اولویت به‌روزرسانی شد",
    updated: "قانون به‌روزرسانی شد",
  },

  // دستیار هوش مصنوعی
  ai: {
    title: "دستیار هوش مصنوعی",
    subtitle: "هوش مصنوعی را روی کسب‌وکار خود آموزش دهید. این زمینه، هر پاسخ تولیدشده را شکل می‌دهد.",
    safeNote: "ما پرامپت را می‌سازیم، شما زمینه را ارائه می‌دهید",
    safeNoteDesc: "ریپلای‌پایلوت یک پرامپت سیستم امن و یکپارچه از این فرم می‌سازد — شما زمینه کسب‌وکار را تنظیم می‌کنید و ما بقیه را انجام می‌دهیم. شما نمی‌توانید پرامپت خام را ویرایش کنید، این‌گونه طراحی شده است. این کار هر پاسخ را روی‌برند نگه می‌دارد و از نشت پرامپت جلوگیری می‌کند.",
    basics: "اطلاعات پایه",
    businessName: "نام کسب‌وکار",
    tone: "لحن ارتباطی",
    description: "کسب‌وکار شما چه کاری انجام می‌دهد؟",
    productsServices: "محصولات و خدمات",
    products: "محصولات",
    productsHelp: "هر کدام در یک خط، با فرمت «نام (قیمت)»",
    services: "خدمات",
    faqs: "سؤالات متداول",
    faqQuestion: "سؤال",
    faqAnswer: "پاسخ",
    addFaq: "افزودن سؤال متداول",
    removeFaq: "حذف",
    pricingCheckout: "قیمت‌گذاری و پرداخت",
    pricingVisible: "نمایش قیمت به مشتریان",
    pricingNote: "یادداشت قیمت (مثلاً: قیمت‌ها به تومان)",
    purchaseLink: "لینک خرید",
    availability: "ساعات کاری",
    workingHours: "ساعات کاری",
    workingHoursPlaceholder: "مثلاً: شنبه تا چهارشنبه ۱۰ تا ۲۰",
    specialRules: "قوانین خاص و محدودیت‌ها",
    specialRulesPlaceholder: "مثلاً: اگر مشتری سؤال پزشکی پرسید، ارجاع دهید. هرگز تخفیف بیش از ۱۰٪ پیشنهاد ندهید.",
    aiFallback: "اجازه دهید هوش مصنوعی پیام‌های بدون قانون را پاسخ دهد",
    save: "ذخیره تغییرات",
    discard: "صرف‌نظر",
    saving: "در حال ذخیره…",
    saved: "دستیار هوش مصنوعی به‌روزرسانی شد",
    preview: "پیش‌نمایش زنده",
    previewDesc: "یک پیام مشتری را شبیه‌سازی کنید تا ببینید هوش مصنوعی چطور پاسخ می‌دهد.",
    testMessage: "پیام مشتری",
    send: "ارسال",
    whenNoMatch: "وقتی هیچ قانونی تطابق نداشته باشد، هوش مصنوعی با این زمینه پاسخ می‌دهد.",
  },

  // سرنخ‌ها
  leads: {
    title: "سرنخ‌ها",
    subtitle: "مشتریان بالقوه ثبت‌شده از طریق خودکارسازی",
    search: "جستجوی سرنخ‌ها…",
    exportCsv: "خروجی CSV",
    addLead: "افزودن سرنخ",
    contact: "تماس",
    status: "وضعیت",
    tags: "برچسب‌ها",
    source: "منبع",
    notes: "یادداشت",
    added: "تاریخ افزودن",
    actions: "عملیات",
    editLead: "ویرایش سرنخ",
    addLeadTitle: "افزودن سرنخ جدید",
    contactId: "شناسه اینستاگرام تماس",
    contactUsername: "نام کاربری اینستاگرام (اختیاری)",
    tagsHelp: "با کاما جدا کنید",
    deleteConfirm: "آیا از حذف این سرنخ مطمئن هستید؟",
    noLeads: "هنوز سرنخی وجود ندارد",
    noLeadsDesc: "سرنخ‌ها وقتی ظاهر می‌شوند که گفتگوها ارجاع شوند یا به قصد قیمت/سفارش برسند.",
    saved: "سرنخ ذخیره شد",
    deleted: "سرنخ حذف شد",
    updated: "سرنخ به‌روزرسانی شد",
    statusNew: "جدید",
    statusContacted: "در حال تماس",
    statusQualified: "تأییدشده",
    statusWon: "برنده",
    statusLost: "باخته",
  },

  // تحلیل‌ها
  analytics: {
    title: "تحلیل‌ها",
    subtitle: "عملکرد پاسخ‌گویی، ترکیب کانال‌ها، نیت‌ها و ارجاعات در طول زمان را دنبال کنید.",
    days7: "۷ روز",
    days30: "۳۰ روز",
    days90: "۹۰ روز",
    summary: "خلاصه تحلیلی",
    totalConv: "مجموع گفتگوها",
    aiReplies: "پاسخ‌های هوش مصنوعی",
    ruleReplies: "پاسخ‌های مبتنی بر قانون",
    escalationRate: "نرخ ارجاع",
    failed: "ناموفق",
    volumeOverTime: "حجم پاسخ در طول زمان",
    aiVsRule: "هوش مصنوعی در برابر قانون",
    channelBreakdown: "تفکیک کانال‌ها",
    channelDesc: "حجم ورودی شما از کجا می‌آید.",
    escalationCard: "نرخ ارجاع",
    topIntents: "نیت‌های برتر",
    topRules: "قوانین راه‌انداز برتر",
    noData: "در این دوره هنوز گفتگویی وجود ندارد",
  },

  // اشتراک
  billing: {
    title: "اشتراک و طرح",
    subtitle: "اشتراک، مصرف و دوره صورت‌حساب خود را مدیریت کنید.",
    currentPlan: "طرح فعلی",
    currentPlanDesc: "اشتراک و مصرف شما در این دوره صورت‌حساب.",
    plan: "طرح",
    seats: "صندلی‌ها",
    periodEnds: "پایان دوره فعلی",
    aiRepliesPeriod: "پاسخ‌های هوش مصنوعی در این دوره",
    availablePlans: "طرح‌های موجود",
    popular: "محبوب‌ترین",
    currentPlanBadge: "طرح فعلی",
    switchTo: "تغییر به",
    cancel: "لغو اشتراک",
    cancelDesc: "اشتراک در پایان دوره فعلی لغو می‌شود.",
    demoNote: "در حالت دمو هیچ پرداختی انجام نمی‌شود. برای محیط تولید، استرایپ یا یک درگاه پرداخت محلی را جایگزین کنید.",
    paymentMethod: "روش پرداخت",
    updated: "طرح به‌روزرسانی شد",
    canceled: "اشتراک در پایان دوره لغو می‌شود",
    usage: "مصرف",
    upgradeSuggest: "به محدودیت نزدیک شده‌اید — برای ادامه، طرح را ارتقا دهید.",
    perMonth: "/ماه",
  },

  // تنظیمات
  settings: {
    title: "تنظیمات",
    subtitle: "اینستاگرام را متصل کنید، فضای کار را مدیریت کنید و خودکارسازی را امتحان کنید.",
    instagram: "اینستاگرام",
    business: "کسب‌وکار",
    simulator: "شبیه‌ساز",
    account: "حساب کاربری",
    demoMode: "حالت دمو",
    demoNote: "اتصال، یک حساب کسب‌وکار را شبیه‌سازی می‌کند. برای فعال‌سازی واقعی، یک اپ متا بسازید (README را ببینید).",
    connectedAccounts: "حساب‌های اینستاگرام متصل",
    connectedAccountsDesc: "حساب‌های کسب‌وکاری که ریپلای‌پایلوت می‌تواند از آن‌ها بخواند و پاسخ دهد.",
    connectInstagram: "اتصال به اینستاگرام",
    disconnect: "قطع اتصال",
    disconnectConfirm: "آیا از قطع اتصال این حساب مطمئن هستید؟",
    requiredScopes: "دسترسی‌های لازم",
    scopesDesc: "این دسترسی‌ها برای عملکرد کامل درخواست می‌شوند:",
    scopeBasic: "اطلاعات پایه کسب‌وکار",
    scopeMessages: "مدیریت پیام‌ها",
    scopeComments: "مدیریت کامنت‌ها",
    scopePublish: "انتشار محتوا (اختیاری)",
    tenantProfile: "پروفایل کسب‌وکار",
    teamMembers: "اعضای تیم",
    role: "نقش",
    simulatorDesc: "خودکارسازی خود را با یک پیام شبیه‌سازی‌شده امتحان کنید 🎬",
    openInbox: "رفتن به صندوق پیام‌ها",
    simulatorSent: "پیام شبیه‌سازی‌شده ارسال شد — صندوق پیام‌ها را بررسی کنید",
    signOut: "خروج از حساب کاربری",
    signOutConfirm: "آیا از خروج مطمئن هستید؟",
    dangerZone: "منطقه خطر",
    noAccounts: "هنوز حسابی متصل نشده است",
    noAccountsDesc: "برای شروع، حساب اینستاگرام کسب‌وکار خود را متصل کنید.",
    followers: "دنبال‌کننده‌ها",
    connectedSince: "متصل از",
    tokenExpires: "انقضای توکن",
  },

  // طرح‌ها
  plans: {
    free: "شروع",
    pro: "رشد",
    business: "مقیاس",
    freeTagline: "برای امتحان کردن",
    proTagline: "برای کسب‌وکارهای در حال رشد",
    businessTagline: "برای آژانس‌ها و تیم‌ها",
  },

  // نقش‌ها
  roles: {
    admin: "مدیر",
    member: "عضو",
  },

  // کانال‌ها
  channels: {
    dm: "دایرکت",
    comment: "کامنت",
    story: "استوری",
  },

  // وضعیت گفتگو
  convoStatus: {
    auto: "پاسخ خودکار",
    manual: "دستی",
    escalated: "نیازمند پیگیری",
    resolved: "حل‌شده",
    failed: "ناموفق",
  },

  // نیت‌ها
  intents: {
    greeting: "سلام و احوال‌پرسی",
    pricing: "قیمت‌گذاری",
    product_question: "سؤال محصول",
    order_status: "وضعیت سفارش",
    support: "پشتیبانی",
    complaint: "شکایت",
    off_topic: "خارج از موضوع",
    other: "سایر",
    unknown: "نامشخص",
  },

  // تایید دمو
  demo: {
    online: "آنلاین",
    aiPowered: "قدرت‌گرفته با GLM",
    replyIncluded: "پاسخ‌های هوش مصنوعی شامل طرح شماست",
    footer: "ریپلای‌پایلوت · خودکارسازی اینستاگرام برای کسب‌وکارهای در حال رشد · حالت دمو فعال — هیچ فراخوانی واقعی به API اینستاگرام ارسال نمی‌شود.",
  },
};

export type T = typeof t;
