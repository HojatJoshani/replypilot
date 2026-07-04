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
      name: "Pricing question → AI",
      triggerType: "keyword",
      triggerKeywords: "price,pricing,cost,how much,بها,قیمت,چند",
      triggerMatchMode: "any",
      responseType: "ai_generated",
      priority: 100,
    },
    {
      name: "Working hours",
      triggerType: "keyword",
      triggerKeywords: "hours,open,close,time,ساعت,باز,زمان",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "We're open Sat–Thu, 10:00–20:00 🕙 Fridays we're closed. See you soon! 💛",
      priority: 90,
    },
    {
      name: "Booking request",
      triggerType: "keyword",
      triggerKeywords: "book,appointment,reserve,رزرو,نوبت,وقت",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "Yay, we'd love to see you! 💆‍♀️ Please share your preferred date + the service you want (facial, peel, or consultation) and we'll confirm availability.",
      priority: 80,
    },
    {
      name: "Shipping info",
      triggerType: "keyword",
      triggerKeywords: "shipping,deliver,send,ارسال,پست",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "We ship across Iran 📦 Tehran = same-day delivery, other cities arrive in 2–4 business days. Free shipping over 1.5M Toman!",
      priority: 70,
    },
    {
      name: "Greeting (hi/hello)",
      triggerType: "keyword",
      triggerKeywords: "hi,hello,hey,salam,سلام,درود",
      triggerMatchMode: "any",
      responseType: "static_text",
      staticResponse: "Hi there! 💛 Welcome to Glow Skin Studio. How can we help your skin glow today?",
      priority: 50,
    },
    {
      name: "Fallback: AI handles all other DMs",
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
    { mins: 26, channel: "dm", user: "arya.r", in: "hey! what are your working hours?", out: "We're open Sat–Thu, 10:00–20:00 🕙 Fridays we're closed. See you soon! 💛", ai: false, intent: "other", esc: false, status: "auto" },
    { mins: 54, channel: "comment", user: "diba.m", in: "I need this serum! How do I order?", out: "You can grab it from the link in our bio 🛍️ DM us if you need help choosing 💛", ai: true, intent: "product_question", esc: false, status: "auto" },
    { mins: 120, channel: "dm", user: "leila_beauty", in: "I have a weird rash, can you recommend a product?", out: "I'm so sorry you're dealing with that! 💛 Since rashes can have many causes, I'd really recommend seeing a dermatologist first. Once you have a diagnosis, we can help build a gentle routine. Want me to note this for our team to follow up?", ai: true, intent: "complaint", esc: true, status: "escalated" },
    { mins: 180, channel: "story", user: "sara_nails", in: "Love this look!", out: "Thank you so much! 💛✨", ai: false, intent: "other", esc: false, status: "auto" },
    { mins: 240, channel: "dm", user: "omid.k", in: "Do you ship to Shiraz?", out: "We ship across Iran 📦 Tehran = same-day delivery, other cities arrive in 2–4 business days. Free shipping over 1.5M Toman!", ai: false, intent: "other", esc: false, status: "auto" },
    { hours: 6, channel: "dm", user: "newcustomer_91", in: "hi", out: "Hi there! 💛 Welcome to Glow Skin Studio. How can we help your skin glow today?", ai: false, intent: "greeting", esc: false, status: "auto" },
    { hours: 9, channel: "comment", user: "negar.sk", in: "price?", out: null, ai: true, intent: "pricing", esc: false, status: "auto" },
    { hours: 14, channel: "dm", user: "mahnaz_t", in: "میخوام نوبت فیشال بگیرم", out: "Yay, we'd love to see you! 💆‍♀️ Please share your preferred date + the service you want (facial, peel, or consultation) and we'll confirm availability.", ai: false, intent: "other", esc: false, status: "auto" },
    { hours: 22, channel: "dm", user: "roya_d", in: "where are you located?", out: "We're in downtown Tehran, just off Enqelab St 📍 There's parking nearby. Want me to send the exact pin?", ai: true, intent: "product_question", esc: false, status: "auto" },
    { hours: 30, channel: "story", user: "niloo.art", in: "😍😍", out: "💛💛", ai: false, intent: "other", esc: false, status: "auto" },
    { hours: 36, channel: "comment", user: "hamid.sh", in: "is this good for oily skin?", out: "Yes! Our Vitamin C Serum is lightweight and non-comedogenic, great for oily skin. Pair it with the Niacinamide Booster for best results ✨", ai: true, intent: "product_question", esc: false, status: "auto" },
    { hours: 50, channel: "dm", user: " complain_guy", in: "my order never arrived!!", out: "Oh no, I'm so sorry about that! 😔 Let me flag this for our team right away and we'll track it down. Could you share your order number?", ai: true, intent: "complaint", esc: true, status: "escalated" },
    { days: 3, channel: "dm", user: "parisa_m", in: "hello", out: "Hi there! 💛 Welcome to Glow Skin Studio. How can we help your skin glow today?", ai: false, intent: "greeting", esc: false, status: "auto" },
    { days: 4, channel: "comment", user: "kian.k", in: "how much is the facial?", out: "Our Signature Glow Facial is 1.2M Toman for 60 minutes ✨ DM us to book!", ai: true, intent: "pricing", esc: false, status: "auto" },
    { days: 6, channel: "dm", user: "elham_b", in: "refund please", out: null, ai: true, intent: "complaint", esc: true, status: "escalated" },
    { days: 8, channel: "story", user: "tara_mua", in: "gorgeous", out: "Thank you! 💕", ai: false, intent: "other", esc: false, status: "auto" },
    { days: 11, channel: "dm", user: "sina.dev", in: "do you have a physical store?", out: "Yes! We have a studio in downtown Tehran and you can also shop online 🛍️ Want the address?", ai: true, intent: "product_question", esc: false, status: "auto" },
    { days: 14, channel: "comment", user: "ava_designs", in: "love your products!", out: "Thank you so much for the love! 💛✨", ai: false, intent: "other", esc: false, status: "auto" },
    { days: 18, channel: "dm", user: "mahsa.r", in: "book a peel for next week", out: "Yay, we'd love to see you! 💆‍♀️ Please share your preferred date + the service you want (facial, peel, or consultation) and we'll confirm availability.", ai: false, intent: "other", esc: false, status: "auto" },
    { days: 22, channel: "dm", user: "samira_k", in: "what sunscreen do you recommend?", out: "Our SPF 50 Sunscreen is a customer favorite — lightweight, no white cast, and reef-safe! 🌞 Want the price?", ai: true, intent: "product_question", esc: false, status: "auto" },
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
        suggestedAction: c.esc ? "Follow up with customer within 24h." : null,
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
        notes: l.status === "won" ? "Converted — purchased SPF 50 + Vitamin C Serum." : l.status === "lost" ? "Requested refund; could not resolve." : "",
        createdAt: daysAgo(l.days),
      },
    });
  }

  console.log("✅ Seed complete. Demo login: demo@replypilot.app / demo1234 (or use the Demo button).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
