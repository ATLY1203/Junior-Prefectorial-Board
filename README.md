Junior Prefectorial Board — Local setup, auth fixes, and troubleshooting

What changed

- Unified Firebase initialization to a single modular config in `js/firebase-config.js`.
- Removed compat SDK script tags from `index.html` to avoid duplicate initialization.
- Consolidated Firestore collection usage to simple collection names: `userProfiles`, `ratings`, `announcements`.
- Updated `script.js` and `js/auth.js` to import modular Firebase modules from the gstatic CDN and to use the shared `auth`/`db` instances.

Why this fixes login/signup issues

Previously the app sometimes wrote user profiles to `userProfiles/{uid}` but read them back from `artifacts/${appId}/public/data/userProfiles/{uid}`. The mismatch made the app think profiles were missing after signup/login. The codebase now uses `userProfiles` consistently and all modules share the same Firebase app instance.

Quick local run

1. Start a static server in the project root (macOS/Linux):

```bash
python3 -m http.server 8000
```

2. Open http://localhost:8000 in your browser.
3. Open DevTools → Console and Network to inspect logs and any Firebase errors.

Firebase project setup checklist (important)

- Make sure `js/firebase-config.js` contains the correct Firebase project configuration for your project (apiKey, authDomain, projectId, etc.).
- In the Firebase console (your project):
  - Enable Email/Password sign-in under Authentication → Sign-in method.
  - Add `localhost:8000` (and your deployed domain) to Authentication → Authorized domains.
  - If using Firestore security rules, ensure the rules allow reads/writes the app needs for the current stage (for quick testing you can temporarily allow reads/writes, but secure before production).

Common errors and how to fix

- Domain not allowed (auth/domain-not-allowed): Add the domain to Authorized domains in Firebase Authentication.
- Invalid API key or project mismatch: Ensure the config in `js/firebase-config.js` matches the Firebase project you expect.
- Permission denied (Firestore): Check Firestore rules or the user’s authentication state.

Next recommended cleanups (optional)

- Remove duplicate auth logic (there are two places with similar functions — prefer keeping `js/auth.js` and importing it from `script.js`).
- Add a small test harness that runs in a headless browser (Puppeteer) to assert signup/login flows automatically.
- Replace CDN imports with a bundler (Vite/Rollup/webpack) for production builds.

If you want, I can implement any of the optional cleanups. Which one would you like next?