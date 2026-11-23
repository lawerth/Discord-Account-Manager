// "Add via Discord Login": while a pendingOfficialLogin flag is set,
// clear the stored token on /login so Discord (which runs after this
// document_start script) shows the login form instead of auto-signing
// in with the previously logged-in account, and capture the new
// account's token once the user has signed in and lands on the app.
const OFFICIAL_LOGIN_TTL = 15 * 60 * 1000;

function sanitizeCapturedToken(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.replace(/^"|"$/g, '').trim();
    return (clean.length > 20 && !clean.includes(' ')) ? clean : null;
}

chrome.storage.local.get(['pendingOfficialLogin'], (res) => {
    if (chrome.runtime.lastError) return;
    const pending = res ? res.pendingOfficialLogin : null;
    if (!pending) return;
    if (Date.now() - (pending.timestamp || 0) > OFFICIAL_LOGIN_TTL) {
        chrome.storage.local.remove(['pendingOfficialLogin']);
        return;
    }

    if (window.location.pathname.startsWith('/login')) {
        // Safety net only: background.js already wiped this origin via
        // chrome.browsingData before opening this tab. Clear everything
        // (not just the `token` key) in case the stored auth lives under
        // a different key in this Discord version.
        try { window.localStorage.clear(); } catch (e) { }
        try { window.sessionStorage.clear(); } catch (e) { }
        return;
    }

    // Poll localStorage: right after a successful login Discord may
    // take a moment to store the token, and navigation to /app or
    // /channels/@me can also happen via SPA routing without a reload.
    let attempts = 0;
    const timer = setInterval(() => {
        attempts++;
        if (attempts > 120) { clearInterval(timer); return; } // ~60s per page load
        let token = null;
        try { token = sanitizeCapturedToken(window.localStorage.getItem('token')); } catch (e) { }
        if (!token) return;
        clearInterval(timer);
        chrome.runtime.sendMessage({ type: 'OFFICIAL_LOGIN_TOKEN', token }, () => {
            // Background claims the pending flag and saves the account;
            // nothing else to do here (runtime.lastError if it went away).
        });
    }, 500);
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
