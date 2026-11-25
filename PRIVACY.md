# Privacy Policy

**Last Updated:** November 25, 2026

Account Manager for Discord is committed to protecting your privacy. This extension operates with a strict "local-first" principle.

### 1. Data Collection and Usage

All data handled by this extension is stored exclusively on your local device within Chrome's local storage (`chrome.storage.local`). **We do not collect, store, transmit, or sell your data to any external servers or third parties.**

The extension processes the following data solely to provide account management features:
- **Authentication Credentials:** Discord tokens provided by the user or imported from the active local session are stored locally to facilitate switching between your accounts.
- **Profile & Metadata:** Usernames, display names, user IDs, avatars, banners, accent colors, Nitro status, profile and tenure badges (including tier and quest progress), and organization folders are stored locally to display your accounts in the interface.
- **Account Status Information:** Verified email, phone indicator, 2FA status, and locale preferences are fetched directly from Discord's official API (`discord.com/api`) and stored locally for account detail display.

### 2. Third-Party Sharing & Telemetry

- **No Remote Servers:** The extension has no external backend, analytics, tracking scripts, or telemetry services.
- **Direct Discord API Communication:** Network requests are made solely and directly between your browser and official Discord endpoints (`https://discord.com/api/*` and `https://cdn.discordapp.com/*`) using standard browser `fetch`.
- **No Third-Party Access:** We do not sell, rent, or share your data or tokens with any third parties.

### 3. Permissions

- **`storage`:** Used to save your account list, folders, appearance theme, and interface preferences locally.
- **`activeTab` & `scripting`:** Used strictly when you explicitly click "Add Current Account" to read the session token of your own currently open Discord tab and import it into your local storage. Also used by the "Add via Discord Login" feature to detect when login is complete and capture the new session token from the Discord tab.
- **`clipboardWrite`:** Used when you explicitly click to copy an ID, token, email, phone, avatar URL, or banner URL to your clipboard.
- **`cookies`:** Used by the "Add via Discord Login" feature to clear Discord cookies before redirecting you to the login page, ensuring the login form appears instead of auto-signing in with a previous account.
- **`browsingData`:** Used by the "Add via Discord Login" feature to perform an origin-level wipe of Discord's cookies and localStorage, guaranteeing a clean login session.

### 4. Disclaimer

*Account Manager for Discord is an independent open-source project and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Discord Inc.*
