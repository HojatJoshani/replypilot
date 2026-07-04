import { PrismaClient } from "@prisma/client";
import { encrypt, hashPassword } from "../src/lib/crypto";

const db = new PrismaClient();

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000);
const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);
const minsAgo = (m: number) => new Date(now - m * 60 * 1000);

async function main() {
  // Wipe (demo only)
  await db.webhookEvent.deleteMany();
  await db.conversationLog.deleteMany();
  await db.lead.deleteMany();
  await db.automationRule.deleteMany();
  await db.aiConfig.deleteMany();
  await db.instagramAccount.deleteMany();
  await db.subscription.deleteMany();
  await db.user.deleteMany();
  await db.tenant.deleteMany();

  // Tenant
  const tenant = await db.tenant.create({
    data: {
      name: "Glow Skin Studio",
      plan: "pro",
      status: "active",
    },
  });

  // User (demo password: demo1234)
  await db.user.create({
    data: {
      tenantId: tenant.id,
      email: "demo@replypilot.app",
      name: "Sara Demo",
      role: "admin",
      passwordHash: hashPassword("demo1234"),
    },
  });

  await db.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "pro",
      status: "active",
      seats: 3,
      currentPeriodEnd: daysAgo(-22),
    },
  });

  // Instagram account (simulated token)
  const acc = await db.instagramAccount.create({
    data: {
      tenantId: tenant.id,
      igUserId: "17841400000000001",
      igUsername: "glowskinstudio",
      igProfilePic: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
      accessTokenEncrypted: encrypt("IGQVJ_SIMULATED_LONG_LIVED_TOKEN_DEMO_MODE"),
      tokenExpiresAt: daysAgo(-48),
      status: "active",
      followerCount: 18420,
      connectedAt: daysAgo(40),
      lastEventAt: minsAgo(12),
    },
  });

  // AI config (Business Context form)
  await db.aiConfig.create({
    data: {
      igAccountId: acc.id,
      tenantId: tenant.id,
      businessName: "Glow Skin Studio",
      tone: "friendly",
      description:
        "A boutique skincare studio offering facials, chemical peels, and curated skincare products. Located in downtown Tehran. We help people build personalized skincare routines.",
      products: "Vitamin C Serum (950K Toman)\nHyaluronic Acid Moisturizer (680K Toman)\nGentle Foaming Cleanser (420K Toman)\nNiacinamide Booster (560K Toman)\nSPF 50 Sunscreen (590K Toman)",
      services: "Signature Glow Facial (1.2M Toman, 60min)\nChemical Peel (1.8M Toman, 45min)\nSkin Consultation (Free, 30min video call)\nCustom Routine Build (350K Toman)",
      faqs: JSON.stringify([
        { q: "Do you ship nationwide?", a: "Yes, we ship across Iran. Tehran same-day, other cities 2-4 days." },
        { q: "Are your products cruelty-free?", a: "Yes, all our products are cruelty-free and most are vegan." },
        { q: "How do I book an appointment?", a: "DM us your preferred date and service, or use the booking link in our bio." },
      ]),
      pricingVisible: true,
      pricingNote: "Prices in Toman. Bundle discounts available.",
      purchaseLink: "https://shop.glowskinstudio.example",
      workingHours: "Sat-Thu 10:00-20:00, Fri closed",
      specialRules: "If a customer asks for medical/dermatology advice, escalate. Never diagnose skin conditions.",
      aiFallbackEnabled: true,
    },
  });

  // Automation rules (priority desc — order matters)
  const rules = [
    {
      name: "سؤال قیمت → هوش مصنوعی",
      triggerType: "keyword",
      triggerKeywords: "price,pricing,cost,how much,بها,قیمت,چند,نرخ",
      triggerMatchMode: "any",
      responseType: "ai_generated",
      priority: 100,
    },
    {
      name: "ساعات کاری",
      triggerType: "keyword",
      triggerKeywords: "hours,open,close,time,ساعت,باز,زمان,کارتون",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "ما شنبه تا چهارشنبه ۱۰ تا ۲۰ آماده‌ایم 🕙 جمعه‌ها تعطیلیم. به‌زودی می‌بینمتون! 💛",
      priority: 90,
    },
    {
      name: "رزرو نوبت",
      triggerType: "keyword",
      triggerKeywords: "book,appointment,reserve,رزرو,نوبت,وقت,دریافت",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "چه عالی، دوست داریم ببینیمتون! 💆‍♀️ لطفاً تاریخ موردنظر + خدمت موردنظرتون (فیشال، پیلینگ یا مشاوره) رو بفرستید تا موجود بودن رو تأیید کنیم.",
      priority: 80,
    },
    {
      name: "اطلاعات ارسال",
      triggerType: "keyword",
      triggerKeywords: "shipping,deliver,send,ارسال,پست,سفارش",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "ارسال به سراسر ایران 📦 تهران = ارسال همان‌روز، شهرهای دیگر ۲ تا ۴ روز کاره. ارسال رایگان برای سفارش‌های بالای ۱.۵ میلیون تومان!",
      priority: 70,
    },
    {
      name: "سلام و احوال‌پرسی",
      triggerType: "keyword",
      triggerKeywords: "hi,hello,hey,salam,سلام,درود,خوبی",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "سلام! 💛 به استودیو پوست گلو خوش آمدید. چطور می‌تونیم به درخشش پوستتون کمک کنیم؟",
      priority: 50,
    },
    {
      name: "پشتیبان: هوش مصنوعی همه دایرکت‌های دیگر را پاسخ می‌دهد",
      triggerType: "any_dm",
      triggerKeywords: "",
      responseType: "ai_generated",
      priority: 1,
    },
  ];

  for (const r of rules) {
    await db.automationRule.create({
      data: {
        tenantId: tenant.id,
        igAccountId: acc.id,
        name: r.name,
        triggerType: r.triggerType,
        triggerKeywords: r.triggerKeywords,
        triggerMatchMode: r.triggerMatchMode as string,
        responseType: r.responseType,
        staticResponse: (r as { staticResponse?: string }).staticResponse ?? null,
        aiPromptOverride: null,
        isActive: true,
        priority: r.priority,
      },
    });
  }

  // Conversation logs (last 30 days)
  const sampleConvos = [
    { mins: 8, channel: "dm", user: "minoo_skincare", in: "سلام، قیمت سرم ویتامین سی چنده؟", out: null, ai: true, intent: "pricing", esc: true, status: "escalated" },
    { mins: 26, channel: "dm", user: "arya.r", in: "سلام! ساعات کاریتون چنده؟", out: "ما شنبه تا چهارشنبه ۱۰ تا ۲۰ آماده‌ایم 🕙 جمعه‌ها تعطیلیم. به‌زودی می‌بینیمتون! 💛", ai: false, intent: "other", esc: false, status: "auto" },
    { mins: 54, channel: "comment", user: "diba.m", in: "این سرمو می‌خوام! چطور سفارش بدم؟", out: "می‌تونید از لینک داخل بایو سفارش بدید 🛍️ اگه تو انتخاب کمک خواستید دایرکت بدید 💛", ai: true, intent: "product_question", esc: false, status: "auto" },
    { mins: 120, channel: "dm", user: "leila_beauty", in: "یک جوش عجیب روی پوستم دارم، محصولی پیشنهاد می‌کنید؟", out: "خیلی متأسفم که با این مشکل مواجه شدید! 💛 چون جوش‌ها می‌تونن علل مختلفی داشته باشن، واقعاً پیشنهاد می‌کنم اول با یک متخصص پوست مشورت کنید. بعد از تشخیص، ما می‌تونیم یک روتین ملایم براتون بسازیم. مایل هستید برای تیممون یادداشت کنم تا پیگیری کنند؟", ai: true, intent: "complaint", esc: true, status: "escalated" },
    { mins: 180, channel: "story", user: "sara_nails", in: "عاشق این لوک شدم!", out: "خیلی ممنون! 💛✨", ai: false, intent: "other", esc: false, status: "auto" },
    { mins: 240, channel: "dm", user: "omid.k", in: "به شیراز ارسال دارید؟", out: "ارسال به سراسر ایران 📦 تهران = ارسال همان‌روز، شهرهای دیگر ۲ تا ۴ روز کاره. ارسال رایگان برای سفارش‌های بالای ۱.۵ میلیون تومان!", ai: false, intent: "other", esc: false, status: "auto" },
    { hours: 6, channel: "dm", user: "newcustomer_91", in: "سلام", out: "سلام! 💛 به استودیو پوست گلو خوش آمدید. چطور می‌تونیم به درخشش پوستتون کمک کنیم؟", ai: false, intent: "greeting", esc: false, status: "auto" },
    { hours: 9, channel: "comment", user: "negar.sk", in: "قیمت؟", out: null, ai: true, intent: "pricing", esc: false, status: "auto" },
    { hours: 14, channel: "dm", user: "mahnaz_t", in: "می‌خوام نوبت فیشال بگیرم", out: "چه عالی، دوست داریم ببینیمتون! 💆‍♀️ لطفاً تاریخ موردنظر + خدمت موردنظرتون (فیشال، پیلینگ یا مشاوره) رو بفرستید تا موجود بودن رو تأیید کنیم.", ai: false, intent: "other", esc: false, status: "auto" },
    { hours: 22, channel: "dm", user: "roya_d", in: "کجان؟ آدرستون چیه؟", out: "ما تو مرکز تهران هستیم، نزدیک میدان انقلاب 📍 پارکینگ نزدیک موجوده. مایل هستید لوکیشن دقیق رو بفرستم؟", ai: true, intent: "product_question", esc: false, status: "auto" },
    { hours: 30, channel: "story", user: "niloo.art", in: "😍😍", out: "💛💛", ai: false, intent: "other", esc: false, status: "auto" },
    { hours: 36, channel: "comment", user: "hamid.sh", in: "این برای پوست چرب مناسبه؟", out: "بله! سرم ویتامین سی ما سبک و بدون چربی‌کنندگی‌ست، برای پوست چرب عالیه. برای نتیجه بهتر با بوستر نیاسینامید ترکیبش کنید ✨", ai: true, intent: "product_question", esc: false, status: "auto" },
    { hours: 50, channel: "dm", user: "complain_guy", in: "سفارشم هنوز نرسیده!!", out: "اوه نه، خیلی متأسفم! 😔 همین الان برای تیممون علامت‌گذاری می‌کنم تا پیگیری کنیم. می‌تونید شماره سفارستون رو بفرستید؟", ai: true, intent: "complaint", esc: true, status: "escalated" },
    { days: 3, channel: "dm", user: "parisa_m", in: "سلام", out: "سلام! 💛 به استودیو پوست گلو خوش آمدید. چطور می‌تونیم به درخشش پوستتون کمک کنیم؟", ai: false, intent: "greeting", esc: false, status: "auto" },
    { days: 4, channel: "comment", user: "kian.k", in: "فیشال چنده؟", out: "فیشال درخشش امضای ما ۱.۲ میلیون تومان برای ۶۰ دقیقه‌ست ✨ برای رزرو دایرکت بدید!", ai: true, intent: "pricing", esc: false, status: "auto" },
    { days: 6, channel: "dm", user: "elham_b", in: "لطفن وجه رو پس بدهید", out: null, ai: true, intent: "complaint", esc: true, status: "escalated" },
    { days: 8, channel: "story", user: "tara_mua", in: "زیبا", out: "ممنون! 💕", ai: false, intent: "other", esc: false, status: "auto" },
    { days: 11, channel: "dm", user: "sina.dev", in: "فروشگاه فیزیکی دارید؟", out: "بله! ما یک استودیو در مرکز تهران داریم و آنلاین هم خرید می‌تونید انجام بدید 🛍️ مایل هستید آدرس رو بفرستم؟", ai: true, intent: "product_question", esc: false, status: "auto" },
    { days: 14, channel: "comment", user: "ava_designs", in: "عاشق محصولاتتونم!", out: "خیلی ممنون از لطفتون! 💛✨", ai: false, intent: "other", esc: false, status: "auto" },
    { days: 18, channel: "dm", user: "mahsa.r", in: "هفته بعد برا پیلینگ نوبت می‌خوام", out: "چه عالی، دوست داریم ببینیمتون! 💆‍♀️ لطفاً تاریخ موردنظر + خدمت موردنظرتون (فیشال، پیلینگ یا مشاوره) رو بفرستید تا موجود بودن رو تأیید کنیم.", ai: false, intent: "other", esc: false, status: "auto" },
    { days: 22, channel: "dm", user: "samira_k", in: "چه ضدآفتابی پیشنهاد می‌کنید؟", out: "ضدآفتاب SPF 50 ما از محبوب‌ترین‌هاست — سبک، بدون سفیدی و سازگار با محیط! 🌞 قیمتش رو بفرستم؟", ai: true, intent: "product_question", esc: false, status: "auto" },
    { days: 25, channel: "story", user: "donya_n", in: "🔥🔥🔥", out: "🔥💛", ai: false, intent: "other", esc: false, status: "auto" },
  ];

  for (const c of sampleConvos) {
    await db.conversationLog.create({
      data: {
        tenantId: tenant.id,
        igAccountId: acc.id,
        contactIgId: "ig_" + c.user.replace(/\W/g, ""),
        contactUsername: c.user.trim(),
        channel: c.channel,
        inboundMessage: c.in,
        outboundMessage: c.out,
        wasAiGenerated: c.ai,
        escalated: c.esc,
        intent: c.intent,
        status: c.status,
        suggestedAction: c.esc ? "ظرف ۲۴ ساعت با مشتری پیگیری کنید." : null,
        aiModel: c.ai ? "z-ai-glm" : null,
        createdAt: c.mins ? minsAgo(c.mins) : c.hours ? hoursAgo(c.hours) : daysAgo(c.days as number),
      },
    });
  }

  // Leads
  const leads = [
    { user: "minoo_skincare", status: "new", tags: "pricing,dm", source: "dm", days: 0 },
    { user: "leila_beauty", status: "contacted", tags: "complaint,dm", source: "dm", days: 0 },
    { user: "roya_d", status: "new", tags: "product_question,dm", source: "dm", days: 1 },
    { user: "complain_guy", status: "qualified", tags: "complaint,dm", source: "dm", days: 2 },
    { user: "elham_b", status: "lost", tags: "complaint,dm", source: "dm", days: 6 },
    { user: "sina.dev", status: "qualified", tags: "product_question,dm", source: "dm", days: 11 },
    { user: "samira_k", status: "won", tags: "product_question,dm", source: "dm", days: 22 },
    { user: "kian.k", status: "new", tags: "pricing,comment", source: "comment", days: 4 },
    { user: "negar.sk", status: "contacted", tags: "pricing,comment", source: "comment", days: 0 },
    { user: "hamid.sh", status: "qualified", tags: "product_question,comment", source: "comment", days: 2 },
  ];
  for (const l of leads) {
    await db.lead.create({
      data: {
        tenantId: tenant.id,
        igAccountId: acc.id,
        contactIgId: "ig_" + l.user.replace(/\W/g, ""),
        contactUsername: l.user,
        tags: l.tags,
        status: l.status,
        source: l.source,
        notes: l.status === "won" ? "تبدیل شد — ضدآفتاب SPF 50 + سرم ویتامین سی را خرید." : l.status === "lost" ? "درخواست بازگشت وجه؛ قابل حل نبود." : "",
        createdAt: daysAgo(l.days),
      },
    });
  }

  console.log("✅ Seed کامل شد. ورود دمو: demo@replypilot.app / demo1234 (یا دکمه دمو).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
