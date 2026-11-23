let checkAbortController = null;
let isCheckRunning = false;

chrome.storage.local.set({
    isChecking: false,
    cancelCheck: false,
    checkProgress: 0,
    checkTarget: 'Ready'
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_CHECK') {
        startCheck();
    } else if (message.type === 'STOP_CHECK') {
        stopCheck();
    } else if (message.type === 'REFRESH_ACCOUNT') {
        refreshAccount(message.token, message.accId).then(() => {
            if (sendResponse) sendResponse({ success: true });
        });
        return true;
    } else if (message.type === 'VALIDATE_TOKEN') {
        validateToken(message.token).then(result => {
            sendResponse(result);
        }).catch(err => {
            sendResponse({ valid: false, error: 'exception', message: err ? err.message : 'Unknown error' });
        });
        return true;
    } else if (message.type === 'START_OFFICIAL_LOGIN') {
        startOfficialLogin().then(result => {
            if (sendResponse) sendResponse(result);
        }).catch(err => {
            if (sendResponse) sendResponse({ success: false, error: err ? err.message : 'Unknown error' });
        });
        return true;
    } else if (message.type === 'OFFICIAL_LOGIN_TOKEN') {
        handleOfficialLoginToken(message.token).then(result => {
            if (sendResponse) sendResponse(result);
        }).catch(err => {
            if (sendResponse) sendResponse({ success: false, error: err ? err.message : 'Unknown error' });
        });
        return true;
    }
});

// How long an "add via official login" attempt stays valid. Manual login
// (including 2FA) can take a while, so this is much longer than the
// 30s window used for switching accounts via pendingLogin.
const OFFICIAL_LOGIN_TTL = 15 * 60 * 1000;
const DISCORD_LOGIN_URL = 'https://discord.com/login';

async function getPendingOfficialLogin() {
    const { pendingOfficialLogin } = await chrome.storage.local.get(['pendingOfficialLogin']);
    if (!pendingOfficialLogin) return null;
    if (Date.now() - (pendingOfficialLogin.timestamp || 0) > OFFICIAL_LOGIN_TTL) {
        await chrome.storage.local.remove(['pendingOfficialLogin']);
        return null;
    }
    return pendingOfficialLogin;
}

// Clear the Discord web session so https://discord.com/login shows the
// login form instead of instantly redirecting back to the account that
// is already signed in.
//
// Discord's auth token lives in localStorage (origin-scoped, and it
// survives closing the tab), not in a cookie, so clearing cookies
// alone does NOT log the web session out. All of the following are
// therefore needed, and they must run BEFORE the login tab is opened:
//   1. An origin-level website-data wipe (chrome.browsingData) for
//      discord.com/www + discordapp.com/www. This is the reliable
//      step: it removes cookies and localStorage for the origin even
//      when no Discord tab is open (the old tab-based approach missed
//      exactly that case, so the stored token survived and /login
//      auto-signed in the previous account again).
//   2. Manual cookie removal as a belt-and-braces pass (domain cookies
//      are not always covered by a single getAll/remove call), with a
//      verify-and-retry so a cookie that survives the first pass is
//      not silently left behind.
//   3. localStorage/sessionStorage wipe in any open Discord tab, as
//      an in-page backstop. Tabs are enumerated with query({}) and
//      filtered by URL here instead of a tabs.query() url match
//      pattern, because `https://*.discord.com/*` does not reliably
//      match the bare `https://discord.com/*` origin.
// content.js repeats step 3 on /login as a final safety net, but the
// origin wipe in step 1 is what actually guarantees the login page
// loads logged out (the content-script check is async and can race
// Discord's own scripts).
const DISCORD_ORIGINS = [
    'https://discord.com',
    'https://www.discord.com',
    'https://discordapp.com',
    'https://www.discordapp.com'
];
const DISCORD_HOSTS = ['discord.com', 'www.discord.com', 'discordapp.com', 'www.discordapp.com'];

