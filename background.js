let checkAbortController = null;
let isCheckRunning = false;
let bulkAddAbortController = null;
let isBulkAddRunning = false;

chrome.storage.local.set({
    isChecking: false,
    cancelCheck: false,
    checkProgress: 0,
    checkTarget: 'Ready',
    isBulkAdding: false,
    cancelBulkAdd: false
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_CHECK') {
        startCheck();
    } else if (message.type === 'STOP_CHECK') {
        stopCheck();
    } else if (message.type === 'START_BULK_ADD') {
        if (!sender || sender.id !== chrome.runtime.id || sender.tab) {
            if (sendResponse) sendResponse({ success: false, error: 'unauthorized_sender' });
            return;
        }
        startBulkAdd(message.tokens, message.folderId);
        if (sendResponse) sendResponse({ success: true });
    } else if (message.type === 'STOP_BULK_ADD') {
        if (!sender || sender.id !== chrome.runtime.id || sender.tab) {
            if (sendResponse) sendResponse({ success: false, error: 'unauthorized_sender' });
            return;
        }
        stopBulkAdd();
        if (sendResponse) sendResponse({ success: true });
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
        if (!sender || sender.id !== chrome.runtime.id || sender.tab) {
            if (sendResponse) sendResponse({ success: false, error: 'unauthorized_sender' });
            return;
        }
        startOfficialLogin().then(result => {
            if (sendResponse) sendResponse(result);
        }).catch(err => {
            if (sendResponse) sendResponse({ success: false, error: err ? err.message : 'Unknown error' });
        });
        return true;
    } else if (message.type === 'OFFICIAL_LOGIN_TOKEN') {
        if (!sender || sender.id !== chrome.runtime.id || !sender.tab || !sender.url) {
            if (sendResponse) sendResponse({ success: false, error: 'unauthorized_sender' });
            return;
        }
        try {
            const senderOrigin = new URL(sender.url).origin;
            if (!DISCORD_ORIGINS.includes(senderOrigin)) {
                if (sendResponse) sendResponse({ success: false, error: 'unauthorized_origin' });
                return;
            }
        } catch (e) {
            if (sendResponse) sendResponse({ success: false, error: 'invalid_sender_url' });
            return;
        }
        handleOfficialLoginToken(message.token).then(result => {
            if (sendResponse) sendResponse(result);
        }).catch(err => {
            if (sendResponse) sendResponse({ success: false, error: err ? err.message : 'Unknown error' });
        });
        return true;
    }
});

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

const DISCORD_ORIGINS = [
    'https://discord.com',
    'https://www.discord.com',
    'https://ptb.discord.com',
    'https://canary.discord.com',
    'https://discordapp.com',
    'https://www.discordapp.com'
];
const DISCORD_HOSTS = ['discord.com', 'www.discord.com', 'ptb.discord.com', 'canary.discord.com', 'discordapp.com', 'www.discordapp.com'];

async function removeAllDiscordCookies() {
    if (!chrome.cookies || typeof chrome.cookies.getAll !== 'function') return 0;
    let removed = 0;
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
    if (chrome.browsingData && typeof chrome.browsingData.remove === 'function') {
        try {
            await chrome.browsingData.remove(
                { origins: DISCORD_ORIGINS },
                { cookies: true, localStorage: true }
            );
        } catch (e) { }
    }

    let removedCookies = 0;
    try {
        removedCookies = await removeAllDiscordCookies();
    } catch (e) { }

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
    } catch (e) { }

    return { removedCookies, clearedTabs };
}

async function startOfficialLogin() {
    const startedAt = Date.now();
    await chrome.storage.local.set({
        pendingOfficialLogin: { timestamp: startedAt, tabId: null }
    });
    await clearDiscordWebSession();
    const tab = await chrome.tabs.create({ url: DISCORD_LOGIN_URL });
    await chrome.storage.local.set({
        pendingOfficialLogin: { timestamp: startedAt, tabId: tab.id }
    });
    return { success: true };
}

function sanitizeOfficialToken(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
    return (clean.length > 20 && !clean.includes(' ')) ? clean : null;
}

