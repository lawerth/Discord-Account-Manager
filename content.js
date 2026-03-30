const LOGIN_PARAM = 'token';
const urlParams = new URLSearchParams(window.location.search);
const encodedToken = urlParams.get(LOGIN_PARAM);

if (encodedToken) {
    try {
        const token = atob(decodeURIComponent(encodedToken));
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.documentElement.appendChild(iframe);
        
        iframe.contentWindow.localStorage.clear();
        iframe.contentWindow.localStorage.token = `"${token}"`;
        
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        window.location.replace('https://discord.com/app');
        
    } catch (err) {
        console.error('Error processing Discord login token:', err);
    }
}
