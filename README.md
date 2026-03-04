# LaunchKit - Smart SaaS Generator

🚀 **Full-scale production system** to generate requirements, build, deploy, test, and ensure outputs are fully functional SaaS products ready for scale.

Now powered by **Turso** - the edge-native SQLite database! 🎉

## 🎯 What It Does

LaunchKit takes a simple description of your SaaS idea and:

1. ✨ Generates a beautiful, production-ready Next.js app
2. 📦 Creates a GitHub repository
3. 🗄️  Sets up a Turso database with schema
4. 🚢 Deploys to Vercel
5. ⚡ Configures all environment variables
6. 🎨 Includes modern UI with Tailwind, Framer Motion, Headless UI

All in **seconds**!

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```env
# GitHub (create token at: https://github.com/settings/tokens)
GITHUB_TOKEN=ghp_your_token_here
GITHUB_USERNAME=your-username

# Vercel (create token at: https://vercel.com/account/tokens)
VERCEL_TOKEN=your_vercel_token_here

# Turso (get token from: turso auth token)
TURSO_TOKEN=your_turso_token_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Verify Vercel + Turso Connection (optional)

Open the LaunchKit home page, enable **Advanced**, and use the **Integrations** panel to test token connectivity:

- Paste `VERCEL_TOKEN` and `TURSO_TOKEN` directly in the UI (kept in-memory on the page)
- Or leave fields blank to test server-side `.env` tokens
- Click **Test Vercel + Turso** to validate both providers before generating a SaaS


## 🎨 Features

### Current Templates

- ✅ **Task Manager** - Full-featured task management with priorities, due dates, status tracking
- 🏋️ **Fitness Tracker** (coming soon)
- 👥 **CRM** (coming soon)
- 📊 **Analytics Dashboard** (coming soon)
- 📝 **Notes/Wiki** (coming soon)

All templates include:
- 🎨 Beautiful, responsive UI
- ⚡ Fast, edge-native Turso database
- 🔄 Real-time updates
- 📱 Mobile-friendly design
- 🎭 Smooth animations with Framer Motion
- ♿ Accessible components with Headless UI

## 🗄️  Database Migration: Supabase → Turso

LaunchKit now uses **Turso** instead of Supabase for:

- ⚡ **Faster performance** - SQLite at the edge
- 💰 **Lower costs** - Pay only for what you use
- 🌍 **Global distribution** - Data closer to users
- 🔒 **Simpler auth** - No complex RLS policies needed initially
- 🚀 **Instant setup** - Database created automatically

### Migration Details

**Old Stack:**
- `@supabase/supabase-js` → Database client
- Supabase projects → Hosted PostgreSQL
- RLS policies → Security

**New Stack:**
- `@libsql/client` → Turso client
- Turso databases → Edge SQLite
- Application-level auth → Simpler, more flexible

**What Changed:**
- `src/lib/supabase.ts` → `src/lib/db.ts`
- PostgreSQL SQL → SQLite SQL
- UUID primary keys → Text/hex primary keys
- `gen_random_uuid()` → `lower(hex(randomblob(16)))`
- Timestamp functions → `CURRENT_TIMESTAMP`

## 📚 Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Turso** - Serverless SQLite database at the edge
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animation library
- **Headless UI** - Accessible React components
- **Heroicons** - Beautiful icons
- **Vercel** - Deployment platform

## 🚀 How It Works

1. User enters SaaS idea description
2. LaunchKit analyzes description to select best template
3. Generates complete Next.js codebase with:
   - Database schema (Turso/SQLite)
   - API routes
   - UI components
   - Configuration files
4. Creates GitHub repo and pushes code
5. Provisions Turso database
6. Initializes database schema
7. Creates Vercel project
8. Sets environment variables
9. Links the new GitHub repo to Vercel and triggers deployment (no manual clone/import in normal flow)
10. Runs post-deploy functional checks (health, DB ping, auth status, pricing page, checkout endpoint)
11. Returns live URL + remediation guidance + readiness/verification metrics
12. Supports async generation mode with job polling for progress tracking

## 🔮 Roadmap

- [x] Task Manager template with Turso
- [ ] Fitness Tracker template
- [ ] CRM template
- [ ] Analytics Dashboard template
- [ ] Notes/Wiki template
- [ ] Custom domain setup
- [ ] Stripe payment integration
- [ ] Email notifications
- [ ] Authentication (Clerk/Auth.js)
- [ ] AI-powered feature suggestions

## 💡 Usage

```json
POST /api/generate
{
  "name": "TaskMaster Pro",
  "description": "A powerful task management system with priorities and due dates",
  "price": "19"
}
```

Response:
```json
{
  "success": true,
  "url": "https://taskmaster-pro.vercel.app",
  "githubUrl": "https://github.com/username/taskmaster-pro",
  "tursoUrl": "https://turso.tech/app/databases/taskmaster-pro",
  "vercelImportUrl": "https://vercel.com/new/clone?repository-url=...",
  "verification": {
    "passed": false,
    "checks": {
      "homepage": true,
      "healthEndpoint": true,
      "dbRoundtrip": true,
      "authFlow": true,
      "pricingPage": true,
      "checkoutSession": false
    },
    "errors": ["checkoutSession check failed"]
  },
  "revenueReadiness": {
    "score": 100,
    "checks": {
      "billing": true,
      "authentication": true,
      "database": true,
      "deployment": true,
      "onboarding": true,
      "analytics": true
    }
  },
  "stats": { "totalFiles": 24, "failedFiles": [], "durationMs": 18342 },
  "remediation": ["Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel project env, then redeploy"],
  "message": "SaaS created successfully! Database is configured and ready."
}
```


### Observability Endpoints

- `GET /api/analytics/events` → recent event stream
- `GET /api/analytics/funnel` → funnel counters (`ideaSubmitted`, `requirementsAccepted`, `generationStarted`, `generationCompleted`, `deploymentSuccess`, `firstPaidConversion`)
- `POST /api/analytics/track` → track custom events (e.g., `first_paid_conversion`)
- `GET /api/generate/preflight` → validate GitHub/Vercel/Turso tokens before generation run

## 🤝 Contributing

Contributions welcome! Feel free to:
- Add new templates
- Improve existing templates
- Fix bugs
- Enhance documentation

## 📄 License

MIT

---

Built with ❤️  by the LaunchKit team

Powered by [Turso](https://turso.tech) - The edge database 🦞