function extractBadgesInventory(badgesData) {
    const list = badgesData && Array.isArray(badgesData.badges) ? badgesData.badges : [];
    const badge_items = [];
    let gifting_tier = 0;
    let gifting_count = 0;

    for (const b of list) {
        if (!b || !b.owned || b.badge_id === 23) continue;

        const progressEntry = Array.isArray(b.progress) ? b.progress[0] : null;
        let current = (progressEntry && typeof progressEntry.current === 'number') ? progressEntry.current : null;
        if (current === null && (b.badge_id === 14 || b.badge_id === 15) && typeof b.info_label === 'string') {
            const numMatch = b.info_label.match(/\d[\d.,\s\u00a0]*/);
            if (numMatch) {
                const parsed = parseInt(numMatch[0].replace(/[.,\s\u00a0]/g, ''), 10);
                if (!isNaN(parsed)) current = parsed;
            }
        }

        let tierIdx = 0;
        if (Array.isArray(b.tiers) && b.tiers.length > 0) {
            if (b.current_tier) {
                const idx = b.tiers.findIndex(t => t && t.key === b.current_tier);
                if (idx !== -1) tierIdx = idx + 1;
            }
            if (tierIdx === 0) {
                tierIdx = b.tiers.reduce((max, t, idx) => (t && t.owned ? idx + 1 : max), 0);
            }
        }

        const item = {
            id: b.badge_id,
            hidden: !!b.hidden
        };
        if (b.current_tier) item.tier = b.current_tier;
        if (tierIdx > 0) item.tier_idx = tierIdx;
        if (current !== null) item.current = current;
        if (b.obtained_at) item.obtained_at = b.obtained_at;
        if (typeof b.rarity === 'number') item.rarity = b.rarity;

        const tierUnlockedAt = (b.tier_obtained_at && b.current_tier && b.tier_obtained_at[b.current_tier])
            ? b.tier_obtained_at[b.current_tier]
            : null;
        if (tierUnlockedAt && tierUnlockedAt !== b.obtained_at) {
            item.tier_unlocked_at = tierUnlockedAt;
        }

        if (progressEntry) {
            const prog = {};
            if (typeof progressEntry.floor === 'number') prog.floor = progressEntry.floor;
            if (typeof progressEntry.threshold === 'number') prog.threshold = progressEntry.threshold;
            if (progressEntry.unit) prog.unit = progressEntry.unit;
            if (Object.keys(prog).length > 0) item.progress = prog;
        }

        badge_items.push(item);

        if (b.badge_id === 17) {
            gifting_count = current !== null ? current : 0;
            gifting_tier = tierIdx;
            if (gifting_tier === 0 && gifting_count >= 1) {
                if (gifting_count >= 20) gifting_tier = 6;
                else if (gifting_count >= 10) gifting_tier = 5;
                else if (gifting_count >= 6) gifting_tier = 4;
                else if (gifting_count >= 3) gifting_tier = 3;
                else if (gifting_count >= 2) gifting_tier = 2;
                else gifting_tier = 1;
            }
        }
    }

    return { gifting_tier, gifting_count, badge_items };
}

function resolveGiftingField(userData, existingAcc, field) {
    if (userData && !userData._badgesFetchFailed && typeof userData[field] === 'number') {
        return userData[field];
    }
    return existingAcc ? (existingAcc[field] || 0) : 0;
}

function resolveBadgeItems(userData, existingAcc) {
    if (userData && !userData._badgesFetchFailed && Array.isArray(userData.badge_items)) {
        return userData.badge_items;
    }
    return (existingAcc && Array.isArray(existingAcc.badge_items)) ? existingAcc.badge_items : null;
}

function buildAccountData(userData, token, existingAcc, folderId) {
    const base = existingAcc || {};
    const profileFailed = !!userData._profileFailed;
    const resolvedFolderId = folderId !== undefined
        ? (folderId || base.folderId || null)
        : (base.folderId || null);

    return {
        ...base,
        id: userData.id || base.id,
        _profileChecked: true,
        _profileVersion: 6,
        username: userData.username,
        global_name: userData.global_name,
        avatar: userData.avatar,
        banner: userData.banner !== undefined ? userData.banner : (base.banner || null),
        banner_color: userData.banner_color !== undefined ? userData.banner_color : (base.banner_color || null),
        accent_color: userData.accent_color !== undefined ? userData.accent_color : (base.accent_color !== undefined ? base.accent_color : null),
        email: userData.email || base.email || null,
        phone: userData.phone || base.phone || null,
        verified: userData.verified !== undefined ? !!userData.verified : (base.verified || false),
        mfa_enabled: userData.mfa_enabled !== undefined ? !!userData.mfa_enabled : (base.mfa_enabled || false),
        locale: userData.locale || base.locale || null,
        premium_type: userData.premium_type,
        premium_since: profileFailed ? (base.premium_since || null) : (userData.premium_since || null),
        premium_guild_since: profileFailed ? (base.premium_guild_since || null) : (userData.premium_guild_since || null),
        legacy_username: profileFailed ? (base.legacy_username || null) : (userData.legacy_username || null),
        badges: profileFailed ? (base.badges || []) : (userData.badges || []),
        badge_items: resolveBadgeItems(userData, existingAcc),
        gifting_count: resolveGiftingField(userData, existingAcc, 'gifting_count'),
        gifting_tier: resolveGiftingField(userData, existingAcc, 'gifting_tier'),
        flags: userData.flags,
        public_flags: userData.public_flags,
        token: token,
        folderId: resolvedFolderId,
        invalid: false
    };
}

