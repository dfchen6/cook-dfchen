# Cook iOS (`私房食谱`)

Native SwiftUI iOS companion app (`iOS 17+`) optimized for hands-busy, counter-side home cooking.

## Highlights

- **Immersive Kitchen Cooking Mode (`CookingModeView`)**:
  - Automatic screen keep-awake (`UIApplication.shared.isIdleTimerDisabled = true`) so the screen never dims mid-stir-fry.
  - High-contrast obsidian palette with counter-distance readable typography (`A` / `A+` toggle).
  - 120Hz native paged step carousel + giant thumb-friendly bottom dock (`←`, `配料速查` bottom sheet drawer, `下一步 →`).
  - Smart inline timer detection (automatically extracts durations like `"焖煮约 20 分钟"` / `"simmer 20 mins"` into one-tap countdown pills) + concurrent multi-dish timers with local notifications & haptics.
  - Minimizable active cooking bar so you can check a second recipe while a dish is simmering.
- **Google Sign-In & Offline-First Sync**:
  - Uses Apple's `ASWebAuthenticationSession` (`https://cook.dfchen.com/zh/login/mobile`) + iOS Keychain + automatic silent token refresh (`/api/mobile/refresh`).
  - Syncs all visible public & private recipes from `/api/mobile/recipes` and caches both JSON data and cover images locally on disk for instant `0ms` offline startup.
- **Mise-en-Place Prep Tools**:
  - Tap-to-check ingredient preparation list, portion scaling (`0.5×` / `1×` / `1.5×` / `2×`), and multi-video support (YouTube in-app `SFSafariViewController` sheet + Xiaohongshu deep link).

## Running in Xcode or on Your iPhone

1. Open `ios/Cook.xcodeproj` in Xcode:
   ```bash
   open ios/Cook.xcodeproj
   ```
2. Select an iPhone Simulator (e.g. **iPhone 16 Pro**) and press **Cmd + R**.
3. To install onto your physical iPhone:
   - In Xcode, select the **Cook** project → **Signing & Capabilities** → choose your Apple ID **Team** (Personal Team works out of the box; if prompted for bundle identifier uniqueness, change `com.dfchen.cook` to your own prefix).
   - Connect your iPhone and press **Cmd + R**.

If you add or reorganize folders and want to regenerate `Cook.xcodeproj` from `project.yml`:
```bash
cd ios && xcodegen generate
```