async function removeAllDiscordCookies() {
    if (!chrome.cookies || typeof chrome.cookies.getAll !== 'function') return 0;
    let removed = 0;
    // Two passes: remove everything found, then verify and retry any
    // cookie that is still there (e.g. a domain cookie whose remove
    // call needs the exact host it was set for).
    for (let pass = 0; pass < 2; pass++) {
        const seen = new Set();
        const cookies = [];
        for (const domain of ['discord.com', '.discord.com', 'discordapp.com', '.discordapp.com']) {
            try {
                const found = await chrome.cookies.getAll({ domain });
                if (Array.isArray(found)) cookies.push(...found);
            } catch (e) { }
        }
        for (const host of DISCORD_HOSTS) {
            try {
                const found = await chrome.cookies.getAll({ url: `https://${host}/` });
                if (Array.isArray(found)) cookies.push(...found);
            } catch (e) { }
        }
        if (cookies.length === 0) break;
        for (const cookie of cookies) {
            if (!cookie || !cookie.name) continue;
            const host = String(cookie.domain || 'discord.com').replace(/^\./, '');
            const path = cookie.path || '/';
            const key = `${cookie.name}|${cookie.domain}|${path}|${cookie.storeId || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            // Try the cookie's own domain first, then each known host:
            // remove() only deletes a cookie when the URL's host matches
            // the cookie's domain, and a failed attempt returns null.
            const urls = [`https://${host}${path}`, ...DISCORD_HOSTS.map(h => `https://${h}${path}`)];
            for (const url of urls) {
                try {
                    const result = await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
                    if (result) { removed++; break; }
                } catch (e) { }
            }
        }
    }
    return removed;
}

async function clearDiscordWebSession() {
    // 1. Origin-level wipe: cookies + localStorage (+ IndexedDB, where
    //    Discord may keep session artifacts) for every Discord origin.
    //    Works with no Discord tab open, which is the case the previous
    //    implementation missed.
    if (chrome.browsingData && typeof chrome.browsingData.remove === 'function') {
        try {
            await chrome.browsingData.remove(
                { origins: DISCORD_ORIGINS },
                { cookies: true, localStorage: true, indexedDB: true }
            );
        } catch (e) {
            console.warn('[DAM] browsingData.remove failed, falling back to manual clear:', e);
        }
    }

    // 2. Manual cookie removal (verify + retry inside).
    let removedCookies = 0;
    try {
        removedCookies = await removeAllDiscordCookies();
    } catch (e) {
        console.warn('[DAM] manual cookie removal failed:', e);
    }

    // 3. In-page storage wipe for every open Discord tab. Query all
    //    tabs and filter by URL manually (see note above).
    let clearedTabs = 0;
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs || []) {
            if (!tab || typeof tab.id !== 'number' || !tab.url) continue;
            const isDiscord = DISCORD_HOSTS.some(host => tab.url.startsWith(`https://${host}/`));
            if (!isDiscord) continue;
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    world: 'MAIN',
                    func: () => {
                        try { window.localStorage.clear(); } catch (e) { }
                        try { window.sessionStorage.clear(); } catch (e) { }
                    }
                });
                clearedTabs++;
            } catch (e) { }
        }
    } catch (e) {
        console.warn('[DAM] tab storage clear failed:', e);
    }

    console.log(`[DAM] Discord web session cleared (cookies removed: ${removedCookies}, tabs cleared: ${clearedTabs})`);
    return { removedCookies, clearedTabs };
}

// "Add via Discord Login": remember that we are waiting for a fresh
// login, clear the current web session, then redirect to Discord's
// official login page. The new account is captured afterwards by
// content.js (polling localStorage) / the tabs.onUpdated fallback
// below once the user has signed in.
async function startOfficialLogin() {
    await chrome.storage.local.set({
        pendingOfficialLogin: { timestamp: Date.now() }
    });
    await clearDiscordWebSession();
    await chrome.tabs.create({ url: DISCORD_LOGIN_URL });
    return { success: true };
}

function sanitizeOfficialToken(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
    return (clean.length > 20 && !clean.includes(' ')) ? clean : null;
}

