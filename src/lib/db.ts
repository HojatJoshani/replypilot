import { PrismaClient } from '@prisma/client'
import { SCHEMA_SQL } from './schema-sql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _seeded: boolean | undefined
  _schemaReady: boolean | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Ensure the SQLite schema exists by executing the DDL SQL directly.
 * On serverless platforms (Vercel), `prisma db push` can't run at runtime
 * (CLI not available), so we apply the schema via raw SQL.
 */
export async function ensureSchema() {
  if (globalForPrisma._schemaReady) return
  try {
    const result = await db.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='Tenant'`
    ) as { name: string }[]
    if (result.length > 0) {
      globalForPrisma._schemaReady = true
      return
    }
    // Schema doesn't exist — apply DDL from bundled SQL
    const statements = SCHEMA_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    for (const stmt of statements) {
      await db.$executeRawUnsafe(stmt)
    }
    globalForPrisma._schemaReady = true
    console.log('[db] schema created via raw SQL')
  } catch (e) {
    console.error('[db] ensureSchema failed:', (e as Error).message)
    globalForPrisma._schemaReady = true
  }
}

/**
 * Ensure the database has at least a demo tenant + user.
 * On serverless platforms (Vercel), the SQLite DB may be empty on cold starts.
 */
export async function ensureSeedData() {
  if (globalForPrisma._seeded) return
  await ensureSchema()
  try {
    const userCount = await db.user.count()
    if (userCount > 0) {
      globalForPrisma._seeded = true
      return
    }
    // Auto-create demo tenant + user if DB is empty
    const { hashPassword, encrypt } = await import('./crypto')
    const tenant = await db.tenant.create({
      data: {
        name: 'استودیو پوست گلو',
        plan: 'pro',
        status: 'active',
        subscription: { create: { plan: 'pro', status: 'active', seats: 3 } },
        users: {
          create: {
            email: 'demo@replypilot.app',
            name: 'Sara Demo',
            role: 'admin',
            passwordHash: hashPassword('demo1234'),
          },
        },
      },
    })
    const acc = await db.instagramAccount.create({
      data: {
        tenantId: tenant.id,
        igUserId: '17841400000000001',
        igUsername: 'glowskinstudio',
        igProfilePic: 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
        accessTokenEncrypted: encrypt('IGQVJ_DEMO_TOKEN'),
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'active',
        followerCount: 18420,
      },
    })
    await db.aiConfig.create({
      data: {
        igAccountId: acc.id,
        tenantId: tenant.id,
        businessName: 'استودیو پوست گلو',
        tone: 'friendly',
        description: 'یک استودیوی تخصصی مراقبت پوست که فیشال، پیلینگ و محصولات پوستی ارائه می‌دهد.',
        products: 'سرم ویتامین سی (۹۵۰ هزار تومان)\nمرطوب‌کننده هیالورونیک اسید (۶۸۰ هزار تومان)',
        services: 'فیشال درخشش (۱.۲ میلیون تومان)\nپیلینگ شیمیایی (۱.۸ میلیون تومان)',
        pricingVisible: true,
        purchaseLink: 'https://shop.example.com',
        workingHours: 'شنبه تا چهارشنبه ۱۰ تا ۲۰',
        specialRules: 'اگه کسی سؤال پزشکی پرسید، ارجاع بده.',
        aiFallbackEnabled: true,
      },
    })
    // Add starter rules from templates
    const { SCENARIO_TEMPLATES } = await import('./constants')
    for (let i = 0; i < SCENARIO_TEMPLATES.length && i < 6; i++) {
      const tpl = SCENARIO_TEMPLATES[i]
      await db.automationRule.create({
        data: {
          tenantId: tenant.id,
          igAccountId: acc.id,
          name: tpl.rule.name,
          triggerType: tpl.rule.triggerType,
          triggerKeywords: tpl.rule.triggerKeywords,
          triggerMatchMode: tpl.rule.triggerMatchMode,
          responseType: tpl.rule.responseType,
          staticResponse: tpl.rule.staticResponse ?? null,
          conditionsJson: tpl.rule.conditionsJson ?? null,
          actionsJson: tpl.rule.actionsJson ?? null,
          isActive: true,
          priority: 100 - i * 10,
        },
      })
    }
    globalForPrisma._seeded = true
    console.log('[db] auto-seeded demo data (empty DB detected)')
  } catch (e) {
    console.error('[db] auto-seed failed:', (e as Error).message)
    globalForPrisma._seeded = true
  }
}