function updateRootOrderForAccount(rootOrder, oldToken, newToken, targetFolderId) {
    const newKey = 'account:' + newToken;
    if (oldToken && oldToken !== newToken) {
        const oldKey = 'account:' + oldToken;
        const orderIdx = rootOrder.indexOf(oldKey);
        if (orderIdx !== -1) {
            if (!targetFolderId) {
                rootOrder[orderIdx] = newKey;
            } else {
                rootOrder.splice(orderIdx, 1);
            }
            return;
        }
    }
    if (!targetFolderId && !rootOrder.includes(newKey)) {
        rootOrder.push(newKey);
    }
}

let _officialLoginProcessing = false;

async function handleOfficialLoginToken(rawToken) {
    const token = sanitizeOfficialToken(rawToken);
    if (!token) return { success: false, error: 'no_token' };

    const pending = await getPendingOfficialLogin();
    if (!pending) return { success: false, error: 'no_pending_login' };

    if (_officialLoginProcessing) return { success: false, error: 'already_processing' };
    _officialLoginProcessing = true;

    try {
        const result = await validateToken(token);
        if (!result.valid || !result.data) {
            if (result.error === 'unauthorized' || result.error === 'invalid_token') {
                await chrome.storage.local.remove(['pendingOfficialLogin']);
            }
            return { success: false, error: result.error || 'invalid_token' };
        }
        const userData = result.data;

        const { discordAccounts, discordRootOrder } = await chrome.storage.local.get(['discordAccounts', 'discordRootOrder']);
        const accounts = Array.isArray(discordAccounts) ? [...discordAccounts] : [];
        const rootOrder = Array.isArray(discordRootOrder) ? [...discordRootOrder] : [];
        const existingIndex = accounts.findIndex(a => a.id === userData.id || a.token === token);

        if (existingIndex !== -1) {
            const acc = accounts[existingIndex];
            accounts[existingIndex] = buildAccountData(userData, token, acc, null);
            updateRootOrderForAccount(rootOrder, acc.token, token, accounts[existingIndex].folderId);
        } else {
            accounts.push(buildAccountData(userData, token, null, null));
            updateRootOrderForAccount(rootOrder, null, token, null);
        }

        await chrome.storage.local.set({
            discordAccounts: accounts,
            discordRootOrder: rootOrder
        });
        await chrome.storage.local.remove(['pendingOfficialLogin']);

        try {
            chrome.action.setBadgeText({ text: '✓' });
            chrome.action.setBadgeBackgroundColor({ color: '#43b581' });
            setTimeout(() => { try { chrome.action.setBadgeText({ text: '' }); } catch (e) { } }, 3000);
        } catch (e) { }

        return { success: true };
    } finally {
        _officialLoginProcessing = false;
    }
}