// Validate the token captured after a successful official login and
// save it as an account (updating it in place if it was already saved,
// mirroring the "Add Current" flow in popup.js). The pending flag is
// claimed (removed) up front so the content.js and tabs.onUpdated
// paths cannot both save the same login twice.
async function handleOfficialLoginToken(rawToken) {
    const token = sanitizeOfficialToken(rawToken);
    if (!token) return { success: false, error: 'no_token' };

    const pending = await getPendingOfficialLogin();
    if (!pending) return { success: false, error: 'no_pending_login' };
    await chrome.storage.local.remove(['pendingOfficialLogin']);

    const result = await validateToken(token);
    if (!result.valid || !result.data) {
        return { success: false, error: 'invalid_token' };
    }
    const userData = result.data;

    const { discordAccounts } = await chrome.storage.local.get(['discordAccounts']);
    const accounts = Array.isArray(discordAccounts) ? [...discordAccounts] : [];
    const existingIndex = accounts.findIndex(a => a.id === userData.id || a.token === token);

    if (existingIndex !== -1) {
        accounts[existingIndex] = {
            ...accounts[existingIndex],
            _profileChecked: true,
            _profileVersion: 4,
            username: userData.username,
            global_name: userData.global_name,
            avatar: userData.avatar,
            email: userData.email || accounts[existingIndex].email || null,
            phone: userData.phone || accounts[existingIndex].phone || null,
            verified: userData.verified !== undefined ? !!userData.verified : (accounts[existingIndex].verified || false),
            mfa_enabled: userData.mfa_enabled !== undefined ? !!userData.mfa_enabled : (accounts[existingIndex].mfa_enabled || false),
            locale: userData.locale || accounts[existingIndex].locale || null,
            premium_type: userData.premium_type,
            premium_since: userData.premium_since || null,
            premium_guild_since: userData.premium_guild_since || null,
            legacy_username: userData.legacy_username || null,
            badges: userData.badges || [],
            flags: userData.flags,
            public_flags: userData.public_flags,
            token: token,
            invalid: false
        };
    } else {
        accounts.push({
            id: userData.id,
            _profileChecked: true,
            _profileVersion: 4,
            username: userData.username,
            global_name: userData.global_name,
            avatar: userData.avatar,
            email: userData.email || null,
            phone: userData.phone || null,
            verified: !!userData.verified,
            mfa_enabled: !!userData.mfa_enabled,
            locale: userData.locale || null,
            premium_type: userData.premium_type,
            premium_since: userData.premium_since || null,
            premium_guild_since: userData.premium_guild_since || null,
            legacy_username: userData.legacy_username || null,
            badges: userData.badges || [],
            flags: userData.flags,
            public_flags: userData.public_flags,
            token: token,
            folderId: null,
            invalid: false
        });
    }
    await chrome.storage.local.set({ discordAccounts: accounts });
    return { success: true };
}

// Fallback capture path: if content.js missed the token (e.g. it ran
// before Discord stored it), watch for the tab landing on the app
// after login and extract the token from the page ourselves.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const url = (changeInfo && changeInfo.url) || (tab && tab.url) || '';
    if (!/^https:\/\/(www\.)?(discord\.com|discordapp\.com)\/(app|channels\/@me)(\/|$)/.test(url)) return;
    if (!(await getPendingOfficialLogin())) return;

    for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1000));
        if (!(await getPendingOfficialLogin())) return;
        let token = null;
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                world: 'MAIN',
                func: () => {
                    const sanitize = (t) => {
                        if (!t || typeof t !== 'string') return null;
                        const clean = t.replace(/^"|"$/g, '').trim();
                        return (clean.length > 20 && !clean.includes(' ')) ? clean : null;
                    };
                    try {
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        document.body.appendChild(iframe);
                        const token = sanitize(iframe.contentWindow.localStorage.getItem('token'));
                        document.body.removeChild(iframe);
                        if (token) return token;
                    } catch (e) { }
                    try {
                        return sanitize(window.localStorage.getItem('token'));
                    } catch (e) { }
                    return null;
                }
            });
            if (results && results[0]) token = results[0].result;
        } catch (e) { }
        if (token) {
            await handleOfficialLoginToken(token);
            return;
        }
    }
});

