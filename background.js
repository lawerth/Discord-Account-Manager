let checkAbortController = null;

// Reset any orphaned or stuck check states on extension load
chrome.storage.local.set({
    isChecking: false,
    cancelCheck: false,
    checkProgress: 0,
    checkTarget: 'Ready'
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'START_CHECK') {
        startCheck();
    } else if (message.type === 'STOP_CHECK') {
        stopCheck();
    } else if (message.type === 'REFRESH_ACCOUNT') {
        refreshAccount(message.token, message.accId);
    }
});

async function stopCheck() {
    if (checkAbortController) {
        checkAbortController.abort();
        checkAbortController = null;
    }
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
        if (acc.username !== userData.username ||
            acc.global_name !== userData.global_name ||
            acc.avatar !== userData.avatar ||
            acc.invalid) {

            accounts[idx] = {
                ...acc,
                username: userData.username,
                global_name: userData.global_name,
                avatar: userData.avatar,
                invalid: false
            };
            await chrome.storage.local.set({ discordAccounts: accounts });
        }
    }
}

async function validateToken(token, externalSignal) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
        try { timeoutController.abort(); } catch (e) { }
    }, 5000); // 5s timeout max per request

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
        clearTimeout(timeoutId);
        if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);

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
        return { valid: true, data: data };
    } catch (err) {
        clearTimeout(timeoutId);
        if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);

        if (externalSignal && externalSignal.aborted) {
            return { valid: false, error: 'aborted' };
        }
        if (err.name === 'AbortError') {
            return { valid: false, error: 'timeout' };
        }
        return { valid: false, error: 'exception' };
    }
}

async function startCheck() {
    const { discordAccounts, isChecking } = await chrome.storage.local.get(['discordAccounts', 'isChecking']);

    if (isChecking) {
        console.log('Check already in progress.');
        return;
    }

    if (!discordAccounts || discordAccounts.length === 0) {
        await chrome.storage.local.set({ isChecking: false, checkProgress: 0 });
        return;
    }

    const accounts = [...discordAccounts];
    checkAbortController = new AbortController();
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

        const { cancelCheck: preCancel } = await chrome.storage.local.get(['cancelCheck']);
        if (preCancel || (checkAbortController && checkAbortController.signal.aborted)) {
            await stopCheck();
            return;
        }

        await chrome.storage.local.set({
            checkTarget: targetName,
            checkCount: currentCount
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
            if (accounts[i].invalid !== false ||
                accounts[i].username !== userData.username ||
                accounts[i].global_name !== userData.global_name ||
                accounts[i].avatar !== userData.avatar) {

                accounts[i] = {
                    ...accounts[i],
                    invalid: false,
                    username: userData.username,
                    global_name: userData.global_name,
                    avatar: userData.avatar
                };
                hasChanges = true;
            }
        }

        const prog = Math.round(((i + 1) / accounts.length) * 100);
        await chrome.storage.local.set({
            checkProgress: prog,
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
    checkAbortController = null;

    setTimeout(() => {
        chrome.storage.local.set({ checkProgress: 0 });
    }, 3000);
}
