# راهنمای اتصال به اینستاگرام واقعی (ویژه بحرین 🇧🇭)

این راهنما نحوه اتصال ریپلای‌پایلوت به یک حساب اینستاگرام واقعی را به‌صورت گام‌به‌گام توضیح می‌دهد، با نکات خاص برای کاربران در **بحرین** و کشورهای منطقه.

---

## ✅ خبر خوب: بحرین هیچ محدودیتی ندارد

**Instagram Graph API و Messaging API به‌صورت جهانی کار می‌کنند** و بحرین در فهرست کشورهای پشتیبانی‌شده است. هیچ محدودیت جغرافیایی خاصی برای بحرین وجود ندارد — وب‌هوک‌ها، Send API و Comments API همه از بحرین قابل‌استفاده‌اند.

---

## 📋 پیش‌نیازها

1. **حساب اینستاگرام Business یا Creator** (نه Personal)
   - تبدیل: Instagram → Settings → Account → Switch to Professional Account → Business
   - باید به یک **صفحه فیسبوک** متصل باشد

2. **حساب Meta Developer** (رایگان) در <https://developers.facebook.com>

3. یک **سرور با HTTPS** (اینستاگرام فقط به URLهای `https://` وب‌هوک می‌فرستد)

---

## 🚀 راه‌اندازی گام‌به‌گام

### گام ۱: ساخت Meta App

1. به <https://developers.facebook.com/apps> بروید → **Create App**
2. نوع: **Business**
3. نام: `ReplyPilot` (یا هر نام دلخواه)
4. ایمیل تماس → **Create App**

### گام ۲: افزودن محصول اینستاگرام

- داشبورد اپ → **Add Product** → **Instagram** → **Set Up**

### گام ۳: پیکربندی OAuth

1. به **Instagram → Basic Display** بروید
2. **Instagram Business Login** را اضافه کنید
3. **Valid OAuth Redirect URIs**:
   ```
   https://YOUR_DOMAIN/api/instagram/oauth/callback
   ```
4. دسترسی‌های موردنیاز:
   - `instagram_business_basic`
   - `instagram_business_manage_messages`
   - `instagram_business_manage_comments`
   - `instagram_business_content_publish` *(فقط برای استوری/پست)*

### گام ۴: پیکربندی وب‌هوک

1. به **Instagram → Webhooks** بروید
2. فیلدها را subscribe کنید: `messages`، `comments`، `mentions`
3. **Callback URL**: `https://YOUR_DOMAIN/api/instagram/webhook`
4. **Verify Token**: دقیقاً با `INSTAGRAM_VERIFY_TOKEN` در `.env` یکسان باشد
5. **Verify and Save**
6. حساب متصل را به فیلدهای وب‌هوک subscribe کنید

### گام ۵: دریافت credentials

- **App ID** → `INSTAGRAM_APP_ID`
- **App Secret** → `INSTAGRAM_APP_SECRET`

### گام ۶: پیکربندی `.env`

```env
DEMO_MODE=false
INSTAGRAM_APP_ID=۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶
INSTAGRAM_APP_SECRET=abc123def456...
INSTAGRAM_VERIFY_TOKEN=یک_رشته_دلخواه_امن
INSTAGRAM_GRAPH_API_VERSION=v21.0
NEXTAUTH_URL=https://your-domain.com   # باید HTTPS باشد
ENCRYPTION_KEY=...    # openssl rand -hex 32
NEXTAUTH_SECRET=...   # openssl rand -hex 32
```

سپس سرور را restart کنید — اپ در **حالت تولید** اجرا می‌شود.

---

## 🌐 توسعه محلی با ngrok

برای تست در لپ‌تاپ، چون اینستاگرام فقط به HTTPS وب‌هوک می‌فرستد:

```bash
# ترمینال ۱: اجرای اپ
bun run dev

# ترمینال ۲: تونل امن
ngrok http 3000
```

URL تولیدشده (مثل `https://abc123.ngrok.io`) را در `.env` و داشبورد متا استفاده کنید.

> **جایگزین رایگان با URL پایدارتر:**
> ```bash
> cloudflared tunnel --url http://localhost:3000
> ```

---

## 🇧🇭 نکات خاص بحرین

| موضوع | توصیه |
|---|---|
| **هاستینگ** | AWS Bahrain (me-south-1)، Azure Bahrain، یا Vercel — تأخیر کم به متا |
| **دسترسی به Meta** | در بحرین مستقیم و بدون VPN قابل‌دسترس است |
| **timezone** | `Asia/Bahrain` (GMT+3)، ساعت تابستانی ندارد |
| **زبان پاسخ** | در فرم زمینه کسب‌وکار بنویسید: «پاسخ به زبان مشتری (عربی/انگلیسی/فارسی)» |
| **پرداخت** | BenefitPay، CrediMax (محلی)، Stripe/PayPal/Tap (بین‌المللی) |
| **شماره تماس** | پیش‌شماره بحرین `+973` (بدون صفر) |

---

## 📱 App Review (برای استفاده عمومی)

| حالت | توضیح |
|---|---|
| **Development** | فقط tester/admin که اضافه می‌کنید می‌تواند وصل شود — برای تست کافی است |
| **Live** | برای استفاده عمومی، App Review درخواست کنید (۳-۷ روز کاری) |

مدارک موردنیاز برای Live:
- Screencast ۲-۵ دقیقه‌ای از flow اوآث
- URL سیاست حریم خصوصی
- Data Deletion Callback URL

---

## 🔒 امنیت توکن‌ها

- توکن‌ها با **AES-256-GCM** رمزنگاری می‌شوند
- توکن‌های long-lived **۶۰ روز** اعتبار دارند — ریپلای‌پایلوت ۷ روز قبل از انقضا بازخوانی می‌کند
- `ENCRYPTION_KEY` هرگز در git commit نشود (`.env` در `.gitignore` است)

---

## 🚨 مشکلات رایج

| مشکل | راه‌حل |
|---|---|
| «Invalid signature» | `INSTAGRAM_APP_SECRET` را دقیق کپی کنید |
| وب‌هوک verify نمی‌شود | `INSTAGRAM_VERIFY_TOKEN` در `.env` و متا یکسان نبود |
| «Account not found» | حساب Personal است → به Business تبدیل کنید |
| DM نمی‌رسد | بعد از ۲۴ ساعت از آخرین پیام مشتری — پنجره ۲۴ ساعته |
| کامنت نمی‌رسد | فیلد `comments` را subscribe نکردید |

---

## 📞 پشتیبانی

- مستندات رسمی: <https://developers.facebook.com/docs/instagram-api>
- Issues گیت‌هاب: <https://github.com/HojatJoshani/replypilot/issues>
