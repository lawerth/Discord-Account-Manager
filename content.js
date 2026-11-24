(() => {
    const ALLOWED_ORIGINS = [
        'https://discord.com',
        'https://www.discord.com',
        'https://ptb.discord.com',
        'https://canary.discord.com',
        'https://discordapp.com',
        'https://www.discordapp.com'
    ];
    if (!ALLOWED_ORIGINS.includes(window.location.origin)) return;

    const OFFICIAL_LOGIN_TTL = 15 * 60 * 1000;

    function sanitizeCapturedToken(raw) {
        if (!raw || typeof raw !== 'string') return null;
        const clean = raw.replace(/^"|"$/g, '').trim();
        return (clean.length > 20 && !clean.includes(' ')) ? clean : null;
    }

    function startTokenPolling() {
        let attempts = 0;
        const timer = setInterval(() => {
            attempts++;
            if (attempts > 120) { clearInterval(timer); return; }
            let token = null;
            try { token = sanitizeCapturedToken(window.localStorage.getItem('token')); } catch (e) { }
            if (!token) return;
            clearInterval(timer);
            chrome.runtime.sendMessage({ type: 'OFFICIAL_LOGIN_TOKEN', token }, () => { });
        }, 500);
    }

    chrome.storage.local.get(['pendingOfficialLogin', 'pendingLogin'], (res) => {
        if (chrome.runtime.lastError) return;

        const pendingLogin = res ? res.pendingLogin : null;
        if (pendingLogin && pendingLogin.token) return;

        const pending = res ? res.pendingOfficialLogin : null;
        if (!pending) return;
        if (Date.now() - (pending.timestamp || 0) > OFFICIAL_LOGIN_TTL) {
            chrome.storage.local.remove(['pendingOfficialLogin']);
            return;
        }

        if (window.location.pathname.startsWith('/login')) {
            try { window.localStorage.clear(); } catch (e) { }
            try { window.sessionStorage.clear(); } catch (e) { }
            const observer = new MutationObserver(() => {
                if (!window.location.pathname.startsWith('/login')) {
                    observer.disconnect();
                    startTokenPolling();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
            return;
        }

        startTokenPolling();
    });

    if (window.location.pathname.startsWith('/login')) {
        chrome.storage.local.get(['pendingLogin'], (res) => {
            if (chrome.runtime.lastError) return;
            const pending = res ? res.pendingLogin : null;
            if (!pending || !pending.token) return;

            chrome.storage.local.remove(['pendingLogin']);

            if (Date.now() - (pending.timestamp || 0) > 30000) return;

            try {
                const token = pending.token;
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.documentElement.appendChild(iframe);

                try {
                    iframe.contentWindow.localStorage.clear();
                    iframe.contentWindow.localStorage.token = `"${token}"`;
                } catch (storageErr) {
                    window.localStorage.setItem('token', `"${token}"`);
                }

                window.location.replace('https://discord.com/app');
            } catch (err) { }
        });
    }
})();
