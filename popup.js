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
    let showBadges = true;

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
    let isBulkAddRunning = false;
    let isBulkAddCanceled = false;
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
                        let logs = [];

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
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            document.body.appendChild(iframe);
                            let token1 = sanitizeToken(iframe.contentWindow.localStorage.getItem('token'));
                            document.body.removeChild(iframe);
                            if (token1) return token1;
                            logs.push("iframe empty");
                        } catch (e) {
                            logs.push("iframe err: " + e.message);
                        }

                        try {
                            let token2 = sanitizeToken(window.localStorage.getItem('token'));
                            if (token2) return token2;
                            logs.push("ls empty");
                        } catch (e) {
                            logs.push("ls err");
                        }

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
                            logs.push("webpack empty");
                        } catch (e) {
                            logs.push("webpack err: " + e.message);
                        }

                        return "ERR:" + logs.join(", ");
                    }
                });

                if (results && results[0] && results[0].result) {
                    const tokenResult = results[0].result;

                    if (tokenResult.startsWith("ERR:")) {
                        console.warn("Token Extraction Notice:", tokenResult);
                        activeAccountId = null;
                        markActiveAccount();
                        addCurrentAccountBtn.textContent = getTranslation('actions.notFound');
                        addCurrentAccountBtn.title = 'Debug logs: ' + tokenResult;
                        return;
                    }

                    const token = tokenResult;

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
                                    newAccounts[existingIndex] = {
                                        ...newAccounts[existingIndex],
                                        _profileChecked: true,
                                        _profileVersion: 4,
                                        username: userData.username,
                                        global_name: userData.global_name,
                                        avatar: userData.avatar,
                                        premium_type: userData.premium_type,
                                        premium_since: userData.premium_since || null,
                                        premium_guild_since: userData.premium_guild_since || null,
                                        legacy_username: userData.legacy_username || null,
                                        badges: userData.badges || [],
                                        gifting_count: userData.gifting_count !== undefined ? userData.gifting_count : (newAccounts[existingIndex].gifting_count || 0),
                                        gifting_tier: userData.gifting_tier !== undefined ? userData.gifting_tier : (newAccounts[existingIndex].gifting_tier || 0),
                                        flags: userData.flags,
                                        public_flags: userData.public_flags,
                                        token: token,
                                        invalid: false
                                    };
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
                                    newAccounts[existingIndex] = {
                                        ...newAccounts[existingIndex],
                                        _profileChecked: true,
                                        _profileVersion: 4,
                                        username: userData.username,
                                        global_name: userData.global_name,
                                        avatar: userData.avatar,
                                        premium_type: userData.premium_type,
                                        premium_since: userData.premium_since || null,
                                        premium_guild_since: userData.premium_guild_since || null,
                                        legacy_username: userData.legacy_username || null,
                                        badges: userData.badges || [],
                                        gifting_count: userData.gifting_count !== undefined ? userData.gifting_count : (newAccounts[existingIndex].gifting_count || 0),
                                        gifting_tier: userData.gifting_tier !== undefined ? userData.gifting_tier : (newAccounts[existingIndex].gifting_tier || 0),
                                        flags: userData.flags,
                                        public_flags: userData.public_flags,
                                        token: token,
                                        invalid: false
                                    };
                                } else {
                                    newAccounts = [...accounts, {
                                        id: userData.id,
                                        _profileChecked: true,
                                        _profileVersion: 4,
                                        username: userData.username,
                                        global_name: userData.global_name,
                                        avatar: userData.avatar,
                                        premium_type: userData.premium_type,
                                        premium_since: userData.premium_since || null,
                                        premium_guild_since: userData.premium_guild_since || null,
                                        legacy_username: userData.legacy_username || null,
                                        badges: userData.badges || [],
                                        gifting_count: userData.gifting_count || 0,
                                        gifting_tier: userData.gifting_tier || 0,
                                        flags: userData.flags,
                                        public_flags: userData.public_flags,
                                        token: token,
                                        folderId: null,
                                        invalid: false
                                    }];
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
            chrome.storage.local.get(['discordAccounts', 'discordFolders', 'collapsedFolders', 'selectedTheme', 'selectedLanguage', 'showBadges', 'discordRootOrder'], async function (result) {
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
                renderAccounts();

                chrome.storage.local.get(['isChecking', 'checkProgress', 'checkTarget', 'checkCount', 'checkResults'], (res) => {
                    updateProgressUI(res.isChecking, res.checkProgress || 0, res.checkTarget, res.checkCount, res.checkResults);
                });

                if (accounts.length > 0 && searchInput) {
                    searchInput.focus();
                }

                checkActiveDiscordTab();

                setTimeout(() => {
                    listContainer.classList.remove('initial-load');
                }, 1000);

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
            if (!showBadges) {
                hideBadgesPopover(0);
            }
            chrome.storage.local.set({ showBadges: showBadges }, () => {
                renderAccounts();
            });
        });
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

    function saveFolders(newFolders) {
        return new Promise((resolve) => {
            folders = newFolders;
            const clean = getCleanRootOrder();
            const foldersToSave = newFolders.map(({ isEditing, menuOpen, ...rest }) => rest);
            chrome.storage.local.set({ discordFolders: foldersToSave, discordRootOrder: clean }, () => {
                renderAccounts();
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
        const isCurrentlyCollapsed = folderContainer.classList.contains('collapsed') && !folderContainer.classList.contains('is-collapsing');
        const targetCollapsed = forceState !== null ? forceState : !isCurrentlyCollapsed;

        if (targetCollapsed === isCurrentlyCollapsed && !folderContainer._animating) {
            return;
        }

        // Update state in storage
        if (targetCollapsed) {
            if (!collapsedFolders.includes(folderId)) {
                saveCollapsedFolders([...collapsedFolders, folderId]);
            }
        } else {
            if (collapsedFolders.includes(folderId)) {
                saveCollapsedFolders(collapsedFolders.filter(fid => fid !== folderId));
            }
        }

        if (immediate || !folderContent) {
            if (folderContainer._animCleanup) {
                folderContainer._animCleanup();
            }
            folderContainer.classList.remove('is-collapsing');
            folderContainer.classList.toggle('collapsed', targetCollapsed);
            if (folderContent) {
                folderContent.style.display = '';
                folderContent.style.height = '';
                folderContent.style.opacity = '';
                folderContent.style.overflow = '';
                folderContent.style.transition = '';
            }
            return;
        }

        // Cancel any in-flight animation on this folder
        if (folderContainer._animCleanup) {
            folderContainer._animCleanup();
        }

        folderContainer._animating = true;

        if (targetCollapsed) {
            // Collapsing
            const currentRect = folderContent.getBoundingClientRect();
            const startHeight = currentRect.height > 0 ? currentRect.height : folderContent.scrollHeight;

            folderContainer.classList.add('collapsed');
            folderContainer.classList.add('is-collapsing');

            folderContent.style.display = 'flex';
            folderContent.style.overflow = 'hidden';
            folderContent.style.height = `${startHeight}px`;
            folderContent.style.opacity = '1';
            folderContent.style.transition = 'none';

            // Force reflow
            void folderContent.offsetHeight;

            folderContent.style.transition = 'height 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease';
            folderContent.style.height = '0px';
            folderContent.style.opacity = '0';

            const finish = () => {
                if (!folderContainer._animating) return;
                folderContainer._animating = false;
                folderContainer._animCleanup = null;
                folderContent.removeEventListener('transitionend', onEnd);
                clearTimeout(fallbackTimer);

                folderContainer.classList.remove('is-collapsing');
                folderContainer.classList.add('collapsed');

                folderContent.style.display = '';
                folderContent.style.height = '';
                folderContent.style.opacity = '';
                folderContent.style.overflow = '';
                folderContent.style.transition = '';
            };

            const onEnd = (e) => {
                if (e.target === folderContent && e.propertyName === 'height') {
                    finish();
                }
            };

            const fallbackTimer = setTimeout(finish, 240);
            folderContent.addEventListener('transitionend', onEnd);
            folderContainer._animCleanup = finish;
        } else {
            // Expanding
            folderContainer.classList.remove('collapsed');
            folderContainer.classList.remove('is-collapsing');

            const currentRect = folderContent.getBoundingClientRect();
            const currentHeight = currentRect.height > 0 ? currentRect.height : 0;

            folderContent.style.display = 'flex';
            folderContent.style.overflow = 'hidden';
            folderContent.style.height = 'auto';
            folderContent.style.opacity = '1';
            folderContent.style.transition = 'none';

            const targetHeight = folderContent.scrollHeight;

            folderContent.style.height = `${currentHeight}px`;
            folderContent.style.opacity = currentHeight > 0 ? '1' : '0';

            // Force reflow
            void folderContent.offsetHeight;

            folderContent.style.transition = 'height 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease';
            folderContent.style.height = `${targetHeight}px`;
            folderContent.style.opacity = '1';

            const finish = () => {
                if (!folderContainer._animating) return;
                folderContainer._animating = false;
                folderContainer._animCleanup = null;
                folderContent.removeEventListener('transitionend', onEnd);
                clearTimeout(fallbackTimer);

                folderContent.style.display = '';
                folderContent.style.height = '';
                folderContent.style.opacity = '';
                folderContent.style.overflow = '';
                folderContent.style.transition = '';
            };

            const onEnd = (e) => {
                if (e.target === folderContent && e.propertyName === 'height') {
                    finish();
                }
            };

            const fallbackTimer = setTimeout(finish, 260);
            folderContent.addEventListener('transitionend', onEnd);
            folderContainer._animCleanup = finish;
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

        if (menuRect.bottom > maxAllowedBottom) {
            folderMenu.style.top = 'auto';
            folderMenu.style.bottom = 'calc(100% + 8px)';

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



















    document.addEventListener('click', (e) => {
        const folderMenuBtn = e.target.closest('.folder-menu-btn');
        const folderMenu = e.target.closest('.folder-menu');

        if (!folderMenuBtn && !folderMenu) {
            folders.forEach(f => {
                delete f.menuOpen;
            });
            listContainer.querySelectorAll('.folder-actions.open').forEach(el => {
                el.classList.remove('open');
            });
            listContainer.querySelectorAll('.folder-menu.open').forEach(el => {
                el.classList.remove('open');
            });
        }

        if (!e.target.closest('.account-menu-wrapper')) {
            openAccountMenuToken = null;
            document.querySelectorAll('.account-menu-wrapper.open').forEach(el => {
                el.classList.remove('open');
                el.classList.remove('open-up');
            });
        }
    });

    function renderAccounts() {
        const savedScrollTop = listContainer ? listContainer.scrollTop : 0;
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
                        <button class="icon-btn folder-menu-btn" title="${getTranslation('folder.options')}">
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

            const folderMenuBtn = folderContainer.querySelector('.folder-menu-btn');
            const folderMenu = folderContainer.querySelector('.folder-menu');

            folderMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                folders.forEach(f => {
                    if (f.id === folder.id) {
                        f.menuOpen = !f.menuOpen;
                    } else {
                        delete f.menuOpen;
                    }
                });
                renderAccounts();
                setTimeout(() => {
                    const newFolderContainer = listContainer.querySelector(`.folder-container[data-id="${folder.id}"]`);
                    const newFolderMenu = newFolderContainer ? newFolderContainer.querySelector('.folder-menu') : null;
                    if (newFolderMenu && newFolderMenu.classList.contains('open')) {
                        adjustFolderMenuPosition(newFolderContainer, newFolderMenu);
                        const input = newFolderContainer.querySelector('.folder-name-input');
                        if (input) {
                            input.focus({ preventScroll: true });
                            input.setSelectionRange(input.value.length, input.value.length);
                        }
                    }
                }, 0);
            });

            if (folderMenu) {
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
                    if (folder.color === color) return;
                    folder.color = color;
                    saveFolders([...folders]);
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

    function getNitroBadgeInfo(acc) {
        if (!acc) return null;
        if (!acc.premium_type || acc.premium_type === 0) {
            const badges = acc.badges || [];
            const hasNitro = badges.some(b => b.id && (b.id === 'premium' || b.id.startsWith('nitro')));
            if (!hasNitro) return null;
        }

        const badges = acc.badges || [];
        const nitroBadge = badges.find(b => b.id && (b.id === 'premium' || b.id.startsWith('nitro')));

        let sinceDate = acc.premium_since;
        if (!sinceDate && nitroBadge && nitroBadge.description) {
            const dateMatch = nitroBadge.description.match(/\b([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}|\d{1,2}\s+[A-Za-zçğıöşüÇĞİÖŞÜ]+\s+\d{4})\b/);
            if (dateMatch) {
                sinceDate = dateMatch[1];
            }
        }

        let iconName = null;
        if (nitroBadge && nitroBadge.id && nitroBadge.id !== 'premium' && nitroBadge.id !== 'nitro') {
            const id = nitroBadge.id;
            if (id === 'nitro_opal') iconName = 'Nitro_Opal.webp';
            else if (id === 'nitro_ruby') iconName = 'Nitro_Ruby.webp';
            else if (id === 'nitro_emerald') iconName = 'Nitro_Emerald.webp';
            else if (id === 'nitro_diamond') iconName = 'Nitro_Diamond.webp';
            else if (id === 'nitro_platinum') iconName = 'Nitro_Platinum.webp';
            else if (id === 'nitro_gold') iconName = 'Nitro_Gold.webp';
            else if (id === 'nitro_silver') iconName = 'Nitro_Silver.webp';
            else if (id === 'nitro_bronze') iconName = 'Nitro_Bronze.webp';
            else if (id === 'nitro_basic') iconName = 'Nitro_Basic.webp';
        }

        if (!iconName && sinceDate) {
            const startDate = new Date(sinceDate);
            if (!isNaN(startDate.getTime())) {
                const now = new Date();
                let months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
                if (now.getDate() < startDate.getDate()) months--;
                if (months < 0) months = 0;

                if (months >= 72) iconName = 'Nitro_Opal.webp';
                else if (months >= 60) iconName = 'Nitro_Ruby.webp';
                else if (months >= 36) iconName = 'Nitro_Emerald.webp';
                else if (months >= 24) iconName = 'Nitro_Diamond.webp';
                else if (months >= 12) iconName = 'Nitro_Platinum.webp';
                else if (months >= 6) iconName = 'Nitro_Gold.webp';
                else if (months >= 3) iconName = 'Nitro_Silver.webp';
                else if (months >= 1) iconName = 'Nitro_Bronze.webp';
                else iconName = 'Nitro_Basic.webp';
            }
        }

        if (!iconName) {
            iconName = 'Nitro_Basic.webp';
        }

        let dateText = getTranslation('badge.nitroSubscriber');
        if (sinceDate) {
            const startDate = new Date(sinceDate);
            if (!isNaN(startDate.getTime())) {
                const langCode = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'tr';
                const formattedDate = startDate.toLocaleDateString(langCode, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                const template = getTranslation('badge.subscriberSince');
                dateText = template.replace('{date}', formattedDate);
            }
        } else if (nitroBadge && nitroBadge.description) {
            dateText = nitroBadge.description;
        }

        return {
            icon: `assets/badges/${iconName}`,
            name: dateText
        };
    }

    function getBoosterBadgeInfo(acc) {
        if (!acc) return null;
        const badges = acc.badges || [];
        const boosterBadge = badges.find(b => b.id && (b.id === 'guild_booster' || b.id.startsWith('guild_booster')));

        if (!boosterBadge && !acc.premium_guild_since) return null;

        let levelIcon = null;
        if (boosterBadge && boosterBadge.id) {
            const lvlMatch = boosterBadge.id.match(/guild_booster_lvl(\d+)/);
            if (lvlMatch) {
                const lvl = parseInt(lvlMatch[1], 10);
                if (lvl >= 1 && lvl <= 9) {
                    levelIcon = `Guild_Booster_Level_${lvl}.webp`;
                }
            }
        }

        let sinceDate = acc.premium_guild_since;
        if (!sinceDate && boosterBadge && boosterBadge.description) {
            const dateMatch = boosterBadge.description.match(/\b([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}|\d{1,2}\s+[A-Za-zçğıöşüÇĞİÖŞÜ]+\s+\d{4})\b/);
            if (dateMatch) {
                sinceDate = dateMatch[1];
            }
        }

        if (!levelIcon && sinceDate) {
            const startDate = new Date(sinceDate);
            if (!isNaN(startDate.getTime())) {
                const now = new Date();
                let months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
                if (now.getDate() < startDate.getDate()) months--;
                if (months < 0) months = 0;

                if (months >= 24) levelIcon = 'Guild_Booster_Level_9.webp';
                else if (months >= 18) levelIcon = 'Guild_Booster_Level_8.webp';
                else if (months >= 15) levelIcon = 'Guild_Booster_Level_7.webp';
                else if (months >= 12) levelIcon = 'Guild_Booster_Level_6.webp';
                else if (months >= 9) levelIcon = 'Guild_Booster_Level_5.webp';
                else if (months >= 6) levelIcon = 'Guild_Booster_Level_4.webp';
                else if (months >= 3) levelIcon = 'Guild_Booster_Level_3.webp';
                else if (months >= 2) levelIcon = 'Guild_Booster_Level_2.webp';
                else levelIcon = 'Guild_Booster_Level_1.webp';
            }
        }

        if (!levelIcon && boosterBadge) {
            levelIcon = 'Guild_Booster_Level_1.webp';
        }

        if (!levelIcon) return null;

        let dateText = getTranslation('badge.boosterSubscriber');
        if (sinceDate) {
            const startDate = new Date(sinceDate);
            if (!isNaN(startDate.getTime())) {
                const langCode = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'tr';
                const formattedDate = startDate.toLocaleDateString(langCode, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                const template = getTranslation('badge.boosterSince');
                dateText = template.replace('{date}', formattedDate);
            }
        } else if (boosterBadge && boosterBadge.description) {
            dateText = boosterBadge.description;
        }

        return {
            icon: `assets/badges/${levelIcon}`,
            name: dateText
        };
    }

    const GIFTING_TIERS = [
        {
            tier: 6,
            minGifts: 20,
            name: 'Legend',
            iconHash: '7fe346cfc5da1340087d8759a9e7a395',
            idPatterns: ['legend', 'gifting_legend', 'efsane', 'gifter_6', 'gifter_20', 'gifting_tier_6', 'gifting_20'],
            descPatterns: ['legend', 'efsane', '20x', '20 hediye', '20 gift'],
            icon: 'assets/badges/Gifting_Legend.webp',
            titleKey: 'badge.giftingLegend'
        },
        {
            tier: 5,
            minGifts: 10,
            name: 'Hero',
            iconHash: '77d65b1f210014a11eb1582ee06ab684',
            idPatterns: ['hero', 'gifting_hero', 'kahraman', 'gifter_5', 'gifter_10', 'gifting_tier_5', 'gifting_10'],
            descPatterns: ['hero', 'kahraman', '10x', '10 hediye', '10 gift'],
            icon: 'assets/badges/Gifting_Hero.webp',
            titleKey: 'badge.giftingHero'
        },
        {
            tier: 4,
            minGifts: 6,
            name: 'Icon',
            iconHash: '64f2413c9b9803661322aaad25826b62',
            idPatterns: ['icon', 'gifting_icon', 'ikon', 'gifter_4', 'gifter_6', 'gifting_tier_4', 'gifting_6'],
            descPatterns: ['icon', 'ikon', '6x', '6 hediye', '6 gift'],
            icon: 'assets/badges/Gifting_Icon.webp',
            titleKey: 'badge.giftingIcon'
        },
        {
            tier: 3,
            minGifts: 3,
            name: 'Luminary',
            iconHash: '3119f5504b2cd09576a323908c7c3517',
            idPatterns: ['luminary', 'gifting_luminary', 'bilge', 'gifter_3', 'gifting_tier_3', 'gifting_3'],
            descPatterns: ['luminary', 'bilge', '3x', '3 hediye', '3 gift'],
            icon: 'assets/badges/Gifting_Luminary.webp',
            titleKey: 'badge.giftingLuminary'
        },
        {
            tier: 2,
            minGifts: 2,
            name: 'Champion',
            iconHash: '8b7792c4f65953d3ff564f23429cb79e',
            idPatterns: ['champion', 'gifting_champion', 'sampiyon', 'şampiyon', 'gifter_2', 'gifting_tier_2', 'gifting_2'],
            descPatterns: ['champion', 'şampiyon', 'sampiyon', '2x', '2 hediye', '2 gift'],
            icon: 'assets/badges/Gifting_Champion.webp',
            titleKey: 'badge.giftingChampion'
        },
        {
            tier: 1,
            minGifts: 1,
            name: 'Patron',
            iconHash: 'ac305d1b9481f312ce4419e7f8296558',
            idPatterns: ['patron', 'gifting_patron', 'destekçi', 'destekci', 'gifter_1', 'gifting_tier_1', 'gifting_1'],
            descPatterns: ['patron', 'destekçi', 'destekci', '1x', '1 hediye', '1 gift'],
            icon: 'assets/badges/Gifting_Patron.webp',
            titleKey: 'badge.giftingPatron'
        }
    ];

    function getGiftingBadgeInfo(acc) {
        if (!acc) return null;

        const tier = acc.gifting_tier || 0;
        const count = acc.gifting_count || 0;
        if (tier >= 1) {
            const def = GIFTING_TIERS.find(t => t.tier === tier);
            if (def) {
                return {
                    icon: def.icon,
                    name: getTranslation(def.titleKey)
                };
            }
        }
        if (count >= 1) {
            const def = GIFTING_TIERS.find(t => count >= t.minGifts);
            if (def) {
                return {
                    icon: def.icon,
                    name: getTranslation(def.titleKey)
                };
            }
        }

        const badges = acc.badges || [];
        if (badges.length === 0) return null;

        for (const def of GIFTING_TIERS) {
            const matched = badges.find(b => {
                if (!b) return false;
                if (b.tier === def.tier) return true;
                if (b.icon && b.icon.includes(def.iconHash)) return true;
                if (b.id) {
                    const idLower = b.id.toLowerCase();
                    if (def.idPatterns.some(p => idLower === p || idLower.includes(p))) return true;
                }
                if (b.description) {
                    const descLower = b.description.toLowerCase();
                    if (def.descPatterns.some(p => descLower.includes(p))) return true;
                }
                return false;
            });

            if (matched) {
                return {
                    icon: def.icon,
                    name: getTranslation(def.titleKey) || matched.description || def.name
                };
            }
        }

        return null;
    }

    const STATIC_BADGE_REGISTRY = [
        {
            flag: 1,
            badgeId: 'staff',
            icon: 'assets/badges/Discord_Staff.webp',
            titleKey: 'badge.staff'
        },
        {
            flag: 2,
            badgeId: 'partner',
            icon: 'assets/badges/Partnered_Server_Owner.webp',
            titleKey: 'badge.partner'
        },
        {
            flag: 4,
            badgeId: 'hypesquad',
            icon: 'assets/badges/Hypesquad_Events.webp',
            titleKey: 'badge.hypesquadEvents'
        },
        {
            flag: 8,
            badgeId: 'bug_hunter_level_1',
            icon: 'assets/badges/Bug_Hunter.webp',
            titleKey: 'badge.bugHunter1'
        },
        {
            flag: 16384,
            badgeId: 'bug_hunter_level_2',
            icon: 'assets/badges/Bug_Hunter_Gold.webp',
            titleKey: 'badge.bugHunter2'
        },
        {
            flag: 64,
            badgeId: 'hypesquad_house_1',
            icon: 'assets/badges/Hypesquad_Bravery.webp',
            titleKey: 'badge.hypesquadBravery'
        },
        {
            flag: 128,
            badgeId: 'hypesquad_house_2',
            icon: 'assets/badges/Hypesquad_Brilliance.webp',
            titleKey: 'badge.hypesquadBrilliance'
        },
        {
            flag: 256,
            badgeId: 'hypesquad_house_3',
            icon: 'assets/badges/Hypesquad_Balance.webp',
            titleKey: 'badge.hypesquadBalance'
        },
        {
            flag: 512,
            badgeId: 'early_supporter',
            icon: 'assets/badges/Early_Supporter.webp',
            titleKey: 'badge.earlySupporter'
        },
        {
            flag: 131072,
            badgeId: 'verified_developer',
            altBadgeId: 'early_verified_bot_developer',
            icon: 'assets/badges/Early_Verified_Bot_Developer.webp',
            titleKey: 'badge.verifiedDev'
        },
        {
            flag: 262144,
            badgeId: 'certified_moderator',
            altBadgeId: 'moderator_programs_alumni',
            icon: 'assets/badges/Moderator_Program_Alumni.webp',
            titleKey: 'badge.modAlumni'
        },
        {
            badgeId: 'quest_completed',
            icon: 'assets/badges/Quest_Completed.webp',
            titleKey: 'badge.questCompleted'
        },
        {
            badgeId: 'orb_profile_badge',
            altBadgeId: 'orbs_apprentice',
            icon: 'assets/badges/Orbs_Apprentice.webp',
            titleKey: 'badge.orbsApprentice'
        },
        {
            badgeId: 'april_fools_2026',
            icon: 'assets/badges/Last_Meadow_Online.webp',
            titleKey: 'badge.lastMeadowOnline'
        }
    ];

    function getLegacyUsernameBadgeInfo(acc) {
        if (!acc) return null;
        const userFlags = acc.public_flags !== undefined && acc.public_flags !== null ? acc.public_flags : (acc.flags || 0);
        const badges = acc.badges || [];
        const legacyBadge = badges.find(b => b.id === 'legacy_username');

        const hasLegacy = (userFlags & 524288) !== 0 || !!legacyBadge || !!acc.legacy_username;
        if (!hasLegacy) return null;

        let tooltipText = null;

        if (acc.legacy_username) {
            const template = getTranslation('badge.legacyUsername');
            tooltipText = template.replace('{username}', acc.legacy_username);
        } else if (legacyBadge && legacyBadge.description) {
            tooltipText = legacyBadge.description;
        } else {
            tooltipText = getTranslation('badge.legacyUsernameDefault');
        }

        return {
            icon: 'assets/badges/Legacy_Username.webp',
            name: tooltipText
        };
    }

    let badgesPopoverEl = null;
    let badgesPopoverTarget = null;
    let badgesPopoverHideTimer = null;

    function getOrCreateBadgesPopover() {
        if (!badgesPopoverEl) {
            badgesPopoverEl = document.createElement('div');
            badgesPopoverEl.id = 'badgesFloatingPopover';
            badgesPopoverEl.className = 'badges-floating-popover';
            document.body.appendChild(badgesPopoverEl);

            badgesPopoverEl.addEventListener('pointerdown', (e) => e.stopPropagation());
            badgesPopoverEl.addEventListener('mousedown', (e) => e.stopPropagation());
            badgesPopoverEl.addEventListener('click', (e) => e.stopPropagation());
        }
        return badgesPopoverEl;
    }

    function showBadgesPopover(anchorEl, badgesList) {
        if (!badgesList || badgesList.length === 0) return;
        if (badgesPopoverHideTimer) {
            clearTimeout(badgesPopoverHideTimer);
            badgesPopoverHideTimer = null;
        }

        const popover = getOrCreateBadgesPopover();
        if (badgesPopoverTarget && badgesPopoverTarget !== anchorEl) {
            badgesPopoverTarget.classList.remove('popover-active');
        }
        badgesPopoverTarget = anchorEl;
        anchorEl.classList.add('popover-active');

        const titleText = getTranslation('badge.allBadges') || 'Badges';
        popover.innerHTML = `
            <div class="badges-popover-header">
                <span class="badges-popover-title">${titleText}</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="badges-popover-count">${badgesList.length}</span>
                    <button class="badges-popover-close" title="${getTranslation('actions.close') || 'Close'}" aria-label="${getTranslation('actions.close') || 'Close'}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="badges-popover-list">
                ${badgesList.map(b => `
                    <div class="badges-popover-item">
                        <img src="${b.icon}" class="badges-popover-icon" alt="">
                        <span class="badges-popover-name">${b.name}</span>
                    </div>
                `).join('')}
            </div>
        `;

        const closeBtn = popover.querySelector('.badges-popover-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hideBadgesPopover(0);
            });
        }

        popover.style.display = 'block';
        popover.style.visibility = 'hidden';

        const popoverRect = popover.getBoundingClientRect();
        const anchorRect = anchorEl.getBoundingClientRect();

        let top = anchorRect.bottom + 6;
        let left = anchorRect.left;

        const maxRight = window.innerWidth - 10;
        if (left + popoverRect.width > maxRight) {
            left = Math.max(10, maxRight - popoverRect.width);
        }

        const maxBottom = window.innerHeight - 10;
        if (top + popoverRect.height > maxBottom) {
            top = anchorRect.top - popoverRect.height - 6;
        }

        popover.style.top = `${Math.max(10, Math.round(top))}px`;
        popover.style.left = `${Math.max(10, Math.round(left))}px`;
        popover.style.visibility = 'visible';
        popover.classList.add('visible');
    }

    function hideBadgesPopover(delay = 0) {
        if (badgesPopoverHideTimer) {
            clearTimeout(badgesPopoverHideTimer);
            badgesPopoverHideTimer = null;
        }
        const doHide = () => {
            if (badgesPopoverTarget) {
                badgesPopoverTarget.classList.remove('popover-active');
                badgesPopoverTarget = null;
            }
            if (badgesPopoverEl) {
                badgesPopoverEl.classList.remove('visible');
                badgesPopoverEl.style.display = 'none';
            }
        };
        if (delay > 0) {
            badgesPopoverHideTimer = setTimeout(() => {
                doHide();
                badgesPopoverHideTimer = null;
            }, delay);
        } else {
            doHide();
        }
    }

    function getAccountBadges(acc) {
        if (!acc) return [];
        const badges = [];

        const nitroInfo = getNitroBadgeInfo(acc);
        if (nitroInfo) badges.push(nitroInfo);

        const boosterInfo = getBoosterBadgeInfo(acc);
        if (boosterInfo) badges.push(boosterInfo);

        const giftingInfo = getGiftingBadgeInfo(acc);
        if (giftingInfo) badges.push(giftingInfo);

        const userFlags = acc.public_flags !== undefined && acc.public_flags !== null ? acc.public_flags : (acc.flags || 0);
        const userBadges = acc.badges || [];

        for (const def of STATIC_BADGE_REGISTRY) {
            const hasFlag = def.flag !== undefined && (userFlags & def.flag) !== 0;
            const matchedBadge = userBadges.find(b => {
                if (!b) return false;
                if (def.badgeId && b.id === def.badgeId) return true;
                if (def.altBadgeId && b.id === def.altBadgeId) return true;
                if (def.matchDesc && b.description && b.description.toLowerCase().includes(def.matchDesc)) return true;
                return false;
            });
            const hasBadge = hasFlag || !!matchedBadge;

            if (hasBadge) {
                let tooltip = getTranslation(def.titleKey);
                if (matchedBadge && matchedBadge.description) {
                    if (def.badgeId === 'april_fools_2026') {
                        tooltip = `${getTranslation(def.titleKey)} (${matchedBadge.description})`;
                    } else if (def.matchDesc) {
                        tooltip = matchedBadge.description;
                    }
                }
                badges.push({
                    icon: def.icon,
                    name: tooltip
                });
            }
        }

        const legacyInfo = getLegacyUsernameBadgeInfo(acc);
        if (legacyInfo) badges.push(legacyInfo);

        return badges;
    }

    function renderBadgesHtml(badges) {
        if (!showBadges || !badges || badges.length === 0) return '';
        const MAX_VISIBLE = 3;
        const visibleBadges = badges.slice(0, MAX_VISIBLE);
        const hiddenCount = badges.length - MAX_VISIBLE;

        const visibleHtml = visibleBadges.map(b => `<img src="${b.icon}" class="badge-icon" title="${b.name}" alt="${b.name}">`).join('');
        const moreHtml = hiddenCount > 0 ? `<span class="badge-more" title="${getTranslation('badge.allBadges') || 'Badges'} (+${hiddenCount})">+${hiddenCount}</span>` : '';

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

        const badges = getAccountBadges(acc);
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
                    <button class="icon-btn account-menu-btn" title="${getTranslation('account.options') || 'Account Options'}">
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
            badgesContainer.addEventListener('pointerdown', (e) => e.stopPropagation());
            badgesContainer.addEventListener('mousedown', (e) => e.stopPropagation());
            badgesContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                if (badges.length > 0) {
                    if (badgesPopoverEl && badgesPopoverEl.classList.contains('visible') && badgesPopoverTarget === badgesContainer) {
                        hideBadgesPopover(0);
                    } else {
                        showBadgesPopover(badgesContainer, badges);
                    }
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
                document.querySelectorAll('.account-menu-wrapper.open').forEach(el => {
                    if (el !== accountMenuWrapper) {
                        el.classList.remove('open');
                        el.classList.remove('open-up');
                    }
                });
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

                    accounts[existingIdx] = {
                        ...existing,
                        _profileChecked: true,
                        username: userData.username,
                        global_name: userData.global_name,
                        avatar: userData.avatar,
                        banner: userData.banner !== undefined ? userData.banner : (existing.banner || null),
                        banner_color: userData.banner_color !== undefined ? userData.banner_color : (existing.banner_color || null),
                        accent_color: userData.accent_color !== undefined ? userData.accent_color : (existing.accent_color !== undefined ? existing.accent_color : null),
                        email: userData.email || existing.email || null,
                        phone: userData.phone || existing.phone || null,
                        verified: userData.verified !== undefined ? !!userData.verified : (existing.verified || false),
                        mfa_enabled: userData.mfa_enabled !== undefined ? !!userData.mfa_enabled : (existing.mfa_enabled || false),
                        locale: userData.locale || existing.locale || null,
                        premium_type: userData.premium_type,
                        flags: userData.flags,
                        public_flags: userData.public_flags,
                        invalid: false,
                        premium_since: userData._profileFailed ? (existing.premium_since || null) : (userData.premium_since || null),
                        premium_guild_since: userData._profileFailed ? (existing.premium_guild_since || null) : (userData.premium_guild_since || null),
                        legacy_username: userData._profileFailed ? (existing.legacy_username || null) : (userData.legacy_username || null),
                        badges: userData._profileFailed ? (existing.badges || []) : (userData.badges || []),
                        gifting_count: existing.gifting_count || 0,
                        gifting_tier: existing.gifting_tier || 0
                    };
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
        addTokenForm.style.display = 'flex';
        footerActions.style.display = 'none';
        populateTokenFolderSelect();
        updateDetectedTokensBadge();
        if (addTokenProgressContainer) addTokenProgressContainer.style.display = 'none';
        errorMsg.textContent = '';
        saveTokenBtn.disabled = false;
        tokenInput.disabled = false;
        tokenInput.focus();
    });

    cancelAddBtn.addEventListener('click', () => {
        if (isBulkAddRunning) {
            isBulkAddCanceled = true;
            cancelAddBtn.textContent = getTranslation('addToken.cancel') || 'Cancel';
            return;
        }
        addTokenForm.style.display = 'none';
        footerActions.style.display = 'flex';
        tokenInput.value = '';
        tokenInput.disabled = false;
        errorMsg.textContent = '';
        if (detectedTokensBadge) detectedTokensBadge.style.display = 'none';
        if (addTokenProgressContainer) addTokenProgressContainer.style.display = 'none';
        if (customTokenFolderSelect) customTokenFolderSelect.classList.remove('open');
        selectFolderOption('', getTranslation('addToken.noFolder') || 'Uncategorized');
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
        const badgesContainer = document.getElementById('accountDetailsBadges');

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

        if (badgesContainer) {
            const badges = getAccountBadges(acc);
            badgesContainer.innerHTML = (badges && badges.length > 0)
                ? badges.map(b => `<img src="${b.icon}" class="badge-icon" title="${b.name}" alt="${b.name}">`).join('')
                : '';
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
                accounts[existingIdx] = {
                    ...existing,
                    token: rawToken,
                    invalid: false,
                    _profileChecked: true,
                    username: userData.username,
                    global_name: userData.global_name,
                    avatar: userData.avatar,
                    email: userData.email || existing.email || null,
                    phone: userData.phone || existing.phone || null,
                    verified: userData.verified !== undefined ? !!userData.verified : (existing.verified || false),
                    mfa_enabled: userData.mfa_enabled !== undefined ? !!userData.mfa_enabled : (existing.mfa_enabled || false),
                    locale: userData.locale || existing.locale || null,
                    premium_type: userData.premium_type,
                    flags: userData.flags,
                    public_flags: userData.public_flags,
                    premium_since: userData._profileFailed ? (existing.premium_since || null) : (userData.premium_since || null),
                    premium_guild_since: userData._profileFailed ? (existing.premium_guild_since || null) : (userData.premium_guild_since || null),
                    legacy_username: userData._profileFailed ? (existing.legacy_username || null) : (userData.legacy_username || null),
                    badges: userData._profileFailed ? (existing.badges || []) : (userData.badges || []),
                    gifting_count: existing.gifting_count || 0,
                    gifting_tier: existing.gifting_tier || 0
                };
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
    }

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
                    newAccounts[existingIndex] = {
                        ...newAccounts[existingIndex],
                        _profileChecked: true,
                        _profileVersion: 4,
                        username: userData.username,
                        global_name: userData.global_name,
                        avatar: userData.avatar,
                        email: userData.email || newAccounts[existingIndex].email || null,
                        phone: userData.phone || newAccounts[existingIndex].phone || null,
                        verified: userData.verified !== undefined ? !!userData.verified : (newAccounts[existingIndex].verified || false),
                        mfa_enabled: userData.mfa_enabled !== undefined ? !!userData.mfa_enabled : (newAccounts[existingIndex].mfa_enabled || false),
                        locale: userData.locale || newAccounts[existingIndex].locale || null,
                        premium_type: userData.premium_type,
                        premium_since: userData.premium_since || null,
                        premium_guild_since: userData.premium_guild_since || null,
                        legacy_username: userData.legacy_username || null,
                        badges: userData.badges || [],
                        flags: userData.flags,
                        public_flags: userData.public_flags,
                        token: token,
                        folderId: selectedFolderId || newAccounts[existingIndex].folderId || null,
                        invalid: false
                    };
                } else {
                    newAccounts = [...accounts, {
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
                        folderId: selectedFolderId,
                        invalid: false
                    }];
                }
                await saveAccounts(newAccounts);
                cancelAddBtn.click();
            } else {
                errorMsg.textContent = getTranslation('addToken.invalid') || 'Invalid token. Please try again.';
            }
            return;
        }

        isBulkAddRunning = true;
        isBulkAddCanceled = false;

        saveTokenBtn.disabled = true;
        tokenInput.disabled = true;
        if (tokenFolderSelect) tokenFolderSelect.disabled = true;
        if (tokenFolderTrigger) tokenFolderTrigger.disabled = true;
        if (customTokenFolderSelect) customTokenFolderSelect.classList.remove('open');
        cancelAddBtn.textContent = getTranslation('addToken.stop') || 'Stop';

        if (addTokenProgressContainer) {
            addTokenProgressContainer.style.display = 'flex';
            if (addTokenProgressBar) addTokenProgressBar.style.width = '0%';
        }

        let addedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        let currentAccounts = [...accounts];

        for (let i = 0; i < tokens.length; i++) {
            if (isBulkAddCanceled) break;

            const token = tokens[i];
            const currentNum = i + 1;
            const percent = Math.round((currentNum / tokens.length) * 100);

            if (addTokenProgressBar) addTokenProgressBar.style.width = `${percent}%`;
            if (addTokenProgressText) {
                const template = getTranslation('addToken.processing') || 'Adding {current} of {total}...';
                addTokenProgressText.textContent = template.replace('{current}', currentNum).replace('{total}', tokens.length);
            }
            if (addTokenProgressCount) {
                addTokenProgressCount.textContent = `${percent}%`;
            }

            if (currentAccounts.some(a => a.token === token)) {
                skippedCount++;
                continue;
            }

            const userData = await validateToken(token);

            if (isBulkAddCanceled) break;

            if (userData) {
                const existingIdx = currentAccounts.findIndex(a => a.id === userData.id);
                if (existingIdx !== -1) {
                    currentAccounts[existingIdx] = {
                        ...currentAccounts[existingIdx],
                        _profileChecked: true,
                        _profileVersion: 4,
                        username: userData.username,
                        global_name: userData.global_name,
                        avatar: userData.avatar,
                        email: userData.email || currentAccounts[existingIdx].email || null,
                        phone: userData.phone || currentAccounts[existingIdx].phone || null,
                        verified: userData.verified !== undefined ? !!userData.verified : (currentAccounts[existingIdx].verified || false),
                        mfa_enabled: userData.mfa_enabled !== undefined ? !!userData.mfa_enabled : (currentAccounts[existingIdx].mfa_enabled || false),
                        locale: userData.locale || currentAccounts[existingIdx].locale || null,
                        premium_type: userData.premium_type,
                        premium_since: userData.premium_since || null,
                        premium_guild_since: userData.premium_guild_since || null,
                        legacy_username: userData.legacy_username || null,
                        badges: userData.badges || [],
                        flags: userData.flags,
                        public_flags: userData.public_flags,
                        token: token,
                        folderId: selectedFolderId || currentAccounts[existingIdx].folderId || null,
                        invalid: false
                    };
                    skippedCount++;
                } else {
                    currentAccounts.push({
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
                        folderId: selectedFolderId,
                        invalid: false
                    });
                    addedCount++;
                }
            } else {
                failedCount++;
            }

            if (i < tokens.length - 1 && !isBulkAddCanceled) {
                await new Promise(r => setTimeout(r, 280));
            }
        }

        if (addedCount > 0 || currentAccounts.length !== accounts.length) {
            await saveAccounts(currentAccounts);
        }

        isBulkAddRunning = false;
        saveTokenBtn.disabled = false;
        tokenInput.disabled = false;
        if (tokenFolderSelect) tokenFolderSelect.disabled = false;
        if (tokenFolderTrigger) tokenFolderTrigger.disabled = false;
        cancelAddBtn.textContent = getTranslation('addToken.cancel') || 'Cancel';

        const summaryTemplate = getTranslation('addToken.summary') || 'Done: {added} added, {skipped} existing, {failed} invalid.';
        const summaryMsg = summaryTemplate
            .replace('{added}', addedCount)
            .replace('{skipped}', skippedCount)
            .replace('{failed}', failedCount);

        errorMsg.textContent = summaryMsg;
        errorMsg.style.color = failedCount > 0 ? 'var(--text-warning)' : 'var(--success)';

        setTimeout(() => {
            if (!isBulkAddRunning) {
                cancelAddBtn.click();
                errorMsg.style.color = '';
            }
        }, 2800);
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
            if (changes.lastCheckAt || changes.lastCheckResults || changes.checkCount || changes.cancelCheck) {
                loadSettingsStatus();
            }
            if (changes.discordAccounts) {
                accounts = changes.discordAccounts.newValue || [];
                renderAccounts();
            }
            if (changes.showBadges) {
                showBadges = changes.showBadges.newValue !== false;
                if (showBadgesToggle) {
                    showBadgesToggle.checked = showBadges;
                }
                if (!showBadges) {
                    hideBadgesPopover(0);
                }
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
            hideBadgesPopover(0);
            const openMenuWrapper = listContainer.querySelector('.account-menu-wrapper.open');
            if (openMenuWrapper) {
                adjustAccountMenuPosition(openMenuWrapper);
            }
        }, { passive: true });
    }
    document.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.account-badges') && !e.target.closest('.badges-floating-popover')) {
            hideBadgesPopover(0);
        }
    });
    // ==========================================
    // MODERN ENTERPRISE DRAG & DROP SYSTEM
    // ==========================================
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

        // Direct children of listContainer are root items: .folder-container OR .account-item
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

                // If folder is open, cache its nested accounts
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

        // Edge Auto-scrolling
        handleAutoScroll(clientY);

        // Calculate Drop Target
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

        // SCENARIO 1: DRAGGING A FOLDER
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

        // SCENARIO 2: DRAGGING AN ACCOUNT
        if (activeDrag.type === 'account') {
            // A) Check if hovering over nested accounts inside an OPEN folder
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

            // B) Check if hovering over folder headers or empty open folders
            let hoveringFolder = null;
            let isFolderHeaderEdge = null; // 'before' | 'after' | null

            for (const f of cachedTargets.folders) {
                // Check folder header
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

                // Check empty open folder body
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

                // If folder is collapsed, auto-expand after 400ms
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

            // Not dropping inside a folder
            if (currentHoverFolder) {
                currentHoverFolder.classList.remove('drop-target-inside');
                currentHoverFolder = null;
            }
            if (hoverExpandTimer) {
                clearTimeout(hoverExpandTimer);
                hoverExpandTimer = null;
            }

            // If it was the top or bottom edge of a folder header:
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

            // C) Check root targets (between / above / below folders and root accounts)
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

            // D) Empty list or bottom of list
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

                // Keep folders array in same relative order as rootOrder
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

        // Animate ghost out
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

            // Close all folder and account option menus
            folders.forEach(f => { delete f.menuOpen; });
            document.querySelectorAll('.folder-actions.open, .folder-menu.open, .account-menu-wrapper.open').forEach(el => {
                el.classList.remove('open', 'open-up');
            });

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

    // Register Escape key cancellation for drag and drop & modal closing
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (activeDrag) {
                e.stopPropagation();
                cancelDragEngine();
                return;
            }
            closeUpdateTokenModal();
            closeAccountDetailsModal();
            hideBadgesPopover(0);
            openAccountMenuToken = null;
            document.querySelectorAll('.account-menu-wrapper.open').forEach(el => {
                el.classList.remove('open');
                el.classList.remove('open-up');
            });
            document.querySelectorAll('.custom-select-container.open').forEach(closeCustomSelect);
        }
    });

    initDragAndDropEngine();
    loadInitialData();
});
