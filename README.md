# DC's Kitchen (`cook-dfchen`)

Bilingual (Chinese / English) personal recipe collection, private per-user restaurant diary, meal planner with Google Calendar sync, and MCP server — deployed on **Firebase App Hosting** at [cook.dfchen.com](https://cook.dfchen.com).

## Stack

- **Framework**: Next.js 16 (App Router) + `next-intl` (`zh` default, `en`) + Tailwind CSS v4
- **Auth**: Firebase Authentication (Google Sign-In + passwordless Email Link) backed by an `httpOnly` `__session` cookie verified server-side
- **Database**: Cloud Firestore (accessed exclusively from the server via `firebase-admin`; [firestore.rules](firestore.rules) denies direct client access)
- **Storage**: Cloud Storage for Firebase (`recipes/**` public read / admin write; `restaurants/{uid}/**` owner-only via [storage.rules](storage.rules))
- **Hosting**: Firebase App Hosting (`cook-dfchen` backend in `us-central1`, project `cook-copilot`, configured in [apphosting.yaml](apphosting.yaml))
- **MCP**: Streamable HTTP MCP server at `/api/mcp` (`Authorization: Bearer <MCP_API_KEY>`)

## Local Development

1. Authenticate Application Default Credentials with access to the `cook-copilot` Firebase project:
   ```bash
   gcloud auth application-default login
   ```
2. Configure `.env.local`:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cook-copilot.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=cook-copilot
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cook-copilot.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=533070630011
   NEXT_PUBLIC_FIREBASE_APP_ID=1:533070630011:web:251f2d823748cddbd7a6de
   OWNER_EMAIL=dfchen6@gmail.com
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   MCP_API_KEY=...
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Running with Firebase Emulators (optional)

```bash
npx -y firebase-tools@latest emulators:start --only auth,firestore,storage --project cook-copilot
```

Then start Next.js with:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 \
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true \
npm run dev
```

## Deploy to Firebase

Deploy Firestore rules, Storage rules, and the Next.js app to Firebase App Hosting:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,storage,apphosting --project cook-copilot
```

Runtime secrets (`googleClientId`, `googleClientSecret`, `mcpApiKey`) are stored in Cloud Secret Manager and referenced in [apphosting.yaml](apphosting.yaml):

```bash
npx -y firebase-tools@latest apphosting:secrets:set <secretName> --project cook-copilot
npx -y firebase-tools@latest apphosting:secrets:grantaccess <secretName> --backend cook-dfchen --project cook-copilot
```
