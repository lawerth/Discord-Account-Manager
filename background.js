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
