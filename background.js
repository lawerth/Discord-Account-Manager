chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_CHECK') {
        startCheck();
    } else if (message.type === 'REFRESH_ACCOUNT') {
        refreshAccount(message.token, message.accId);
    }
});

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

async function validateToken(token) {
    try {
        const response = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { 'Authorization': token }
        });

        if (response.status === 401 || response.status === 403) {
            return { valid: false, error: 'unauthorized', status: response.status };
        }

        if (!response.ok) {
            return { valid: false, error: 'network', status: response.status };
        }

        const data = await response.json();
        return { valid: true, data: data };
    } catch (err) {
        console.error('Validation error:', err);
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
    await chrome.storage.local.set({
        isChecking: true,
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
        const targetName = acc.global_name || acc.username;
        const currentCount = `${i + 1}/${accounts.length}`;

        await chrome.storage.local.set({
            checkTarget: targetName,
            checkCount: currentCount
        });

        const result = await validateToken(acc.token);
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

        if (accounts.length > 5) {
            await new Promise(r => setTimeout(r, 200));
        }
    }

    if (hasChanges) {
        await chrome.storage.local.set({ discordAccounts: accounts });
    }

    await chrome.storage.local.set({
        isChecking: false,
        checkProgress: 100,
        checkResults: { valid: validCount, invalid: invalidCount }
    });

    setTimeout(() => {
        chrome.storage.local.set({ checkProgress: 0 });
    }, 3000);
}