async function stopCheck() {
    if (checkAbortController) {
        checkAbortController.abort();
        checkAbortController = null;
    }
    isCheckRunning = false;
    await chrome.storage.local.set({
        isChecking: false,
        cancelCheck: false,
        checkTarget: 'Canceled',
        checkProgress: 0
    });
}

async function refreshAccount(token, accId) {
    const result = await validateToken(token);
    if (!result.valid) {
        if (result.error === 'unauthorized') {
            const { discordAccounts } = await chrome.storage.local.get(['discordAccounts']);
            if (!discordAccounts) return;
            const accounts = [...discordAccounts];
            const idx = accounts.findIndex(a => a.id === accId || a.token === token);
            if (idx !== -1 && !accounts[idx].invalid) {
                accounts[idx].invalid = true;
                await chrome.storage.local.set({ discordAccounts: accounts });
            }
        }
        return;
    }

    const userData = result.data;

    const { discordAccounts } = await chrome.storage.local.get(['discordAccounts']);
    if (!discordAccounts) return;

    const accounts = [...discordAccounts];
    const idx = accounts.findIndex(a => a.id === accId || a.token === token);

    if (idx !== -1) {
        const acc = accounts[idx];
        accounts[idx] = {
            ...acc,
            username: userData.username,
            global_name: userData.global_name,
            avatar: userData.avatar,
            banner: userData.banner !== undefined ? userData.banner : (acc.banner || null),
            banner_color: userData.banner_color !== undefined ? userData.banner_color : (acc.banner_color || null),
            accent_color: userData.accent_color !== undefined ? userData.accent_color : (acc.accent_color !== undefined ? acc.accent_color : null),
            email: userData.email || acc.email || null,
            phone: userData.phone || acc.phone || null,
            verified: userData.verified !== undefined ? !!userData.verified : (acc.verified || false),
            mfa_enabled: userData.mfa_enabled !== undefined ? !!userData.mfa_enabled : (acc.mfa_enabled || false),
            locale: userData.locale || acc.locale || null,
            premium_type: userData.premium_type,
            flags: userData.flags,
            public_flags: userData.public_flags,
            invalid: false,
            _profileChecked: true,
            premium_since: userData._profileFailed ? (acc.premium_since || null) : (userData.premium_since || null),
            premium_guild_since: userData._profileFailed ? (acc.premium_guild_since || null) : (userData.premium_guild_since || null),
            legacy_username: userData._profileFailed ? (acc.legacy_username || null) : (userData.legacy_username || null),
            badges: userData._profileFailed ? (acc.badges || []) : (userData.badges || []),
            gifting_count: acc.gifting_count || 0,
            gifting_tier: acc.gifting_tier || 0
        };
        await chrome.storage.local.set({ discordAccounts: accounts });
    }
}

