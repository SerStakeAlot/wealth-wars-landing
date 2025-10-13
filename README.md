# ✨ Welcome to Your Spark Template!
You've just launched your brand-new Spark Template Codespace — everything’s fired up and ready for you to explore, build, and create with Spark!

This template is your blank canvas. It comes with a minimal setup to help you get started quickly with Spark development.

🚀 What's Inside?
- A clean, minimal Spark environment
- Pre-configured for local development
- Ready to scale with your ideas
  
🧠 What Can You Do?

Right now, this is just a starting point — the perfect place to begin building and testing your Spark applications.

## 🌐 Deployment (GitHub Pages + Custom Domain)

This project is configured to deploy automatically to **GitHub Pages** from the `main` branch using a GitHub Actions workflow (`.github/workflows/deploy.yml`).

### Build Output
The production build outputs to `dist/` via `vite build`.

### Custom Domain
Custom domain configured: `wealthwars.fun` (via `public/CNAME`). The CNAME file is uploaded automatically in each deployment.

### First-Time Setup Steps
1. In the GitHub repository settings, go to: Settings → Pages.
2. Set: Source = GitHub Actions (should auto-detect once workflow runs).
3. After first successful deploy, add `wealthwars.fun` as the custom domain in the Pages settings (it should already detect it thanks to `CNAME`).
4. (Optional) Enforce HTTPS once the certificate is issued.

### DNS Configuration (GoDaddy)
In your GoDaddy DNS manager for `wealthwars.fun` add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 185.199.108.153 | 1h |
| A | @ | 185.199.109.153 | 1h |
| A | @ | 185.199.110.153 | 1h |
| A | @ | 185.199.111.153 | 1h |
| CNAME | www | wealthwars.fun | 1h |

(GitHub Pages anycast IPs – all four A records recommended.)

Propagation may take from a few minutes up to a couple of hours. Use `dig wealthwars.fun` or an online DNS checker to verify.

### Local Preview
```bash
npm install
npm run dev
```

### Production Build (manual)
```bash
npm run build
```

### Force a Redeploy
Make any commit to `main` (e.g. update README) or use the workflow dispatch button in the Actions tab.

### Troubleshooting
| Symptom | Fix |
|---------|-----|
| 404 on custom domain | Ensure DNS A records point to GitHub Pages IPs; verify `CNAME` file deployed. |
| HTTP only | Wait for certificate, then enable HTTPS in Pages settings. |
| Old assets cached | Bump query param or invalidate by changing file hash (Vite already hashes). |

## 🎮 Unity WebGL Demo

The Unity WebGL demo is served at `https://wealthwars.fun/demo/`. 

To sync a new Unity build to the demo route, use the **"Sync Demo Build"** GitHub Actions workflow. See [DEMO-SYNC.md](./DEMO-SYNC.md) for detailed instructions.

Default source repo: `SerStakeAlot/wealthwarsbuild` (WebGL export at repo root)

**Quick Start:**
1. Go to Actions → "Sync Demo Build" → Run workflow
2. Provide the Unity build repository details
3. Wait for deployment to complete
4. Visit https://wealthwars.fun/demo/

---

🧹 Just Exploring?
No problem! If you were just checking things out and don’t need to keep this code:

- Simply delete your Spark.
- Everything will be cleaned up — no traces left behind.

📄 License For Spark Template Resources 

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
