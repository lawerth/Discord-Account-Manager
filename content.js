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