async function validateToken(rawToken, externalSignal) {
    if (!rawToken || typeof rawToken !== 'string') {
        return { valid: false, error: 'invalid_token' };
    }
    const token = rawToken.trim().replace(/^["']|["']$/g, '');
    if (!token) {
        return { valid: false, error: 'empty_token' };
    }
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
        try { timeoutController.abort(); } catch (e) { }
    }, 8000);

    const onExternalAbort = () => {
        try { timeoutController.abort(); } catch (e) { }
    };

    if (externalSignal) {
        if (externalSignal.aborted) {
            clearTimeout(timeoutId);
            return { valid: false, error: 'aborted' };
        }
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
        const response = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { 'Authorization': token },
            signal: timeoutController.signal
        });

        if (response.status === 401 || response.status === 403) {
            return { valid: false, error: 'unauthorized', status: response.status };
        }

        if (response.status === 429) {
            return { valid: false, error: 'ratelimit', status: 429 };
        }

        if (!response.ok) {
            return { valid: false, error: 'network', status: response.status };
        }

        const data = await response.json();

        if (data && data.id) {
            try {
                let profData = null;
                try {
                    const profRes = await fetch(`https://discord.com/api/v9/users/${data.id}/profile?with_mutual_guilds=true&with_mutual_friends_count=true`, {
                        headers: {
                            'Authorization': token,
                            'Accept-Language': 'en-US,en;q=0.9'
                        },
                        signal: timeoutController.signal
                    });
                    if (profRes.ok) {
                        profData = await profRes.json();
                    } else if (profRes.status === 429) {
                        profData = { _rateLimited: true };
                    } else {
                        const fallback = await fetch(`https://discord.com/api/v10/users/${data.id}/profile`, {
                            headers: { 'Authorization': token },
                            signal: timeoutController.signal
                        });
                        if (fallback.ok) profData = await fallback.json();
                        else if (fallback.status === 429) profData = { _rateLimited: true };
                    }
                } catch (e) { }

                if (profData && !profData._rateLimited) {
                    data._profileChecked = true;
                    data._profileFailed = false;
                    data.premium_since = profData.premium_since || null;
                    data.premium_guild_since = profData.premium_guild_since || null;
                    data.legacy_username = profData.legacy_username || null;
                    data.badges = profData.badges || [];
                    if (profData.user) {
                        if (profData.user.banner !== undefined) data.banner = profData.user.banner;
                        if (profData.user.banner_color !== undefined) data.banner_color = profData.user.banner_color;
                        if (profData.user.accent_color !== undefined) data.accent_color = profData.user.accent_color;
                    }
                } else {
                    data._profileFailed = true;
                    if (profData && profData._rateLimited) {
                        data._rateLimited = true;
                    }
                }
            } catch (e) { }
        }

        return { valid: true, data: data };
    } catch (err) {
        if (externalSignal && externalSignal.aborted) {
            return { valid: false, error: 'aborted' };
        }
        if (err.name === 'AbortError') {
            return { valid: false, error: 'timeout' };
        }
        return { valid: false, error: 'exception' };
    } finally {
        clearTimeout(timeoutId);
        if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    }
}

