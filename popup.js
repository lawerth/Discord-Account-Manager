document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('accountList');
    const showAddBtn = document.getElementById('showAddBtn');
    const addTokenForm = document.getElementById('addTokenForm');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    const tokenInput = document.getElementById('tokenInput');
    const errorMsg = document.getElementById('errorMsg');
    const themeBtn = document.getElementById('themeSelect');
    const accountCount = document.getElementById('accountCount');
    const addFolderBtn = document.getElementById('addFolderBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const footerActions = document.getElementById('footerActions');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchContainer = document.querySelector('.search-container');
    const checkAllTokensBtn = document.getElementById('checkAllTokensBtn');
    const cancelCheckBtn = document.getElementById('cancelCheckBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsStatusText = document.getElementById('settingsStatusText');
    const settingsLastSummary = document.getElementById('settingsLastSummary');
    const settingsProgressBarContainer = document.getElementById('settingsProgressBarContainer');
    const settingsProgressBar = document.getElementById('settingsProgressBar');
    const settingsProgressText = document.getElementById('settingsProgressText');
    const settingsProgressCount = document.getElementById('settingsProgressCount');
    const addCurrentAccountBtn = document.getElementById('addCurrentAccountBtn');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressCount = document.getElementById('progressCount');
    const showBadgesToggle = document.getElementById('showBadgesToggle');
    const visibleBadgesCountRow = document.getElementById('visibleBadgesCountRow');
    const decreaseVisibleBadgesBtn = document.getElementById('decreaseVisibleBadgesBtn');
    const increaseVisibleBadgesBtn = document.getElementById('increaseVisibleBadgesBtn');
    const visibleBadgesCountValue = document.getElementById('visibleBadgesCountValue');
    const DEFAULT_VISIBLE_BADGES = 6;
    const MIN_VISIBLE_BADGES = 3;
    const MAX_VISIBLE_BADGES = 6;
    let showBadges = true;
    let maxVisibleBadges = DEFAULT_VISIBLE_BADGES;

    function clampVisibleBadgesCount(val) {
        const parsed = parseInt(val, 10);
        if (!Number.isFinite(parsed)) return DEFAULT_VISIBLE_BADGES;
        return Math.min(MAX_VISIBLE_BADGES, Math.max(MIN_VISIBLE_BADGES, parsed));
    }

    function updateVisibleBadgesSettingUI() {
        if (visibleBadgesCountRow) {
            visibleBadgesCountRow.hidden = !showBadges;
        }
        if (visibleBadgesCountValue) {
            visibleBadgesCountValue.textContent = String(maxVisibleBadges);
        }
        if (decreaseVisibleBadgesBtn) {
            decreaseVisibleBadgesBtn.disabled = maxVisibleBadges <= MIN_VISIBLE_BADGES;
        }
        if (increaseVisibleBadgesBtn) {
            increaseVisibleBadgesBtn.disabled = maxVisibleBadges >= MAX_VISIBLE_BADGES;
        }
    }

    const tokenFolderSelect = document.getElementById('tokenFolderSelect');
    const customTokenFolderSelect = document.getElementById('customTokenFolderSelect');
    const tokenFolderTrigger = document.getElementById('tokenFolderTrigger');
    const tokenFolderTriggerText = document.getElementById('tokenFolderTriggerText');
    const tokenFolderOptions = document.getElementById('tokenFolderOptions');
    const importTxtFile = document.getElementById('importTxtFile');
    const detectedTokensBadge = document.getElementById('detectedTokensBadge');
    const addTokenProgressContainer = document.getElementById('addTokenProgressContainer');
    const addTokenProgressBar = document.getElementById('addTokenProgressBar');
    const addTokenProgressText = document.getElementById('addTokenProgressText');
    const addTokenProgressCount = document.getElementById('addTokenProgressCount');
    const addAccountModal = document.getElementById('addAccountModal');
    const addViaTokenBtn = document.getElementById('addViaTokenBtn');
    const addViaLoginBtn = document.getElementById('addViaLoginBtn');
    const cancelAddAccountBtn = document.getElementById('cancelAddAccountBtn');
    let isBulkAddRunning = false;
    let bulkAddAutoCloseTimer = null;
    let openAccountMenuToken = null;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function applyUserDataToAccount(existing, userData, token, folderId) {
        const base = existing || {};
        const profileFailed = !!userData._profileFailed;
        const badgesFetchFailed = !!userData._badgesFetchFailed;
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
            badge_items: (!badgesFetchFailed && Array.isArray(userData.badge_items))
                ? userData.badge_items
                : (Array.isArray(base.badge_items) ? base.badge_items : null),
            gifting_count: (!badgesFetchFailed && typeof userData.gifting_count === 'number') ? userData.gifting_count : (base.gifting_count || 0),
            gifting_tier: (!badgesFetchFailed && typeof userData.gifting_tier === 'number') ? userData.gifting_tier : (base.gifting_tier || 0),
            flags: userData.flags,
            public_flags: userData.public_flags,
            token: token,
            folderId: resolvedFolderId,
            invalid: false
        };
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const editingFolder = folders.find(f => f.isEditing);
            if (editingFolder) {
                const input = document.querySelector('.folder-name-input');
                if (input) {
                    editingFolder.name = input.value || 'New Folder';
                    delete editingFolder.isEditing;
                    saveFolders([...folders]);
                }
            }
        }
    });


    let accounts = [];
    let folders = [];
    let collapsedFolders = [];
    let rootOrder = [];
    let searchQuery = '';

    const themes = [
        'discord-dark',
        'amoled',
        'light',
        'midnight-blurple',
        'retro-storm',
        'neon-nights',
        'sunset',
        'mint-apple',
        'hanami'
    ];
    let currentThemeIndex = 0;

    function applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
    }

    let activeAccountId = null;

    async function checkActiveDiscordTab() {
        if (!addCurrentAccountBtn) return;
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && (tab.url.startsWith('https://discord.com/') || tab.url.startsWith('https://discordapp.com/'))) {

                addCurrentAccountBtn.textContent = getTranslation('actions.searching');

                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    world: "MAIN",
                    func: () => {
                        const sanitizeToken = (t) => {
                            if (!t) return null;
                            if (typeof t === 'string') {
                                const clean = t.replace(/^"|"$/g, '').trim();
                                if (clean.length > 20 && !clean.includes(' ')) return clean;
                            } else if (typeof t === 'object') {
                                if (typeof t.token === 'string' && t.token.length > 20) return t.token.trim();
                                if (typeof t.authToken === 'string' && t.authToken.length > 20) return t.authToken.trim();
                            }
                            return null;
                        };

                        try {
                            if (document.body) {
                                const iframe = document.createElement('iframe');
                                iframe.style.display = 'none';
                                document.body.appendChild(iframe);
                                const token1 = sanitizeToken(iframe.contentWindow.localStorage.getItem('token'));
                                document.body.removeChild(iframe);
                                if (token1) return token1;
                            }
                        } catch (e) { }

                        try {
                            const token2 = sanitizeToken(window.localStorage.getItem('token'));
                            if (token2) return token2;
                        } catch (e) { }

                        try {
                            let foundToken = null;
                            if (typeof window.webpackChunkdiscord_app !== 'undefined') {
                                window.webpackChunkdiscord_app.push([
                                    [Math.random()],
                                    {},
                                    (req) => {
                                        if (!req.c) return;
                                        for (const key in req.c) {
                                            const mod = req.c[key];
                                            if (!mod || !mod.exports) continue;
                                            const m = mod.exports;

                                            if (m.default && typeof m.default.getToken === 'function') {
                                                try {
                                                    const candidate = sanitizeToken(m.default.getToken());
                                                    if (candidate) {
                                                        foundToken = candidate;
                                                        break;
                                                    }
                                                } catch (e) {}
                                            }

                                            if (typeof m.getToken === 'function') {
                                                try {
                                                    const candidate = sanitizeToken(m.getToken());
                                                    if (candidate) {
                                                        foundToken = candidate;
                                                        break;
                                                    }
                                                } catch (e) {}
                                            }
                                        }
                                    }
                                ]);
                            }
                            if (foundToken) return foundToken;
                        } catch (e) { }

                        return null;
                    }
                });

                if (results && results[0] && results[0].result) {
                    const token = results[0].result;

                    const matchedAccount = accounts.find(a => a.token === token);
                    if (matchedAccount) {
                        activeAccountId = matchedAccount.id;
                        markActiveAccount();
                        addCurrentAccountBtn.disabled = false;
                        addCurrentAccountBtn.textContent = getTranslation('actions.updateCurrent') || 'Update Current';
                        addCurrentAccountBtn.title = getTranslation('actions.updateCurrent') || 'Update Current';
                        addCurrentAccountBtn.onclick = async () => {
                            const originalText = addCurrentAccountBtn.textContent;
                            addCurrentAccountBtn.textContent = getTranslation('actions.updating') || 'Updating...';
                            addCurrentAccountBtn.disabled = true;

                            const userData = await validateToken(token);
                            if (userData) {
                                const existingIndex = accounts.findIndex(a => a.id === userData.id || a.token === token);
                                let newAccounts = [...accounts];
                                if (existingIndex !== -1) {
                                    newAccounts[existingIndex] = applyUserDataToAccount(newAccounts[existingIndex], userData, token);
                                }
                                await saveAccounts(newAccounts);
                                addCurrentAccountBtn.textContent = getTranslation('actions.updated') || 'Updated!';
                                setTimeout(() => {
                                    checkActiveDiscordTab();
                                }, 1500);
                            } else {
                                addCurrentAccountBtn.textContent = getTranslation('actions.failed');
                                setTimeout(() => {
                                    addCurrentAccountBtn.textContent = originalText;
                                    addCurrentAccountBtn.disabled = false;
                                }, 2000);
                            }
                        };
                    } else {
                        activeAccountId = null;
                        markActiveAccount();
                        addCurrentAccountBtn.disabled = false;
                        addCurrentAccountBtn.textContent = getTranslation('actions.addCurrent');
                        addCurrentAccountBtn.title = getTranslation('actions.addCurrent');

                        addCurrentAccountBtn.onclick = async () => {
                            const originalText = addCurrentAccountBtn.textContent;
                            addCurrentAccountBtn.textContent = getTranslation('actions.adding');
                            addCurrentAccountBtn.disabled = true;

                            const userData = await validateToken(token);
                            if (userData) {
                                const existingIndex = accounts.findIndex(a => a.id === userData.id);
                                let newAccounts;
                                if (existingIndex !== -1) {
                                    newAccounts = [...accounts];
                                    newAccounts[existingIndex] = applyUserDataToAccount(newAccounts[existingIndex], userData, token);
                                } else {
                                    newAccounts = [...accounts, applyUserDataToAccount(null, userData, token, null)];
                                }
                                await saveAccounts(newAccounts);
                                checkActiveDiscordTab();
                            } else {
                                addCurrentAccountBtn.textContent = getTranslation('actions.failed');
                                setTimeout(() => {
                                    addCurrentAccountBtn.textContent = originalText;
                                    addCurrentAccountBtn.disabled = false;
                                }, 2000);
                            }
                        };
                    }
                } else {
                    activeAccountId = null;
                    markActiveAccount();
                    addCurrentAccountBtn.textContent = getTranslation('actions.noTokenFound');
                    addCurrentAccountBtn.title = getTranslation('actions.noTokenFound');
                }
            } else {
                activeAccountId = null;
                markActiveAccount();
                addCurrentAccountBtn.textContent = getTranslation('actions.addCurrent');
                addCurrentAccountBtn.title = getTranslation('actions.addCurrent');
            }
        } catch (error) {
            console.error('Error checking active tab:', error);
            activeAccountId = null;
            markActiveAccount();
            addCurrentAccountBtn.textContent = getTranslation('actions.error');
            addCurrentAccountBtn.title = getTranslation('actions.error');
        }
    }

    function markActiveAccount() {
        document.querySelectorAll('.account-item.active-account').forEach(el => {
            el.classList.remove('active-account');
        });
        if (activeAccountId) {
            document.querySelectorAll('.account-item').forEach(el => {
                if (el.dataset.accountId === activeAccountId) {
                    el.classList.add('active-account');
                }
            });
        }
    }

    async function loadInitialData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['discordAccounts', 'discordFolders', 'collapsedFolders', 'selectedTheme', 'selectedLanguage', 'showBadges', 'maxVisibleBadges', 'discordRootOrder'], async function (result) {
                let activeLang = result.selectedLanguage;
                if (!activeLang) {
                    activeLang = detectSystemLanguage();
                    chrome.storage.local.set({ selectedLanguage: activeLang });
                }
                setLanguage(activeLang);
                if (window.updateCustomLangSelect) {
                    window.updateCustomLangSelect(activeLang);
                }

                if (result.selectedTheme) {
                    currentThemeIndex = Math.max(0, themes.indexOf(result.selectedTheme));
                    applyTheme(result.selectedTheme);
                    if (themeBtn) {
                        themeBtn.value = result.selectedTheme;
                    }
                    if (window.updateCustomThemeSelect) {
                        window.updateCustomThemeSelect(result.selectedTheme);
                    }
                }

                showBadges = result.showBadges !== false;
                if (showBadgesToggle) {
                    showBadgesToggle.checked = showBadges;
                }
                maxVisibleBadges = clampVisibleBadgesCount(result.maxVisibleBadges);
                updateVisibleBadgesSettingUI();

                accounts = result.discordAccounts || [];
                folders = (result.discordFolders || []).map(({ isEditing, menuOpen, ...rest }) => rest);
                collapsedFolders = folders.map(f => f.id);
                rootOrder = result.discordRootOrder || [];

                let hasChanges = false;
                const folderIds = new Set(folders.map(f => f.id));

                const uniqueAccounts = [];
                const accountMap = new Map();

                for (const acc of accounts) {
                    if (!acc) continue;
                    let cleanAcc = acc;
                    if (cleanAcc.folderId && !folderIds.has(cleanAcc.folderId)) {
                        hasChanges = true;
                        cleanAcc = { ...cleanAcc, folderId: null };
                    }

                    const key = cleanAcc.id || cleanAcc.token || cleanAcc.username;
                    if (!key) {
                        uniqueAccounts.push(cleanAcc);
                        continue;
                    }

                    if (!accountMap.has(key)) {
                        accountMap.set(key, cleanAcc);
                        uniqueAccounts.push(cleanAcc);
                    } else {
                        hasChanges = true;
                        const existing = accountMap.get(key);
                        const existingIdx = uniqueAccounts.findIndex(a => (a.id && a.id === key) || (a.token && a.token === key) || (a.username && a.username === key));

                        let merged = { ...existing };
                        if (existing.invalid && !cleanAcc.invalid) {
                            merged = { ...merged, ...cleanAcc, invalid: false };
                        } else if (!existing.invalid && !cleanAcc.invalid) {
                            merged = { ...merged, ...cleanAcc };
                        }
                        if (cleanAcc.folderId && !merged.folderId) {
                            merged.folderId = cleanAcc.folderId;
                        }

                        accountMap.set(key, merged);
                        if (existingIdx !== -1) {
                            uniqueAccounts[existingIdx] = merged;
                        }
                    }
                }

                accounts = uniqueAccounts;
                if (hasChanges) {
                    chrome.storage.local.set({ discordAccounts: accounts });
                }

                listContainer.classList.add('initial-load');
                renderAccounts(true);

                chrome.storage.local.get([
                    'isChecking', 'checkProgress', 'checkTarget', 'checkCount', 'checkResults',
                    'isBulkAdding', 'bulkAddCurrent', 'bulkAddTotal', 'bulkAddProgress',
                    'bulkAddResults', 'bulkAddFinished', 'bulkAddCompletedAt'
                ], (res) => {
                    updateProgressUI(res.isChecking, res.checkProgress || 0, res.checkTarget, res.checkCount, res.checkResults);
                    if (res.isBulkAdding || (res.bulkAddFinished && res.bulkAddCompletedAt && Date.now() - res.bulkAddCompletedAt < 30000)) {
                        updateBulkAddUI(res);
                    } else if (res.bulkAddFinished) {
                        chrome.storage.local.set({ bulkAddFinished: false });
                    }
                    if (accounts.length > 0 && searchInput && !res.isBulkAdding) {
                        searchInput.focus();
                    }
                });

                checkActiveDiscordTab();
                queueStaleBadgeUpgrades();

                setTimeout(() => {
                    if (listContainer) listContainer.classList.remove('initial-load');
                }, 450);

                resolve();
            });
        });
    }

    function closeCustomSelect(container) {
        if (!container) return;
        if (container._flipAnim) {
            container._flipAnim.cancel();
            container._flipAnim = null;
        }
        container.classList.remove('open');
    }

    function adjustCustomSelectPosition(container) {
        if (!container || container.id === 'customTokenFolderSelect') return;
        const trigger = container.querySelector('.custom-select-trigger');
        const options = container.querySelector('.custom-select-options');
        if (!trigger || !options) return;

        const triggerRect = trigger.getBoundingClientRect();
        if (triggerRect.width === 0 && triggerRect.height === 0) return;

        const optionsHeight = options.offsetHeight || 180;

        const scrollContainer = container.closest('.settings-content') || document.documentElement;
        const containerRect = scrollContainer.getBoundingClientRect();

        const spaceBelow = containerRect.bottom - triggerRect.bottom;
        const spaceAbove = triggerRect.top - containerRect.top;

        const shouldOpenUp = (spaceBelow < optionsHeight + 8 && spaceAbove > spaceBelow);
        const wasOpenUp = container.classList.contains('open-up');
        const isOpen = container.classList.contains('open');

        if (shouldOpenUp !== wasOpenUp) {
            if (shouldOpenUp) {
                container.classList.add('open-up');
            } else {
                container.classList.remove('open-up');
            }

            if (isOpen) {
                if (container._flipAnim) {
                    container._flipAnim.cancel();
                }
                const startY = shouldOpenUp ? 20 : -20;
                container._flipAnim = options.animate([
                    { transform: `translateY(${startY}px) scale(0.96)`, opacity: 0.45 },
                    { transform: 'translateY(0) scale(1)', opacity: 1 }
                ], {
                    duration: 220,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
                });
                container._flipAnim.onfinish = () => {
                    container._flipAnim = null;
                };
            }
        }
    }

    function initCustomThemeSelect() {
        const container = document.getElementById('customThemeSelect');
        if (!container) return;

        const trigger = container.querySelector('.custom-select-trigger');
        const options = container.querySelectorAll('.custom-option');
        const nativeSelect = document.getElementById('themeSelect');

        function updateTrigger(themeValue) {
            const badge = trigger.querySelector('.theme-badge-dot');
            const text = trigger.querySelector('.custom-select-text');
            if (badge) badge.className = `theme-badge-dot ${themeValue}`;
            const keyMap = {
                'discord-dark': 'theme.discordDark',
                'amoled': 'theme.amoled',
                'light': 'theme.light',
                'midnight-blurple': 'theme.midnightBlurple',
                'retro-storm': 'theme.retroStorm',
                'neon-nights': 'theme.neonNights',
                'sunset': 'theme.sunset',
                'mint-apple': 'theme.mintApple',
                'hanami': 'theme.hanami'
            };
            const i18nKey = keyMap[themeValue] || themeValue;
            if (text) {
                text.setAttribute('data-i18n', i18nKey);
                text.textContent = getTranslation(i18nKey);
            }

            options.forEach(opt => {
                if (opt.dataset.value === themeValue) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
        }

        window.updateCustomThemeSelect = updateTrigger;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const langContainer = document.getElementById('customLangSelect');
            if (langContainer) closeCustomSelect(langContainer);
            if (!container.classList.contains('open')) {
                adjustCustomSelectPosition(container);
                container.classList.add('open');
                const selectedOpt = container.querySelector('.custom-option.selected');
                if (selectedOpt) {
                    selectedOpt.scrollIntoView({ block: 'nearest' });
                }
            } else {
                closeCustomSelect(container);
            }
        });

        options.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = opt.dataset.value;
                if (nativeSelect) {
                    nativeSelect.value = val;
                    nativeSelect.dispatchEvent(new Event('change'));
                }
                updateTrigger(val);
                closeCustomSelect(container);
            });
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                closeCustomSelect(container);
            }
        });
    }

    initCustomThemeSelect();

    if (themeBtn) {
        themeBtn.addEventListener('change', () => {
            const selectedTheme = themeBtn.value;
            applyTheme(selectedTheme);
            chrome.storage.local.set({ selectedTheme: selectedTheme });
            if (window.updateCustomThemeSelect) {
                window.updateCustomThemeSelect(selectedTheme);
            }
        });
    }

    if (showBadgesToggle) {
        showBadgesToggle.addEventListener('change', () => {
            showBadges = showBadgesToggle.checked;
            updateVisibleBadgesSettingUI();
            if (!showBadges) {
                hideBadgeHoverCard();
                closeBadgesModal();
            }
            chrome.storage.local.set({ showBadges: showBadges }, () => {
                renderAccounts();
            });
        });
    }

    function adjustVisibleBadgesCount(delta) {
        const nextCount = clampVisibleBadgesCount(maxVisibleBadges + delta);
        if (nextCount === maxVisibleBadges) return;
        maxVisibleBadges = nextCount;
        updateVisibleBadgesSettingUI();
        chrome.storage.local.set({ maxVisibleBadges: maxVisibleBadges }, () => {
            renderAccounts();
        });
    }

    if (decreaseVisibleBadgesBtn) {
        decreaseVisibleBadgesBtn.addEventListener('click', () => adjustVisibleBadgesCount(-1));
    }
    if (increaseVisibleBadgesBtn) {
        increaseVisibleBadgesBtn.addEventListener('click', () => adjustVisibleBadgesCount(1));
    }

    function saveAccounts(newAccounts) {
        return new Promise((resolve) => {
            accounts = newAccounts;
            const clean = getCleanRootOrder();
            chrome.storage.local.set({ discordAccounts: newAccounts, discordRootOrder: clean }, () => {
                renderAccounts();
                resolve();
            });
        });
    }

    function saveFolders(newFolders, shouldRender = true) {
        return new Promise((resolve) => {
            folders = newFolders;
            const clean = getCleanRootOrder();
            const foldersToSave = newFolders.map(({ isEditing, menuOpen, ...rest }) => rest);
            chrome.storage.local.set({ discordFolders: foldersToSave, discordRootOrder: clean }, () => {
                if (shouldRender) renderAccounts();
                resolve();
            });
        });
    }

    function saveCollapsedFolders(newCollapsed) {
        chrome.storage.local.set({ collapsedFolders: newCollapsed });
        collapsedFolders = newCollapsed;
    }

    function toggleFolderCollapse(folderContainer, folderId, forceState = null, immediate = false) {
        if (!folderContainer) return;
        const folderContent = folderContainer.querySelector('.folder-content');
        const isCurrentlyCollapsed = folderContainer.classList.contains('collapsed');
        const targetCollapsed = forceState !== null ? forceState : !isCurrentlyCollapsed;

        if (targetCollapsed === isCurrentlyCollapsed && !folderContainer._anim) {
            return;
        }

        if (targetCollapsed) {
            if (!collapsedFolders.includes(folderId)) {
                saveCollapsedFolders([...collapsedFolders, folderId]);
            }
        } else {
            if (collapsedFolders.includes(folderId)) {
                saveCollapsedFolders(collapsedFolders.filter(fid => fid !== folderId));
            }
        }

        if (folderContainer._anim) {
            try {
                folderContainer._anim.cancel();
            } catch (err) {}
            folderContainer._anim = null;
        }

        if (immediate || !folderContent) {
            folderContainer.classList.remove('animating');
            folderContainer.classList.toggle('collapsed', targetCollapsed);
            return;
        }

        if (targetCollapsed) {
            const currentHeight = folderContent.getBoundingClientRect().height || folderContent.offsetHeight;
            if (currentHeight <= 0) {
                folderContainer.classList.remove('animating');
                folderContainer.classList.add('collapsed');
                return;
            }

            folderContainer.classList.add('animating');
            folderContainer.classList.add('collapsed');

            const computed = window.getComputedStyle(folderContent);
            const startPadTop = computed.paddingTop || '6px';
            const startPadBottom = computed.paddingBottom || '6px';

            const anim = folderContent.animate([
                { height: `${currentHeight}px`, paddingTop: startPadTop, paddingBottom: startPadBottom, overflow: 'hidden' },
                { height: '0px', paddingTop: '0px', paddingBottom: '0px', overflow: 'hidden' }
            ], {
                duration: 180,
                easing: 'cubic-bezier(0.2, 0, 0, 1)'
            });

            folderContainer._anim = anim;

            anim.onfinish = () => {
                if (folderContainer._anim === anim) {
                    folderContainer._anim = null;
                    folderContainer.classList.remove('animating');
                    folderContainer.classList.add('collapsed');
                }
            };
        } else {
            folderContainer.classList.add('animating');
            folderContainer.classList.remove('collapsed');

            const targetHeight = folderContent.scrollHeight || folderContent.offsetHeight;
            const currentHeight = Math.max(0, folderContent.getBoundingClientRect().height);

            const anim = folderContent.animate([
                { height: `${currentHeight}px`, paddingTop: currentHeight > 0 ? '6px' : '0px', paddingBottom: currentHeight > 0 ? '6px' : '0px', overflow: 'hidden' },
                { height: `${targetHeight}px`, paddingTop: '6px', paddingBottom: '6px', overflow: 'hidden' }
            ], {
                duration: 200,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
            });

            folderContainer._anim = anim;

            anim.onfinish = () => {
                if (folderContainer._anim === anim) {
                    folderContainer._anim = null;
                    folderContainer.classList.remove('animating');
                }
            };
        }
    }

    function collapseAllFolders(immediate = false) {
        const allFolderIds = folders.map(folder => folder.id);
        saveCollapsedFolders(allFolderIds);
        document.querySelectorAll('.folder-container').forEach(folderEl => {
            const folderId = folderEl.dataset.id;
            toggleFolderCollapse(folderEl, folderId, true, immediate);
        });
    }

    function getCleanRootOrder() {
        const validFolderIds = new Set(folders.map(f => f.id));
        const validAccountTokens = new Set(accounts.filter(a => !a.folderId).map(a => a.token));

        const result = [];
        const seen = new Set();

        for (const key of rootOrder) {
            if (key.startsWith('folder:')) {
                const fId = key.slice(7);
                if (validFolderIds.has(fId) && !seen.has(key)) {
                    result.push(key);
                    seen.add(key);
                }
            } else if (key.startsWith('account:')) {
                const token = key.slice(8);
                if (validAccountTokens.has(token) && !seen.has(key)) {
                    result.push(key);
                    seen.add(key);
                }
            }
        }

        for (const f of folders) {
            const key = 'folder:' + f.id;
            if (!seen.has(key)) {
                result.push(key);
                seen.add(key);
            }
        }

        for (const a of accounts) {
            if (!a.folderId) {
                const key = 'account:' + a.token;
                if (!seen.has(key)) {
                    result.push(key);
                    seen.add(key);
                }
            }
        }

        rootOrder = result;
        return rootOrder;
    }





    function adjustFolderMenuPosition(folderContainer, folderMenu) {
        if (!folderMenu) return;

        folderMenu.style.top = 'calc(100% + 8px)';
        folderMenu.style.bottom = 'auto';
        folderMenu.style.maxHeight = '';
        folderMenu.style.overflowY = '';

        const menuRect = folderMenu.getBoundingClientRect();
        const footerActions = document.getElementById('footerActions');
        const header = document.querySelector('.header');

        let maxAllowedBottom = window.innerHeight - 12;
        if (footerActions && footerActions.offsetParent !== null) {
            const footerRect = footerActions.getBoundingClientRect();
            if (footerRect.top > 0) {
                maxAllowedBottom = footerRect.top - 8;
            }
        }

        const minAllowedTop = header ? header.getBoundingClientRect().bottom + 8 : 10;

        folderMenu.classList.remove('open-up');
        if (menuRect.bottom > maxAllowedBottom) {
            folderMenu.style.top = 'auto';
            folderMenu.style.bottom = 'calc(100% + 8px)';
            folderMenu.classList.add('open-up');

            const flippedRect = folderMenu.getBoundingClientRect();
            if (flippedRect.top < minAllowedTop) {
                const folderHeader = folderContainer.querySelector('.folder-header');
                const triggerRect = folderHeader ? folderHeader.getBoundingClientRect() : folderContainer.getBoundingClientRect();
                const availableHeight = Math.max(120, triggerRect.top - minAllowedTop - 8);
                folderMenu.style.maxHeight = `${availableHeight}px`;
                folderMenu.style.overflowY = 'auto';
            }
        }
    }

    function adjustAccountMenuPosition(wrapper) {
        if (!wrapper) return;
        const btn = wrapper.querySelector('.account-menu-btn');
        const menu = wrapper.querySelector('.account-menu');
        if (!btn || !menu) return;

        wrapper.classList.remove('open-up');

        const btnRect = btn.getBoundingClientRect();
        const menuHeight = menu.offsetHeight || 125;

        const footerActions = document.getElementById('footerActions');
        const header = document.querySelector('.header');

        let maxAllowedBottom = window.innerHeight - 8;
        if (footerActions && footerActions.offsetParent !== null) {
            const footerRect = footerActions.getBoundingClientRect();
            if (footerRect.top > 0) {
                maxAllowedBottom = Math.min(maxAllowedBottom, footerRect.top - 6);
            }
        }
        if (listContainer) {
            const listRect = listContainer.getBoundingClientRect();
            maxAllowedBottom = Math.min(maxAllowedBottom, listRect.bottom - 4);
        }

        let minAllowedTop = 10;
        if (header) {
            const headerRect = header.getBoundingClientRect();
            minAllowedTop = Math.max(minAllowedTop, headerRect.bottom + 6);
        }
        if (listContainer) {
            const listRect = listContainer.getBoundingClientRect();
            minAllowedTop = Math.max(minAllowedTop, listRect.top + 4);
        }

        const spaceBelow = maxAllowedBottom - btnRect.bottom;
        const spaceAbove = btnRect.top - minAllowedTop;

        if (spaceBelow < menuHeight + 6 && spaceAbove > spaceBelow) {
            wrapper.classList.add('open-up');
        }
    }



















    function closeAllFolderMenus(exceptActions = null) {
        const exceptFolderId = exceptActions && exceptActions.closest ? (exceptActions.closest('.folder-container')?.dataset.id || null) : null;
        folders.forEach(f => {
            if (!exceptFolderId || f.id !== exceptFolderId) {
                delete f.menuOpen;
            }
        });
        listContainer.querySelectorAll('.folder-actions.open').forEach(el => {
            if (el !== exceptActions) {
                el.classList.remove('open');
            }
        });
        listContainer.querySelectorAll('.folder-menu.open').forEach(el => {
            if (!exceptActions || !exceptActions.contains(el)) {
                el.classList.remove('open', 'open-up');
            }
        });
    }

    function closeAllAccountMenus(exceptWrapper = null) {
        if (!exceptWrapper) {
            openAccountMenuToken = null;
        }
        document.querySelectorAll('.account-menu-wrapper.open').forEach(el => {
            if (el !== exceptWrapper) {
                el.classList.remove('open');
                el.classList.remove('open-up');
            }
        });
    }

    document.addEventListener('click', (e) => {
        const folderMenuBtn = e.target.closest('.folder-menu-btn');
        const folderMenu = e.target.closest('.folder-menu');

        if (!folderMenuBtn && !folderMenu) {
            closeAllFolderMenus();
        }

        if (!e.target.closest('.account-menu-wrapper')) {
            closeAllAccountMenus();
        }
    });

    function renderAccounts(isInitial = false) {
        const savedScrollTop = listContainer ? listContainer.scrollTop : 0;
        if (!isInitial && listContainer) {
            listContainer.classList.remove('initial-load');
        }
        listContainer.innerHTML = '';
        listContainer.classList.toggle('is-searching', searchQuery.trim() !== '');

        const filteredAccounts = searchQuery.trim() === ''
            ? accounts
            : accounts.filter(acc => {
                const query = searchQuery.toLowerCase();
                const matchesAcc = (acc.username && acc.username.toLowerCase().includes(query)) ||
                    (acc.global_name && acc.global_name.toLowerCase().includes(query));
                if (matchesAcc) return true;

                if (acc.folderId) {
                    const folder = folders.find(f => f.id === acc.folderId);
                    if (folder && (folder.name || '').toLowerCase().includes(query)) return true;
                }
                return false;
            });

        if (accountCount) {
            const count = searchQuery.trim() === '' ? accounts.length : filteredAccounts.length;
            accountCount.textContent = count > 0 ? count : '';
            accountCount.style.display = count > 0 ? 'inline-block' : 'none';
        }

        if (searchContainer) {
            searchContainer.style.display = accounts.length > 0 ? 'block' : 'none';
        }

        if (checkAllTokensBtn) {
            checkAllTokensBtn.style.display = accounts.length > 0 ? 'flex' : 'none';
        }

        if (accounts.length === 0 && folders.length === 0) {
            listContainer.innerHTML = `<div class="empty-state">${getTranslation('account.empty')}</div>`;
            return;
        }

        const visibleFolders = folders.filter(folder => {
            const query = searchQuery.toLowerCase();
            const folderMatches = (folder.name || '').toLowerCase().includes(query);
            if (folderMatches) return true;

            return filteredAccounts.some(acc => acc.folderId === folder.id);
        });

        function createFolderElement(folder, folderAccounts) {
            const folderContainer = document.createElement('div');
            folderContainer.className = `folder-container ${collapsedFolders.includes(folder.id) ? 'collapsed' : ''} ${folder.color ? 'color-' + folder.color : ''}`;
            folderContainer.dataset.id = folder.id;

            const count = folderAccounts.length;
            const isEditing = folder.isEditing;

            folderContainer.innerHTML = `
                <div class="folder-header" data-id="${folder.id}">
                    <div class="drag-handle" title="${getTranslation('actions.dragReorder')}" data-drag-handle="folder" data-id="${folder.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="8" cy="6" r="1.5"></circle>
                            <circle cx="16" cy="6" r="1.5"></circle>
                            <circle cx="8" cy="12" r="1.5"></circle>
                            <circle cx="16" cy="12" r="1.5"></circle>
                            <circle cx="8" cy="18" r="1.5"></circle>
                            <circle cx="16" cy="18" r="1.5"></circle>
                        </svg>
                    </div>
                    <div class="folder-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10L12 15L17 10H7Z"></path>
                        </svg>
                    </div>
                    <div class="folder-name-wrapper">
                        <div class="folder-name">${escapeHtml(folder.name)}</div>
                        ${count > 0 ? `<span class="folder-count">${count}</span>` : ''}
                    </div>
                    <div class="folder-actions${folder.menuOpen ? ' open' : ''}">
                        <button class="icon-btn folder-menu-btn" aria-label="${escapeHtml(getTranslation('folder.options'))}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5" cy="12" r="1.5"></circle>
                                <circle cx="12" cy="12" r="1.5"></circle>
                                <circle cx="19" cy="12" r="1.5"></circle>
                            </svg>
                        </button>
                        <div class="folder-menu${folder.menuOpen ? ' open' : ''}">
                            <div class="folder-menu-edit">
                                <input type="text" class="folder-name-input" value="${escapeHtml(folder.name)}" autofocus placeholder="${getTranslation('folder.renamePlaceholder')}">
                                <div class="color-palette">
                                    <div class="color-option default ${!folder.color ? 'active' : ''}" data-color="" title="Default"></div>
                                    <div class="color-option blue ${folder.color === 'blue' ? 'active' : ''}" data-color="blue" title="Blue"></div>
                                    <div class="color-option green ${folder.color === 'green' ? 'active' : ''}" data-color="green" title="Green"></div>
                                    <div class="color-option yellow ${folder.color === 'yellow' ? 'active' : ''}" data-color="yellow" title="Yellow"></div>
                                    <div class="color-option red ${folder.color === 'red' ? 'active' : ''}" data-color="red" title="Red"></div>
                                    <div class="color-option purple ${folder.color === 'purple' ? 'active' : ''}" data-color="purple" title="Purple"></div>
                                </div>
                                <div class="folder-menu-actions">
                                    <button class="btn save-folder-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>${getTranslation('folder.save')}</button>
                                    <button class="btn delete-folder-panel-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path><path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path></svg>${getTranslation('folder.delete')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="folder-content"></div>
            `;

            const folderHeader = folderContainer.querySelector('.folder-header');
            const folderContent = folderContainer.querySelector('.folder-content');

            const folderActions = folderContainer.querySelector('.folder-actions');
            const folderMenuBtn = folderContainer.querySelector('.folder-menu-btn');
            const folderMenu = folderContainer.querySelector('.folder-menu');

            if (folderActions) {
                folderActions.addEventListener('pointerdown', (e) => e.stopPropagation());
                folderActions.addEventListener('mousedown', (e) => e.stopPropagation());
            }

            folderMenuBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
            folderMenuBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            folderMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpening = !folderActions.classList.contains('open');
                closeAllFolderMenus(isOpening ? folderActions : null);
                closeAllAccountMenus();
                hideBadgeHoverCard();
                document.querySelectorAll('.custom-select-container.open').forEach(closeCustomSelect);

                folders.forEach(f => {
                    if (f.id === folder.id) {
                        if (isOpening) f.menuOpen = true;
                        else delete f.menuOpen;
                    } else {
                        delete f.menuOpen;
                    }
                });

                if (isOpening) {
                    folderActions.classList.add('open');
                    if (folderMenu) {
                        folderMenu.classList.add('open');
                        adjustFolderMenuPosition(folderContainer, folderMenu);
                        const input = folderMenu.querySelector('.folder-name-input');
                        if (input) {
                            input.focus({ preventScroll: true });
                            input.setSelectionRange(input.value.length, input.value.length);
                        }
                    }
                } else {
                    folderActions.classList.remove('open');
                    if (folderMenu) {
                        folderMenu.classList.remove('open', 'open-up');
                    }
                }
            });

            if (folderMenu) {
                folderMenu.addEventListener('pointerdown', (e) => e.stopPropagation());
                folderMenu.addEventListener('mousedown', (e) => e.stopPropagation());
                folderMenu.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }

            const deleteFolderPanelBtn = folderContainer.querySelector('.delete-folder-panel-btn');
            if (deleteFolderPanelBtn) {
                deleteFolderPanelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newFolders = folders.filter(f => f.id !== folder.id).map(({ isEditing, menuOpen, ...rest }) => rest);
                    const newAccounts = accounts.map(acc => acc.folderId === folder.id ? { ...acc, folderId: null } : acc);
                    folders = newFolders;
                    accounts = newAccounts;
                    const clean = getCleanRootOrder();
                    chrome.storage.local.set({ discordFolders: newFolders, discordAccounts: newAccounts, discordRootOrder: clean }, () => {
                        renderAccounts();
                    });
                });
            }

            const nameInput = folderContainer.querySelector('.folder-name-input');
            if (nameInput) {
                nameInput.addEventListener('mousedown', (e) => e.stopPropagation());
                nameInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        folder.name = nameInput.value || 'New Folder';
                        folder.menuOpen = false;
                        saveFolders([...folders]);
                    }
                });
            }

            const saveFolderBtn = folderContainer.querySelector('.save-folder-btn');
            if (saveFolderBtn) {
                saveFolderBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (nameInput) {
                        folder.name = nameInput.value || 'New Folder';
                    }
                    folder.menuOpen = false;
                    saveFolders([...folders]);
                });
            }

            if (folderMenu && folderMenu.classList.contains('open')) {
                adjustFolderMenuPosition(folderContainer, folderMenu);
            }

            const colorOptions = folderContainer.querySelectorAll('.color-option');
            colorOptions.forEach(opt => {
                const applyColor = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const color = opt.dataset.color || null;
                    if ((folder.color || null) === color) return;
                    folder.color = color;
                    Array.from(folderContainer.classList)
                        .filter(cls => cls.startsWith('color-'))
                        .forEach(cls => folderContainer.classList.remove(cls));
                    if (color) {
                        folderContainer.classList.add('color-' + color);
                    }
                    colorOptions.forEach(o => o.classList.toggle('active', (o.dataset.color || null) === color));
                    saveFolders([...folders], false);
                };

                opt.addEventListener('click', applyColor);
            });

            folderHeader.addEventListener('click', (e) => {
                if (e.target.closest('.drag-handle, .folder-actions, .icon-btn, .color-option, .folder-menu') || e.target.closest('input')) return;

                toggleFolderCollapse(folderContainer, folder.id);
            });

            if (folderAccounts.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'folder-empty-msg';
                emptyMsg.textContent = getTranslation('folder.empty');
                folderContent.appendChild(emptyMsg);
            } else {
                folderAccounts.forEach((acc) => {
                    const accIndex = accounts.indexOf(acc);
                    const item = createAccountItem(acc, accIndex);
                    folderContent.appendChild(item);
                });
            }

            return folderContainer;
        }

        const cleanOrder = getCleanRootOrder();

        cleanOrder.forEach(key => {
            if (key.startsWith('folder:')) {
                const fId = key.slice(7);
                const folder = visibleFolders.find(f => f.id === fId);
                if (folder) {
                    const folderAccounts = filteredAccounts.filter(acc => acc.folderId === folder.id);
                    const folderEl = createFolderElement(folder, folderAccounts);
                    listContainer.appendChild(folderEl);
                }
            } else if (key.startsWith('account:')) {
                const token = key.slice(8);
                const acc = filteredAccounts.find(a => a.token === token && !a.folderId);
                if (acc) {
                    const accIndex = accounts.indexOf(acc);
                    const item = createAccountItem(acc, accIndex);
                    listContainer.appendChild(item);
                }
            }
        });

        if (filteredAccounts.length === 0 && visibleFolders.length === 0 && searchQuery.trim() !== '') {
            listContainer.innerHTML = `<div class="empty-state">${getTranslation('search.noResults')}</div>`;
        }

        if (listContainer) {
            listContainer.scrollTop = savedScrollTop;
        }

        requestAnimationFrame(() => {
            const openMenuEl = listContainer.querySelector('.folder-menu.open');
            if (openMenuEl) {
                const parentFolderContainer = openMenuEl.closest('.folder-container');
                if (parentFolderContainer) {
                    adjustFolderMenuPosition(parentFolderContainer, openMenuEl);
                }
            }
            const openAccountMenuEl = listContainer.querySelector('.account-menu-wrapper.open');
            if (openAccountMenuEl) {
                adjustAccountMenuPosition(openAccountMenuEl);
            }
        });
    }

    const BADGE_LOCALE_MAP = {
        en: 'en-US',
        tr: 'tr-TR',
        de: 'de-DE',
        es: 'es-ES',
        fr: 'fr-FR',
        pt: 'pt-BR',
        ru: 'ru-RU',
        it: 'it-IT',
        ja: 'ja-JP',
        ko: 'ko-KR',
        pl: 'pl-PL',
        zh: 'zh-CN',
        uk: 'uk-UA'
    };

    function getBadgeLocale() {
        const langCode = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en';
        return BADGE_LOCALE_MAP[langCode] || langCode || 'en-US';
    }

    function formatBadgeCount(num) {
        try {
            return new Intl.NumberFormat(getBadgeLocale()).format(num);
        } catch (e) {
            return String(num);
        }
    }

    function formatBadgeUnit(unit, count) {
        const locale = getBadgeLocale();
        let pluralRule = count === 1 ? 'one' : 'other';
        try {
            if (typeof Intl !== 'undefined' && Intl.PluralRules) {
                pluralRule = new Intl.PluralRules(locale).select(count);
            }
        } catch (e) { }
        const specificKey = `badge.unit.${unit}_${pluralRule}`;
        const fallbackKey = `badge.unit.${unit}_other`;
        let template = getTranslation(specificKey);
        if (template === specificKey) {
            template = getTranslation(fallbackKey);
        }
        return template.replace('{count}', formatBadgeCount(count));
    }

    function getCalendarDiffMonths(startDate, endDate = new Date()) {
        let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
        if (endDate.getDate() < startDate.getDate()) months--;
        return Math.max(0, months);
    }

    function getCalendarYearsMonths(startDate, endDate = new Date()) {
        const totalMonths = getCalendarDiffMonths(startDate, endDate);
        return {
            years: Math.floor(totalMonths / 12),
            months: totalMonths % 12
        };
    }

    function getAccountCreatedDateForBadge(acc, invItem) {
        const userId = getEffectiveUserId(acc);
        if (userId) {
            try {
                const timestampMs = Number((BigInt(userId) >> 22n) + 1420070400000n);
                const d = new Date(timestampMs);
                if (!isNaN(d.getTime())) return d;
            } catch (e) { }
        }
        if (invItem && typeof invItem.current === 'number' && invItem.current > 0) {
            return new Date(Date.now() - invItem.current * 86400000);
        }
        return null;
    }

    function toBadgeUpper(str) {
        if (!str) return '';
        try {
            return String(str).toLocaleUpperCase(getBadgeLocale());
        } catch (e) {
            return String(str).toUpperCase();
        }
    }

    function addCalendarMonths(startDate, monthsToAdd) {
        if (!startDate || isNaN(startDate.getTime())) return null;
        const d = new Date(startDate.getTime());
        const origDay = d.getDate();
        d.setMonth(d.getMonth() + monthsToAdd);
        if (d.getDate() < origDay) d.setDate(0);
        return d;
    }

    function formatBadgeSlashDate(dateInput) {
        if (!dateInput) return '';
        const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function formatBadgeUnlockedDate(dateInput) {
        return formatBadgeSlashDate(dateInput);
    }

    function formatMoreRemaining(unit, count) {
        const tmpl = getTranslation('badge.progressMore') || '{unit} left';
        return tmpl.replace('{unit}', formatBadgeUnit(unit, count));
    }

    function formatMilestoneText(unit, count, isPlus = false) {
        const base = formatBadgeUnit(unit, count);
        if (!isPlus) return base;
        const formattedCount = formatBadgeCount(count);
        if (base.includes(formattedCount)) {
            return base.replace(formattedCount, `${formattedCount}+`);
        }
        return `${base}+`;
    }

    function computeTimeBadgeProgress(invItem, startDate, currentIdx, tiers) {
        if (currentIdx >= tiers.length - 1) {
            return {
                isMaxed: true,
                percent: 100,
                remainingText: '',
                currentIcon: tiers[tiers.length - 1].icon,
                nextIcon: null
            };
        }

        const curTier = tiers[currentIdx];
        const nextTier = tiers[currentIdx + 1];
        let percent = 0;
        let remainingText = '';

        if (invItem && invItem.progress && typeof invItem.current === 'number' && typeof invItem.progress.threshold === 'number') {
            const floor = typeof invItem.progress.floor === 'number' ? invItem.progress.floor : 0;
            const threshold = invItem.progress.threshold;
            const span = Math.max(1, threshold - floor);
            percent = Math.max(4, Math.min(98, Math.round(((invItem.current - floor) / span) * 100)));
            const rem = Math.max(1, threshold - invItem.current);
            if (invItem.progress.unit === 'days') {
                if (rem >= 28) {
                    remainingText = formatMoreRemaining('month', Math.max(1, Math.round(rem / 30)));
                } else {
                    remainingText = formatMoreRemaining('day', rem);
                }
            } else {
                remainingText = formatMoreRemaining('month', rem);
            }
        } else if (startDate && !isNaN(startDate.getTime())) {
            const floorDate = addCalendarMonths(startDate, curTier.months || 0);
            const targetDate = addCalendarMonths(startDate, nextTier.months);
            if (floorDate && targetDate) {
                const nowMs = Date.now();
                const totalMs = Math.max(86400000, targetDate.getTime() - floorDate.getTime());
                const elapsedMs = Math.max(0, nowMs - floorDate.getTime());
                percent = Math.max(4, Math.min(98, Math.round((elapsedMs / totalMs) * 100)));
                const remDays = Math.max(1, Math.ceil((targetDate.getTime() - nowMs) / 86400000));
                if (remDays >= 28) {
                    remainingText = formatMoreRemaining('month', Math.max(1, Math.round(remDays / 30)));
                } else {
                    remainingText = formatMoreRemaining('day', remDays);
                }
            }
        } else {
            const diffMonths = Math.max(1, (nextTier.months || 1) - (curTier.months || 0));
            remainingText = formatMoreRemaining('month', diffMonths);
            percent = 12;
        }

        return {
            isMaxed: false,
            percent,
            remainingText,
            currentIcon: curTier.icon,
            nextIcon: nextTier.icon
        };
    }

    function computeCountBadgeProgress(unit, tiers, currentIdx, currentVal, invItem, createdDate) {
        if (currentIdx >= tiers.length - 1) {
            return {
                isMaxed: true,
                percent: 100,
                remainingText: '',
                currentIcon: tiers[tiers.length - 1].icon,
                nextIcon: null
            };
        }

        const curTier = tiers[currentIdx];
        const nextTier = tiers[currentIdx + 1];
        let percent = 10;
        let remainingText = '';

        if (invItem && invItem.progress && typeof invItem.current === 'number' && typeof invItem.progress.threshold === 'number') {
            const floor = typeof invItem.progress.floor === 'number' ? invItem.progress.floor : 0;
            const threshold = invItem.progress.threshold;
            const span = Math.max(1, threshold - floor);
            percent = Math.max(4, Math.min(98, Math.round(((invItem.current - floor) / span) * 100)));
            const rem = Math.max(1, threshold - invItem.current);
            if (invItem.progress.unit === 'days') {
                if (rem >= 28) {
                    remainingText = formatMoreRemaining('month', Math.max(1, Math.round(rem / 30)));
                } else {
                    remainingText = formatMoreRemaining('day', rem);
                }
            } else {
                remainingText = formatMoreRemaining(unit, rem);
            }
        } else if (unit === 'age' && createdDate && !isNaN(createdDate.getTime())) {
            const floorDate = addCalendarMonths(createdDate, curTier.min * 12);
            const targetDate = addCalendarMonths(createdDate, nextTier.min * 12);
            if (floorDate && targetDate) {
                const nowMs = Date.now();
                const totalMs = Math.max(86400000, targetDate.getTime() - floorDate.getTime());
                const elapsedMs = Math.max(0, nowMs - floorDate.getTime());
                percent = Math.max(4, Math.min(98, Math.round((elapsedMs / totalMs) * 100)));
                const remDays = Math.max(1, Math.ceil((targetDate.getTime() - nowMs) / 86400000));
                if (remDays >= 28) {
                    remainingText = formatMoreRemaining('month', Math.max(1, Math.round(remDays / 30)));
                } else {
                    remainingText = formatMoreRemaining('day', remDays);
                }
            }
        } else {
            const prevMin = curTier.min || 0;
            const nextMin = nextTier.min || 1;
            const val = typeof currentVal === 'number' ? currentVal : prevMin;
            const span = Math.max(1, nextMin - prevMin);
            percent = Math.max(4, Math.min(98, Math.round(((val - prevMin) / span) * 100)));
            remainingText = formatMoreRemaining(unit, Math.max(1, nextMin - val));
        }

        return {
            isMaxed: false,
            percent,
            remainingText,
            currentIcon: curTier.icon,
            nextIcon: nextTier.icon
        };
    }

    function extractDateFromDescription(desc) {
        if (!desc) return null;
        const m = desc.match(/\b([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}|\d{1,2}\s+[A-Za-zçğıöşüÇĞİÖŞÜ]+\s+\d{4})\b/);
        return m ? m[1] : null;
    }

    function isNitroBadgeId(id) {
        return !!id && (id === 'premium' || id.startsWith('nitro') || id.startsWith('premium_tenure_'));
    }

    function isBoosterBadgeId(id) {
        return !!id && (id === 'guild_booster' || id.startsWith('guild_booster'));
    }

    const NITRO_TIERS = [
        { key: 'starter', months: 0, rarity: 1, milestone: null, icon: 'assets/badges/nitro/Nitro_Starter.webp', hoverIcon: 'assets/badges/hover/nitro/Nitro_Starter.webp' },
        { key: 'bronze', months: 1, rarity: 2, milestone: { unit: 'month', count: 1 }, icon: 'assets/badges/nitro/Nitro_Bronze.webp', hoverIcon: 'assets/badges/hover/nitro/Nitro_Bronze.webp' },
        { key: 'silver', months: 3, rarity: 2, milestone: { unit: 'month', count: 3 }, icon: 'assets/badges/nitro/Nitro_Silver.webp', hoverIcon: 'assets/badges/hover/nitro/Nitro_Silver.webp' },
        { key: 'gold', months: 6, rarity: 2, milestone: { unit: 'month', count: 6 }, icon: 'assets/badges/nitro/Nitro_Gold.webp', hoverIcon: 'assets/badges/hover/nitro/Nitro_Gold.webp' },
        { key: 'platinum', months: 12, rarity: 2, milestone: { unit: 'year', count: 1 }, icon: 'assets/badges/nitro/Nitro_Platinum.webp', hoverIcon: 'assets/badges/hover/nitro/Nitro_Platinum.webp' },
        { key: 'diamond', months: 24, rarity: 3, milestone: { unit: 'year', count: 2 }, icon: 'assets/badges/nitro/Nitro_Diamond.webp', hoverIcon: 'assets/badges/hover/nitro/Nitro_Diamond.webp' },
        { key: 'emerald', months: 36, rarity: 3, milestone: { unit: 'year', count: 3 }, icon: 'assets/badges/nitro/Nitro_Emerald.webp', hoverIcon: 'assets/badges/hover/nitro/Nitro_Emerald.webp' },
        { key: 'ruby', months: 60, rarity: 5, milestone: { unit: 'year', count: 5 }, icon: 'assets/badges/nitro/Nitro_Ruby.webp', hoverIcon: 'assets/badges/hover/nitro/Nitro_Ruby.webp' },
        { key: 'opal', months: 72, rarity: 5, milestone: { unit: 'year', count: 6, plus: true }, icon: 'assets/badges/nitro/Nitro_Opal.webp', hoverIcon: 'assets/badges/hover/nitro/Nitro_Opal.webp' }
    ];

    function getNitroTierIndexFromMonths(months) {
        for (let i = NITRO_TIERS.length - 1; i >= 0; i--) {
            if (months >= NITRO_TIERS[i].months) return i;
        }
        return 0;
    }

    function getNitroBadgeInfo(acc, invItem = null, profileBadge = null) {
        if (!acc) return null;
        const badges = acc.badges || [];
        const nitroBadge = profileBadge || badges.find(b => b && isNitroBadgeId(b.id));

        if (!invItem && (!acc.premium_type || acc.premium_type === 0) && !nitroBadge) {
            return null;
        }

        let sinceDate = acc.premium_since || (invItem && invItem.obtained_at) || null;
        if (!sinceDate && nitroBadge && nitroBadge.description) {
            sinceDate = extractDateFromDescription(nitroBadge.description);
        }

        const parsedStart = sinceDate ? new Date(sinceDate) : null;
        const validStart = (parsedStart && !isNaN(parsedStart.getTime())) ? parsedStart : null;

        let tierIdx = -1;
        if (invItem && invItem.tier) {
            const key = invItem.tier === 'basic' ? 'starter' : invItem.tier;
            tierIdx = NITRO_TIERS.findIndex(t => t.key === key);
        }
        if (tierIdx === -1 && nitroBadge && nitroBadge.id) {
            const id = nitroBadge.id;
            if (id.startsWith('nitro_')) {
                const rawKey = id.slice(6);
                const key = rawKey === 'basic' ? 'starter' : rawKey;
                tierIdx = NITRO_TIERS.findIndex(t => t.key === key);
            } else {
                const tenureMatch = id.match(/^premium_tenure_(\d+)_month/);
                if (tenureMatch) {
                    tierIdx = getNitroTierIndexFromMonths(parseInt(tenureMatch[1], 10));
                }
            }
        }
        if (tierIdx === -1 && validStart) {
            tierIdx = getNitroTierIndexFromMonths(getCalendarDiffMonths(validStart));
        }
        if (tierIdx === -1) tierIdx = 0;

        const currentTier = NITRO_TIERS[tierIdx];

        let dateText = getTranslation('badge.nitroSubscriber');
        if (validStart) {
            const formattedDate = formatBadgeSlashDate(validStart);
            dateText = getTranslation('badge.subscriberSince').replace('{date}', formattedDate);
        } else if (nitroBadge && nitroBadge.description) {
            dateText = nitroBadge.description;
        }

        const unlockedSource = (invItem && invItem.tier_unlocked_at)
            || (validStart && currentTier.months > 0 ? addCalendarMonths(validStart, currentTier.months) : null)
            || (invItem && invItem.obtained_at)
            || validStart;
        const unlockedStr = formatBadgeUnlockedDate(unlockedSource);
        const detailMeta = unlockedStr
            ? `${dateText} • ${getTranslation('badge.unlockedAt').replace('{date}', unlockedStr)}`
            : dateText;

        const progress = computeTimeBadgeProgress(invItem, validStart, tierIdx, NITRO_TIERS);
        const tiers = NITRO_TIERS.map((t, i) => ({
            key: t.key,
            label: getTranslation(`badge.tier.nitro.${t.key}`),
            milestoneText: t.milestone ? formatMilestoneText(t.milestone.unit, t.milestone.count, !!t.milestone.plus) : '',
            icon: t.icon,
            unlocked: i <= tierIdx,
            isCurrent: i === tierIdx
        }));

        const tierLabel = getTranslation(`badge.tier.nitro.${currentTier.key}`);
        const hoverTitle = `${getTranslation('badge.nitroTitle')} ${tierLabel}`.trim();

        return {
            id: 'nitro',
            icon: currentTier.icon,
            hoverIcon: currentTier.hoverIcon,
            isNitroComplex: true,
            hidden: !!(invItem && invItem.hidden),
            name: dateText,
            familyTitle: '',
            hoverTitle,
            titleItalic: true,
            hoverSubtitle: dateText,
            detailMeta,
            rarity: (invItem && typeof invItem.rarity === 'number') ? invItem.rarity : currentTier.rarity,
            isLegacy: false,
            description: progress.isMaxed ? getTranslation('badge.maxedDesc') : getTranslation('badge.desc.nitro'),
            progress,
            tiers
        };
    }

    const BOOSTER_TIERS = [
        { level: 1, key: 'level_1', months: 1, rarity: 1, icon: 'assets/badges/booster/Guild_Booster_Level_1.webp' },
        { level: 2, key: 'level_2', months: 2, rarity: 2, icon: 'assets/badges/booster/Guild_Booster_Level_2.webp' },
        { level: 3, key: 'level_3', months: 3, rarity: 2, icon: 'assets/badges/booster/Guild_Booster_Level_3.webp' },
        { level: 4, key: 'level_4', months: 6, rarity: 2, icon: 'assets/badges/booster/Guild_Booster_Level_4.webp' },
        { level: 5, key: 'level_5', months: 9, rarity: 3, icon: 'assets/badges/booster/Guild_Booster_Level_5.webp' },
        { level: 6, key: 'level_6', months: 12, rarity: 3, icon: 'assets/badges/booster/Guild_Booster_Level_6.webp' },
        { level: 7, key: 'level_7', months: 15, rarity: 3, icon: 'assets/badges/booster/Guild_Booster_Level_7.webp' },
        { level: 8, key: 'level_8', months: 18, rarity: 3, icon: 'assets/badges/booster/Guild_Booster_Level_8.webp' },
        { level: 9, key: 'level_9', months: 24, rarity: 5, plus: true, icon: 'assets/badges/booster/Guild_Booster_Level_9.webp' }
    ];

    function getBoosterBadgeInfo(acc, invItem = null, profileBadge = null) {
        if (!acc) return null;
        const badges = acc.badges || [];
        const boosterBadge = profileBadge || badges.find(b => b && isBoosterBadgeId(b.id));

        if (!invItem && !boosterBadge && !acc.premium_guild_since) return null;

        let tierIdx = -1;
        if (invItem && invItem.tier) {
            const tierMatch = String(invItem.tier).match(/^level_(\d+)/);
            if (tierMatch) {
                const lvl = parseInt(tierMatch[1], 10);
                if (lvl >= 1 && lvl <= BOOSTER_TIERS.length) tierIdx = lvl - 1;
            }
        }
        if (tierIdx === -1 && invItem && invItem.tier_idx >= 1 && invItem.tier_idx <= BOOSTER_TIERS.length) {
            tierIdx = invItem.tier_idx - 1;
        }
        if (tierIdx === -1 && boosterBadge && boosterBadge.id) {
            const lvlMatch = boosterBadge.id.match(/guild_booster_lvl(\d+)/);
            if (lvlMatch) {
                const lvl = parseInt(lvlMatch[1], 10);
                if (lvl >= 1 && lvl <= BOOSTER_TIERS.length) tierIdx = lvl - 1;
            }
        }

        let sinceDate = acc.premium_guild_since || (invItem && invItem.obtained_at) || null;
        if (!sinceDate && boosterBadge && boosterBadge.description) {
            sinceDate = extractDateFromDescription(boosterBadge.description);
        }

        const parsedStart = sinceDate ? new Date(sinceDate) : null;
        const validStart = (parsedStart && !isNaN(parsedStart.getTime())) ? parsedStart : null;

        if (tierIdx === -1 && validStart) {
            const months = getCalendarDiffMonths(validStart);
            for (let i = BOOSTER_TIERS.length - 1; i >= 0; i--) {
                if (months >= BOOSTER_TIERS[i].months) {
                    tierIdx = i;
                    break;
                }
            }
            if (tierIdx === -1) tierIdx = 0;
        }
        if (tierIdx === -1 && (invItem || boosterBadge)) {
            tierIdx = 0;
        }
        if (tierIdx === -1) return null;

        const currentTier = BOOSTER_TIERS[tierIdx];

        let dateText = getTranslation('badge.boosterSubscriber');
        if (validStart) {
            const formattedDate = formatBadgeSlashDate(validStart);
            dateText = getTranslation('badge.boosterSince').replace('{date}', formattedDate);
        } else if (boosterBadge && boosterBadge.description) {
            dateText = boosterBadge.description;
        }

        const unlockedSource = (invItem && invItem.tier_unlocked_at)
            || (validStart ? addCalendarMonths(validStart, currentTier.months) : null)
            || (invItem && invItem.obtained_at);
        const unlockedStr = formatBadgeUnlockedDate(unlockedSource);
        const detailMeta = unlockedStr
            ? `${dateText} • ${getTranslation('badge.unlockedAt').replace('{date}', unlockedStr)}`
            : dateText;

        const progress = computeTimeBadgeProgress(invItem, validStart, tierIdx, BOOSTER_TIERS);
        const tiers = BOOSTER_TIERS.map((t, i) => ({
            key: t.key,
            label: '',
            milestoneText: formatMilestoneText('month', t.months, !!t.plus),
            icon: t.icon,
            unlocked: i <= tierIdx,
            isCurrent: i === tierIdx
        }));

        return {
            id: 'booster',
            icon: currentTier.icon,
            hoverIcon: currentTier.icon,
            hidden: !!(invItem && invItem.hidden),
            name: dateText,
            familyTitle: '',
            hoverTitle: getTranslation('badge.serverBoosting'),
            titleItalic: false,
            hoverSubtitle: dateText,
            detailMeta,
            rarity: (invItem && typeof invItem.rarity === 'number') ? invItem.rarity : currentTier.rarity,
            isLegacy: false,
            description: progress.isMaxed ? getTranslation('badge.maxedDesc') : getTranslation('badge.desc.booster'),
            progress,
            tiers
        };
    }

    const GIFTING_TIERS = [
        {
            tier: 6,
            key: '1506325268141314208',
            tierKey: 'legend',
            minGifts: 20,
            plus: true,
            rarity: 5,
            name: 'Legend',
            iconHash: '7fe346cfc5da1340087d8759a9e7a395',
            idPatterns: ['legend', 'gifting_legend', 'efsane', 'gifter_6', 'gifter_20', 'gifting_tier_6', 'gifting_20'],
            descPatterns: ['legend', 'efsane', '20x', '20 hediye', '20 gift'],
            icon: 'assets/badges/gifting/Gifting_Legend.webp',
            hoverIcon: 'assets/badges/hover/gifting/Gifting_Legend.webp',
            titleKey: 'badge.giftingLegend'
        },
        {
            tier: 5,
            key: '1506325197932990504',
            tierKey: 'hero',
            minGifts: 10,
            rarity: 3,
            name: 'Hero',
            iconHash: '77d65b1f210014a11eb1582ee06ab684',
            idPatterns: ['hero', 'gifting_hero', 'kahraman', 'gifter_5', 'gifter_10', 'gifting_tier_5', 'gifting_10'],
            descPatterns: ['hero', 'kahraman', '10x', '10 hediye', '10 gift'],
            icon: 'assets/badges/gifting/Gifting_Hero.webp',
            hoverIcon: 'assets/badges/hover/gifting/Gifting_Hero.webp',
            titleKey: 'badge.giftingHero'
        },
        {
            tier: 4,
            key: '1495878436579840091',
            tierKey: 'icon',
            minGifts: 6,
            rarity: 3,
            name: 'Icon',
            iconHash: '64f2413c9b9803661322aaad25826b62',
            idPatterns: ['icon', 'gifting_icon', 'ikon', 'gifter_4', 'gifter_6', 'gifting_tier_4', 'gifting_6'],
            descPatterns: ['icon', 'ikon', '6x', '6 hediye', '6 gift'],
            icon: 'assets/badges/gifting/Gifting_Icon.webp',
            hoverIcon: 'assets/badges/hover/gifting/Gifting_Icon.webp',
            titleKey: 'badge.giftingIcon'
        },
        {
            tier: 3,
            key: '1495878394632474785',
            tierKey: 'luminary',
            minGifts: 3,
            rarity: 2,
            name: 'Luminary',
            iconHash: '3119f5504b2cd09576a323908c7c3517',
            idPatterns: ['luminary', 'gifting_luminary', 'bilge', 'gifter_3', 'gifting_tier_3', 'gifting_3'],
            descPatterns: ['luminary', 'bilge', '3x', '3 hediye', '3 gift'],
            icon: 'assets/badges/gifting/Gifting_Luminary.webp',
            hoverIcon: 'assets/badges/hover/gifting/Gifting_Luminary.webp',
            titleKey: 'badge.giftingLuminary'
        },
        {
            tier: 2,
            key: '1495878348587536515',
            tierKey: 'champion',
            minGifts: 2,
            rarity: 2,
            name: 'Champion',
            iconHash: '8b7792c4f65953d3ff564f23429cb79e',
            idPatterns: ['champion', 'gifting_champion', 'sampiyon', 'şampiyon', 'gifter_2', 'gifting_tier_2', 'gifting_2'],
            descPatterns: ['champion', 'şampiyon', 'sampiyon', '2x', '2 hediye', '2 gift'],
            icon: 'assets/badges/gifting/Gifting_Champion.webp',
            hoverIcon: 'assets/badges/hover/gifting/Gifting_Champion.webp',
            titleKey: 'badge.giftingChampion'
        },
        {
            tier: 1,
            key: '1495878284498440192',
            tierKey: 'patron',
            minGifts: 1,
            rarity: 2,
            name: 'Patron',
            iconHash: 'ac305d1b9481f312ce4419e7f8296558',
            idPatterns: ['patron', 'gifting_patron', 'destekçi', 'destekci', 'gifter_1', 'gifting_tier_1', 'gifting_1'],
            descPatterns: ['patron', 'destekçi', 'destekci', '1x', '1 hediye', '1 gift'],
            icon: 'assets/badges/gifting/Gifting_Patron.webp',
            hoverIcon: 'assets/badges/hover/gifting/Gifting_Patron.webp',
            titleKey: 'badge.giftingPatron'
        }
    ];

    const GIFTING_TIERS_ASC = [...GIFTING_TIERS].reverse().map(t => ({ ...t, min: t.minGifts }));

    function formatGiftingBadgeName(baseName, count) {
        return count > 0 ? `${baseName} (${formatBadgeUnit('gift', count)})` : baseName;
    }

    function getGiftingBadgeInfo(acc, invItem = null, profileBadge = null) {
        if (!acc) return null;

        const tier = (invItem && invItem.tier_idx) ? invItem.tier_idx : (acc.gifting_tier || 0);
        const count = (invItem && typeof invItem.current === 'number') ? invItem.current : (acc.gifting_count || 0);

        let def = null;
        if (invItem && invItem.tier) {
            def = GIFTING_TIERS.find(t => t.key === invItem.tier) || null;
        }
        if (!def && tier >= 1) {
            def = GIFTING_TIERS.find(t => t.tier === tier) || null;
        }
        if (!def && count >= 1) {
            def = GIFTING_TIERS.find(t => count >= t.minGifts) || null;
        }

        let matched = null;
        if (!def) {
            const badges = profileBadge ? [profileBadge] : (acc.badges || []);
            for (const candidate of GIFTING_TIERS) {
                matched = badges.find(b => {
                    if (!b) return false;
                    if (b.tier === candidate.tier) return true;
                    if (b.icon && b.icon.includes(candidate.iconHash)) return true;
                    if (b.id) {
                        const idLower = b.id.toLowerCase();
                        if (candidate.idPatterns.some(p => idLower === p || idLower.includes(p))) return true;
                    }
                    if (b.description) {
                        const descLower = b.description.toLowerCase();
                        if (candidate.descPatterns.some(p => descLower.includes(p))) return true;
                    }
                    return false;
                });
                if (matched) {
                    def = candidate;
                    break;
                }
            }
        }

        if (!def && (invItem || (profileBadge && profileBadge.id === 'gifting'))) {
            def = GIFTING_TIERS[GIFTING_TIERS.length - 1];
        }
        if (!def) return null;

        const currentIdx = GIFTING_TIERS_ASC.findIndex(t => t.tier === def.tier);
        const resolvedCount = count > 0 ? count : def.minGifts;
        const baseName = getTranslation(def.titleKey) || (matched && matched.description) || def.name;
        const tierShortName = getTranslation(`badge.tier.gifting.${def.tierKey}`) || def.name;
        const subLine = resolvedCount > 0
            ? getTranslation('badge.sub.giftingGiven').replace('{unit}', formatBadgeUnit('gift', resolvedCount))
            : tierShortName;

        const unlockedStr = formatBadgeUnlockedDate(invItem && (invItem.tier_unlocked_at || invItem.obtained_at));
        const detailMeta = unlockedStr
            ? `${subLine} • ${getTranslation('badge.unlockedAt').replace('{date}', unlockedStr)}`
            : subLine;

        const progress = computeCountBadgeProgress('gift', GIFTING_TIERS_ASC, currentIdx, resolvedCount, invItem, null);
        const tiers = GIFTING_TIERS_ASC.map((t, i) => ({
            key: t.key,
            label: getTranslation(`badge.tier.gifting.${t.tierKey}`),
            milestoneText: formatMilestoneText('gift', t.minGifts, !!t.plus),
            icon: t.icon,
            unlocked: i <= currentIdx,
            isCurrent: i === currentIdx
        }));

        return {
            id: 'gifting',
            icon: def.icon,
            hoverIcon: def.hoverIcon,
            hidden: !!(invItem && invItem.hidden),
            name: formatGiftingBadgeName(baseName, count),
            familyTitle: getTranslation('badge.gifting'),
            hoverTitle: tierShortName,
            titleItalic: false,
            hoverSubtitle: subLine,
            detailMeta,
            rarity: (invItem && typeof invItem.rarity === 'number') ? invItem.rarity : def.rarity,
            isLegacy: false,
            description: progress.isMaxed ? getTranslation('badge.maxedDesc') : getTranslation('badge.desc.gifting'),
            progress,
            tiers
        };
    }

    const PROGRESSIVE_BADGE_REGISTRY = [
        {
            badgeIdNum: 18,
            profileId: 'account_age',
            titleKey: 'badge.accountAge',
            tierPrefix: 'badge.tier.accountAge',
            unit: 'age',
            milestoneUnit: 'year',
            descKey: 'badge.desc.accountAge',
            tiers: [
                { key: 'one_year', min: 1, rarity: 1, icon: 'assets/badges/account-age/Account_Age_1_Seed.webp', hoverIcon: 'assets/badges/hover/account-age/Account_Age_1_Seed.webp' },
                { key: 'two_years', min: 2, rarity: 1, icon: 'assets/badges/account-age/Account_Age_2_Sprout.webp', hoverIcon: 'assets/badges/hover/account-age/Account_Age_2_Sprout.webp' },
                { key: 'three_years', min: 3, rarity: 1, icon: 'assets/badges/account-age/Account_Age_3_Sapling.webp', hoverIcon: 'assets/badges/hover/account-age/Account_Age_3_Sapling.webp' },
                { key: 'four_years', min: 4, rarity: 1, icon: 'assets/badges/account-age/Account_Age_4_Bud.webp', hoverIcon: 'assets/badges/hover/account-age/Account_Age_4_Bud.webp' },
                { key: 'five_years', min: 5, rarity: 1, icon: 'assets/badges/account-age/Account_Age_5_Blossom.webp', hoverIcon: 'assets/badges/hover/account-age/Account_Age_5_Blossom.webp' },
                { key: 'six_years', min: 6, rarity: 2, icon: 'assets/badges/account-age/Account_Age_6_Redwood.webp', hoverIcon: 'assets/badges/hover/account-age/Account_Age_6_Redwood.webp' },
                { key: 'seven_years', min: 7, rarity: 2, icon: 'assets/badges/account-age/Account_Age_7_Sequoia.webp', hoverIcon: 'assets/badges/hover/account-age/Account_Age_7_Sequoia.webp' },
                { key: 'eight_years', min: 8, rarity: 2, icon: 'assets/badges/account-age/Account_Age_8_Bristlecone.webp', hoverIcon: 'assets/badges/hover/account-age/Account_Age_8_Bristlecone.webp' },
                { key: 'nine_years', min: 9, rarity: 3, icon: 'assets/badges/account-age/Account_Age_9_Stromatolite.webp', hoverIcon: 'assets/badges/hover/account-age/Account_Age_9_Stromatolite.webp' },
                { key: 'ten_years', min: 10, rarity: 5, plus: true, icon: 'assets/badges/account-age/Account_Age_10_Primordial.webp', hoverIcon: 'assets/badges/hover/account-age/Account_Age_10_Primordial.webp' }
            ]
        },
        {
            badgeIdNum: 19,
            profileId: 'streaming',
            titleKey: 'badge.streaming',
            tierPrefix: 'badge.tier.streaming',
            unit: 'hour',
            milestoneUnit: 'hour',
            subKey: 'badge.sub.streamingHours',
            descKey: 'badge.desc.streaming',
            tiers: [
                { key: 'newcomer', min: 1, rarity: 1, icon: 'assets/badges/streaming/Streaming_1_Newcomer.webp', hoverIcon: 'assets/badges/hover/streaming/Streaming_1_Newcomer.webp' },
                { key: 'fledgling', min: 5, rarity: 1, icon: 'assets/badges/streaming/Streaming_2_Fledgling.webp', hoverIcon: 'assets/badges/hover/streaming/Streaming_2_Fledgling.webp' },
                { key: 'breakout', min: 20, rarity: 1, icon: 'assets/badges/streaming/Streaming_3_Breakout.webp', hoverIcon: 'assets/badges/hover/streaming/Streaming_3_Breakout.webp' },
                { key: 'standout', min: 75, rarity: 1, icon: 'assets/badges/streaming/Streaming_4_Standout.webp', hoverIcon: 'assets/badges/hover/streaming/Streaming_4_Standout.webp' },
                { key: 'trendsetter', min: 150, rarity: 2, icon: 'assets/badges/streaming/Streaming_5_Trendsetter.webp', hoverIcon: 'assets/badges/hover/streaming/Streaming_5_Trendsetter.webp' },
                { key: 'headliner', min: 300, rarity: 2, icon: 'assets/badges/streaming/Streaming_6_Headliner.webp', hoverIcon: 'assets/badges/hover/streaming/Streaming_6_Headliner.webp' },
                { key: 'star', min: 500, rarity: 2, icon: 'assets/badges/streaming/Streaming_7_Star.webp', hoverIcon: 'assets/badges/hover/streaming/Streaming_7_Star.webp' },
                { key: 'sensation', min: 1000, rarity: 3, icon: 'assets/badges/streaming/Streaming_8_Sensation.webp', hoverIcon: 'assets/badges/hover/streaming/Streaming_8_Sensation.webp' },
                { key: 'visionary', min: 2000, rarity: 3, icon: 'assets/badges/streaming/Streaming_9_Visionary.webp', hoverIcon: 'assets/badges/hover/streaming/Streaming_9_Visionary.webp' },
                { key: 'phenomenon', min: 5000, rarity: 5, plus: true, icon: 'assets/badges/streaming/Streaming_10_Phenomenon.webp', hoverIcon: 'assets/badges/hover/streaming/Streaming_10_Phenomenon.webp' }
            ]
        },
        {
            badgeIdNum: 20,
            profileId: 'game_time',
            titleKey: 'badge.gameTime',
            tierPrefix: 'badge.tier.gameTime',
            unit: 'hour',
            milestoneUnit: 'hour',
            subKey: 'badge.sub.gameTimeHours',
            descKey: 'badge.desc.gameTime',
            tiers: [
                { key: 'casual', min: 1, rarity: 1, icon: 'assets/badges/game-time/Game_Time_1_Casual.webp', hoverIcon: 'assets/badges/hover/game-time/Game_Time_1_Casual.webp' },
                { key: 'recreational', min: 5, rarity: 1, icon: 'assets/badges/game-time/Game_Time_2_Recreational.webp', hoverIcon: 'assets/badges/hover/game-time/Game_Time_2_Recreational.webp' },
                { key: 'dedicated', min: 20, rarity: 1, icon: 'assets/badges/game-time/Game_Time_3_Dedicated.webp', hoverIcon: 'assets/badges/hover/game-time/Game_Time_3_Dedicated.webp' },
                { key: 'committed', min: 75, rarity: 1, icon: 'assets/badges/game-time/Game_Time_4_Committed.webp', hoverIcon: 'assets/badges/hover/game-time/Game_Time_4_Committed.webp' },
                { key: 'serious', min: 150, rarity: 2, icon: 'assets/badges/game-time/Game_Time_5_Serious.webp', hoverIcon: 'assets/badges/hover/game-time/Game_Time_5_Serious.webp' },
                { key: 'devoted', min: 300, rarity: 2, icon: 'assets/badges/game-time/Game_Time_6_Devoted.webp', hoverIcon: 'assets/badges/hover/game-time/Game_Time_6_Devoted.webp' },
                { key: 'seasoned', min: 500, rarity: 2, icon: 'assets/badges/game-time/Game_Time_7_Seasoned.webp', hoverIcon: 'assets/badges/hover/game-time/Game_Time_7_Seasoned.webp' },
                { key: 'ironclad', min: 1000, rarity: 3, icon: 'assets/badges/game-time/Game_Time_8_Ironclad.webp', hoverIcon: 'assets/badges/hover/game-time/Game_Time_8_Ironclad.webp' },
                { key: 'unshakeable', min: 2000, rarity: 3, icon: 'assets/badges/game-time/Game_Time_9_Unshakeable.webp', hoverIcon: 'assets/badges/hover/game-time/Game_Time_9_Unshakeable.webp' },
                { key: 'eternal', min: 5000, rarity: 5, plus: true, icon: 'assets/badges/game-time/Game_Time_10_Eternal.webp', hoverIcon: 'assets/badges/hover/game-time/Game_Time_10_Eternal.webp' }
            ]
        },
        {
            badgeIdNum: 21,
            profileId: 'game_variety',
            titleKey: 'badge.gameVariety',
            tierPrefix: 'badge.tier.gameVariety',
            unit: 'game',
            milestoneUnit: 'game',
            subKey: 'badge.sub.gameVarietyCount',
            descKey: 'badge.desc.gameVariety',
            tiers: [
                { key: 'sampler', min: 2, rarity: 1, icon: 'assets/badges/game-variety/Game_Variety_1_Sampler.webp', hoverIcon: 'assets/badges/hover/game-variety/Game_Variety_1_Sampler.webp' },
                { key: 'dabbler', min: 5, rarity: 1, icon: 'assets/badges/game-variety/Game_Variety_2_Dabbler.webp', hoverIcon: 'assets/badges/hover/game-variety/Game_Variety_2_Dabbler.webp' },
                { key: 'enthusiast', min: 10, rarity: 1, icon: 'assets/badges/game-variety/Game_Variety_3_Enthusiast.webp', hoverIcon: 'assets/badges/hover/game-variety/Game_Variety_3_Enthusiast.webp' },
                { key: 'ranger', min: 15, rarity: 1, icon: 'assets/badges/game-variety/Game_Variety_4_Ranger.webp', hoverIcon: 'assets/badges/hover/game-variety/Game_Variety_4_Ranger.webp' },
                { key: 'explorer', min: 20, rarity: 2, icon: 'assets/badges/game-variety/Game_Variety_5_Explorer.webp', hoverIcon: 'assets/badges/hover/game-variety/Game_Variety_5_Explorer.webp' },
                { key: 'adventurer', min: 30, rarity: 2, icon: 'assets/badges/game-variety/Game_Variety_6_Adventurer.webp', hoverIcon: 'assets/badges/hover/game-variety/Game_Variety_6_Adventurer.webp' },
                { key: 'voyager', min: 40, rarity: 2, icon: 'assets/badges/game-variety/Game_Variety_7_Voyager.webp', hoverIcon: 'assets/badges/hover/game-variety/Game_Variety_7_Voyager.webp' },
                { key: 'maverick', min: 60, rarity: 3, icon: 'assets/badges/game-variety/Game_Variety_8_Maverick.webp', hoverIcon: 'assets/badges/hover/game-variety/Game_Variety_8_Maverick.webp' },
                { key: 'polymath', min: 80, rarity: 3, icon: 'assets/badges/game-variety/Game_Variety_9_Polymath.webp', hoverIcon: 'assets/badges/hover/game-variety/Game_Variety_9_Polymath.webp' },
                { key: 'universalist', min: 100, rarity: 5, plus: true, icon: 'assets/badges/game-variety/Game_Variety_10_Universalist.webp', hoverIcon: 'assets/badges/hover/game-variety/Game_Variety_10_Universalist.webp' }
            ]
        }
    ];

    function getProgressiveBadgeInfo(def, acc, invItem = null) {
        if (!def) return null;

        let tierIdx = -1;
        if (invItem && invItem.tier) {
            tierIdx = def.tiers.findIndex(t => t.key === invItem.tier);
        }
        if (tierIdx === -1 && invItem && invItem.tier_idx >= 1 && invItem.tier_idx <= def.tiers.length) {
            tierIdx = invItem.tier_idx - 1;
        }

        let ageDiff = null;
        let createdDate = null;
        if (def.unit === 'age') {
            createdDate = getAccountCreatedDateForBadge(acc, invItem);
            if (createdDate) {
                ageDiff = getCalendarYearsMonths(createdDate);
                if (tierIdx === -1 && ageDiff.years >= 1) {
                    tierIdx = Math.min(def.tiers.length, ageDiff.years) - 1;
                }
            }
        } else if (tierIdx === -1 && invItem && typeof invItem.current === 'number') {
            for (let i = def.tiers.length - 1; i >= 0; i--) {
                if (invItem.current >= def.tiers[i].min) {
                    tierIdx = i;
                    break;
                }
            }
        }

        const hasResolvedTier = tierIdx !== -1;
        const activeIdx = hasResolvedTier ? tierIdx : 0;
        const resolvedTier = def.tiers[activeIdx];
        const familyName = getTranslation(def.titleKey);
        const tierName = hasResolvedTier ? getTranslation(`${def.tierPrefix}.${resolvedTier.key}`) : '';

        let detailText = '';
        let subLine = '';
        if (def.unit === 'age') {
            if (ageDiff && (ageDiff.years > 0 || ageDiff.months > 0)) {
                const parts = [];
                if (ageDiff.years > 0) parts.push(formatBadgeUnit('year', ageDiff.years));
                if (ageDiff.months > 0) parts.push(formatBadgeUnit('month', ageDiff.months));
                detailText = parts.join(', ');
                subLine = detailText;
            }
        } else if (invItem && typeof invItem.current === 'number') {
            detailText = formatBadgeUnit(def.unit, invItem.current);
            if (def.subKey) {
                subLine = getTranslation(def.subKey).replace('{unit}', detailText);
            } else {
                subLine = detailText;
            }
        }

        let name = tierName ? `${familyName} • ${tierName}` : familyName;
        if (detailText) {
            name += ` (${detailText})`;
        }

        let unlockedDateSrc = invItem && invItem.tier_unlocked_at;
        if (!unlockedDateSrc && def.unit === 'age' && createdDate) {
            unlockedDateSrc = addCalendarMonths(createdDate, resolvedTier.min * 12);
        }
        if (!unlockedDateSrc && invItem && invItem.obtained_at) {
            unlockedDateSrc = invItem.obtained_at;
        }
        const unlockedStr = formatBadgeUnlockedDate(unlockedDateSrc);
        let detailMeta = subLine || familyName;
        if (unlockedStr) {
            detailMeta = subLine
                ? `${subLine} • ${getTranslation('badge.unlockedAt').replace('{date}', unlockedStr)}`
                : getTranslation('badge.unlockedAt').replace('{date}', unlockedStr);
        }

        const curVal = (invItem && typeof invItem.current === 'number') ? invItem.current : resolvedTier.min;
        const progress = computeCountBadgeProgress(def.unit, def.tiers, activeIdx, curVal, invItem, createdDate);
        const tiers = def.tiers.map((t, i) => ({
            key: t.key,
            label: getTranslation(`${def.tierPrefix}.${t.key}`),
            milestoneText: formatMilestoneText(def.milestoneUnit, t.min, !!t.plus),
            icon: t.icon,
            unlocked: i <= activeIdx,
            isCurrent: i === activeIdx
        }));

        return {
            id: def.profileId,
            icon: resolvedTier.icon,
            hoverIcon: resolvedTier.hoverIcon || resolvedTier.icon,
            hidden: !!(invItem && invItem.hidden),
            name: name,
            familyTitle: tierName ? familyName : '',
            hoverTitle: tierName || familyName,
            titleItalic: false,
            hoverSubtitle: subLine || familyName,
            detailMeta,
            rarity: (invItem && typeof invItem.rarity === 'number') ? invItem.rarity : resolvedTier.rarity,
            isLegacy: false,
            description: progress.isMaxed ? getTranslation('badge.maxedDesc') : getTranslation(def.descKey),
            progress,
            tiers
        };
    }

    const STATIC_BADGE_REGISTRY = [
        {
            flag: 1,
            badgeIdNum: 22,
            badgeId: 'staff',
            icon: 'assets/badges/general/Discord_Staff.webp',
            titleKey: 'badge.staff',
            rarity: 5,
            isLegacy: true,
            subKey: 'badge.sub.staff',
            metaKey: 'badge.meta.iykyk',
            descKey: 'badge.desc.staff'
        },
        {
            flag: 2,
            badgeIdNum: 2,
            badgeId: 'partner',
            icon: 'assets/badges/general/Partnered_Server_Owner.webp',
            titleKey: 'badge.partner',
            rarity: 5,
            isLegacy: true,
            subKey: 'badge.sub.partner',
            metaKey: 'badge.meta.iykyk',
            descKey: 'badge.desc.partner'
        },
        {
            flag: 4,
            badgeIdNum: 4,
            badgeId: 'hypesquad',
            icon: 'assets/badges/general/Hypesquad_Events.webp',
            titleKey: 'badge.hypesquadEvents',
            rarity: 5,
            isLegacy: true,
            subKey: 'badge.sub.hypesquadEvents',
            metaKey: 'badge.meta.iykyk',
            descKey: 'badge.desc.hypesquadEvents'
        },
        {
            flag: 8,
            badgeIdNum: 8,
            badgeId: 'bug_hunter_level_1',
            icon: 'assets/badges/general/Bug_Hunter.webp',
            titleKey: 'badge.bugHunter1',
            rarity: 5,
            isLegacy: true,
            subKey: 'badge.sub.bugHunter',
            metaKey: 'badge.meta.iykyk',
            descKey: 'badge.desc.bugHunter1'
        },
        {
            flag: 16384,
            badgeIdNum: 9,
            badgeId: 'bug_hunter_level_2',
            icon: 'assets/badges/general/Bug_Hunter_Gold.webp',
            titleKey: 'badge.bugHunter2',
            rarity: 5,
            isLegacy: true,
            subKey: 'badge.sub.bugHunter',
            metaKey: 'badge.meta.iykyk',
            descKey: 'badge.desc.bugHunter2'
        },
        {
            flag: 64,
            badgeIdNum: 5,
            badgeId: 'hypesquad_house_1',
            icon: 'assets/badges/general/Hypesquad_Bravery.webp',
            titleKey: 'badge.hypesquadBravery',
            rarity: 2,
            isLegacy: true,
            subKey: 'badge.sub.hypesquadBravery',
            metaKey: 'badge.meta.iykyk',
            descKey: 'badge.desc.hypesquadBravery'
        },
        {
            flag: 128,
            badgeIdNum: 6,
            badgeId: 'hypesquad_house_2',
            icon: 'assets/badges/general/Hypesquad_Brilliance.webp',
            titleKey: 'badge.hypesquadBrilliance',
            rarity: 2,
            isLegacy: true,
            subKey: 'badge.sub.hypesquadBrilliance',
            metaKey: 'badge.meta.iykyk',
            descKey: 'badge.desc.hypesquadBrilliance'
        },
        {
            flag: 256,
            badgeIdNum: 7,
            badgeId: 'hypesquad_house_3',
            icon: 'assets/badges/general/Hypesquad_Balance.webp',
            titleKey: 'badge.hypesquadBalance',
            rarity: 2,
            isLegacy: true,
            subKey: 'badge.sub.hypesquadBalance',
            metaKey: 'badge.meta.iykyk',
            descKey: 'badge.desc.hypesquadBalance'
        },
        {
            flag: 512,
            badgeIdNum: 11,
            badgeId: 'early_supporter',
            icon: 'assets/badges/general/Early_Supporter.webp',
            titleKey: 'badge.earlySupporter',
            rarity: 5,
            isLegacy: true,
            subKey: 'badge.sub.earlySupporter',
            metaKey: 'badge.meta.veryEarly',
            descKey: 'badge.desc.earlySupporter'
        },
        {
            flag: 131072,
            badgeIdNum: 10,
            badgeId: 'verified_developer',
            altBadgeId: 'early_verified_bot_developer',
            icon: 'assets/badges/general/Early_Verified_Bot_Developer.webp',
            titleKey: 'badge.verifiedDev',
            rarity: 5,
            isLegacy: true,
            subKey: 'badge.sub.verifiedDev',
            metaKey: 'badge.meta.veryEarly',
            descKey: 'badge.desc.verifiedDev'
        },
        {
            flag: 262144,
            badgeIdNum: 3,
            badgeId: 'certified_moderator',
            altBadgeId: 'moderator_programs_alumni',
            icon: 'assets/badges/general/Moderator_Program_Alumni.webp',
            titleKey: 'badge.modAlumni',
            rarity: 5,
            isLegacy: true,
            subKey: 'badge.sub.modAlumni',
            metaKey: 'badge.meta.iykyk',
            descKey: 'badge.desc.modAlumni'
        },
        {
            badgeIdNum: 14,
            badgeId: 'quest_completed',
            icon: 'assets/badges/general/Quest_Completed.webp',
            titleKey: 'badge.questsTitle',
            tooltipKey: 'badge.questCompleted',
            rarity: 1,
            isLegacy: false,
            descKey: 'badge.desc.quests'
        },
        {
            badgeIdNum: 16,
            badgeId: 'orb_profile_badge',
            altBadgeId: 'orbs_apprentice',
            icon: 'assets/badges/general/Orbs_Apprentice.webp',
            titleKey: 'badge.orbsApprentice',
            rarity: 1,
            isLegacy: false,
            subKey: 'badge.sub.orbsBeginning',
            descKey: 'badge.desc.orbsApprentice'
        },
        {
            badgeIdNum: 15,
            badgeId: 'april_fools_2026',
            icon: 'assets/badges/general/Last_Meadow_Online.webp',
            titleKey: 'badge.lastMeadowTitle',
            tooltipKey: 'badge.lastMeadowOnline',
            rarity: 1,
            isLegacy: true,
            metaKey: 'badge.meta.april2026',
            descKey: 'badge.desc.lastMeadow'
        }
    ];

    function getStaticBadgeInfo(def, matchedProfileBadge, invItem = null) {
        const displayTitle = getTranslation(def.titleKey);
        let legacyTooltip = getTranslation(def.tooltipKey || def.titleKey);
        if (matchedProfileBadge && matchedProfileBadge.description && def.badgeId === 'april_fools_2026') {
            legacyTooltip = `${legacyTooltip} (${matchedProfileBadge.description})`;
        }

        let hoverSubtitle = def.subKey ? getTranslation(def.subKey) : displayTitle;
        let detailMeta = hoverSubtitle;

        if (def.badgeId === 'quest_completed') {
            const count = (invItem && typeof invItem.current === 'number') ? invItem.current : null;
            if (count !== null) {
                hoverSubtitle = getTranslation('badge.sub.questsCompleted').replace('{unit}', formatBadgeUnit('quest', count));
                detailMeta = `${hoverSubtitle} • ${getTranslation('badge.unlocked')}`;
            } else {
                hoverSubtitle = getTranslation('badge.unlocked');
                detailMeta = getTranslation('badge.unlocked');
            }
        } else if (def.badgeId === 'april_fools_2026') {
            let level = (invItem && typeof invItem.current === 'number') ? invItem.current : null;
            if (level === null && matchedProfileBadge && matchedProfileBadge.description) {
                const lvlMatch = matchedProfileBadge.description.match(/\d+/);
                if (lvlMatch) level = parseInt(lvlMatch[0], 10);
            }
            hoverSubtitle = level !== null
                ? getTranslation('badge.sub.lastMeadowLevel').replace('{level}', formatBadgeCount(level))
                : ((matchedProfileBadge && matchedProfileBadge.description) || displayTitle);
            detailMeta = def.metaKey ? `${hoverSubtitle} • ${getTranslation(def.metaKey)}` : hoverSubtitle;
        } else if (def.badgeId === 'orb_profile_badge') {
            hoverSubtitle = getTranslation(def.subKey);
            detailMeta = `${hoverSubtitle} • ${getTranslation('badge.unlocked')}`;
        } else {
            detailMeta = def.metaKey ? `${hoverSubtitle} • ${getTranslation(def.metaKey)}` : hoverSubtitle;
        }

        return {
            id: def.badgeId,
            icon: def.icon,
            hoverIcon: def.icon,
            hidden: !!(invItem && invItem.hidden),
            name: legacyTooltip,
            familyTitle: '',
            hoverTitle: displayTitle,
            titleItalic: false,
            hoverSubtitle,
            detailMeta,
            rarity: (invItem && typeof invItem.rarity === 'number') ? invItem.rarity : def.rarity,
            isLegacy: !!def.isLegacy,
            description: getTranslation(def.descKey),
            progress: null,
            tiers: null
        };
    }

    function getLegacyUsernameBadgeInfo(acc, forceShow = false, profileBadge = null, invItem = null) {
        if (!acc) return null;
        const userFlags = acc.public_flags !== undefined && acc.public_flags !== null ? acc.public_flags : (acc.flags || 0);
        const badges = acc.badges || [];
        const legacyBadge = profileBadge || badges.find(b => b && b.id === 'legacy_username');

        const hasLegacy = forceShow || (userFlags & 524288) !== 0 || !!legacyBadge || !!acc.legacy_username;
        if (!hasLegacy) return null;

        let tooltipText = null;
        let shortHandle = null;
        if (acc.legacy_username) {
            shortHandle = acc.legacy_username;
            tooltipText = getTranslation('badge.legacyUsername').replace('{username}', acc.legacy_username);
        } else if (legacyBadge && legacyBadge.description) {
            shortHandle = legacyBadge.description;
            tooltipText = legacyBadge.description;
        } else {
            shortHandle = getTranslation('badge.legacyUsernameDefault');
            tooltipText = shortHandle;
        }

        const title = getTranslation('badge.legacyUsernameDefault');
        const detailMeta = `${shortHandle} • ${getTranslation('badge.meta.veryEarly')}`;

        return {
            id: 'legacy_username',
            icon: 'assets/badges/general/Legacy_Username.webp',
            hoverIcon: 'assets/badges/general/Legacy_Username.webp',
            hidden: !!(invItem && invItem.hidden),
            name: tooltipText,
            familyTitle: '',
            hoverTitle: title,
            titleItalic: false,
            hoverSubtitle: shortHandle,
            detailMeta,
            rarity: (invItem && typeof invItem.rarity === 'number') ? invItem.rarity : 1,
            isLegacy: true,
            description: getTranslation('badge.desc.legacyUsername'),
            progress: null,
            tiers: null
        };
    }

    const HIDDEN_EYE_ICON_SVG = `<svg class="badges-grid-tile-eye" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;
    const TIER_LOCK_ICON_SVG = `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/></svg>`;

    function getBadgeRarityInfo(rarity) {
        if (rarity === 2) {
            return {
                cls: 'rarity-rare',
                label: getTranslation('badge.rarity.rare'),
                icon: `<svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 2.2l6.2 11H1.8z"/></svg>`
            };
        }
        if (rarity === 3) {
            return {
                cls: 'rarity-epic',
                label: getTranslation('badge.rarity.epic'),
                icon: `<svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1l6.5 7L8 15 1.5 8z"/></svg>`
            };
        }
        if (rarity >= 4) {
            return {
                cls: 'rarity-mythic',
                label: getTranslation('badge.rarity.mythic'),
                icon: `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01z"/></svg>`
            };
        }
        return null;
    }

    function renderRarityPillHtml(rarity) {
        const info = getBadgeRarityInfo(rarity);
        if (!info) return '';
        return `<span class="badge-rarity-pill ${info.cls}">${info.icon}<span>${escapeHtml(toBadgeUpper(info.label))}</span></span>`;
    }

    const HOVER_PREVIEW_DELAY_MS = 500;
    const badgeContainerRegistry = new WeakMap();
    let badgeHoverCardEl = null;
    let activeHoverAnchor = null;
    let badgeHoverShowTimer = null;

    function bindBadgeContainerData(containerEl, acc, badgesList) {
        if (!containerEl) return;
        const byId = new Map();
        const list = Array.isArray(badgesList) ? badgesList : [];
        for (const b of list) {
            if (b && b.id) byId.set(b.id, b);
        }
        badgeContainerRegistry.set(containerEl, { acc, badges: list, byId });
    }

    function getOrCreateBadgeHoverCard() {
        if (!badgeHoverCardEl) {
            badgeHoverCardEl = document.createElement('div');
            badgeHoverCardEl.id = 'badgeHoverCard';
            badgeHoverCardEl.className = 'badge-hover-card';
            badgeHoverCardEl.style.display = 'none';
            document.body.appendChild(badgeHoverCardEl);
        }
        return badgeHoverCardEl;
    }

    function showBadgeHoverCard(anchorEl, badge) {
        if (!anchorEl || !badge) return;
        const card = getOrCreateBadgeHoverCard();
        const familyHtml = badge.familyTitle
            ? `<div class="badge-hover-family">${escapeHtml(badge.familyTitle)}</div>`
            : '';
        const titleCls = `badge-display-title badge-hover-title${badge.titleItalic ? ' is-italic' : ''}`;
        const subHtml = badge.hoverSubtitle
            ? `<div class="badge-hover-sub">${escapeHtml(badge.hoverSubtitle)}</div>`
            : '';

        card.innerHTML = `
            <img src="${badge.hoverIcon || badge.icon}" class="badge-hover-art${badge.isNitroComplex ? ' is-nitro-complex' : ''}" alt="">
            ${familyHtml}
            <div class="${titleCls}">${escapeHtml(toBadgeUpper(badge.hoverTitle || badge.name))}</div>
            ${subHtml}
            <span class="badge-hover-caret" aria-hidden="true"></span>
        `;

        card.classList.remove('is-bottom', 'visible');
        card.style.visibility = 'hidden';
        card.style.display = 'flex';

        const cardRect = card.getBoundingClientRect();
        const anchorRect = anchorEl.getBoundingClientRect();
        const anchorCenterX = anchorRect.left + anchorRect.width / 2;

        const minLeft = 8;
        const maxLeft = Math.max(minLeft, window.innerWidth - cardRect.width - 8);
        const left = Math.min(maxLeft, Math.max(minLeft, Math.round(anchorCenterX - cardRect.width / 2)));

        let top = Math.round(anchorRect.top - cardRect.height - 9);
        let isBottom = false;
        if (top < 8) {
            top = Math.round(anchorRect.bottom + 9);
            isBottom = true;
            if (top + cardRect.height > window.innerHeight - 8) {
                top = Math.max(8, window.innerHeight - cardRect.height - 8);
            }
        }

        const caretX = Math.max(14, Math.min(cardRect.width - 14, Math.round(anchorCenterX - left)));
        card.style.setProperty('--caret-x', `${caretX}px`);
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
        if (isBottom) card.classList.add('is-bottom');

        card.style.visibility = 'visible';
        requestAnimationFrame(() => {
            if (activeHoverAnchor === anchorEl && badgeHoverCardEl) {
                badgeHoverCardEl.classList.add('visible');
            }
        });
    }

    function clearBadgeHoverTimer() {
        if (badgeHoverShowTimer) {
            clearTimeout(badgeHoverShowTimer);
            badgeHoverShowTimer = null;
        }
    }

    function hideBadgeHoverCard() {
        clearBadgeHoverTimer();
        activeHoverAnchor = null;
        if (badgeHoverCardEl) {
            badgeHoverCardEl.classList.remove('visible', 'is-bottom');
            badgeHoverCardEl.style.display = 'none';
        }
    }

    let activeBadgesModalState = null;

    function isBadgesModalOpen() {
        const modal = document.getElementById('badgesModal');
        return !!(modal && modal.style.display !== 'none' && activeBadgesModalState);
    }

    const staleUpgradeInFlight = new Map();
    const staleUpgradeDone = new Set();
    let staleUpgradeRateLimited = false;
    let staleQueueStarted = false;

    function needsBadgeDataUpgrade(acc) {
        return !!(acc && !acc.invalid && acc.token && (!acc._profileVersion || acc._profileVersion < 6));
    }

    function syncBadgesModalAccount(acc) {
        if (!acc || !activeBadgesModalState) return;
        const split = getAccountBadgesSplit(acc);
        const allBadges = [...split.visible, ...split.hidden];
        if (allBadges.length === 0) return;
        const byId = new Map();
        for (const b of allBadges) {
            if (b && b.id) byId.set(b.id, b);
        }
        const prevId = activeBadgesModalState.selectedId;
        const selectedId = (prevId && byId.has(prevId)) ? prevId : allBadges[0].id;
        activeBadgesModalState = { acc, badges: allBadges, byId, selectedId };
        renderBadgesModalGrid();
        renderBadgesModalDetail();
    }

    function upgradeAccountBadgeDataIfNeeded(acc) {
        if (!needsBadgeDataUpgrade(acc) || staleUpgradeRateLimited) return Promise.resolve(null);
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return Promise.resolve(null);
        if (staleUpgradeDone.has(acc.token)) return Promise.resolve(null);
        if (staleUpgradeInFlight.has(acc.token)) return staleUpgradeInFlight.get(acc.token);

        const p = (async () => {
            try {
                const result = await validateToken(acc.token, true);
                if (!result || result.error === 'ratelimit' || (result.data && result.data._rateLimited)) {
                    if (result && (result.error === 'ratelimit' || (result.data && result.data._rateLimited))) {
                        staleUpgradeRateLimited = true;
                    }
                    return null;
                }
                staleUpgradeDone.add(acc.token);
                if (!result.valid || !result.data) return null;

                const idx = accounts.findIndex(a => a && (a.id === acc.id || a.token === acc.token));
                if (idx === -1) return null;

                const wasCardVisible = !!(badgeHoverCardEl && badgeHoverCardEl.style.display !== 'none');
                const hoveredInDetails = !!(activeHoverAnchor && activeHoverAnchor.closest('#accountDetailsBadges'));
                const hoveredBadgeId = (activeHoverAnchor && (hoveredInDetails || activeHoverAnchor.closest('.account-badges')))
                    ? activeHoverAnchor.dataset.badgeId
                    : null;
                const updatedAcc = applyUserDataToAccount(accounts[idx], result.data, acc.token);
                accounts[idx] = updatedAcc;
                await saveAccounts(accounts);

                if (activeDetailsAccount && (activeDetailsAccount.id === updatedAcc.id || activeDetailsAccount.token === updatedAcc.token)) {
                    activeDetailsAccount = updatedAcc;
                    renderAccountDetailsBadges(updatedAcc);
                }
                if (activeBadgesModalState && activeBadgesModalState.acc && (activeBadgesModalState.acc.id === updatedAcc.id || activeBadgesModalState.acc.token === updatedAcc.token)) {
                    syncBadgesModalAccount(updatedAcc);
                }
                if (activeHoverAnchor && !isBadgesModalOpen()) {
                    if (!activeHoverAnchor.isConnected) {
                        let replacementIcon = null;
                        if (hoveredBadgeId && hoveredInDetails) {
                            const detailsContainer = document.getElementById('accountDetailsBadges');
                            replacementIcon = detailsContainer ? detailsContainer.querySelector(`.badge-icon[data-badge-id="${hoveredBadgeId}"]`) : null;
                        } else if (hoveredBadgeId && listContainer) {
                            const newRow = [...listContainer.querySelectorAll('.account-item')].find(el => el.dataset.token === updatedAcc.token);
                            replacementIcon = newRow ? newRow.querySelector(`.account-badges .badge-icon[data-badge-id="${hoveredBadgeId}"]`) : null;
                        }
                        if (replacementIcon) {
                            activeHoverAnchor = replacementIcon;
                        } else {
                            hideBadgeHoverCard();
                        }
                    }
                    if (wasCardVisible && activeHoverAnchor && activeHoverAnchor.isConnected) {
                        const freshBadge = resolveHoveredBadgeObject(activeHoverAnchor);
                        if (freshBadge) showBadgeHoverCard(activeHoverAnchor, freshBadge);
                    }
                }
                return updatedAcc;
            } catch (e) {
                return null;
            } finally {
                staleUpgradeInFlight.delete(acc.token);
            }
        })();
        staleUpgradeInFlight.set(acc.token, p);
        return p;
    }

    function queueStaleBadgeUpgrades() {
        if (staleQueueStarted || staleUpgradeRateLimited) return;
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
        const staleTokens = accounts.filter(needsBadgeDataUpgrade).map(a => a.token);
        if (staleTokens.length === 0) return;
        staleQueueStarted = true;

        setTimeout(async () => {
            for (const tok of staleTokens) {
                if (staleUpgradeRateLimited) break;
                const target = accounts.find(a => a && a.token === tok);
                if (target && needsBadgeDataUpgrade(target) && !staleUpgradeDone.has(tok)) {
                    await upgradeAccountBadgeDataIfNeeded(target);
                    await new Promise(r => setTimeout(r, 400));
                }
            }
        }, 250);
    }

    function resolveHoveredBadgeObject(triggerEl) {
        if (!triggerEl || isBadgesModalOpen()) return null;
        const badgeId = triggerEl.dataset.badgeId;
        if (!badgeId) return null;

        const containerEl = triggerEl.closest('.account-badges, #accountDetailsBadges');
        if (!containerEl) return null;
        const reg = badgeContainerRegistry.get(containerEl);
        if (reg && reg.acc && needsBadgeDataUpgrade(reg.acc)) {
            upgradeAccountBadgeDataIfNeeded(reg.acc);
        }
        return (reg && reg.byId) ? (reg.byId.get(badgeId) || null) : null;
    }

    function renderBadgesModalGrid() {
        const gridEl = document.getElementById('badgesModalGrid');
        if (!gridEl || !activeBadgesModalState) return;
        const { badges, selectedId } = activeBadgesModalState;

        gridEl.innerHTML = badges.map(b => {
            const isActive = b.id === selectedId;
            const classes = [
                'badges-grid-tile',
                isActive ? 'active' : '',
                b.hidden ? 'is-hidden-badge' : ''
            ].filter(Boolean).join(' ');
            const eyeHtml = b.hidden ? HIDDEN_EYE_ICON_SVG : '';
            return `<button type="button" class="${classes}" data-badge-id="${escapeHtml(b.id)}"><img src="${b.icon}" alt="">${eyeHtml}</button>`;
        }).join('');
    }

    function renderBadgesModalDetail() {
        const detailEl = document.getElementById('badgesModalDetail');
        if (!detailEl || !activeBadgesModalState) return;

        const badge = activeBadgesModalState.byId.get(activeBadgesModalState.selectedId)
            || activeBadgesModalState.badges[0];
        if (!badge) {
            detailEl.innerHTML = '';
            return;
        }

        const familyHtml = badge.familyTitle
            ? `<div class="badges-detail-family">${escapeHtml(badge.familyTitle)}</div>`
            : '';
        const titleCls = `badge-display-title badges-detail-title${badge.titleItalic ? ' is-italic' : ''}`;
        const rarityHtml = renderRarityPillHtml(badge.rarity);
        const metaParts = [];
        if (badge.detailMeta) metaParts.push(`<span>${escapeHtml(badge.detailMeta)}</span>`);
        if (rarityHtml) {
            const bulletHtml = metaParts.length > 0 ? `<span aria-hidden="true">•</span>` : '';
            metaParts.push(`<span class="badges-detail-rarity-wrap">${bulletHtml}${rarityHtml}</span>`);
        }

        let cardInnerHtml = '';
        if (badge.progress && !badge.progress.isMaxed) {
            const p = badge.progress;
            cardInnerHtml += `
                <div class="badges-progress-title">${escapeHtml(getTranslation('badge.yourProgress'))}</div>
                <div class="badges-progress-row">
                    <img src="${p.currentIcon}" class="badges-progress-tier-icon" alt="">
                    <div class="badges-progress-mid">
                        <div class="badges-progress-remaining">${escapeHtml(p.remainingText)}</div>
                        <div class="badges-progress-track">
                            <div class="badges-progress-fill" style="width: ${p.percent}%;"></div>
                        </div>
                    </div>
                    ${p.nextIcon ? `<img src="${p.nextIcon}" class="badges-progress-tier-icon" alt="">` : ''}
                </div>
                <div class="badges-detail-divider"></div>
            `;
        } else if (badge.isLegacy) {
            cardInnerHtml += `<div class="badges-legacy-label">${escapeHtml(getTranslation('badge.legacyBadge'))}</div>`;
        }

        const hasTiers = Array.isArray(badge.tiers) && badge.tiers.length > 0;
        if (badge.description) {
            cardInnerHtml += `<div class="badges-detail-desc">${escapeHtml(badge.description)}</div>`;
            if (badge.progress && badge.progress.isMaxed && hasTiers) {
                cardInnerHtml += `<div class="badges-detail-divider"></div>`;
            }
        }

        if (hasTiers) {
            const tierCells = badge.tiers.map(t => {
                const cellCls = `badges-tier-cell${t.isCurrent ? ' is-current' : ''}${!t.unlocked ? ' is-locked' : ''}`;
                const nameHtml = t.label ? `<div class="badges-tier-name">${escapeHtml(t.label)}</div>` : '';
                const lockHtml = !t.unlocked ? TIER_LOCK_ICON_SVG : '';
                const mileHtml = t.milestoneText
                    ? `<div class="badges-tier-milestone">${lockHtml}<span>${escapeHtml(t.milestoneText)}</span></div>`
                    : '';
                return `
                    <div class="${cellCls}">
                        <img src="${t.icon}" class="badges-tier-icon" alt="">
                        ${nameHtml}
                        ${mileHtml}
                    </div>
                `;
            }).join('');
            cardInnerHtml += `<div class="badges-tiers-grid">${tierCells}</div>`;
        }

        detailEl.innerHTML = `
            <div class="badges-detail-hero">
                <img src="${badge.hoverIcon || badge.icon}" class="badges-detail-art${badge.isNitroComplex ? ' is-nitro-complex' : ''}" alt="">
                ${familyHtml}
                <div class="${titleCls}">${escapeHtml(toBadgeUpper(badge.hoverTitle || badge.name))}</div>
                <div class="badges-detail-meta">${metaParts.join('')}</div>
            </div>
            ${cardInnerHtml ? `<div class="badges-detail-card">${cardInnerHtml}</div>` : ''}
        `;
        detailEl.scrollTop = 0;
    }

    function openBadgesModal(acc, initialBadgeId = null) {
        if (!acc) return;
        const modal = document.getElementById('badgesModal');
        if (!modal) return;

        const split = getAccountBadgesSplit(acc);
        const allBadges = [...split.visible, ...split.hidden];
        if (allBadges.length === 0) return;

        hideBadgeHoverCard();

        const byId = new Map();
        for (const b of allBadges) {
            if (b && b.id) byId.set(b.id, b);
        }

        const selectedId = (initialBadgeId && byId.has(initialBadgeId))
            ? initialBadgeId
            : allBadges[0].id;

        activeBadgesModalState = { acc, badges: allBadges, byId, selectedId };

        const titleEl = document.getElementById('badgesModalTitle');
        const subEl = document.getElementById('badgesModalSubtitle');
        if (titleEl) titleEl.textContent = getTranslation('badge.panelTitle');
        if (subEl) subEl.textContent = getTranslation('badge.panelSubtitle');

        renderBadgesModalGrid();
        renderBadgesModalDetail();
        modal.style.display = 'flex';
        if (needsBadgeDataUpgrade(acc)) {
            upgradeAccountBadgeDataIfNeeded(acc);
        }
    }

    function closeBadgesModal() {
        hideBadgeHoverCard();
        const modal = document.getElementById('badgesModal');
        if (modal) modal.style.display = 'none';
        activeBadgesModalState = null;
    }

    function resolveBadgeFromInventoryItem(acc, invItem) {
        if (!invItem) return null;
        const userBadges = acc.badges || [];
        if (invItem.id === 1) return getNitroBadgeInfo(acc, invItem);
        if (invItem.id === 12) return getBoosterBadgeInfo(acc, invItem);
        if (invItem.id === 17) return getGiftingBadgeInfo(acc, invItem);
        if (invItem.id === 13) return getLegacyUsernameBadgeInfo(acc, true, null, invItem);

        const progDef = PROGRESSIVE_BADGE_REGISTRY.find(p => p.badgeIdNum === invItem.id);
        if (progDef) return getProgressiveBadgeInfo(progDef, acc, invItem);

        const staticDef = STATIC_BADGE_REGISTRY.find(s => s.badgeIdNum === invItem.id);
        if (staticDef) {
            const matchedProfileBadge = userBadges.find(b => b && (b.id === staticDef.badgeId || (staticDef.altBadgeId && b.id === staticDef.altBadgeId)));
            return getStaticBadgeInfo(staticDef, matchedProfileBadge, invItem);
        }
        return null;
    }

    function getAccountBadgesSplit(acc) {
        if (!acc) return { visible: [], hidden: [] };
        const visible = [];
        const hidden = [];

        if (Array.isArray(acc.badge_items)) {
            for (const invItem of acc.badge_items) {
                if (!invItem || invItem.id === 23) continue;
                const resolved = resolveBadgeFromInventoryItem(acc, invItem);
                if (!resolved) continue;
                if (invItem.hidden) hidden.push(resolved);
                else visible.push(resolved);
            }
            return { visible, hidden };
        }

        const userBadges = acc.badges || [];
        const matchedKeys = new Set();

        for (const profBadge of userBadges) {
            if (!profBadge || !profBadge.id) continue;
            const pid = profBadge.id;

            if (isNitroBadgeId(pid)) {
                if (!matchedKeys.has('nitro')) {
                    const info = getNitroBadgeInfo(acc, null, profBadge);
                    if (info) { visible.push(info); matchedKeys.add('nitro'); }
                }
                continue;
            }
            if (isBoosterBadgeId(pid)) {
                if (!matchedKeys.has('booster')) {
                    const info = getBoosterBadgeInfo(acc, null, profBadge);
                    if (info) { visible.push(info); matchedKeys.add('booster'); }
                }
                continue;
            }
            if (pid === 'gifting' || pid.startsWith('gifting_')) {
                if (!matchedKeys.has('gifting')) {
                    const info = getGiftingBadgeInfo(acc, null, profBadge);
                    if (info) { visible.push(info); matchedKeys.add('gifting'); }
                }
                continue;
            }
            if (pid === 'legacy_username') {
                if (!matchedKeys.has('legacy_username')) {
                    const info = getLegacyUsernameBadgeInfo(acc, true, profBadge, null);
                    if (info) { visible.push(info); matchedKeys.add('legacy_username'); }
                }
                continue;
            }

            const progDef = PROGRESSIVE_BADGE_REGISTRY.find(p => p.profileId === pid);
            if (progDef) {
                if (!matchedKeys.has(progDef.profileId)) {
                    const info = getProgressiveBadgeInfo(progDef, acc, null);
                    if (info) { visible.push(info); matchedKeys.add(progDef.profileId); }
                }
                continue;
            }

            const staticDef = STATIC_BADGE_REGISTRY.find(s => s.badgeId === pid || (s.altBadgeId && s.altBadgeId === pid));
            if (staticDef && !matchedKeys.has(staticDef.badgeId)) {
                visible.push(getStaticBadgeInfo(staticDef, profBadge, null));
                matchedKeys.add(staticDef.badgeId);
            }
        }

        if (!acc._profileChecked || userBadges.length === 0) {
            if (!matchedKeys.has('nitro')) {
                const nitroInfo = getNitroBadgeInfo(acc);
                if (nitroInfo) { visible.push(nitroInfo); matchedKeys.add('nitro'); }
            }
            if (!matchedKeys.has('booster')) {
                const boosterInfo = getBoosterBadgeInfo(acc);
                if (boosterInfo) { visible.push(boosterInfo); matchedKeys.add('booster'); }
            }
            if (!matchedKeys.has('gifting')) {
                const giftingInfo = getGiftingBadgeInfo(acc);
                if (giftingInfo) { visible.push(giftingInfo); matchedKeys.add('gifting'); }
            }
            const userFlags = acc.public_flags !== undefined && acc.public_flags !== null ? acc.public_flags : (acc.flags || 0);
            for (const def of STATIC_BADGE_REGISTRY) {
                if (matchedKeys.has(def.badgeId)) continue;
                if (def.flag !== undefined && (userFlags & def.flag) !== 0) {
                    visible.push(getStaticBadgeInfo(def, null, null));
                    matchedKeys.add(def.badgeId);
                }
            }
            if (!matchedKeys.has('legacy_username')) {
                const legacyInfo = getLegacyUsernameBadgeInfo(acc);
                if (legacyInfo) visible.push(legacyInfo);
            }
        } else if (!matchedKeys.has('gifting') && ((acc.gifting_tier || 0) > 0 || (acc.gifting_count || 0) > 0)) {
            const giftingInfo = getGiftingBadgeInfo(acc);
            if (giftingInfo) visible.push(giftingInfo);
        }

        return { visible, hidden };
    }

    function getAccountBadges(acc) {
        return getAccountBadgesSplit(acc).visible;
    }

    function renderBadgesHtml(badges) {
        if (!showBadges || !badges || badges.length === 0) return '';
        const visibleLimit = clampVisibleBadgesCount(maxVisibleBadges);
        const visibleBadges = badges.slice(0, visibleLimit);
        const hiddenCount = badges.length - visibleLimit;

        const visibleHtml = visibleBadges.map(b => `<img src="${b.icon}" class="badge-icon" data-badge-id="${escapeHtml(b.id)}" alt="${escapeHtml(b.name)}">`).join('');
        const moreHtml = hiddenCount > 0 ? `<span class="badge-more">+${hiddenCount}</span>` : '';

        return `<div class="account-badges${hiddenCount > 0 ? ' has-more' : ''}">${visibleHtml}${moreHtml}</div>`;
    }

    function getAccountAvatarUrl(acc, size = 64) {
        const userId = (acc && acc.id) ? acc.id : (acc ? getEffectiveUserId(acc) : null);
        if (!acc || !acc.avatar) {
            if (userId) {
                try {
                    return `https://cdn.discordapp.com/embed/avatars/${(BigInt(userId) >> 22n) % 6n}.png`;
                } catch (e) { }
            }
            return 'https://cdn.discordapp.com/embed/avatars/0.png';
        }
        const ext = acc.avatar.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${userId || '0'}/${acc.avatar}.${ext}?size=${size}`;
    }

    function createAccountItem(acc, index) {
        const item = document.createElement('div');
        item.className = 'account-item' + (acc.id && acc.id === activeAccountId ? ' active-account' : '');
        item.dataset.index = index;
        item.dataset.token = acc.token;
        item.dataset.accountId = acc.id || '';

        const avatarUrl = getAccountAvatarUrl(acc, 64);

        const badgeData = getAccountBadgesSplit(acc);
        const badges = badgeData.visible;
        const badgesHtml = renderBadgesHtml(badges);

        item.innerHTML = `
            <div class="drag-handle" title="${getTranslation('actions.dragReorder')}" data-drag-handle="account" data-token="${escapeHtml(acc.token)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="8" cy="6" r="1.5"></circle>
                    <circle cx="16" cy="6" r="1.5"></circle>
                    <circle cx="8" cy="12" r="1.5"></circle>
                    <circle cx="16" cy="12" r="1.5"></circle>
                    <circle cx="8" cy="18" r="1.5"></circle>
                    <circle cx="16" cy="18" r="1.5"></circle>
                </svg>
            </div>
            <img src="${avatarUrl}" class="account-avatar" alt="Avatar">
            <div class="account-info">
                <div class="account-name-row">
                    <span class="account-name">${escapeHtml(acc.global_name || acc.username)}</span>
                    ${badgesHtml}
                </div>
                <div class="account-id">${escapeHtml(acc.username)}</div>
            </div>
            <div class="actions-group">
                ${acc.invalid ? `
                    <button type="button" class="icon-btn invalid-warning update-token-trigger" data-tooltip="${getTranslation('account.tokenInvalid') || 'Token Invalid'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                        </svg>
                    </button>
                ` : ''}
                <div class="account-menu-wrapper">
                    <button class="icon-btn account-menu-btn" aria-label="${escapeHtml(getTranslation('account.options') || 'Account Options')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                            <circle cx="12" cy="19" r="2"></circle>
                        </svg>
                    </button>
                    <div class="account-menu">
                        <button class="account-menu-item account-details-btn" data-index="${index}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <span>${getTranslation('account.details')}</span>
                        </button>
                        <button class="account-menu-item refresh-btn" data-index="${index}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4ZM12 18C8.69 18 6 15.31 6 12C6 10.99 6.25 10.03 6.7 9.2L5.24 7.74C4.46 8.97 4 10.43 4 12C4 16.42 7.58 20 12 20V23L16 19L12 15V18Z"></path>
                            </svg>
                            <span>${getTranslation('account.refresh')}</span>
                        </button>
                        ${acc.invalid ? `
                            <button class="account-menu-item update-token-btn" data-index="${index}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                                </svg>
                                <span>${getTranslation('account.updateToken')}</span>
                            </button>
                        ` : ''}
                        <div class="account-menu-divider"></div>
                        <button class="account-menu-item delete-btn danger" data-index="${index}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
                                <path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
                            </svg>
                            <span>${getTranslation('account.delete')}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.closest('.icon-btn') || e.target.closest('.drag-handle') || e.target.closest('.account-badges') || e.target.closest('.account-menu-wrapper') || e.target.closest('.invalid-warning')) return;
            switchAccount(acc.token, acc.id);
        });

        const badgesContainer = item.querySelector('.account-badges');
        if (badgesContainer) {
            const allAccountBadges = [...badgeData.visible, ...badgeData.hidden];
            bindBadgeContainerData(badgesContainer, acc, allAccountBadges);
            badgesContainer.addEventListener('pointerdown', (e) => e.stopPropagation());
            badgesContainer.addEventListener('mousedown', (e) => e.stopPropagation());
            badgesContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllFolderMenus();
                closeAllAccountMenus();
                hideBadgeHoverCard();
                document.querySelectorAll('.custom-select-container.open').forEach(closeCustomSelect);
                if (allAccountBadges.length > 0) {
                    const clickedIcon = e.target.closest('.badge-icon');
                    const initialId = clickedIcon ? clickedIcon.dataset.badgeId : allAccountBadges[0].id;
                    openBadgesModal(acc, initialId);
                }
            });
        }

        const accountMenuBtn = item.querySelector('.account-menu-btn');
        const accountMenu = item.querySelector('.account-menu');
        const accountMenuWrapper = item.querySelector('.account-menu-wrapper');

        if (openAccountMenuToken && openAccountMenuToken === acc.token) {
            accountMenuWrapper.classList.add('open');
            requestAnimationFrame(() => {
                adjustAccountMenuPosition(accountMenuWrapper);
            });
        }

        if (accountMenuWrapper) {
            accountMenuWrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
            accountMenuWrapper.addEventListener('mousedown', (e) => e.stopPropagation());
        }

        if (accountMenuBtn && accountMenu) {
            accountMenuBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
            accountMenuBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            accountMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllFolderMenus();
                closeAllAccountMenus(accountMenuWrapper);
                hideBadgeHoverCard();
                document.querySelectorAll('.custom-select-container.open').forEach(closeCustomSelect);
                const isOpening = !accountMenuWrapper.classList.contains('open');
                if (isOpening) {
                    openAccountMenuToken = acc.token;
                    accountMenuWrapper.classList.add('open');
                    adjustAccountMenuPosition(accountMenuWrapper);
                } else {
                    openAccountMenuToken = null;
                    accountMenuWrapper.classList.remove('open');
                    accountMenuWrapper.classList.remove('open-up');
                }
            });

            accountMenu.addEventListener('pointerdown', (e) => e.stopPropagation());
            accountMenu.addEventListener('mousedown', (e) => e.stopPropagation());
            accountMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        const detailsBtn = item.querySelector('.account-details-btn');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (accountMenuWrapper) {
                    accountMenuWrapper.classList.remove('open');
                    accountMenuWrapper.classList.remove('open-up');
                }
                openAccountDetailsModal(acc);
            });
        }

        const refreshBtn = item.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                refreshBtn.classList.add('spinning');
                const result = await validateToken(acc.token, true);
                refreshBtn.classList.remove('spinning');

                const existingIdx = accounts.findIndex(a => a.id === acc.id || a.token === acc.token);
                if (existingIdx === -1) return;
                const existing = accounts[existingIdx];

                if (result && result.valid && result.data) {
                    const userData = result.data;

                    if (userData._rateLimited) {
                        refreshBtn.style.color = '#fee339';
                        refreshBtn.title = getTranslation('account.rateLimited') || 'Discord Rate Limit - Please wait a few minutes';
                        setTimeout(() => {
                            refreshBtn.style.color = '';
                            refreshBtn.title = getTranslation('account.refresh') || 'Refresh Profile';
                        }, 3000);
                    }

                    accounts[existingIdx] = applyUserDataToAccount(existing, userData, acc.token);
                    await saveAccounts(accounts);
                } else if (result && (result.error === 'unauthorized' || result.error === 'invalid_token')) {
                    refreshBtn.style.color = 'var(--danger)';
                    refreshBtn.title = getTranslation('settings.tokenExpired') || 'Invalid Token';
                    accounts[existingIdx] = {
                        ...existing,
                        invalid: true
                    };
                    await saveAccounts(accounts);
                } else if (result && result.error === 'ratelimit') {
                    refreshBtn.style.color = '#fee339';
                    refreshBtn.title = getTranslation('account.rateLimited') || 'Discord Rate Limit - Please wait a few minutes';
                    setTimeout(() => {
                        refreshBtn.style.color = '';
                        refreshBtn.title = getTranslation('account.refresh') || 'Refresh Profile';
                    }, 3000);
                } else {
                    refreshBtn.style.color = 'var(--danger)';
                    setTimeout(() => { refreshBtn.style.color = ''; }, 1500);
                }
            });
        }

        const updateTokenTrigger = item.querySelector('.invalid-warning.update-token-trigger');
        if (updateTokenTrigger) {
            updateTokenTrigger.addEventListener('pointerdown', (e) => e.stopPropagation());
            updateTokenTrigger.addEventListener('mousedown', (e) => e.stopPropagation());
            updateTokenTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                openUpdateTokenModal(acc);
            });
        }

        const updateTokenBtn = item.querySelector('.update-token-btn');
        if (updateTokenBtn) {
            updateTokenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (accountMenuWrapper) {
                    accountMenuWrapper.classList.remove('open');
                    accountMenuWrapper.classList.remove('open-up');
                }
                openUpdateTokenModal(acc);
            });
        }

        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openAccountMenuToken = null;
            const newAccs = accounts.filter(a => a.token !== acc.token);
            saveAccounts(newAccs);
        });



        return item;
    }

    async function validateToken(token, returnFull = false) {
        if (!token) return returnFull ? { valid: false, error: 'empty_token' } : null;
        return new Promise((resolve) => {
            let done = false;
            const timer = setTimeout(() => {
                if (!done) {
                    done = true;
                    resolve(returnFull ? { valid: false, error: 'timeout' } : null);
                }
            }, 7000);

            try {
                chrome.runtime.sendMessage({ type: 'VALIDATE_TOKEN', token: token }, (response) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    if (chrome.runtime.lastError) {
                        console.error('ValidateToken background message error:', chrome.runtime.lastError);
                        resolve(returnFull ? { valid: false, error: 'runtime_error' } : null);
                        return;
                    }
                    if (returnFull) {
                        resolve(response || { valid: false, error: 'no_response' });
                    } else {
                        if (response && response.valid && response.data) {
                            resolve(response.data);
                        } else {
                            resolve(null);
                        }
                    }
                });
            } catch (err) {
                if (!done) {
                    done = true;
                    clearTimeout(timer);
                    console.error('validateToken error:', err);
                    resolve(returnFull ? { valid: false, error: 'exception' } : null);
                }
            }
        });
    }


    function extractTokenFromLine(line) {
        if (!line || typeof line !== 'string') return null;
        let str = line.trim().replace(/[^\x00-\x7F]/g, '');
        if (!str) return null;

        if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
            str = str.slice(1, -1).trim();
        }

        if (str.includes(':')) {
            const parts = str.split(':');
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i].trim().replace(/^["']|["']$/g, '');
                if (p.startsWith('mfa.') && p.length >= 50) return p;
                if (p.split('.').length >= 3 && p.length >= 50) return p;
            }
            const longest = parts.reduce((a, b) => b.trim().length > a.trim().length ? b : a, '').trim().replace(/^["']|["']$/g, '');
            if (longest.length >= 50) return longest;
        }

        return str.length >= 25 ? str : null;
    }

    function parseTokensFromInput(rawText) {
        if (!rawText) return [];
        const lines = rawText.split(/\r?\n/);
        const tokens = [];
        const seen = new Set();

        for (const line of lines) {
            const token = extractTokenFromLine(line);
            if (token && !seen.has(token)) {
                seen.add(token);
                tokens.push(token);
            }
        }
        return tokens;
    }

    function selectFolderOption(val, label) {
        if (tokenFolderSelect) tokenFolderSelect.value = val || '';
        if (tokenFolderTriggerText) tokenFolderTriggerText.textContent = label;
        if (tokenFolderOptions) {
            tokenFolderOptions.querySelectorAll('.custom-option').forEach(opt => {
                if (opt.dataset.value === (val || '')) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
        }
        if (customTokenFolderSelect) {
            customTokenFolderSelect.classList.remove('open');
        }
    }

    function populateTokenFolderSelect() {
        if (!tokenFolderSelect) return;
        const currentVal = tokenFolderSelect.value || '';
        const uncategorizedText = getTranslation('addToken.noFolder') || 'Uncategorized';

        tokenFolderSelect.innerHTML = `<option value="">${uncategorizedText}</option>`;
        folders.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.name;
            tokenFolderSelect.appendChild(opt);
        });
        if (currentVal && folders.some(f => f.id === currentVal)) {
            tokenFolderSelect.value = currentVal;
        } else {
            tokenFolderSelect.value = '';
        }

        if (tokenFolderOptions && tokenFolderTriggerText) {
            tokenFolderOptions.innerHTML = '';

            const selectedVal = tokenFolderSelect.value;
            let activeLabel = uncategorizedText;

            const uncatOpt = document.createElement('div');
            uncatOpt.className = `custom-option ${!selectedVal ? 'selected' : ''}`;
            uncatOpt.dataset.value = '';

            const uncatDot = document.createElement('span');
            uncatDot.className = 'folder-dot';
            const uncatLabel = document.createElement('span');
            uncatLabel.className = 'option-label';
            uncatLabel.textContent = uncategorizedText;
            const uncatCheck = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            uncatCheck.setAttribute('class', 'check-icon');
            uncatCheck.setAttribute('width', '14');
            uncatCheck.setAttribute('height', '14');
            uncatCheck.setAttribute('viewBox', '0 0 24 24');
            uncatCheck.setAttribute('fill', 'currentColor');
            uncatCheck.innerHTML = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>';

            uncatOpt.appendChild(uncatDot);
            uncatOpt.appendChild(uncatLabel);
            uncatOpt.appendChild(uncatCheck);

            uncatOpt.addEventListener('click', (e) => {
                e.stopPropagation();
                selectFolderOption('', uncategorizedText);
            });
            tokenFolderOptions.appendChild(uncatOpt);

            folders.forEach(f => {
                const isSel = selectedVal === f.id;
                if (isSel) activeLabel = f.name;

                const opt = document.createElement('div');
                opt.className = `custom-option ${isSel ? 'selected' : ''}`;
                opt.dataset.value = f.id;

                const dot = document.createElement('span');
                dot.className = f.color ? `folder-dot ${f.color}` : 'folder-dot';

                const label = document.createElement('span');
                label.className = 'option-label';
                label.textContent = f.name;

                const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                check.setAttribute('class', 'check-icon');
                check.setAttribute('width', '14');
                check.setAttribute('height', '14');
                check.setAttribute('viewBox', '0 0 24 24');
                check.setAttribute('fill', 'currentColor');
                check.innerHTML = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>';

                opt.appendChild(dot);
                opt.appendChild(label);
                opt.appendChild(check);

                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectFolderOption(f.id, f.name);
                });
                tokenFolderOptions.appendChild(opt);
            });

            tokenFolderTriggerText.textContent = activeLabel;
        }
    }

    if (tokenFolderTrigger && customTokenFolderSelect) {
        tokenFolderTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllFolderMenus();
            closeAllAccountMenus();
            hideBadgeHoverCard();
            document.querySelectorAll('.custom-select-container.open').forEach(el => {
                if (el !== customTokenFolderSelect) closeCustomSelect(el);
            });
            customTokenFolderSelect.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!customTokenFolderSelect.contains(e.target)) {
                customTokenFolderSelect.classList.remove('open');
            }
        });
    }

    function updateDetectedTokensBadge() {
        if (!detectedTokensBadge) return;
        const tokens = parseTokensFromInput(tokenInput.value);
        if (tokens.length > 1) {
            detectedTokensBadge.textContent = `${tokens.length}`;
            detectedTokensBadge.title = (getTranslation('addToken.tokensDetected') || '{count} tokens detected').replace('{count}', tokens.length);
            detectedTokensBadge.style.display = 'inline-block';
        } else {
            detectedTokensBadge.style.display = 'none';
        }
    }

    if (importTxtFile) {
        importTxtFile.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                tokenInput.value = text;
                updateDetectedTokensBadge();
                const tokens = parseTokensFromInput(text);
                if (tokens.length === 0) {
                    errorMsg.textContent = getTranslation('addToken.noTokensFound') || 'No valid tokens found.';
                } else {
                    errorMsg.textContent = '';
                }
            };
            reader.readAsText(file);
            importTxtFile.value = '';
        });
    }

    showAddBtn.addEventListener('click', () => {
        if (addAccountModal) addAccountModal.style.display = 'flex';
    });

    function closeAddAccountModal() {
        if (addAccountModal) addAccountModal.style.display = 'none';
    }

    if (addAccountModal) {
        addAccountModal.addEventListener('click', (e) => {
            if (e.target === addAccountModal) closeAddAccountModal();
        });
    }

    if (cancelAddAccountBtn) {
        cancelAddAccountBtn.addEventListener('click', closeAddAccountModal);
    }

    if (addViaTokenBtn) {
        addViaTokenBtn.addEventListener('click', () => {
            if (bulkAddAutoCloseTimer) {
                clearTimeout(bulkAddAutoCloseTimer);
                bulkAddAutoCloseTimer = null;
            }
            closeAddAccountModal();
            setBulkAddCompactMode(false);
            addTokenForm.style.display = 'flex';
            footerActions.style.display = 'none';
            populateTokenFolderSelect();
            updateDetectedTokensBadge();
            if (addTokenProgressContainer) addTokenProgressContainer.style.display = 'none';
            errorMsg.textContent = '';
            errorMsg.style.color = '';
            saveTokenBtn.disabled = false;
            tokenInput.disabled = false;
            tokenInput.focus();
        });
    }

    if (addViaLoginBtn) {
        addViaLoginBtn.addEventListener('click', () => {
            addViaLoginBtn.disabled = true;
            if (addViaTokenBtn) addViaTokenBtn.disabled = true;
            const titleEl = addViaLoginBtn.querySelector('.add-account-option-title');
            if (titleEl) titleEl.textContent = getTranslation('addAccount.openingLogin') || 'Opening Discord Login...';
            chrome.runtime.sendMessage({ type: 'START_OFFICIAL_LOGIN' }, (response) => {
                if (chrome.runtime.lastError || !response || !response.success) {
                    addViaLoginBtn.disabled = false;
                    if (addViaTokenBtn) addViaTokenBtn.disabled = false;
                    if (titleEl) titleEl.textContent = getTranslation('addAccount.viaLogin') || 'Add via Discord Login';
                    return;
                }
                window.close();
            });
        });
    }

    const addTokenHeader = addTokenForm ? addTokenForm.querySelector('.add-token-header') : null;
    const tokenFolderRow = document.getElementById('tokenFolderRow');

    function setBulkAddCompactMode(active) {
        const display = active ? 'none' : '';
        if (addTokenHeader) addTokenHeader.style.display = display;
        if (tokenInput) tokenInput.style.display = display;
        if (tokenFolderRow) tokenFolderRow.style.display = display;
        if (saveTokenBtn) saveTokenBtn.style.display = display;
        if (importTxtFile) importTxtFile.disabled = active;
    }

    function resetAddTokenForm() {
        if (bulkAddAutoCloseTimer) {
            clearTimeout(bulkAddAutoCloseTimer);
            bulkAddAutoCloseTimer = null;
        }
        setBulkAddCompactMode(false);
        addTokenForm.style.display = 'none';
        footerActions.style.display = 'flex';
        tokenInput.value = '';
        tokenInput.disabled = false;
        saveTokenBtn.disabled = false;
        if (tokenFolderSelect) tokenFolderSelect.disabled = false;
        if (tokenFolderTrigger) tokenFolderTrigger.disabled = false;
        errorMsg.textContent = '';
        errorMsg.style.color = '';
        if (detectedTokensBadge) detectedTokensBadge.style.display = 'none';
        if (addTokenProgressContainer) addTokenProgressContainer.style.display = 'none';
        if (customTokenFolderSelect) customTokenFolderSelect.classList.remove('open');
        cancelAddBtn.textContent = getTranslation('addToken.cancel') || 'Cancel';
        selectFolderOption('', getTranslation('addToken.noFolder') || 'Uncategorized');
    }

    function updateBulkAddUI(state) {
        if (!state || (!state.isBulkAdding && !state.bulkAddFinished && !isBulkAddRunning)) return;

        if (bulkAddAutoCloseTimer) {
            clearTimeout(bulkAddAutoCloseTimer);
            bulkAddAutoCloseTimer = null;
        }

        if (state && state.isBulkAdding) {
            isBulkAddRunning = true;
            closeAddAccountModal();
            setBulkAddCompactMode(true);
            addTokenForm.style.display = 'flex';
            footerActions.style.display = 'none';
            saveTokenBtn.disabled = true;
            tokenInput.disabled = true;
            if (tokenFolderSelect) tokenFolderSelect.disabled = true;
            if (tokenFolderTrigger) tokenFolderTrigger.disabled = true;
            if (customTokenFolderSelect) customTokenFolderSelect.classList.remove('open');
            cancelAddBtn.textContent = getTranslation('addToken.stop') || 'Stop';

            const current = state.bulkAddCurrent || 0;
            const total = state.bulkAddTotal || 0;
            const percent = state.bulkAddProgress || 0;

            if (addTokenProgressContainer) {
                addTokenProgressContainer.style.display = 'flex';
                if (addTokenProgressBar) addTokenProgressBar.style.width = `${percent}%`;
            }
            if (addTokenProgressText) {
                const template = getTranslation('addToken.processing') || 'Adding {current} of {total}...';
                addTokenProgressText.textContent = template.replace('{current}', current).replace('{total}', total);
            }
            if (addTokenProgressCount) {
                addTokenProgressCount.textContent = `${percent}%`;
            }
            return;
        }

        const wasRunning = isBulkAddRunning;
        isBulkAddRunning = false;
        saveTokenBtn.disabled = false;
        tokenInput.disabled = false;
        if (tokenFolderSelect) tokenFolderSelect.disabled = false;
        if (tokenFolderTrigger) tokenFolderTrigger.disabled = false;
        cancelAddBtn.textContent = getTranslation('addToken.cancel') || 'Cancel';

        if (state && state.bulkAddFinished && state.bulkAddResults) {
            const { added = 0, skipped = 0, failed = 0 } = state.bulkAddResults;
            setBulkAddCompactMode(true);
            if (!wasRunning) {
                addTokenForm.style.display = 'flex';
                footerActions.style.display = 'none';
            }
            if (addTokenProgressContainer) {
                addTokenProgressContainer.style.display = 'flex';
                if (addTokenProgressBar) addTokenProgressBar.style.width = `${state.bulkAddProgress ?? 100}%`;
            }
            if (addTokenProgressCount) {
                addTokenProgressCount.textContent = `${state.bulkAddProgress ?? 100}%`;
            }

            const summaryTemplate = getTranslation('addToken.summary') || 'Done: {added} added, {skipped} existing, {failed} invalid.';
            errorMsg.textContent = summaryTemplate
                .replace('{added}', added)
                .replace('{skipped}', skipped)
                .replace('{failed}', failed);
            errorMsg.style.color = failed > 0 ? 'var(--text-warning)' : 'var(--success)';

            chrome.storage.local.set({ bulkAddFinished: false });
            bulkAddAutoCloseTimer = setTimeout(() => {
                if (!isBulkAddRunning) {
                    resetAddTokenForm();
                }
            }, 2800);
        } else {
            setBulkAddCompactMode(false);
        }
    }

    cancelAddBtn.addEventListener('click', () => {
        if (isBulkAddRunning) {
            chrome.runtime.sendMessage({ type: 'STOP_BULK_ADD' });
            cancelAddBtn.textContent = getTranslation('addToken.cancel') || 'Cancel';
            return;
        }
        chrome.storage.local.set({ bulkAddFinished: false });
        resetAddTokenForm();
    });

    tokenInput.addEventListener('input', () => {
        updateDetectedTokensBadge();
        errorMsg.textContent = '';
    });

    tokenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const tokens = parseTokensFromInput(tokenInput.value);
            if (tokens.length <= 1 && !e.shiftKey) {
                e.preventDefault();
                saveTokenBtn.click();
            } else if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                saveTokenBtn.click();
            }
        }
    });

    function showConfirmDialog(title, message, confirmText = 'Delete All') {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            const titleEl = document.getElementById('confirmModalTitle');
            const msgEl = document.getElementById('confirmModalMessage');
            const okBtn = document.getElementById('okConfirmBtn');
            const cancelBtn = document.getElementById('cancelConfirmBtn');

            if (!modal || !okBtn || !cancelBtn) {
                resolve(window.confirm(message));
                return;
            }

            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;
            if (okBtn) okBtn.textContent = confirmText;

            modal.style.display = 'flex';

            const onOk = () => {
                cleanup();
                resolve(true);
            };

            const onCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                modal.style.display = 'none';
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
            };

            okBtn.addEventListener('click', onOk);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    let activeDetailsAccount = null;
    let isDetailsTokenVisible = false;

    function getEffectiveUserId(acc) {
        if (!acc) return '';
        if (acc.id) return acc.id;
        if (acc.token) {
            try {
                const b64 = acc.token.split('.')[0];
                return atob(b64);
            } catch (err) { }
        }
        return '';
    }

    function getDiscordCreationDate(userId) {
        if (!userId) return '';
        try {
            const idBig = BigInt(userId);
            const timestampMs = Number((idBig >> 22n) + 1420070400000n);
            const date = new Date(timestampMs);
            if (isNaN(date.getTime())) return '';
            const langMap = {
                'tr': 'tr-TR',
                'de': 'de-DE',
                'es': 'es-ES',
                'fr': 'fr-FR',
                'pt': 'pt-BR',
                'ru': 'ru-RU',
                'it': 'it-IT',
                'ja': 'ja-JP',
                'ko': 'ko-KR',
                'pl': 'pl-PL',
                'zh': 'zh-CN',
                'uk': 'uk-UA'
            };
            const locale = (currentLang && langMap[currentLang]) ? langMap[currentLang] : 'en-US';
            return date.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return '';
        }
    }

    function getDiscordCreationDateWithAge(userId) {
        if (!userId) return '';
        try {
            const idBig = BigInt(userId);
            const timestampMs = Number((idBig >> 22n) + 1420070400000n);
            const date = new Date(timestampMs);
            if (isNaN(date.getTime())) return '';
            const langMap = {
                'tr': 'tr-TR',
                'de': 'de-DE',
                'es': 'es-ES',
                'fr': 'fr-FR',
                'pt': 'pt-BR',
                'ru': 'ru-RU',
                'it': 'it-IT',
                'ja': 'ja-JP',
                'ko': 'ko-KR',
                'pl': 'pl-PL',
                'zh': 'zh-CN',
                'uk': 'uk-UA'
            };
            const locale = (currentLang && langMap[currentLang]) ? langMap[currentLang] : 'en-US';
            const formattedDate = date.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const diffMs = Date.now() - timestampMs;
            if (diffMs <= 0) return formattedDate;

            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffMonths = Math.floor(diffDays / 30.4375);
            const diffYears = Math.floor(diffDays / 365.25);

            let ageText = '';
            if (diffYears >= 1) {
                const template = getTranslation('account.yearsAgo') || '{count} years ago';
                ageText = template.replace('{count}', diffYears);
            } else if (diffMonths >= 1) {
                const template = getTranslation('account.monthsAgo') || '{count} months ago';
                ageText = template.replace('{count}', diffMonths);
            } else {
                const template = getTranslation('account.daysAgo') || '{count} days ago';
                ageText = template.replace('{count}', Math.max(1, diffDays));
            }

            return `${formattedDate} (${ageText})`;
        } catch (e) {
            return '';
        }
    }

    function getFriendlyLocaleName(loc) {
        if (!loc) return '-';
        const clean = String(loc).toLowerCase();
        const map = {
            'tr': 'Türkçe (TR)',
            'en-us': 'English (US)',
            'en-gb': 'English (UK)',
            'de': 'Deutsch (DE)',
            'es-es': 'Español (ES)',
            'es-419': 'Español (LATAM)',
            'fr': 'Français (FR)',
            'pt-br': 'Português (BR)',
            'ru': 'Русский (RU)',
            'it': 'Italiano (IT)',
            'nl': 'Nederlands (NL)',
            'pl': 'Polski (PL)',
            'uk': 'Українська (UA)',
            'ja': '日本語 (JA)',
            'ko': '한국어 (KO)',
            'zh-cn': '简体中文 (CN)',
            'zh-tw': '繁體中文 (TW)',
            'ar': 'العربية (AR)',
            'vi': 'Tiếng Việt (VI)',
            'hi': 'हिन्दी (HI)',
            'th': 'ไทย (TH)',
            'cs': 'Čeština (CZ)',
            'el': 'Ελληνικά (GR)',
            'hu': 'Magyar (HU)',
            'ro': 'Română (RO)',
            'sv-se': 'Svenska (SE)',
            'bg': 'Български (BG)',
            'da': 'Dansk (DK)',
            'fi': 'Suomi (FI)',
            'no': 'Norsk (NO)',
            'hr': 'Hrvatski (HR)',
            'lt': 'Lietuvių (LT)'
        };
        return map[clean] || String(loc).toUpperCase();
    }

    function getLocaleFlagSvg(loc) {
        if (!loc) return '';
        const clean = String(loc).toLowerCase().trim();
        const flagSvgs = {
            'tr': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#E30A17"/><circle cx="230" cy="240" r="140" fill="#ffffff"/><circle cx="265" cy="240" r="112" fill="#E30A17"/><path d="M342.3 216.7l15.6 48-40.8-29.6-40.8 29.6 15.6-48-40.8-29.7h50.4l15.6-48 15.6 48h50.4z" fill="#ffffff"/></svg>',
            'en-us': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><path fill="#bd3d44" d="M0 0h640v480H0z"/><path fill="#fff" d="M0 36.9h640v36.9H0zm0 73.8h640v36.9H0zm0 73.9h640v36.9H0zm0 73.8h640v36.9H0zm0 73.9h640v36.9H0zm0 73.8h640v36.9H0z"/><path fill="#192f5d" d="M0 0h280v258.5H0z"/></svg>',
            'en-gb': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><path fill="#012169" d="M0 0h640v480H0z"/><path fill="#FFF" d="m75 0 245 184L565 0h75v60L440 240l200 150v90h-75L320 296 75 480H0v-60l200-150L0 120V0z"/><path fill="#C8102E" d="m424 288 216 162v30h-40L384 318zM640 0v30L424 192l40 30L640 72zM0 450l216-162-40-30L0 408zM176 192 0 60V0l216 162z"/><path fill="#FFF" d="M240 0h160v480H240zM0 160h640v160H0z"/><path fill="#C8102E" d="M280 0h80v480h-80zM0 200h640v80H0z"/></svg>',
            'de': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="160" y="0" fill="#000000"/><rect width="640" height="160" y="160" fill="#DD0000"/><rect width="640" height="160" y="320" fill="#FFCC00"/></svg>',
            'es': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="120" y="0" fill="#AA151B"/><rect width="640" height="240" y="120" fill="#F1BF00"/><rect width="640" height="120" y="360" fill="#AA151B"/></svg>',
            'es-es': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="120" y="0" fill="#AA151B"/><rect width="640" height="240" y="120" fill="#F1BF00"/><rect width="640" height="120" y="360" fill="#AA151B"/></svg>',
            'es-419': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="120" y="0" fill="#AA151B"/><rect width="640" height="240" y="120" fill="#F1BF00"/><rect width="640" height="120" y="360" fill="#AA151B"/></svg>',
            'fr': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="213.3" height="480" x="0" fill="#002395"/><rect width="213.3" height="480" x="213.3" fill="#ffffff"/><rect width="213.3" height="480" x="426.6" fill="#ED2939"/></svg>',
            'pt': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="256" height="480" fill="#046A38"/><rect width="384" height="480" x="256" fill="#DA291C"/><circle cx="256" cy="240" r="90" fill="#FFC72C"/><circle cx="256" cy="240" r="75" fill="#DA291C"/></svg>',
            'pt-br': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#009c3b"/><path fill="#ffdf00" d="M320 40L600 240 320 440 40 240z"/><circle cx="320" cy="240" r="105" fill="#002776"/></svg>',
            'ru': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="160" y="0" fill="#ffffff"/><rect width="640" height="160" y="160" fill="#0039A6"/><rect width="640" height="160" y="320" fill="#D52B1E"/></svg>',
            'it': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="213.3" height="480" fill="#009246"/><rect width="213.3" height="480" x="213.3" fill="#ffffff"/><rect width="213.3" height="480" x="426.6" fill="#ce2b37"/></svg>',
            'ja': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#ffffff"/><circle cx="320" cy="240" r="144" fill="#bc002d"/></svg>',
            'ko': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#ffffff"/><circle cx="320" cy="240" r="120" fill="#c60c30"/><path d="M200 240a120 120 0 0 0 240 0c0-66.27-53.73-60-120-60s-120 60-120 60z" fill="#003478"/></svg>',
            'zh-cn': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#de2910"/><polygon fill="#ffde00" points="120,60 148,146 76,93 164,93 92,146"/></svg>',
            'zh-tw': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#de2910"/><polygon fill="#ffde00" points="120,60 148,146 76,93 164,93 92,146"/></svg>',
            'pl': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="240" fill="#ffffff"/><rect width="640" height="240" y="240" fill="#dc143c"/></svg>',
            'uk': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="240" fill="#0057b7"/><rect width="640" height="240" y="240" fill="#ffd700"/></svg>',
            'nl': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="160" fill="#AE1C28"/><rect width="640" height="160" y="160" fill="#ffffff"/><rect width="640" height="160" y="320" fill="#21468B"/></svg>',
            'sv-se': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#005293"/><rect width="106.7" height="480" x="186.7" fill="#fecb00"/><rect width="640" height="96" y="192" fill="#fecb00"/></svg>',
            'da': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#c8102e"/><rect width="68.6" height="480" x="182.9" fill="#ffffff"/><rect width="640" height="68.6" y="205.7" fill="#ffffff"/></svg>',
            'fi': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#ffffff"/><rect width="106.7" height="480" x="186.7" fill="#003580"/><rect width="640" height="106.7" y="186.7" fill="#003580"/></svg>',
            'no': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#ba0c2f"/><path stroke="#fff" stroke-width="120" d="M0 240h640M200 0v480"/><path stroke="#00205b" stroke-width="60" d="M0 240h640M200 0v480"/></svg>',
            'el': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#005bae"/><path stroke="#fff" stroke-width="53.3" d="M0 80h640M0 186.7h640M0 293.3h640M0 400h640M0 0h266.7v266.7H0z"/><path stroke="#fff" stroke-width="53.3" d="M133.3 0v266.7M0 133.3h266.7"/></svg>',
            'ro': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="213.3" height="480" fill="#002B7F"/><rect width="213.3" height="480" x="213.3" fill="#FCD116"/><rect width="213.3" height="480" x="426.6" fill="#CE1126"/></svg>',
            'hu': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="160" fill="#CE2939"/><rect width="640" height="160" y="160" fill="#ffffff"/><rect width="640" height="160" y="320" fill="#477050"/></svg>',
            'cs': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="240" fill="#ffffff"/><rect width="640" height="240" y="240" fill="#d7141a"/><polygon fill="#11457e" points="0,0 320,240 0,480"/></svg>',
            'vi': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="480" fill="#da251d"/><polygon fill="#ffff00" points="320,80 367,225 519,225 396,314 443,459 320,370 197,459 244,314 121,225 273,225"/></svg>',
            'th': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="80" fill="#A51931"/><rect width="640" height="80" y="80" fill="#F4F5F8"/><rect width="640" height="160" y="160" fill="#2D2A4A"/><rect width="640" height="80" y="320" fill="#F4F5F8"/><rect width="640" height="80" y="400" fill="#A51931"/></svg>',
            'id': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="240" fill="#e70011"/><rect width="640" height="240" y="240" fill="#ffffff"/></svg>',
            'bg': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="160" fill="#ffffff"/><rect width="640" height="160" y="160" fill="#00966E"/><rect width="640" height="160" y="320" fill="#D62612"/></svg>',
            'hr': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="160" fill="#ff0000"/><rect width="640" height="160" y="160" fill="#ffffff"/><rect width="640" height="160" y="320" fill="#171796"/></svg>',
            'lt': '<svg class="flag-icon" width="16" height="12" viewBox="0 0 640 480"><rect width="640" height="160" fill="#FDB913"/><rect width="640" height="160" y="160" fill="#006A44"/><rect width="640" height="160" y="320" fill="#C1272D"/></svg>'
        };
        if (flagSvgs[clean]) return flagSvgs[clean];
        const prefix = clean.split('-')[0];
        if (prefix === 'en') return flagSvgs['en-us'];
        return flagSvgs[prefix] || '';
    }

    function getFriendlyNitroName(account) {
        if (!account.premium_type) return getTranslation('account.nitroNone') || 'None';
        let baseName = '';
        if (account.premium_type === 1) {
            baseName = getTranslation('account.nitroClassic') || 'Nitro Classic';
        } else if (account.premium_type === 2) {
            baseName = getTranslation('account.nitroBoost') || 'Nitro Boost';
        } else if (account.premium_type === 3) {
            baseName = getTranslation('account.nitroBasic') || 'Nitro Basic';
        } else {
            baseName = 'Nitro';
        }

        if (account.premium_since) {
            try {
                const pDate = new Date(account.premium_since);
                if (!isNaN(pDate.getTime())) {
                    const langMap = {
                        'tr': 'tr-TR',
                        'de': 'de-DE',
                        'es': 'es-ES',
                        'fr': 'fr-FR',
                        'pt': 'pt-BR',
                        'ru': 'ru-RU'
                    };
                    const locale = (currentLang && langMap[currentLang]) ? langMap[currentLang] : 'en-US';
                    const dateFormatted = pDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
                    const sinceTemplate = getTranslation('account.nitroSince') || 'since {date}';
                    return `${baseName} (${sinceTemplate.replace('{date}', dateFormatted)})`;
                }
            } catch (e) {}
        }
        return baseName;
    }

    function updateAccountDetailsStatusUI(status) {
        const statusImg = document.getElementById('accountDetailsStatusIndicator');
        if (!statusImg) return;
        const validStatuses = ['online', 'idle', 'dnd', 'invisible', 'offline'];
        const current = validStatuses.includes(status) ? status : 'offline';
        const file = (current === 'invisible') ? 'offline' : current;
        statusImg.src = `assets/status/${file}.webp`;
        const tooltip = getTranslation(`status.${current}`) || current;
        statusImg.title = tooltip;
        statusImg.alt = tooltip;
    }

    function renderAccountBanner(account) {
        const bannerEl = document.getElementById('accountDetailsBanner');
        if (!bannerEl) return;

        const effectiveId = getEffectiveUserId(account);
        const bannerHash = account.banner;

        let hexColor = null;
        if (account.banner_color) {
            hexColor = account.banner_color;
        } else if (account.accent_color !== null && account.accent_color !== undefined) {
            hexColor = '#' + Number(account.accent_color).toString(16).padStart(6, '0');
        }

        if (bannerHash && effectiveId) {
            const ext = String(bannerHash).startsWith('a_') ? 'gif' : 'png';
            const bannerUrl = `https://cdn.discordapp.com/banners/${effectiveId}/${bannerHash}.${ext}?size=480`;
            bannerEl.style.backgroundImage = `url('${bannerUrl}')`;
            bannerEl.style.backgroundColor = hexColor || '#1e1f22';
            bannerEl.classList.add('has-custom-banner');
            bannerEl.title = getTranslation('account.copyBannerUrl') || 'Copy Banner URL';
        } else if (hexColor) {
            bannerEl.style.backgroundImage = 'none';
            bannerEl.style.backgroundColor = hexColor;
            bannerEl.classList.remove('has-custom-banner');
            bannerEl.title = '';
        } else {
            bannerEl.style.backgroundImage = '';
            bannerEl.style.backgroundColor = '';
            bannerEl.classList.remove('has-custom-banner');
            bannerEl.title = '';
        }
    }

    function renderAccountDetailsBadges(acc) {
        const badgesContainer = document.getElementById('accountDetailsBadges');
        if (!badgesContainer || !acc) return;
        const badgeData = getAccountBadgesSplit(acc);
        const visibleHtml = badgeData.visible
            .map(b => `<img src="${b.icon}" class="badge-icon" data-badge-id="${escapeHtml(b.id)}" alt="${escapeHtml(b.name)}">`)
            .join('');
        let hiddenHtml = '';
        if (badgeData.hidden.length > 0) {
            const hiddenIcons = badgeData.hidden
                .map(b => `<img src="${b.icon}" class="badge-icon hidden-badge-icon" data-badge-id="${escapeHtml(b.id)}" alt="${escapeHtml(b.name)}">`)
                .join('');
            hiddenHtml = `
                <div class="account-details-hidden-badges">
                    <svg class="account-details-hidden-eye" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                    ${hiddenIcons}
                </div>
            `;
        }
        badgesContainer.innerHTML = visibleHtml + hiddenHtml;
        bindBadgeContainerData(badgesContainer, acc, [...badgeData.visible, ...badgeData.hidden]);
    }

    function openAccountDetailsModal(acc) {
        if (!acc) return;
        activeDetailsAccount = acc;
        const modal = document.getElementById('accountDetailsModal');
        if (!modal) return;

        applyTranslations();

        const avatarEl = document.getElementById('accountDetailsAvatar');
        const statusDotEl = document.getElementById('accountDetailsStatusIndicator');
        const globalNameEl = document.getElementById('accountDetailsGlobalName');
        const usernameEl = document.getElementById('accountDetailsUsername');

        const createdDateEl = document.getElementById('accountDetailsCreatedDate');
        const idEl = document.getElementById('accountDetailsId');
        const tokenEl = document.getElementById('accountDetailsToken');
        const tokenBadgeEl = document.getElementById('accountDetailsTokenBadge');

        const copyAccountIdBtnEl = document.getElementById('copyAccountIdBtn');
        const copyAccountTokenBtnEl = document.getElementById('copyAccountTokenBtn');
        const avatarWrapEl = document.getElementById('accountDetailsAvatarWrap');

        if (copyAccountIdBtnEl) copyAccountIdBtnEl.title = getTranslation('account.copyId') || 'Copy ID';
        if (copyAccountTokenBtnEl) copyAccountTokenBtnEl.title = getTranslation('account.copyToken') || 'Copy Token';
        if (avatarWrapEl) avatarWrapEl.title = getTranslation('account.copyAvatarUrl') || 'Copy Avatar URL';

        if (avatarEl) avatarEl.src = getAccountAvatarUrl(acc, 64);
        if (globalNameEl) globalNameEl.textContent = acc.global_name || acc.username || getTranslation('account.unknown');
        if (usernameEl) {
            usernameEl.textContent = `@${acc.username || ''}`;
        }

        renderAccountDetailsBadges(acc);
        if (needsBadgeDataUpgrade(acc)) {
            upgradeAccountBadgeDataIfNeeded(acc);
        }

        const effectiveId = getEffectiveUserId(acc);
        if (idEl) idEl.textContent = effectiveId || '-';

        isDetailsTokenVisible = false;
        if (tokenEl) {
            tokenEl.textContent = '••••••••••••••••';
            tokenEl.classList.remove('unmasked');
            tokenEl.classList.add('masked');
        }
        updateTokenEyeIcon();

        if (acc.invalid) {
            if (tokenBadgeEl) {
                tokenBadgeEl.className = 'token-status-pill invalid';
                tokenBadgeEl.textContent = getTranslation('account.statusInvalid') || 'Invalid';
            }
            updateAccountDetailsStatusUI('offline');
        } else {
            if (tokenBadgeEl) {
                tokenBadgeEl.className = 'token-status-pill valid';
                tokenBadgeEl.textContent = getTranslation('account.statusValid') || 'Valid';
            }
            updateAccountDetailsStatusUI(acc.status || 'offline');
        }

        renderAccountInfoFields(acc);
        renderAccountBanner(acc);

        if (!acc.invalid && acc.token) {
            fetch('https://discord.com/api/v9/users/@me/settings', {
                headers: { 'Authorization': acc.token }
            }).then(res => {
                if (res.ok) return res.json();
                return null;
            }).then(settingsData => {
                if (settingsData && settingsData.status) {
                    acc.status = settingsData.status;
                    const existingIdx = accounts.findIndex(a => a.id === acc.id || a.token === acc.token);
                    if (existingIdx !== -1) {
                        accounts[existingIdx] = {
                            ...accounts[existingIdx],
                            status: acc.status
                        };
                        chrome.storage.local.set({ discordAccounts: accounts });
                    }

                    if (activeDetailsAccount && (activeDetailsAccount.id === acc.id || activeDetailsAccount.token === acc.token)) {
                        updateAccountDetailsStatusUI(acc.status);
                    }
                }
            }).catch(() => {});

            if (acc.email === undefined || acc.banner === undefined) {
                fetch('https://discord.com/api/v10/users/@me', {
                    headers: { 'Authorization': acc.token }
                }).then(res => {
                    if (res.ok) return res.json();
                    return null;
                }).then(userData => {
                    if (userData) {
                        acc.email = userData.email || null;
                        acc.phone = userData.phone || null;
                        acc.verified = !!userData.verified;
                        acc.mfa_enabled = !!userData.mfa_enabled;
                        acc.locale = userData.locale || null;
                        acc.banner = userData.banner || null;
                        acc.banner_color = userData.banner_color || null;
                        acc.accent_color = userData.accent_color !== undefined ? userData.accent_color : null;

                        const existingIdx = accounts.findIndex(a => a.id === acc.id || a.token === acc.token);
                        if (existingIdx !== -1) {
                            accounts[existingIdx] = {
                                ...accounts[existingIdx],
                                email: acc.email,
                                phone: acc.phone,
                                verified: acc.verified,
                                mfa_enabled: acc.mfa_enabled,
                                locale: acc.locale,
                                banner: acc.banner,
                                banner_color: acc.banner_color,
                                accent_color: acc.accent_color
                            };
                            chrome.storage.local.set({ discordAccounts: accounts });
                        }

                        if (activeDetailsAccount && (activeDetailsAccount.id === acc.id || activeDetailsAccount.token === acc.token)) {
                            renderAccountInfoFields(acc);
                            renderAccountBanner(acc);
                        }
                    }
                }).catch(() => {});
            }
        }

        modal.style.display = 'flex';
    }

    function renderAccountInfoFields(account) {
        const createdDateEl = document.getElementById('accountDetailsCreatedDate');
        const emailEl = document.getElementById('accountDetailsEmail');
        const emailVerifiedEl = document.getElementById('accountDetailsEmailVerified');
        const copyEmailBtn = document.getElementById('copyAccountEmailBtn');
        const phoneEl = document.getElementById('accountDetailsPhone');
        const copyPhoneBtn = document.getElementById('copyAccountPhoneBtn');
        const mfaEl = document.getElementById('accountDetailsMfa');
        const nitroEl = document.getElementById('accountDetailsNitro');
        const folderRow = document.getElementById('accountDetailsFolderRow');
        const folderDotEl = document.getElementById('accountDetailsFolderDot');
        const folderNameEl = document.getElementById('accountDetailsFolderName');

        const effectiveId = getEffectiveUserId(account);
        if (createdDateEl) {
            createdDateEl.textContent = getDiscordCreationDateWithAge(effectiveId) || '-';
        }

        if (emailEl) {
            if (account.email) {
                emailEl.textContent = account.email;
                emailEl.title = account.email;
                if (emailVerifiedEl) {
                    emailVerifiedEl.style.display = account.verified ? 'inline-flex' : 'none';
                    emailVerifiedEl.title = account.verified 
                        ? (getTranslation('account.verified') || 'Verified') 
                        : (getTranslation('account.unverified') || 'Unverified');
                }
                if (copyEmailBtn) {
                    copyEmailBtn.style.display = 'inline-flex';
                    copyEmailBtn.title = getTranslation('account.copyEmail') || 'Copy Email';
                }
            } else if (account.email === null) {
                emailEl.textContent = getTranslation('account.notLinked') || 'None';
                emailEl.title = '';
                if (emailVerifiedEl) emailVerifiedEl.style.display = 'none';
                if (copyEmailBtn) copyEmailBtn.style.display = 'none';
            } else {
                emailEl.textContent = '-';
                emailEl.title = '';
                if (emailVerifiedEl) emailVerifiedEl.style.display = 'none';
                if (copyEmailBtn) copyEmailBtn.style.display = 'none';
            }
        }

        if (phoneEl) {
            if (account.phone) {
                phoneEl.textContent = account.phone;
                phoneEl.title = account.phone;
                if (copyPhoneBtn) {
                    copyPhoneBtn.style.display = 'inline-flex';
                    copyPhoneBtn.title = getTranslation('account.copyPhone') || 'Copy Phone';
                }
            } else if (account.phone === null) {
                phoneEl.textContent = getTranslation('account.notLinked') || 'None';
                phoneEl.title = '';
                if (copyPhoneBtn) copyPhoneBtn.style.display = 'none';
            } else {
                phoneEl.textContent = '-';
                phoneEl.title = '';
                if (copyPhoneBtn) copyPhoneBtn.style.display = 'none';
            }
        }

        if (mfaEl) {
            if (account.mfa_enabled) {
                mfaEl.className = 'account-info-pill enabled';
                mfaEl.textContent = getTranslation('account.mfaEnabled') || 'Enabled';
            } else {
                mfaEl.className = 'account-info-pill disabled';
                mfaEl.textContent = getTranslation('account.mfaDisabled') || 'Disabled';
            }
        }

        if (nitroEl) {
            nitroEl.textContent = getFriendlyNitroName(account);
        }

        const localeEl = document.getElementById('accountDetailsLocale');
        const localeFlagEl = document.getElementById('accountDetailsLocaleFlag');
        if (localeEl) {
            localeEl.textContent = getFriendlyLocaleName(account.locale);
        }
        if (localeFlagEl) {
            const flagSvg = getLocaleFlagSvg(account.locale);
            if (flagSvg) {
                localeFlagEl.innerHTML = flagSvg;
                localeFlagEl.style.display = 'inline-flex';
            } else {
                localeFlagEl.innerHTML = '';
                localeFlagEl.style.display = 'none';
            }
        }

        updateDetailsFolderUI(account);
    }

    function updateDetailsFolderUI(acc) {
        const folderDotEl = document.getElementById('accountDetailsFolderDot');
        const folderNameEl = document.getElementById('accountDetailsFolderName');
        const folderBtn = document.getElementById('accountDetailsFolderBtn');
        if (!folderDotEl || !folderNameEl) return;

        const uncategorizedText = getTranslation('addToken.noFolder') || 'Uncategorized';
        const folder = folders.find(f => f.id === acc.folderId);

        if (folder) {
            folderNameEl.textContent = folder.name;
            folderDotEl.className = 'folder-dot ' + (folder.color || 'blue');
            if (folderBtn) folderBtn.title = `${getTranslation('account.folder') || 'Folder'}: ${folder.name}`;
        } else {
            folderNameEl.textContent = uncategorizedText;
            folderDotEl.className = 'folder-dot';
            if (folderBtn) folderBtn.title = getTranslation('account.folder') || 'Folder';
        }
    }

    function renderFolderDropdownOptions(acc) {
        const dropdown = document.getElementById('accountDetailsFolderDropdown');
        if (!dropdown) return;
        dropdown.innerHTML = '';

        const uncategorizedText = getTranslation('addToken.noFolder') || 'Uncategorized';
        const isUncategorized = !acc.folderId;

        const uncatEl = document.createElement('div');
        uncatEl.className = `account-details-folder-option${isUncategorized ? ' active' : ''}`;
        uncatEl.innerHTML = `
            <span class="folder-dot"></span>
            <span class="folder-opt-name">${uncategorizedText}</span>
            ${isUncategorized ? '<svg class="folder-opt-check" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
        `;
        uncatEl.addEventListener('click', (e) => {
            e.stopPropagation();
            changeAccountFolder(acc, null);
        });
        dropdown.appendChild(uncatEl);

        folders.forEach(f => {
            const isActive = acc.folderId === f.id;
            const optEl = document.createElement('div');
            optEl.className = `account-details-folder-option${isActive ? ' active' : ''}`;
            optEl.innerHTML = `
                <span class="folder-dot ${f.color || 'blue'}"></span>
                <span class="folder-opt-name">${escapeHtml(f.name)}</span>
                ${isActive ? '<svg class="folder-opt-check" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
            `;
            optEl.addEventListener('click', (e) => {
                e.stopPropagation();
                changeAccountFolder(acc, f.id);
            });
            dropdown.appendChild(optEl);
        });
    }

    function changeAccountFolder(acc, newFolderId) {
        acc.folderId = newFolderId || null;
        const existingIdx = accounts.findIndex(a => a.id === acc.id || a.token === acc.token);
        if (existingIdx !== -1) {
            accounts[existingIdx] = {
                ...accounts[existingIdx],
                folderId: acc.folderId
            };
            chrome.storage.local.set({ discordAccounts: accounts }, () => {
                renderAccounts();
            });
        }
        updateDetailsFolderUI(acc);
        closeFolderDropdown();
    }

    function toggleFolderDropdown() {
        const wrap = document.getElementById('accountDetailsFolderWrap');
        const dropdown = document.getElementById('accountDetailsFolderDropdown');
        if (!wrap || !dropdown || !activeDetailsAccount) return;

        const isOpen = wrap.classList.contains('open');
        if (isOpen) {
            closeFolderDropdown();
        } else {
            renderFolderDropdownOptions(activeDetailsAccount);
            wrap.classList.add('open');
            dropdown.style.display = 'flex';
        }
    }

    function closeFolderDropdown() {
        const wrap = document.getElementById('accountDetailsFolderWrap');
        const dropdown = document.getElementById('accountDetailsFolderDropdown');
        if (wrap) wrap.classList.remove('open');
        if (dropdown) dropdown.style.display = 'none';
    }

    function closeAccountDetailsModal() {
        hideBadgeHoverCard();
        closeFolderDropdown();
        const modal = document.getElementById('accountDetailsModal');
        if (modal) modal.style.display = 'none';
        activeDetailsAccount = null;
        isDetailsTokenVisible = false;
    }

    function toggleDetailsTokenVisibility() {
        const tokenEl = document.getElementById('accountDetailsToken');
        if (!tokenEl || !activeDetailsAccount) return;
        isDetailsTokenVisible = !isDetailsTokenVisible;
        if (isDetailsTokenVisible) {
            tokenEl.textContent = activeDetailsAccount.token || '';
            tokenEl.classList.remove('masked');
            tokenEl.classList.add('unmasked');
        } else {
            tokenEl.textContent = '••••••••••••••••';
            tokenEl.classList.remove('unmasked');
            tokenEl.classList.add('masked');
        }
        updateTokenEyeIcon();
    }

    function updateTokenEyeIcon() {
        const eyeBtn = document.getElementById('toggleAccountTokenVisibilityBtn');
        if (!eyeBtn) return;
        if (isDetailsTokenVisible) {
            eyeBtn.title = getTranslation('account.hideToken') || 'Hide Token';
            eyeBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;
        } else {
            eyeBtn.title = getTranslation('account.showToken') || 'Show Token';
            eyeBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
        }
    }

    function copyTextWithFeedback(text, buttonEl, originalKey) {
        if (!text || !buttonEl) return;
        const origSvg = buttonEl.querySelector('svg');
        const origHtml = origSvg ? origSvg.outerHTML : buttonEl.innerHTML;
        const origTitle = buttonEl.title;

        const onSuccess = () => {
            buttonEl.classList.add('copied');
            buttonEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            buttonEl.title = getTranslation('settings.copied') || 'Copied! ✔';
            setTimeout(() => {
                buttonEl.classList.remove('copied');
                buttonEl.innerHTML = origHtml;
                buttonEl.title = getTranslation(originalKey) || origTitle;
            }, 1500);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
                fallbackCopy();
            });
        } else {
            fallbackCopy();
        }

        function fallbackCopy() {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                onSuccess();
            } catch (err) { }
        }
    }

    function copyAccountAvatarUrl() {
        if (!activeDetailsAccount) return;
        const avatarUrl = getAccountAvatarUrl(activeDetailsAccount, 1024);
        if (!avatarUrl) return;

        const avatarWrap = document.getElementById('accountDetailsAvatarWrap');
        const overlay = document.getElementById('accountDetailsAvatarOverlay');
        const origOverlayHtml = overlay ? overlay.innerHTML : '';
        const origTitle = avatarWrap ? avatarWrap.title : '';

        const checkmarkSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        const copiedText = getTranslation('account.copied') || 'Copied!';

        const onSuccess = () => {
            if (avatarWrap) {
                avatarWrap.classList.add('copied');
                avatarWrap.title = copiedText;
            }
            if (overlay) {
                overlay.innerHTML = checkmarkSvg;
            }

            setTimeout(() => {
                if (avatarWrap) {
                    avatarWrap.classList.remove('copied');
                    avatarWrap.title = getTranslation('account.copyAvatarUrl') || origTitle;
                }
                if (overlay) {
                    overlay.innerHTML = origOverlayHtml;
                }
            }, 1500);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(avatarUrl).then(onSuccess).catch(() => {
                fallbackCopy(avatarUrl, onSuccess);
            });
        } else {
            fallbackCopy(avatarUrl, onSuccess);
        }

        function fallbackCopy(val, cb) {
            try {
                const ta = document.createElement('textarea');
                ta.value = val;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                cb();
            } catch (err) {}
        }
    }

    function copyAccountBannerUrl() {
        if (!activeDetailsAccount || !activeDetailsAccount.banner) return;
        const effectiveId = getEffectiveUserId(activeDetailsAccount);
        if (!effectiveId) return;

        const ext = String(activeDetailsAccount.banner).startsWith('a_') ? 'gif' : 'png';
        const bannerUrl = `https://cdn.discordapp.com/banners/${effectiveId}/${activeDetailsAccount.banner}.${ext}?size=1024`;

        const bannerEl = document.getElementById('accountDetailsBanner');
        const overlay = document.getElementById('accountDetailsBannerOverlay');
        const origOverlayHtml = overlay ? overlay.innerHTML : '';
        const origTitle = bannerEl ? bannerEl.title : '';

        const checkmarkSvg = `<svg class="banner-overlay-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        const copiedText = getTranslation('account.copied') || 'Copied!';

        const onSuccess = () => {
            if (bannerEl) {
                bannerEl.classList.add('copied');
                bannerEl.title = copiedText;
            }
            if (overlay) {
                overlay.innerHTML = checkmarkSvg;
            }

            setTimeout(() => {
                if (bannerEl) {
                    bannerEl.classList.remove('copied');
                    bannerEl.title = getTranslation('account.copyBannerUrl') || origTitle;
                }
                if (overlay) {
                    overlay.innerHTML = origOverlayHtml;
                }
            }, 1500);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(bannerUrl).then(onSuccess).catch(() => {
                fallbackCopy(bannerUrl, onSuccess);
            });
        } else {
            fallbackCopy(bannerUrl, onSuccess);
        }

        function fallbackCopy(val, cb) {
            try {
                const ta = document.createElement('textarea');
                ta.value = val;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                cb();
            } catch (err) {}
        }
    }

    let updateTargetAccount = null;

    function openUpdateTokenModal(acc) {
        updateTargetAccount = acc;
        const modal = document.getElementById('updateTokenModal');
        const avatar = document.getElementById('updateTokenAvatar');
        const nameEl = document.getElementById('updateTokenAccountName');
        const input = document.getElementById('updateTokenInput');
        const errorEl = document.getElementById('updateTokenError');
        const submitBtn = document.getElementById('submitUpdateTokenBtn');

        if (!modal) return;

        if (avatar) avatar.src = getAccountAvatarUrl(acc, 64);
        if (nameEl) nameEl.textContent = acc.global_name ? `${acc.global_name} (@${acc.username})` : (acc.username || 'Account');
        if (input) input.value = '';
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = getTranslation('account.updateToken');
        }

        modal.style.display = 'flex';
        setTimeout(() => { if (input) input.focus(); }, 60);
    }

    function closeUpdateTokenModal() {
        const modal = document.getElementById('updateTokenModal');
        if (modal) modal.style.display = 'none';
        updateTargetAccount = null;
    }

    async function submitUpdateToken() {
        if (!updateTargetAccount) return;
        const input = document.getElementById('updateTokenInput');
        const errorEl = document.getElementById('updateTokenError');
        const submitBtn = document.getElementById('submitUpdateTokenBtn');

        const rawToken = input ? input.value.trim().replace(/^["']|["']$/g, '') : '';
        if (!rawToken) {
            if (errorEl) {
                errorEl.textContent = getTranslation('addToken.invalid') || 'Invalid token.';
                errorEl.style.display = 'block';
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = getTranslation('settings.checking') || 'Checking...';
        }
        if (errorEl) errorEl.style.display = 'none';

        const result = await validateToken(rawToken, true);

        if (result && result.valid && result.data) {
            const userData = result.data;
            if (updateTargetAccount.id && userData.id && updateTargetAccount.id !== userData.id) {
                if (errorEl) {
                    errorEl.textContent = getTranslation('account.updateTokenMismatch') || 'This token belongs to a different account!';
                    errorEl.style.display = 'block';
                }
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = getTranslation('account.updateToken');
                }
                return;
            }

            const existingIdx = accounts.findIndex(a => a.id === updateTargetAccount.id || a.token === updateTargetAccount.token);
            if (existingIdx !== -1) {
                const existing = accounts[existingIdx];
                accounts[existingIdx] = applyUserDataToAccount(existing, userData, rawToken);
                await saveAccounts(accounts);
            }

            closeUpdateTokenModal();
        } else {
            if (errorEl) {
                errorEl.textContent = getTranslation('addToken.invalid') || 'Invalid token. Please try again.';
                errorEl.style.display = 'block';
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = getTranslation('account.updateToken');
            }
        }
    }

    const cancelUpdateTokenBtn = document.getElementById('cancelUpdateTokenBtn');
    const submitUpdateTokenBtn = document.getElementById('submitUpdateTokenBtn');
    const updateTokenModal = document.getElementById('updateTokenModal');
    const updateTokenInput = document.getElementById('updateTokenInput');

    if (cancelUpdateTokenBtn) cancelUpdateTokenBtn.addEventListener('click', closeUpdateTokenModal);
    if (submitUpdateTokenBtn) submitUpdateTokenBtn.addEventListener('click', submitUpdateToken);
    if (updateTokenModal) {
        updateTokenModal.addEventListener('click', (e) => {
            if (e.target === updateTokenModal) closeUpdateTokenModal();
        });
    }
    if (updateTokenInput) {
        updateTokenInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitUpdateToken();
            }
        });
    }

    const closeAccountDetailsBtn = document.getElementById('closeAccountDetailsBtn');
    const copyAccountIdBtn = document.getElementById('copyAccountIdBtn');
    const copyAccountTokenBtn = document.getElementById('copyAccountTokenBtn');
    const copyAccountEmailBtn = document.getElementById('copyAccountEmailBtn');
    const copyAccountPhoneBtn = document.getElementById('copyAccountPhoneBtn');
    const accountDetailsBanner = document.getElementById('accountDetailsBanner');
    const accountDetailsAvatarWrap = document.getElementById('accountDetailsAvatarWrap');
    const toggleAccountTokenVisibilityBtn = document.getElementById('toggleAccountTokenVisibilityBtn');
    const accountDetailsFolderBtn = document.getElementById('accountDetailsFolderBtn');
    const accountDetailsModal = document.getElementById('accountDetailsModal');

    if (closeAccountDetailsBtn) closeAccountDetailsBtn.addEventListener('click', closeAccountDetailsModal);
    if (toggleAccountTokenVisibilityBtn) toggleAccountTokenVisibilityBtn.addEventListener('click', toggleDetailsTokenVisibility);

    if (accountDetailsFolderBtn) {
        accountDetailsFolderBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFolderDropdown();
        });
    }

    document.addEventListener('click', (e) => {
        const wrap = document.getElementById('accountDetailsFolderWrap');
        if (wrap && !wrap.contains(e.target)) {
            closeFolderDropdown();
        }
    });

    if (accountDetailsAvatarWrap) {
        accountDetailsAvatarWrap.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target && e.target.id === 'accountDetailsStatusIndicator') return;
            copyAccountAvatarUrl();
        });
    }

    if (accountDetailsBanner) {
        accountDetailsBanner.addEventListener('click', (e) => {
            if (!accountDetailsBanner.classList.contains('has-custom-banner')) return;
            copyAccountBannerUrl();
        });
    }

    if (copyAccountIdBtn) {
        copyAccountIdBtn.addEventListener('click', () => {
            if (!activeDetailsAccount) return;
            const id = getEffectiveUserId(activeDetailsAccount);
            copyTextWithFeedback(id, copyAccountIdBtn, 'account.copyId');
        });
    }

    if (copyAccountTokenBtn) {
        copyAccountTokenBtn.addEventListener('click', () => {
            if (!activeDetailsAccount || !activeDetailsAccount.token) return;
            copyTextWithFeedback(activeDetailsAccount.token, copyAccountTokenBtn, 'account.copyToken');
        });
    }

    if (copyAccountEmailBtn) {
        copyAccountEmailBtn.addEventListener('click', () => {
            if (!activeDetailsAccount || !activeDetailsAccount.email) return;
            copyTextWithFeedback(activeDetailsAccount.email, copyAccountEmailBtn, 'account.copyEmail');
        });
    }

    if (copyAccountPhoneBtn) {
        copyAccountPhoneBtn.addEventListener('click', () => {
            if (!activeDetailsAccount || !activeDetailsAccount.phone) return;
            copyTextWithFeedback(activeDetailsAccount.phone, copyAccountPhoneBtn, 'account.copyPhone');
        });
    }

    if (accountDetailsModal) {
        accountDetailsModal.addEventListener('click', (e) => {
            if (e.target === accountDetailsModal) closeAccountDetailsModal();
        });
        const detailsCardEl = accountDetailsModal.querySelector('.account-details-card');
        if (detailsCardEl) {
            detailsCardEl.addEventListener('scroll', hideBadgeHoverCard, { passive: true });
        }
    }

    const accountDetailsBadgesEl = document.getElementById('accountDetailsBadges');
    if (accountDetailsBadgesEl) {
        accountDetailsBadgesEl.addEventListener('click', (e) => {
            const iconEl = e.target.closest('.badge-icon');
            if (!iconEl || !activeDetailsAccount) return;
            e.stopPropagation();
            hideBadgeHoverCard();
            openBadgesModal(activeDetailsAccount, iconEl.dataset.badgeId);
        });
    }

    const badgesModalEl = document.getElementById('badgesModal');
    const closeBadgesModalBtn = document.getElementById('closeBadgesModalBtn');
    const badgesModalGridEl = document.getElementById('badgesModalGrid');
    const badgesModalSidebarEl = badgesModalEl ? badgesModalEl.querySelector('.badges-modal-sidebar') : null;
    const badgesModalDetailEl = document.getElementById('badgesModalDetail');
    if (closeBadgesModalBtn) closeBadgesModalBtn.addEventListener('click', closeBadgesModal);
    if (badgesModalEl) {
        badgesModalEl.addEventListener('click', (e) => {
            if (e.target === badgesModalEl) closeBadgesModal();
        });
    }
    if (badgesModalGridEl) {
        badgesModalGridEl.addEventListener('click', (e) => {
            const tile = e.target.closest('.badges-grid-tile');
            if (!tile || !activeBadgesModalState) return;
            const bid = tile.dataset.badgeId;
            if (!bid || bid === activeBadgesModalState.selectedId) return;
            activeBadgesModalState.selectedId = bid;
            renderBadgesModalGrid();
            renderBadgesModalDetail();
        });
    }
    if (badgesModalSidebarEl) badgesModalSidebarEl.addEventListener('scroll', hideBadgeHoverCard, { passive: true });
    if (badgesModalDetailEl) badgesModalDetailEl.addEventListener('scroll', hideBadgeHoverCard, { passive: true });

    document.addEventListener('mouseover', (e) => {
        if (isBadgesModalOpen()) return;
        const trigger = e.target && e.target.closest ? e.target.closest('.badge-icon') : null;
        if (!trigger || trigger === activeHoverAnchor) return;
        const badgeObj = resolveHoveredBadgeObject(trigger);
        if (!badgeObj) return;
        hideBadgeHoverCard();
        activeHoverAnchor = trigger;
        badgeHoverShowTimer = setTimeout(() => {
            badgeHoverShowTimer = null;
            if (activeHoverAnchor !== trigger || isBadgesModalOpen() || trigger.isConnected === false) return;
            const latestBadge = resolveHoveredBadgeObject(trigger) || badgeObj;
            showBadgeHoverCard(trigger, latestBadge);
        }, HOVER_PREVIEW_DELAY_MS);
    });
    document.addEventListener('mouseout', (e) => {
        if (!activeHoverAnchor) return;
        const fromTrigger = e.target && e.target.closest ? e.target.closest('.badge-icon') : null;
        if (!fromTrigger || fromTrigger !== activeHoverAnchor) return;
        const toTrigger = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.badge-icon') : null;
        if (toTrigger === activeHoverAnchor) return;
        hideBadgeHoverCard();
    });
    window.addEventListener('blur', hideBadgeHoverCard);

    deleteAllBtn.addEventListener('click', async () => {
        if (accounts.length === 0 && folders.length === 0) return;

        const confirmed = await showConfirmDialog(
            getTranslation('confirm.title'),
            getTranslation('confirm.msg'),
            getTranslation('confirm.delete')
        );

        if (confirmed) {
            chrome.storage.local.set({
                discordAccounts: [],
                discordFolders: [],
                collapsedFolders: []
            }, () => {
                accounts = [];
                folders = [];
                collapsedFolders = [];
                renderAccounts();
            });
        }
    });

    saveTokenBtn.addEventListener('click', async () => {
        if (isBulkAddRunning) return;

        const tokens = parseTokensFromInput(tokenInput.value);

        if (tokens.length === 0) {
            errorMsg.textContent = getTranslation('addToken.enterToken') || 'Please enter a token.';
            return;
        }

        const selectedFolderId = (tokenFolderSelect && tokenFolderSelect.value) ? tokenFolderSelect.value : null;

        if (tokens.length === 1) {
            const token = tokens[0];

            if (accounts.some(a => a.token === token)) {
                errorMsg.textContent = getTranslation('actions.alreadyAdded') || 'This account is already added.';
                return;
            }

            saveTokenBtn.textContent = getTranslation('addToken.validating') || 'Validating...';
            saveTokenBtn.disabled = true;
            tokenInput.disabled = true;
            if (tokenFolderSelect) tokenFolderSelect.disabled = true;
            if (tokenFolderTrigger) tokenFolderTrigger.disabled = true;
            if (customTokenFolderSelect) customTokenFolderSelect.classList.remove('open');

            const userData = await validateToken(token);

            saveTokenBtn.textContent = getTranslation('addToken.save') || 'Save';
            saveTokenBtn.disabled = false;
            tokenInput.disabled = false;
            if (tokenFolderSelect) tokenFolderSelect.disabled = false;
            if (tokenFolderTrigger) tokenFolderTrigger.disabled = false;

            if (userData) {
                const existingIndex = accounts.findIndex(a => a.id === userData.id);
                let newAccounts;

                if (existingIndex !== -1) {
                    newAccounts = [...accounts];
                    newAccounts[existingIndex] = applyUserDataToAccount(newAccounts[existingIndex], userData, token, selectedFolderId);
                } else {
                    newAccounts = [...accounts, applyUserDataToAccount(null, userData, token, selectedFolderId)];
                }
                await saveAccounts(newAccounts);
                cancelAddBtn.click();
            } else {
                errorMsg.textContent = getTranslation('addToken.invalid') || 'Invalid token. Please try again.';
            }
            return;
        }

        errorMsg.textContent = '';
        errorMsg.style.color = '';

        chrome.runtime.sendMessage({
            type: 'START_BULK_ADD',
            tokens,
            folderId: selectedFolderId
        });

        updateBulkAddUI({
            isBulkAdding: true,
            bulkAddCurrent: 0,
            bulkAddTotal: tokens.length,
            bulkAddProgress: 0
        });
    });

    addFolderBtn.addEventListener('click', () => {
        const folderId = 'folder_' + Date.now();
        const newFolder = {
            id: folderId,
            name: getTranslation('folder.newFolder') || 'New Folder',
            isEditing: false
        };
        const newFolders = [...folders, newFolder];

        saveCollapsedFolders([...collapsedFolders, folderId]);

        getCleanRootOrder();
        rootOrder.push('folder:' + folderId);
        chrome.storage.local.set({ discordRootOrder: rootOrder });

        saveFolders(newFolders);
    });












    function switchAccount(token, accId) {
        chrome.runtime.sendMessage({
            type: 'REFRESH_ACCOUNT',
            token: token,
            accId: accId
        });

        chrome.storage.local.set({
            pendingLogin: {
                token: token,
                timestamp: Date.now()
            }
        }, () => {
            chrome.tabs.create({ url: 'https://discord.com/login' }, () => {
                window.close();
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
            renderAccounts();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.style.display = 'none';
            searchInput.focus();
            renderAccounts();
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', async () => {
            if (settingsModal) {
                await loadSettingsStatus();
                settingsModal.style.display = 'flex';
            }
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.style.display = 'none';
                document.querySelectorAll('.custom-select-container.open').forEach(el => {
                    el.classList.remove('open');
                });
            }
        });
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
                document.querySelectorAll('.custom-select-container.open').forEach(el => {
                    el.classList.remove('open');
                });
            }
        });
    }

    document.querySelectorAll('.settings-link-btn').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.href;
            if (url) {
                chrome.tabs.create({ url });
            }
        });
    });

    if (checkAllTokensBtn) {
        checkAllTokensBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'START_CHECK' });
            if (settingsProgressBarContainer) {
                settingsProgressBarContainer.style.display = 'block';
            }
            if (settingsStatusText) {
                settingsStatusText.textContent = getTranslation('settings.checking');
            }
            if (settingsLastSummary) {
                settingsLastSummary.textContent = getTranslation('settings.checking');
            }
            if (cancelCheckBtn) {
                cancelCheckBtn.style.display = 'flex';
                cancelCheckBtn.disabled = false;
            }
        });
    }

    if (cancelCheckBtn) {
        cancelCheckBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'STOP_CHECK' });
            chrome.storage.local.set({
                isChecking: false,
                cancelCheck: false,
                checkTarget: 'Canceled',
                checkProgress: 0
            });
            updateProgressUI(false, 0, 'Canceled', '', null);
            if (settingsStatusText) {
                settingsStatusText.textContent = getTranslation('settings.canceled') || 'Check canceled.';
            }
        });
    }

    function updateProgressUI(isChecking, progress, target, count, results) {
        if (!checkAllTokensBtn || !settingsProgressBarContainer || !settingsProgressBar) return;
        const settingsStatusContainer = document.getElementById('settingsStatusContainer');

        if (isChecking) {
            if (settingsStatusContainer) settingsStatusContainer.style.display = 'none';
            checkAllTokensBtn.classList.add('loading');
            checkAllTokensBtn.title = getTranslation('settings.checking');
            settingsProgressBarContainer.style.display = 'block';
            settingsProgressBar.style.width = progress + '%';
            if (settingsProgressText) settingsProgressText.textContent = target ? `${getTranslation('settings.checking')} ${target}` : getTranslation('settings.checking');
            if (settingsProgressCount) settingsProgressCount.textContent = count || '0/0';
            if (cancelCheckBtn) {
                cancelCheckBtn.style.display = 'flex';
                cancelCheckBtn.disabled = false;
                const span = cancelCheckBtn.querySelector('span');
                if (span) span.textContent = getTranslation('settings.cancelCheck');
                else cancelCheckBtn.textContent = getTranslation('settings.cancelCheck');
            }
        } else {
            if (settingsStatusContainer) settingsStatusContainer.style.display = 'block';
            checkAllTokensBtn.classList.remove('loading');
            checkAllTokensBtn.title = getTranslation('settings.checkAll');
            if (cancelCheckBtn) {
                cancelCheckBtn.style.display = 'none';
            }
            if (progress >= 100) {
                if (settingsProgressText) {
                    if (results) {
                        settingsProgressText.textContent = `${getTranslation('settings.completed')}: ${results.valid} ${getTranslation('settings.valid')}, ${results.invalid} ${getTranslation('settings.invalid')}`;
                    } else {
                        settingsProgressText.textContent = getTranslation('settings.completed');
                    }
                }
                if (settingsProgressCount) settingsProgressCount.textContent = count || '';
                settingsProgressBar.style.width = '100%';
                setTimeout(() => {
                    chrome.storage.local.get(['isChecking'], (res) => {
                        if (!res.isChecking && settingsProgressBarContainer) settingsProgressBarContainer.style.display = 'none';
                    });
                }, 4000);
            } else {
                if (settingsProgressBarContainer) settingsProgressBarContainer.style.display = 'none';
            }
        }
    }

    async function loadSettingsStatus() {
        if (!settingsStatusText || !settingsLastSummary) return;
        const settingsStatusContainer = document.getElementById('settingsStatusContainer');

        chrome.storage.local.get(['lastCheckAt', 'lastCheckResults', 'checkCount', 'isChecking', 'checkProgress', 'checkTarget', 'cancelCheck', 'discordAccounts'], (res) => {
            if (res.cancelCheck) {
                chrome.storage.local.set({ isChecking: false, cancelCheck: false, checkProgress: 0, checkTarget: 'Ready' });
                res.isChecking = false;
            }

            if (res.isChecking) {
                if (settingsStatusContainer) settingsStatusContainer.style.display = 'none';
                if (settingsProgressBarContainer) settingsProgressBarContainer.style.display = 'block';
                if (settingsProgressBar) settingsProgressBar.style.width = (res.checkProgress || 0) + '%';
                if (settingsProgressText) settingsProgressText.textContent = res.checkTarget ? `${getTranslation('settings.checking')} ${res.checkTarget}` : getTranslation('settings.checking');
                if (settingsProgressCount) settingsProgressCount.textContent = res.checkCount || '0/0';
                if (cancelCheckBtn) {
                    cancelCheckBtn.style.display = 'flex';
                    cancelCheckBtn.disabled = false;
                    const span = cancelCheckBtn.querySelector('span');
                    if (span) span.textContent = getTranslation('settings.cancelCheck');
                    else cancelCheckBtn.textContent = getTranslation('settings.cancelCheck');
                }
            } else {
                if (settingsStatusContainer) settingsStatusContainer.style.display = 'block';
                if (settingsProgressBarContainer) settingsProgressBarContainer.style.display = 'none';
                if (cancelCheckBtn) {
                    cancelCheckBtn.style.display = 'none';
                }
                if (res.lastCheckAt && res.lastCheckResults) {
                    settingsStatusText.textContent = `${getTranslation('settings.lastChecked')} ${formatDate(res.lastCheckAt)}`;
                    settingsLastSummary.textContent = `${res.lastCheckResults.valid} ${getTranslation('settings.valid')}, ${res.lastCheckResults.invalid} ${getTranslation('settings.invalid')}${res.lastCheckCount ? ` — ${res.lastCheckCount}` : ''}`;
                } else {
                    settingsStatusText.textContent = getTranslation('settings.lastCheckUnavailable');
                    settingsLastSummary.textContent = '';
                }
            }

            renderInvalidAccountsSection(res.discordAccounts || accounts);
        });
    }

    function renderInvalidAccountsSection(allAccounts) {
        const container = document.getElementById('invalidAccountsListContainer');
        if (!container) return;

        const invalidAccs = allAccounts.filter(acc => acc && acc.invalid);
        if (invalidAccs.length === 0) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = `
            <div class="invalid-section-header">
                <span class="invalid-section-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                    </svg>
                    ${getTranslation('settings.invalidAccounts')} (${invalidAccs.length})
                </span>
                <button id="deleteAllInvalidBtn" class="btn-danger-subtle">
                    ${getTranslation('settings.deleteAllInvalid')} (${invalidAccs.length})
                </button>
            </div>
            <div class="invalid-accounts-list">
                ${invalidAccs.map(acc => {
                    const avatarUrl = getAccountAvatarUrl(acc, 64);
                    return `
                        <div class="invalid-account-item">
                            <img src="${avatarUrl}" class="invalid-acc-avatar" alt="Avatar">
                            <div class="invalid-acc-info">
                                <div class="invalid-acc-name">${acc.global_name || acc.username || getTranslation('account.unknown')}</div>
                                <div class="invalid-acc-sub">${getTranslation('settings.tokenExpired')}</div>
                            </div>
                            <button class="icon-btn-sm delete-invalid-single-btn" title="${getTranslation('account.delete')}" data-token="${acc.token}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
                                    <path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
                                </svg>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        const deleteAllBtn = container.querySelector('#deleteAllInvalidBtn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                accounts = accounts.filter(acc => !acc.invalid);
                chrome.storage.local.set({ discordAccounts: accounts }, () => {
                    renderAccounts();
                    loadSettingsStatus();
                });
            });
        }

        container.querySelectorAll('.delete-invalid-single-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tokenToDelete = btn.dataset.token;
                accounts = accounts.filter(acc => acc.token !== tokenToDelete);
                chrome.storage.local.set({ discordAccounts: accounts }, () => {
                    renderAccounts();
                    loadSettingsStatus();
                });
            });
        });
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.isChecking || changes.checkProgress || changes.checkTarget || changes.checkCount || changes.checkResults) {
                chrome.storage.local.get(['isChecking', 'checkProgress', 'checkTarget', 'checkCount', 'checkResults'], (res) => {
                    updateProgressUI(res.isChecking, res.checkProgress || 0, res.checkTarget, res.checkCount, res.checkResults);
                });
            }
            if (changes.isBulkAdding || changes.bulkAddCurrent || changes.bulkAddTotal || changes.bulkAddProgress || changes.bulkAddResults || changes.bulkAddFinished) {
                chrome.storage.local.get([
                    'isBulkAdding', 'bulkAddCurrent', 'bulkAddTotal', 'bulkAddProgress',
                    'bulkAddResults', 'bulkAddFinished', 'bulkAddCompletedAt'
                ], (res) => {
                    updateBulkAddUI(res);
                });
            }
            if (changes.lastCheckAt || changes.lastCheckResults || changes.checkCount || changes.cancelCheck) {
                loadSettingsStatus();
            }
            if (changes.discordRootOrder) {
                rootOrder = changes.discordRootOrder.newValue || [];
            }
            if (changes.discordAccounts) {
                accounts = changes.discordAccounts.newValue || [];
                renderAccounts();
            }
            let shouldRenderBadgeSettings = false;
            if (changes.showBadges) {
                showBadges = changes.showBadges.newValue !== false;
                if (showBadgesToggle) {
                    showBadgesToggle.checked = showBadges;
                }
                if (!showBadges) {
                    hideBadgeHoverCard();
                    closeBadgesModal();
                }
                shouldRenderBadgeSettings = true;
            }
            if (changes.maxVisibleBadges) {
                maxVisibleBadges = clampVisibleBadgesCount(changes.maxVisibleBadges.newValue);
                shouldRenderBadgeSettings = true;
            }
            if (shouldRenderBadgeSettings) {
                updateVisibleBadgesSettingUI();
                renderAccounts();
            }
        }
    });

    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const copyTokensBtn = document.getElementById('copyTokensBtn');
    const copyTokensBtnTitle = document.getElementById('copyTokensBtnTitle');
    const backupMessage = document.getElementById('backupMessage');

    function showBackupMessage(msg, type = 'success') {
        if (!backupMessage) return;
        backupMessage.textContent = msg;
        backupMessage.className = `backup-status-banner ${type}`;
        backupMessage.style.display = 'flex';
        setTimeout(() => {
            if (backupMessage) backupMessage.style.display = 'none';
        }, 4000);
    }

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify({
                version: "2.3.0",
                exportedAt: new Date().toISOString(),
                accounts: accounts,
                folders: folders
            }, null, 2);
            downloadFile(dataStr, 'discord_accounts_backup.json', 'application/json');
            showBackupMessage(getTranslation('settings.jsonDownloaded'), 'success');
        });
    }

    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            const tokensList = accounts.map(a => a.token).filter(Boolean).join('\n');
            downloadFile(tokensList, 'discord_tokens.txt', 'text/plain');
            showBackupMessage(getTranslation('settings.txtDownloaded'), 'success');
        });
    }

    if (copyTokensBtn) {
        copyTokensBtn.addEventListener('click', () => {
            const tokensList = accounts.map(a => a.token).filter(Boolean).join('\n');
            if (!tokensList) {
                showBackupMessage(getTranslation('account.empty'), 'error');
                return;
            }
            navigator.clipboard.writeText(tokensList).then(() => {
                showBackupMessage(`${accounts.length} ${getTranslation('settings.tokensCopied')}`, 'success');
                if (copyTokensBtnTitle) {
                    const originalText = copyTokensBtnTitle.textContent;
                    copyTokensBtnTitle.textContent = getTranslation('settings.copied');
                    setTimeout(() => {
                        copyTokensBtnTitle.textContent = originalText;
                    }, 2500);
                }
            }).catch(() => {
                showBackupMessage(getTranslation('actions.failed'), 'error');
            });
        });
    }

    function downloadFile(content, fileName, contentType) {
        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    const langSelect = document.getElementById('langSelect');
    const customLangSelect = document.getElementById('customLangSelect');

    const langMap = {
        'en': { name: 'English', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><path fill="#bd3d44" d="M0 0h640v480H0z"/><path fill="#fff" d="M0 36.9h640v36.9H0zm0 73.8h640v36.9H0zm0 73.9h640v36.9H0zm0 73.8h640v36.9H0zm0 73.9h640v36.9H0zm0 73.8h640v36.9H0z"/><path fill="#192f5d" d="M0 0h280v258.5H0z"/></svg>' },
        'tr': { name: 'Türkçe', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="480" fill="#E30A17"/><circle cx="230" cy="240" r="140" fill="#ffffff"/><circle cx="265" cy="240" r="112" fill="#E30A17"/><path d="M342.3 216.7l15.6 48-40.8-29.6-40.8 29.6 15.6-48-40.8-29.7h50.4l15.6-48 15.6 48h50.4z" fill="#ffffff"/></svg>' },
        'de': { name: 'Deutsch', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="160" y="0" fill="#000000"/><rect width="640" height="160" y="160" fill="#DD0000"/><rect width="640" height="160" y="320" fill="#FFCC00"/></svg>' },
        'es': { name: 'Español', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="120" y="0" fill="#AA151B"/><rect width="640" height="240" y="120" fill="#F1BF00"/><rect width="640" height="120" y="360" fill="#AA151B"/></svg>' },
        'fr': { name: 'Français', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="213.3" height="480" x="0" fill="#002395"/><rect width="213.3" height="480" x="213.3" fill="#ffffff"/><rect width="213.3" height="480" x="426.6" fill="#ED2939"/></svg>' },
        'pt': { name: 'Português', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="256" height="480" fill="#046A38"/><rect width="384" height="480" x="256" fill="#DA291C"/><circle cx="256" cy="240" r="90" fill="#FFC72C"/><circle cx="256" cy="240" r="75" fill="#DA291C"/></svg>' },
        'ru': { name: 'Русский', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="160" y="0" fill="#ffffff"/><rect width="640" height="160" y="160" fill="#0039A6"/><rect width="640" height="160" y="320" fill="#D52B1E"/></svg>' },
        'it': { name: 'Italiano', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="213.3" height="480" fill="#009246"/><rect width="213.3" height="480" x="213.3" fill="#ffffff"/><rect width="213.3" height="480" x="426.6" fill="#ce2b37"/></svg>' },
        'ja': { name: '日本語', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="480" fill="#ffffff"/><circle cx="320" cy="240" r="144" fill="#bc002d"/></svg>' },
        'ko': { name: '한국어', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="480" fill="#ffffff"/><path fill="#cd2e3a" d="M320 120a120 120 0 01120 120c0 66.27-53.73 120-120 120a60 60 0 110-120 60 60 0 000-120z"/><path fill="#0047a0" d="M320 360a120 120 0 01-120-120c0-66.27 53.73-120 120-120a60 60 0 110 120 60 60 0 000 120z"/></svg>' },
        'pl': { name: 'Polski', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="240" fill="#ffffff"/><rect width="640" height="240" y="240" fill="#dc143c"/></svg>' },
        'zh': { name: '简体中文', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="480" fill="#de2910"/><path fill="#ffde00" d="M160 80l24.7 76h79.9l-64.6 47 24.7 76-64.7-47-64.7 47 24.7-76-64.6-47h79.9z"/></svg>' },
        'uk': { name: 'Українська', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="240" fill="#0057b7"/><rect width="640" height="240" y="240" fill="#ffd700"/></svg>' }
    };

    window.updateCustomLangSelect = function(langValue) {
        if (!customLangSelect) return;
        const triggerText = customLangSelect.querySelector('.custom-select-text');
        const triggerFlag = customLangSelect.querySelector('.lang-flag');
        const options = customLangSelect.querySelectorAll('.custom-option');

        const langData = langMap[langValue] || langMap['en'];
        if (triggerText) triggerText.textContent = langData.name;
        if (triggerFlag) triggerFlag.innerHTML = langData.flagSvg;

        options.forEach(opt => {
            if (opt.dataset.value === langValue) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    };

    if (customLangSelect) {
        const trigger = customLangSelect.querySelector('.custom-select-trigger');
        const options = customLangSelect.querySelectorAll('.custom-option');

        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const themeContainer = document.getElementById('customThemeSelect');
                if (themeContainer) closeCustomSelect(themeContainer);
                if (!customLangSelect.classList.contains('open')) {
                    adjustCustomSelectPosition(customLangSelect);
                    customLangSelect.classList.add('open');
                    const selectedOpt = customLangSelect.querySelector('.custom-option.selected');
                    if (selectedOpt) {
                        selectedOpt.scrollIntoView({ block: 'nearest' });
                    }
                } else {
                    closeCustomSelect(customLangSelect);
                }
            });

            options.forEach(opt => {
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = opt.dataset.value;
                    if (langSelect) langSelect.value = val;
                    window.updateCustomLangSelect(val);
                    setLanguage(val);
                    chrome.storage.local.set({ selectedLanguage: val });
                    closeCustomSelect(customLangSelect);
                    populateTokenFolderSelect();
                    renderAccounts();
                    loadSettingsStatus();
                    if (themeBtn && window.updateCustomThemeSelect) {
                        window.updateCustomThemeSelect(themeBtn.value);
                    }
                });
            });

            document.addEventListener('click', (e) => {
                if (!customLangSelect.contains(e.target)) {
                    closeCustomSelect(customLangSelect);
                }
            });
        }
    }

    const settingsContentEl = document.querySelector('.settings-content');
    if (settingsContentEl) {
        settingsContentEl.addEventListener('scroll', () => {
            const openSelect = settingsContentEl.querySelector('.custom-select-container.open');
            if (openSelect) {
                adjustCustomSelectPosition(openSelect);
            }
        }, { passive: true });
    }

    window.addEventListener('resize', () => {
        const openSelect = document.querySelector('.custom-select-container.open');
        if (openSelect) {
            adjustCustomSelectPosition(openSelect);
        }
    }, { passive: true });

    if (listContainer) {
        listContainer.addEventListener('scroll', () => {
            hideBadgeHoverCard();
            const openMenuWrapper = listContainer.querySelector('.account-menu-wrapper.open');
            if (openMenuWrapper) {
                adjustAccountMenuPosition(openMenuWrapper);
            }
        }, { passive: true });
    }
    document.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.badge-icon') && !e.target.closest('.badges-grid-tile')) {
            hideBadgeHoverCard();
        }
    });

    let dropIndicatorLine = null;
    let dragGhostProxy = null;
    let pendingDrag = null;
    let activeDrag = null;
    let cachedTargets = null;
    let autoScrollRafId = null;
    let hoverExpandTimer = null;
    let currentHoverFolder = null;
    let lastDropTarget = null;

    function getOrCreateDropIndicator() {
        if (!dropIndicatorLine) {
            dropIndicatorLine = document.getElementById('dropIndicatorLine');
            if (!dropIndicatorLine) {
                dropIndicatorLine = document.createElement('div');
                dropIndicatorLine.id = 'dropIndicatorLine';
                document.body.appendChild(dropIndicatorLine);
            }
        }
        return dropIndicatorLine;
    }

    function clearDragEffects() {
        if (hoverExpandTimer) {
            clearTimeout(hoverExpandTimer);
            hoverExpandTimer = null;
        }
        if (autoScrollRafId) {
            cancelAnimationFrame(autoScrollRafId);
            autoScrollRafId = null;
        }
        if (currentHoverFolder) {
            currentHoverFolder.classList.remove('drop-target-inside');
            currentHoverFolder = null;
        }
        if (dropIndicatorLine) {
            dropIndicatorLine.style.display = 'none';
        }
        document.body.classList.remove('dragging-active');
        document.querySelectorAll('.is-dragged').forEach(el => el.classList.remove('is-dragged'));
    }

    function cacheDropTargets(dragType, draggedElement) {
        if (!listContainer) return { listRect: null, rootTargets: [], folders: [], nestedAccounts: [] };
        const listRect = listContainer.getBoundingClientRect();
        const rootTargets = [];
        const folders = [];
        const nestedAccounts = [];

        for (const child of listContainer.children) {
            if (child === draggedElement) continue;

            if (child.classList.contains('folder-container')) {
                const header = child.querySelector('.folder-header');
                const content = child.querySelector('.folder-content');
                const emptyEl = child.querySelector('.empty-folder');
                const fRect = child.getBoundingClientRect();
                const hRect = header ? header.getBoundingClientRect() : fRect;
                const isCollapsed = child.classList.contains('collapsed');

                const folderInfo = {
                    element: child,
                    headerElement: header,
                    emptyElement: emptyEl,
                    id: child.dataset.id,
                    key: 'folder:' + child.dataset.id,
                    type: 'folder',
                    rect: fRect,
                    headerRect: hRect,
                    isCollapsed
                };

                rootTargets.push(folderInfo);
                folders.push(folderInfo);

                if (!isCollapsed && content) {
                    const accEls = Array.from(content.querySelectorAll('.account-item')).filter(el => el !== draggedElement);
                    for (const aEl of accEls) {
                        nestedAccounts.push({
                            element: aEl,
                            token: aEl.dataset.token,
                            folderId: child.dataset.id,
                            rect: aEl.getBoundingClientRect()
                        });
                    }
                }
            } else if (child.classList.contains('account-item')) {
                rootTargets.push({
                    element: child,
                    token: child.dataset.token,
                    key: 'account:' + child.dataset.token,
                    type: 'account',
                    rect: child.getBoundingClientRect()
                });
            }
        }

        return { listRect, rootTargets, folders, nestedAccounts };
    }

    function startDragEngine(info, clientX, clientY) {
        clearDragEffects();

        if (info.type === 'folder') {
            collapseAllFolders(true);
        }

        const el = info.element;
        const headerEl = info.type === 'folder' ? el.querySelector('.folder-header') : null;
        const rect = (headerEl || el).getBoundingClientRect();

        const ghost = el.cloneNode(true);
        ghost.id = 'dragGhostProxy';
        ghost.style.transition = 'none';

        if (info.type === 'folder') {
            ghost.classList.add('collapsed');
            const content = ghost.querySelector('.folder-content');
            if (content) content.remove();
            ghost.style.height = `${rect.height}px`;
        } else {
            ghost.style.height = `${rect.height}px`;
        }
        ghost.style.width = `${rect.width}px`;
        ghost.style.left = '0px';
        ghost.style.top = '0px';

        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;
        const startX = clientX - offsetX;
        const startY = clientY - offsetY;

        ghost.style.transform = `translate3d(${startX}px, ${startY}px, 0) scale(1.02)`;
        document.body.appendChild(ghost);
        dragGhostProxy = ghost;

        el.classList.add('is-dragged');
        document.body.classList.add('dragging-active');

        cachedTargets = cacheDropTargets(info.type, el);
        lastDropTarget = null;

        activeDrag = {
            type: info.type,
            element: el,
            id: info.id,
            token: info.token,
            originRect: rect,
            pointerId: info.pointerId,
            offsetX,
            offsetY,
            width: rect.width,
            height: rect.height,
            currentX: clientX,
            currentY: clientY
        };

        getOrCreateDropIndicator();
        updateDragEngine(clientX, clientY);
    }

    function updateDragEngine(clientX, clientY) {
        if (!activeDrag || !dragGhostProxy) return;

        activeDrag.currentX = clientX;
        activeDrag.currentY = clientY;

        const posX = clientX - activeDrag.offsetX;
        const posY = clientY - activeDrag.offsetY;
        dragGhostProxy.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(1.02)`;

        handleAutoScroll(clientY);
        computeDropTarget(clientX, clientY);
    }

    function handleAutoScroll(clientY) {
        if (!listContainer || !activeDrag) return;
        const rect = listContainer.getBoundingClientRect();
        const SCROLL_ZONE = 36;
        const MAX_SPEED = 12;

        let speed = 0;
        if (clientY < rect.top + SCROLL_ZONE && clientY > rect.top - 15) {
            const intensity = Math.max(0, (rect.top + SCROLL_ZONE - clientY) / SCROLL_ZONE);
            speed = -intensity * MAX_SPEED;
        } else if (clientY > rect.bottom - SCROLL_ZONE && clientY < rect.bottom + 15) {
            const intensity = Math.max(0, (clientY - (rect.bottom - SCROLL_ZONE)) / SCROLL_ZONE);
            speed = intensity * MAX_SPEED;
        }

        if (speed !== 0) {
            if (!autoScrollRafId) {
                const step = () => {
                    if (!activeDrag) {
                        autoScrollRafId = null;
                        return;
                    }
                    listContainer.scrollTop += speed;
                    cachedTargets = cacheDropTargets(activeDrag.type, activeDrag.element);
                    computeDropTarget(activeDrag.currentX, activeDrag.currentY);
                    autoScrollRafId = requestAnimationFrame(step);
                };
                autoScrollRafId = requestAnimationFrame(step);
            }
        } else if (autoScrollRafId) {
            cancelAnimationFrame(autoScrollRafId);
            autoScrollRafId = null;
        }
    }

    function computeDropTarget(clientX, clientY) {
        if (!cachedTargets || !activeDrag) return;
        const indicator = getOrCreateDropIndicator();

        if (activeDrag.type === 'folder') {
            const rootTargets = cachedTargets.rootTargets;
            if (rootTargets.length === 0) {
                indicator.style.display = 'none';
                lastDropTarget = null;
                return;
            }

            let bestTarget = null;
            let bestDist = Infinity;

            for (const rt of rootTargets) {
                const midY = rt.rect.top + rt.rect.height * 0.5;
                const dist = Math.abs(clientY - midY);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestTarget = rt;
                }
            }

            if (!bestTarget) {
                indicator.style.display = 'none';
                lastDropTarget = null;
                return;
            }

            const isBefore = clientY < (bestTarget.rect.top + bestTarget.rect.height * 0.5);
            const targetY = isBefore ? bestTarget.rect.top : bestTarget.rect.bottom;

            indicator.style.display = 'block';
            indicator.style.top = `${Math.round(targetY - 1.5)}px`;
            indicator.style.left = `${Math.round(bestTarget.rect.left + 2)}px`;
            indicator.style.width = `${Math.round(bestTarget.rect.width - 4)}px`;

            lastDropTarget = {
                type: 'root',
                position: isBefore ? 'before' : 'after',
                targetKey: bestTarget.key,
                targetY: targetY
            };
            return;
        }

        if (activeDrag.type === 'account') {
            let bestNested = null;
            let bestNestedDist = Infinity;

            for (const na of cachedTargets.nestedAccounts) {
                if (clientX >= na.rect.left - 20 && clientX <= na.rect.right + 20) {
                    if (clientY >= na.rect.top - 8 && clientY <= na.rect.bottom + 8) {
                        const midY = na.rect.top + na.rect.height * 0.5;
                        const dist = Math.abs(clientY - midY);
                        if (dist < bestNestedDist) {
                            bestNestedDist = dist;
                            bestNested = na;
                        }
                    }
                }
            }

            if (bestNested) {
                if (currentHoverFolder) {
                    currentHoverFolder.classList.remove('drop-target-inside');
                    currentHoverFolder = null;
                }
                if (hoverExpandTimer) {
                    clearTimeout(hoverExpandTimer);
                    hoverExpandTimer = null;
                }

                const isBefore = clientY < (bestNested.rect.top + bestNested.rect.height * 0.5);
                const targetY = isBefore ? bestNested.rect.top : bestNested.rect.bottom;

                indicator.style.display = 'block';
                indicator.style.top = `${Math.round(targetY - 1.5)}px`;
                indicator.style.left = `${Math.round(bestNested.rect.left + 2)}px`;
                indicator.style.width = `${Math.round(bestNested.rect.width - 4)}px`;

                lastDropTarget = {
                    type: 'nested_account',
                    folderId: bestNested.folderId,
                    targetToken: bestNested.token,
                    position: isBefore ? 'before' : 'after',
                    targetY: targetY
                };
                return;
            }

            let hoveringFolder = null;
            let isFolderHeaderEdge = null;

            for (const f of cachedTargets.folders) {
                if (clientX >= f.headerRect.left && clientX <= f.headerRect.right) {
                    if (clientY >= f.headerRect.top && clientY <= f.headerRect.bottom) {
                        if (clientY < f.headerRect.top + 7) {
                            hoveringFolder = f;
                            isFolderHeaderEdge = 'before';
                            break;
                        } else if (f.isCollapsed && clientY > f.headerRect.bottom - 7) {
                            hoveringFolder = f;
                            isFolderHeaderEdge = 'after';
                            break;
                        } else {
                            hoveringFolder = f;
                            isFolderHeaderEdge = null;
                            break;
                        }
                    }
                }

                if (!f.isCollapsed && f.emptyElement) {
                    const eRect = f.emptyElement.getBoundingClientRect();
                    if (clientX >= eRect.left && clientX <= eRect.right && clientY >= eRect.top && clientY <= eRect.bottom) {
                        hoveringFolder = f;
                        isFolderHeaderEdge = null;
                        break;
                    }
                }
            }

            if (hoveringFolder && !isFolderHeaderEdge) {
                if (currentHoverFolder !== hoveringFolder.element) {
                    if (currentHoverFolder) currentHoverFolder.classList.remove('drop-target-inside');
                    currentHoverFolder = hoveringFolder.element;
                    currentHoverFolder.classList.add('drop-target-inside');
                }

                indicator.style.display = 'none';

                if (hoveringFolder.isCollapsed && !hoverExpandTimer) {
                    hoverExpandTimer = setTimeout(() => {
                        if (activeDrag && currentHoverFolder === hoveringFolder.element) {
                            toggleFolderCollapse(hoveringFolder.element, hoveringFolder.id, false);
                            hoveringFolder.isCollapsed = false;
                            setTimeout(() => {
                                if (activeDrag) {
                                    cachedTargets = cacheDropTargets(activeDrag.type, activeDrag.element);
                                }
                            }, 240);
                            hoverExpandTimer = null;
                        }
                    }, 400);
                }

                lastDropTarget = {
                    type: 'folder_inside',
                    folderId: hoveringFolder.id,
                    element: hoveringFolder.element
                };
                return;
            }

            if (currentHoverFolder) {
                currentHoverFolder.classList.remove('drop-target-inside');
                currentHoverFolder = null;
            }
            if (hoverExpandTimer) {
                clearTimeout(hoverExpandTimer);
                hoverExpandTimer = null;
            }

            if (hoveringFolder && isFolderHeaderEdge) {
                const targetY = isFolderHeaderEdge === 'before' ? hoveringFolder.headerRect.top : hoveringFolder.headerRect.bottom;
                indicator.style.display = 'block';
                indicator.style.top = `${Math.round(targetY - 1.5)}px`;
                indicator.style.left = `${Math.round(hoveringFolder.rect.left + 2)}px`;
                indicator.style.width = `${Math.round(hoveringFolder.rect.width - 4)}px`;

                lastDropTarget = {
                    type: 'root',
                    position: isFolderHeaderEdge,
                    targetKey: hoveringFolder.key,
                    targetY: targetY
                };
                return;
            }

            const rootTargets = cachedTargets.rootTargets;
            if (rootTargets.length > 0) {
                let bestRoot = null;
                let bestDist = Infinity;

                for (const rt of rootTargets) {
                    const distTop = Math.abs(clientY - rt.rect.top);
                    const distBottom = Math.abs(clientY - rt.rect.bottom);
                    const minDist = Math.min(distTop, distBottom);

                    if (minDist < bestDist) {
                        bestDist = minDist;
                        const isBefore = distTop <= distBottom;
                        bestRoot = {
                            target: rt,
                            position: isBefore ? 'before' : 'after',
                            targetY: isBefore ? rt.rect.top : rt.rect.bottom
                        };
                    }
                }

                if (bestRoot) {
                    indicator.style.display = 'block';
                    indicator.style.top = `${Math.round(bestRoot.targetY - 1.5)}px`;
                    indicator.style.left = `${Math.round(bestRoot.target.rect.left + 2)}px`;
                    indicator.style.width = `${Math.round(bestRoot.target.rect.width - 4)}px`;

                    lastDropTarget = {
                        type: 'root',
                        position: bestRoot.position,
                        targetKey: bestRoot.target.key,
                        targetY: bestRoot.targetY
                    };
                    return;
                }
            }

            if (cachedTargets.listRect) {
                const lr = cachedTargets.listRect;
                indicator.style.display = 'block';
                indicator.style.top = `${Math.round(lr.bottom - 8)}px`;
                indicator.style.left = `${Math.round(lr.left + 8)}px`;
                indicator.style.width = `${Math.round(lr.width - 16)}px`;

                lastDropTarget = {
                    type: 'root_end',
                    targetY: lr.bottom - 8
                };
                return;
            }

            indicator.style.display = 'none';
            lastDropTarget = null;
        }
    }

    async function finishDragEngine() {
        if (!activeDrag) return;

        const drag = activeDrag;
        const target = lastDropTarget;
        const ghost = dragGhostProxy;

        activeDrag = null;
        dragGhostProxy = null;
        pendingDrag = null;

        clearDragEffects();

        if (target) {
            if (drag.type === 'folder') {
                const sourceFolderId = drag.id;
                const sourceKey = 'folder:' + sourceFolderId;

                getCleanRootOrder();

                if (target.type === 'root') {
                    const targetKey = target.targetKey;
                    if (sourceKey !== targetKey) {
                        const sIdx = rootOrder.indexOf(sourceKey);
                        if (sIdx !== -1) {
                            rootOrder.splice(sIdx, 1);
                        }
                        const tIdx = rootOrder.indexOf(targetKey);
                        if (tIdx !== -1) {
                            const insertIdx = target.position === 'before' ? tIdx : tIdx + 1;
                            rootOrder.splice(insertIdx, 0, sourceKey);
                        } else {
                            rootOrder.push(sourceKey);
                        }
                    }
                } else if (target.type === 'root_end') {
                    const sIdx = rootOrder.indexOf(sourceKey);
                    if (sIdx !== -1) {
                        rootOrder.splice(sIdx, 1);
                    }
                    rootOrder.push(sourceKey);
                }

                const folderKeysInRoot = rootOrder.filter(k => k.startsWith('folder:')).map(k => k.slice(7));
                folders.sort((a, b) => {
                    const idxA = folderKeysInRoot.indexOf(a.id);
                    const idxB = folderKeysInRoot.indexOf(b.id);
                    return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
                });

                const foldersToSave = folders.map(({ isEditing, menuOpen, ...rest }) => rest);
                await new Promise(r => chrome.storage.local.set({
                    discordFolders: foldersToSave,
                    discordRootOrder: rootOrder
                }, r));
                renderAccounts();
            } else if (drag.type === 'account') {
                const sourceToken = drag.token;
                const sIdx = accounts.findIndex(a => a.token === sourceToken);
                if (sIdx !== -1) {
                    const sourceAcc = accounts[sIdx];
                    const sourceKey = 'account:' + sourceToken;

                    if (target.type === 'folder_inside') {
                        sourceAcc.folderId = target.folderId;
                        rootOrder = rootOrder.filter(k => k !== sourceKey);
                        const [movedAcc] = accounts.splice(sIdx, 1);
                        let lastFolderAccIdx = -1;
                        for (let i = 0; i < accounts.length; i++) {
                            if (accounts[i].folderId === target.folderId) {
                                lastFolderAccIdx = i;
                            }
                        }
                        if (lastFolderAccIdx !== -1) {
                            accounts.splice(lastFolderAccIdx + 1, 0, movedAcc);
                        } else {
                            accounts.push(movedAcc);
                        }
                    } else if (target.type === 'nested_account') {
                        sourceAcc.folderId = target.folderId;
                        rootOrder = rootOrder.filter(k => k !== sourceKey);
                        const [movedAcc] = accounts.splice(sIdx, 1);
                        const tIdx = accounts.findIndex(a => a.token === target.targetToken);
                        if (tIdx !== -1) {
                            const insertIdx = target.position === 'before' ? tIdx : tIdx + 1;
                            accounts.splice(Math.max(0, insertIdx), 0, movedAcc);
                        } else {
                            accounts.push(movedAcc);
                        }
                    } else if (target.type === 'root') {
                        sourceAcc.folderId = null;
                        getCleanRootOrder();
                        const currRootIdx = rootOrder.indexOf(sourceKey);
                        if (currRootIdx !== -1) {
                            rootOrder.splice(currRootIdx, 1);
                        }
                        const tRootIdx = rootOrder.indexOf(target.targetKey);
                        if (tRootIdx !== -1) {
                            const insertIdx = target.position === 'before' ? tRootIdx : tRootIdx + 1;
                            rootOrder.splice(insertIdx, 0, sourceKey);
                        } else {
                            rootOrder.push(sourceKey);
                        }
                    } else if (target.type === 'root_end') {
                        sourceAcc.folderId = null;
                        getCleanRootOrder();
                        const currRootIdx = rootOrder.indexOf(sourceKey);
                        if (currRootIdx !== -1) {
                            rootOrder.splice(currRootIdx, 1);
                        }
                        rootOrder.push(sourceKey);
                    }

                    getCleanRootOrder();
                    await new Promise(r => chrome.storage.local.set({
                        discordAccounts: accounts,
                        discordRootOrder: rootOrder
                    }, r));
                    renderAccounts();
                }
            }
        }

        if (ghost) {
            const anim = ghost.animate([
                { opacity: 0.95 },
                { opacity: 0 }
            ], {
                duration: 120,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
            });
            anim.onfinish = () => {
                if (ghost.parentNode) ghost.remove();
            };
        }
    }

    function cancelDragEngine() {
        if (!activeDrag && !pendingDrag) return;
        const ghost = dragGhostProxy;

        if (activeDrag && ghost) {
            const origin = activeDrag.originRect;
            const anim = ghost.animate([
                { transform: ghost.style.transform, opacity: 0.95 },
                { transform: `translate3d(${origin.left}px, ${origin.top}px, 0) scale(1)`, opacity: 0 }
            ], {
                duration: 160,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
            });
            anim.onfinish = () => {
                if (ghost.parentNode) ghost.remove();
            };
        } else if (ghost && ghost.parentNode) {
            ghost.remove();
        }

        activeDrag = null;
        dragGhostProxy = null;
        pendingDrag = null;
        lastDropTarget = null;
        clearDragEffects();
    }

    function initDragAndDropEngine() {
        if (!listContainer) return;

        listContainer.addEventListener('pointerdown', (e) => {
            if (searchQuery && searchQuery.trim() !== '') return;
            if (e.button !== 0) return;

            const handle = e.target.closest('.drag-handle');
            if (!handle) return;

            const type = handle.dataset.dragHandle;
            if (!type) return;

            const element = type === 'folder'
                ? handle.closest('.folder-container')
                : handle.closest('.account-item');
            if (!element) return;

            closeAllFolderMenus();
            closeAllAccountMenus();
            hideBadgeHoverCard();

            pendingDrag = {
                type,
                element,
                id: handle.dataset.id || element.dataset.id,
                token: handle.dataset.token || element.dataset.token,
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY
            };

            try {
                handle.setPointerCapture(e.pointerId);
            } catch (err) {}

            e.preventDefault();
        });

        window.addEventListener('pointermove', (e) => {
            if (pendingDrag && !activeDrag) {
                if (e.pointerId !== pendingDrag.pointerId) return;
                const dist = Math.hypot(e.clientX - pendingDrag.startX, e.clientY - pendingDrag.startY);
                if (dist >= 5) {
                    const p = pendingDrag;
                    pendingDrag = null;
                    startDragEngine(p, e.clientX, e.clientY);
                }
            } else if (activeDrag) {
                if (e.pointerId !== activeDrag.pointerId) return;
                updateDragEngine(e.clientX, e.clientY);
            }
        });

        window.addEventListener('pointerup', (e) => {
            if (pendingDrag && e.pointerId === pendingDrag.pointerId) {
                pendingDrag = null;
            } else if (activeDrag && e.pointerId === activeDrag.pointerId) {
                finishDragEngine();
            }
        });

        window.addEventListener('pointercancel', (e) => {
            if (pendingDrag && e.pointerId === pendingDrag.pointerId) {
                pendingDrag = null;
            } else if (activeDrag && e.pointerId === activeDrag.pointerId) {
                cancelDragEngine();
            }
        });

        window.addEventListener('blur', () => {
            if (activeDrag || pendingDrag) {
                cancelDragEngine();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (activeDrag) {
                e.stopPropagation();
                cancelDragEngine();
                return;
            }
            hideBadgeHoverCard();
            if (isBadgesModalOpen()) {
                closeBadgesModal();
                return;
            }
            closeUpdateTokenModal();
            closeAccountDetailsModal();
            closeAddAccountModal();
            closeAllFolderMenus();
            closeAllAccountMenus();
            document.querySelectorAll('.custom-select-container.open').forEach(closeCustomSelect);
        }
    });

    initDragAndDropEngine();
    loadInitialData();
});