function abortableDelay(ms, signal) {
    return new Promise((resolve) => {
        if (signal && signal.aborted) { resolve(); return; }
        const onAbort = () => { clearTimeout(t); resolve(); };
        const t = setTimeout(() => {
            if (signal) signal.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        if (signal) signal.addEventListener('abort', onAbort, { once: true });
    });
}

async function stopBulkAdd() {
    isBulkAddRunning = false;
    if (bulkAddAbortController) {
        bulkAddAbortController.abort();
        bulkAddAbortController = null;
    }
    await chrome.storage.local.set({
        isBulkAdding: false,
        cancelBulkAdd: true
    });
}

async function startBulkAdd(rawTokens, selectedFolderId) {
    if (isBulkAddRunning) return;
    if (!Array.isArray(rawTokens) || rawTokens.length === 0) return;

    const tokens = rawTokens
        .map(t => (typeof t === 'string' ? t.trim() : ''))
        .filter(Boolean);
    if (tokens.length === 0) return;

    isBulkAddRunning = true;
    bulkAddAbortController = new AbortController();

    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let wasCanceled = false;

    try {
        await chrome.storage.local.set({
            isBulkAdding: true,
            cancelBulkAdd: false,
            bulkAddCurrent: 0,
            bulkAddTotal: tokens.length,
            bulkAddProgress: 0,
            bulkAddResults: { added: 0, skipped: 0, failed: 0 },
            bulkAddFinished: false,
            bulkAddCanceled: false
        });

        for (let i = 0; i < tokens.length; i++) {
            const { cancelBulkAdd: preCancel } = await chrome.storage.local.get(['cancelBulkAdd']);
            if (preCancel || !isBulkAddRunning || (bulkAddAbortController && bulkAddAbortController.signal.aborted)) {
                wasCanceled = true;
                break;
            }

            const token = tokens[i];
            const currentNum = i + 1;
            const percent = Math.round((currentNum / tokens.length) * 100);

            await chrome.storage.local.set({
                bulkAddCurrent: currentNum,
                bulkAddTotal: tokens.length,
                bulkAddProgress: percent,
                bulkAddResults: { added: addedCount, skipped: skippedCount, failed: failedCount }
            });

            const { discordAccounts: preAccounts } = await chrome.storage.local.get(['discordAccounts']);
            const existingList = Array.isArray(preAccounts) ? preAccounts : [];
            if (existingList.some(a => a && a.token === token)) {
                skippedCount++;
                await chrome.storage.local.set({
                    bulkAddResults: { added: addedCount, skipped: skippedCount, failed: failedCount }
                });
                continue;
            }

            const signal = bulkAddAbortController ? bulkAddAbortController.signal : null;
            const result = await validateToken(token, signal);
            if (result.error === 'aborted' || !isBulkAddRunning) {
                wasCanceled = true;
                break;
            }

            if (result.error === 'ratelimit') {
                await abortableDelay(1500, signal);
            }

            const { cancelBulkAdd: midCancel } = await chrome.storage.local.get(['cancelBulkAdd']);
            if (midCancel || !isBulkAddRunning || (signal && signal.aborted)) {
                wasCanceled = true;
                break;
            }

            if (result.valid && result.data) {
                const userData = result.data;
                const { discordAccounts, discordRootOrder } = await chrome.storage.local.get(['discordAccounts', 'discordRootOrder']);
                const accounts = Array.isArray(discordAccounts) ? [...discordAccounts] : [];
                const rootOrder = Array.isArray(discordRootOrder) ? [...discordRootOrder] : [];
                const existingIdx = accounts.findIndex(a => a && (a.id === userData.id || a.token === token));

                if (existingIdx !== -1) {
                    const existingAcc = accounts[existingIdx];
                    accounts[existingIdx] = buildAccountData(userData, token, existingAcc, selectedFolderId);
                    updateRootOrderForAccount(rootOrder, existingAcc.token, token, accounts[existingIdx].folderId);
                    skippedCount++;
                } else {
                    const newAcc = buildAccountData(userData, token, null, selectedFolderId);
                    accounts.push(newAcc);
                    updateRootOrderForAccount(rootOrder, null, token, newAcc.folderId);
                    addedCount++;
                }

                await chrome.storage.local.set({
                    discordAccounts: accounts,
                    discordRootOrder: rootOrder
                });
            } else {
                failedCount++;
            }

            await chrome.storage.local.set({
                bulkAddResults: { added: addedCount, skipped: skippedCount, failed: failedCount }
            });

            if (i < tokens.length - 1) {
                await abortableDelay(280, signal);
            }
        }

        await chrome.storage.local.set({
            isBulkAdding: false,
            cancelBulkAdd: false,
            bulkAddProgress: wasCanceled ? Math.round(((addedCount + skippedCount + failedCount) / tokens.length) * 100) : 100,
            bulkAddResults: { added: addedCount, skipped: skippedCount, failed: failedCount },
            bulkAddFinished: true,
            bulkAddCanceled: wasCanceled,
            bulkAddCompletedAt: Date.now()
        });

        if (addedCount > 0) {
            try {
                chrome.action.setBadgeText({ text: `+${addedCount}` });
                chrome.action.setBadgeBackgroundColor({ color: '#43b581' });
                setTimeout(() => { try { chrome.action.setBadgeText({ text: '' }); } catch (e) { } }, 3500);
            } catch (e) { }
        }
    } finally {
        isBulkAddRunning = false;
        bulkAddAbortController = null;
    }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (!changeInfo.url && changeInfo.status !== 'complete') return;

    const url = (changeInfo && changeInfo.url) || (tab && tab.url) || '';
    if (!/^https:\/\/(www\.)?(ptb\.|canary\.)?(discord\.com|discordapp\.com)\/(app|channels|onboarding)(\/|$)/.test(url)) return;

    const pending = await getPendingOfficialLogin();
    if (!pending) return;
    if (pending.tabId && pending.tabId !== tabId) return;

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
                        const wp = typeof webpackChunkdiscord_app !== 'undefined' ? webpackChunkdiscord_app : (typeof window.webpackChunkdiscord_app !== 'undefined' ? window.webpackChunkdiscord_app : null);
                        if (wp && wp.push) {
                            let token = null;
                            wp.push([[Symbol()], {}, (req) => {
                                for (const id in req.c) {
                                    const m = req.c[id]?.exports;
                                    if (m?.default?.getToken) { token = m.default.getToken(); break; }
                                    if (m?.getToken) { token = m.getToken(); break; }
                                }
                            }]);
                            const cleaned = sanitize(token);
                            if (cleaned) return cleaned;
                        }
                    } catch (e) { }
                    try {
                        if (document.body) {
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            document.body.appendChild(iframe);
                            const token = sanitize(iframe.contentWindow.localStorage.getItem('token'));
                            document.body.removeChild(iframe);
                            if (token) return token;
                        }
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

chrome.tabs.onRemoved.addListener(async (tabId) => {
    try {
        const pending = await getPendingOfficialLogin();
        if (pending && pending.tabId === tabId) {
            await chrome.storage.local.remove(['pendingOfficialLogin']);
        }
    } catch (e) { }
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
        accounts[idx] = buildAccountData(userData, token, accounts[idx], null);
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
                let badgesData = null;

                const fetchProfile = async () => {
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
                };

                const getSuperProperties = () => {
                    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
                    const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
                    const payload = {
                        os: 'Windows',
                        browser: 'Chrome',
                        device: '',
                        system_locale: 'en-US',
                        has_client_mods: false,
                        browser_user_agent: ua,
                        browser_version: chromeMatch ? chromeMatch[1] : '130.0.0.0',
                        os_version: '10',
                        release_channel: 'stable',
                        client_build_number: 679963,
                        client_event_source: null
                    };
                    return btoa(JSON.stringify(payload));
                };

                const fetchUserBadges = async () => {
                    try {
                        const badgesRes = await fetch('https://discord.com/api/v9/users/%40me/badges', {
                            headers: {
                                'Authorization': token,
                                'Accept-Language': 'en-US,en;q=0.9',
                                'X-Super-Properties': getSuperProperties()
                            },
                            signal: timeoutController.signal
                        });
                        if (badgesRes.ok) {
                            badgesData = await badgesRes.json();
                        }
                    } catch (e) { }
                };

                await Promise.all([fetchProfile(), fetchUserBadges()]);

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

                if (badgesData && Array.isArray(badgesData.badges)) {
                    const inv = extractBadgesInventory(badgesData);
                    data.gifting_tier = inv.gifting_tier;
                    data.gifting_count = inv.gifting_count;
                    data.badge_items = inv.badge_items;
                    data._badgesFetchFailed = false;
                } else {
                    data._badgesFetchFailed = true;
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
                const nextAcc = buildAccountData(userData, currentAcc.token, currentAcc, null);

                const oldBadgesJson = JSON.stringify(currentAcc.badges || []);
                const newBadgesJson = JSON.stringify(nextAcc.badges || []);
                const oldItemsJson = JSON.stringify(currentAcc.badge_items || null);
                const newItemsJson = JSON.stringify(nextAcc.badge_items || null);

                if (currentAcc.invalid !== false ||
                    currentAcc._profileVersion !== nextAcc._profileVersion ||
                    currentAcc.username !== nextAcc.username ||
                    currentAcc.global_name !== nextAcc.global_name ||
                    currentAcc.avatar !== nextAcc.avatar ||
                    currentAcc.premium_type !== nextAcc.premium_type ||
                    currentAcc.premium_since !== nextAcc.premium_since ||
                    currentAcc.premium_guild_since !== nextAcc.premium_guild_since ||
                    currentAcc.flags !== nextAcc.flags ||
                    currentAcc.public_flags !== nextAcc.public_flags ||
                    currentAcc.gifting_count !== nextAcc.gifting_count ||
                    currentAcc.gifting_tier !== nextAcc.gifting_tier ||
                    oldBadgesJson !== newBadgesJson ||
                    oldItemsJson !== newItemsJson ||
                    currentAcc.legacy_username !== nextAcc.legacy_username) {

                    accounts[i] = nextAcc;
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