async function startCheck() {
    if (isCheckRunning) {
        console.log('Check process is already active. Ignoring duplicate call.');
        return;
    }

    const { discordAccounts } = await chrome.storage.local.get(['discordAccounts']);

    if (!discordAccounts || discordAccounts.length === 0) {
        await chrome.storage.local.set({ isChecking: false, checkProgress: 0 });
        return;
    }

    isCheckRunning = true;
    const accounts = [...discordAccounts];
    checkAbortController = new AbortController();

    try {
        await chrome.storage.local.set({
            isChecking: true,
            cancelCheck: false,
            checkProgress: 0,
            checkTarget: 'Starting...',
            checkCount: `0/${accounts.length}`,
            checkResults: { valid: 0, invalid: 0 }
        });

        let hasChanges = false;
        let validCount = 0;
        let invalidCount = 0;

        for (let i = 0; i < accounts.length; i++) {
            const acc = accounts[i];
            const targetName = acc.global_name || acc.username || `Account #${i + 1}`;
            const currentCount = `${i + 1}/${accounts.length}`;
            const currentProg = Math.round(((i + 1) / accounts.length) * 100);

            const { cancelCheck: preCancel } = await chrome.storage.local.get(['cancelCheck']);
            if (preCancel || (checkAbortController && checkAbortController.signal.aborted)) {
                await stopCheck();
                return;
            }

            await chrome.storage.local.set({
                checkTarget: targetName,
                checkCount: currentCount,
                checkProgress: currentProg,
                checkResults: { valid: validCount, invalid: invalidCount }
            });

            const result = await validateToken(acc.token, checkAbortController ? checkAbortController.signal : null);
            
            if (result.error === 'aborted') {
                await stopCheck();
                return;
            }

            if (result.error === 'ratelimit') {
                await new Promise(r => setTimeout(r, 1500));
            }

            const isInvalid = !result.valid && result.error === 'unauthorized';
            const userData = result.data;

            if (isInvalid) {
                invalidCount++;
                if (accounts[i].invalid !== true) {
                    accounts[i] = { ...accounts[i], invalid: true };
                    hasChanges = true;
                }
            } else if (result.valid) {
                validCount++;
                const currentAcc = accounts[i];
                const finalBadges = userData._profileFailed ? (currentAcc.badges || []) : (userData.badges || []);
                const finalGuildSince = userData._profileFailed ? (currentAcc.premium_guild_since || null) : (userData.premium_guild_since || null);
                const finalSince = userData._profileFailed ? (currentAcc.premium_since || null) : (userData.premium_since || null);
                const finalLegacy = userData._profileFailed ? (currentAcc.legacy_username || null) : (userData.legacy_username || null);
                const finalGiftCount = currentAcc.gifting_count || 0;
                const finalGiftTier = currentAcc.gifting_tier || 0;

                const oldBadgesJson = JSON.stringify(currentAcc.badges || []);
                const newBadgesJson = JSON.stringify(finalBadges);

                if (currentAcc.invalid !== false ||
                    currentAcc.username !== userData.username ||
                    currentAcc.global_name !== userData.global_name ||
                    currentAcc.avatar !== userData.avatar ||
                    currentAcc.premium_type !== userData.premium_type ||
                    currentAcc.premium_since !== finalSince ||
                    currentAcc.premium_guild_since !== finalGuildSince ||
                    currentAcc.flags !== userData.flags ||
                    currentAcc.public_flags !== userData.public_flags ||
                    currentAcc.gifting_count !== finalGiftCount ||
                    currentAcc.gifting_tier !== finalGiftTier ||
                    oldBadgesJson !== newBadgesJson ||
                    currentAcc.legacy_username !== finalLegacy) {

                    accounts[i] = {
                        ...currentAcc,
                        invalid: false,
                        username: userData.username,
                        global_name: userData.global_name,
                        avatar: userData.avatar,
                        banner: userData.banner !== undefined ? userData.banner : (currentAcc.banner || null),
                        banner_color: userData.banner_color !== undefined ? userData.banner_color : (currentAcc.banner_color || null),
                        accent_color: userData.accent_color !== undefined ? userData.accent_color : (currentAcc.accent_color !== undefined ? currentAcc.accent_color : null),
                        email: userData.email || currentAcc.email || null,
                        phone: userData.phone || currentAcc.phone || null,
                        verified: userData.verified !== undefined ? !!userData.verified : (currentAcc.verified || false),
                        mfa_enabled: userData.mfa_enabled !== undefined ? !!userData.mfa_enabled : (currentAcc.mfa_enabled || false),
                        locale: userData.locale || currentAcc.locale || null,
                        premium_type: userData.premium_type,
                        premium_since: finalSince,
                        premium_guild_since: finalGuildSince,
                        legacy_username: finalLegacy,
                        badges: finalBadges,
                        gifting_count: finalGiftCount,
                        gifting_tier: finalGiftTier,
                        flags: userData.flags,
                        public_flags: userData.public_flags,
                        _profileChecked: true
                    };
                    hasChanges = true;
                }
            }

            await chrome.storage.local.set({
                checkResults: { valid: validCount, invalid: invalidCount }
            });

            const { cancelCheck: postCancel } = await chrome.storage.local.get(['cancelCheck']);
            if (postCancel) {
                await stopCheck();
                return;
            }

            await new Promise(r => setTimeout(r, 150));
        }

        if (hasChanges) {
            await chrome.storage.local.set({ discordAccounts: accounts });
        }

        await chrome.storage.local.set({
            isChecking: false,
            checkProgress: 100,
            checkResults: { valid: validCount, invalid: invalidCount },
            lastCheckAt: Date.now(),
            lastCheckResults: { valid: validCount, invalid: invalidCount },
            lastCheckCount: `${accounts.length} total`,
            cancelCheck: false
        });

        setTimeout(() => {
            chrome.storage.local.set({ checkProgress: 0 });
        }, 3000);
    } finally {
        isCheckRunning = false;
        checkAbortController = null;
    }
}
