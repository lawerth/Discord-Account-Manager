document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('accountList');
    const showAddBtn = document.getElementById('showAddBtn');
    const addTokenForm = document.getElementById('addTokenForm');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    const tokenInput = document.getElementById('tokenInput');
    const errorMsg = document.getElementById('errorMsg');
    const themeBtn = document.getElementById('themeSelect');
    const themeIcon = document.getElementById('themeIcon');
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
    let draggingElement = null;
    let draggingType = null;
    let dragProxy = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let draggingHeight = 0;
    let searchQuery = '';
    let scrollInterval = null;
    let scrollDirection = 0;
    let scrollIntensity = 0;
    const SCROLL_ZONE = 40;
    const MAX_SCROLL_SPEED = 15;
    let pendingDrag = null;
    let dragPointerId = null;
    let dragStarted = false;
    let ignoreFolderClick = false;
    let currentFolderHover = null;
    let currentDragTarget = null;
    const DRAG_START_THRESHOLD = 5;

    const themes = ['discord-dark', 'amoled', 'light'];
    const themeIcons = {
        'discord-dark': '<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 20V4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20Z"></path>',
        'amoled': '<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"></path><path fill="var(--text-normal)" d="M12 16a4 4 0 100-8 4 4 0 000 8z"></path>',
        'light': '<path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM11 1H13V4H11V1ZM11 20H13V23H11V20ZM3.51472 4.92893L4.92893 3.51472L7.05025 5.63604L5.63604 7.05025L3.51472 4.92893ZM16.9497 18.364L18.364 16.9497L20.4853 19.0711L19.0711 20.4853L16.9497 18.364ZM19.0711 3.51472L20.4853 4.92893L18.364 7.05025L16.9497 5.63604L19.0711 3.51472ZM5.63604 16.9497L7.05025 18.364L4.92893 20.4853L3.51472 19.0711L5.63604 16.9497ZM23 11V13H20V11H23ZM4 11V13H1V11H4Z"></path>'
    };
    let currentThemeIndex = 0;

    function applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        if (themeIcon) {
            themeIcon.innerHTML = themeIcons[themeName] || themeIcons['discord-dark'];
        }
    }

    let activeToken = null;

    async function checkActiveDiscordTab() {
        if (!addCurrentAccountBtn) return;
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && (tab.url.startsWith('https://discord.com/') || tab.url.startsWith('https://discordapp.com/'))) {

                addCurrentAccountBtn.textContent = 'Searching...';

                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    world: "MAIN",
                    func: () => {
                        let logs = [];
                        try {
                            const iframe = document.createElement('iframe');
                            document.body.appendChild(iframe);
                            let token1 = iframe.contentWindow.localStorage.getItem('token');
                            document.body.removeChild(iframe);
                            if (token1) return token1.replace(/^"|"$/g, '');
                            logs.push("iframe empty");
                        } catch (e) {
                            logs.push("iframe err: " + e.message);
                        }

                        try {
                            let token2 = window.localStorage.getItem('token');
                            if (token2) return token2.replace(/^"|"$/g, '');
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
                                            let m = req.c[key].exports;
                                            if (m && m.default && typeof m.default.getToken === 'function') {
                                                foundToken = m.default.getToken();
                                                break;
                                            }
                                            if (m && typeof m.getToken === 'function') {
                                                foundToken = m.getToken();
                                                break;
                                            }
                                        }
                                    }
                                ]);
                            }
                            if (foundToken && typeof foundToken === 'string') return foundToken.replace(/^"|"$/g, '');
                            if (foundToken) logs.push("webpack err: foundToken is not a string");
                            else logs.push("webpack empty");
                        } catch (e) {
                            logs.push("webpack err: " + e.message);
                        }

                        return "ERR:" + logs.join(", ");
                    }
                });

                if (results && results[0] && results[0].result) {
                    const tokenResult = results[0].result;

                    if (tokenResult.startsWith("ERR:")) {
                        console.error("Token Extraction Failed:", tokenResult);
                        addCurrentAccountBtn.textContent = 'Not Found';
                        addCurrentAccountBtn.title = 'Debug logs: ' + tokenResult;
                        return;
                    }

                    const token = tokenResult;

                    const tokenExists = accounts.some(a => a.token === token);
                    if (tokenExists) {
                        addCurrentAccountBtn.disabled = true;
                        addCurrentAccountBtn.textContent = 'Already Added';
                        addCurrentAccountBtn.title = 'Account already added';
                        addCurrentAccountBtn.onclick = null;
                    } else {
                        addCurrentAccountBtn.disabled = false;
                        addCurrentAccountBtn.textContent = 'Add Current';
                        addCurrentAccountBtn.title = 'Add Currently Active Discord Account';

                        addCurrentAccountBtn.onclick = async () => {
                            const originalText = addCurrentAccountBtn.textContent;
                            addCurrentAccountBtn.textContent = 'Adding...';
                            addCurrentAccountBtn.disabled = true;

                            const userData = await validateToken(token);
                            if (userData) {
                                const existingIndex = accounts.findIndex(a => a.id === userData.id);
                                let newAccounts;
                                if (existingIndex !== -1) {
                                    newAccounts = [...accounts];
                                    newAccounts[existingIndex] = {
                                        ...newAccounts[existingIndex],
                                        username: userData.username,
                                        global_name: userData.global_name,
                                        avatar: userData.avatar,
                                        token: token,
                                        invalid: false
                                    };
                                } else {
                                    newAccounts = [...accounts, {
                                        id: userData.id,
                                        username: userData.username,
                                        global_name: userData.global_name,
                                        avatar: userData.avatar,
                                        token: token,
                                        folderId: null,
                                        invalid: false
                                    }];
                                }
                                await saveAccounts(newAccounts);
                                checkActiveDiscordTab();
                            } else {
                                addCurrentAccountBtn.textContent = 'Failed';
                                setTimeout(() => {
                                    addCurrentAccountBtn.textContent = originalText;
                                    addCurrentAccountBtn.disabled = false;
                                }, 2000);
                            }
                        };
                    }
                } else {
                    addCurrentAccountBtn.textContent = 'No Token Found';
                    addCurrentAccountBtn.title = 'Could not extract token. Ensure you are fully logged in.';
                }
            } else {
                addCurrentAccountBtn.textContent = 'Add Current';
                addCurrentAccountBtn.title = 'Open a Discord tab to use this feature';
            }
        } catch (error) {
            console.error('Error checking active tab:', error);
            addCurrentAccountBtn.textContent = 'Error';
            addCurrentAccountBtn.title = 'Extension permissions error or reload required.';
        }
    }

    async function loadInitialData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['discordAccounts', 'discordFolders', 'collapsedFolders', 'selectedTheme', 'selectedLanguage'], async function (result) {
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

                accounts = result.discordAccounts || [];
                folders = (result.discordFolders || []).map(({ isEditing, menuOpen, ...rest }) => rest);
                collapsedFolders = folders.map(f => f.id);

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
                'light': 'theme.light'
            };
            if (text) text.textContent = getTranslation(keyMap[themeValue] || themeValue);

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
            container.classList.toggle('open');
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
                container.classList.remove('open');
            });
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                container.classList.remove('open');
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

    function saveAccounts(newAccounts) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ discordAccounts: newAccounts }, () => {
                accounts = newAccounts;
                renderAccounts();
                resolve();
            });
        });
    }

    function saveFolders(newFolders) {
        return new Promise((resolve) => {
            const foldersToSave = newFolders.map(({ isEditing, menuOpen, ...rest }) => rest);
            chrome.storage.local.set({ discordFolders: foldersToSave }, () => {
                folders = newFolders;
                renderAccounts();
                resolve();
            });
        });
    }

    function saveCollapsedFolders(newCollapsed) {
        chrome.storage.local.set({ collapsedFolders: newCollapsed });
        collapsedFolders = newCollapsed;
    }

    function clearFolderHover() {
        if (currentFolderHover) {
            currentFolderHover.classList.remove('drag-over');
            currentFolderHover = null;
        }
    }

    function updateFolderHover(folderContainer) {
        if (currentFolderHover === folderContainer) return;
        clearFolderHover();
        currentFolderHover = folderContainer;
        currentFolderHover.classList.add('drag-over');
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

    function collapseAllFolders() {
        const allFolderIds = folders.map(folder => folder.id);
        saveCollapsedFolders(allFolderIds);
        document.querySelectorAll('.folder-container').forEach(folderEl => {
            folderEl.classList.add('collapsed');
            const folderIcon = folderEl.querySelector('.folder-icon');
            if (folderIcon) {
                folderIcon.style.transform = 'rotate(-90deg)';
            }
            const folderContent = folderEl.querySelector('.folder-content');
            if (folderContent) {
                folderContent.style.maxHeight = '0';
                folderContent.style.paddingTop = '0';
                folderContent.style.paddingBottom = '0';
                folderContent.style.opacity = '0';
                folderContent.style.pointerEvents = 'none';
            }
        });
    }

    function beginPointerDrag(element, type, pointerId, startX, startY) {
        folders.forEach(f => {
            delete f.menuOpen;
        });
        listContainer.querySelectorAll('.folder-actions.open').forEach(el => {
            el.classList.remove('open');
        });
        listContainer.querySelectorAll('.folder-menu.open').forEach(el => {
            el.classList.remove('open');
        });

        if (type === 'folder') {
            collapseAllFolders();
            ignoreFolderClick = true;
        }

        draggingElement = element;
        draggingType = type;
        dragPointerId = pointerId;
        dragStarted = true;
        currentDragTarget = null;

        const rect = element.getBoundingClientRect();
        draggingHeight = rect.height;
        dragOffsetX = startX - rect.left;
        dragOffsetY = startY - rect.top;

        dragProxy = element.cloneNode(true);
        dragProxy.classList.add('drag-proxy');
        if (type === 'folder') {
            dragProxy.classList.add('collapsed');
            const proxyFolderIcon = dragProxy.querySelector('.folder-icon');
            if (proxyFolderIcon) {
                proxyFolderIcon.style.transform = 'rotate(-90deg)';
            }
            const proxyFolderContent = dragProxy.querySelector('.folder-content');
            if (proxyFolderContent) {
                proxyFolderContent.style.maxHeight = '0';
                proxyFolderContent.style.paddingTop = '0';
                proxyFolderContent.style.paddingBottom = '0';
                proxyFolderContent.style.opacity = '0';
                proxyFolderContent.style.pointerEvents = 'none';
            }
        }
        dragProxy.style.width = rect.width + 'px';
        dragProxy.style.height = rect.height + 'px';
        dragProxy.style.left = `${startX - dragOffsetX}px`;
        dragProxy.style.top = `${startY - dragOffsetY}px`;
        dragProxy.style.transition = 'none';
        dragProxy.style.pointerEvents = 'none';
        dragProxy.setAttribute('aria-hidden', 'true');
        document.body.appendChild(dragProxy);

        document.body.style.userSelect = 'none';
        element.classList.add('dragging');
        movePointerDrag(startX, startY);
    }

    function finishPointerDrag() {
        stopScroll();
        document.body.style.userSelect = '';
        if (!draggingElement) {
            cancelPendingDrag();
            return;
        }

        const draggedElement = draggingElement;

        const cleanup = () => {
            draggedElement.classList.remove('dragging');
            draggedElement.style.opacity = '';
            draggedElement.style.transform = '';
            draggedElement.style.transition = '';

            // Add spring bounce drop-settle animation to the dropped element
            draggedElement.classList.add('drop-settle');
            setTimeout(() => {
                draggedElement.classList.remove('drop-settle');
            }, 300);

            const allItems = listContainer.querySelectorAll('.account-item, .folder-container');
            allItems.forEach(item => {
                item.style.transition = '';
                item.style.transform = '';
            });

            draggingElement = null;
            draggingType = null;
            dragStarted = false;
            dragPointerId = null;
            pendingDrag = null;
            currentDragTarget = null;
            clearFolderHover();
        };

        if (dragProxy) {
            const rect = draggedElement.getBoundingClientRect();
            dragProxy.style.transition = 'all 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
            dragProxy.style.left = rect.left + 'px';
            dragProxy.style.top = rect.top + 'px';
            dragProxy.style.transform = 'scale(1)';
            dragProxy.style.opacity = '1';
            dragProxy.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';

            setTimeout(() => {
                if (dragProxy) {
                    dragProxy.remove();
                    dragProxy = null;
                }
                cleanup();
                saveOrderFromDOM(false);
                setTimeout(() => { ignoreFolderClick = false; }, 50);
            }, 220);
        } else {
            cleanup();
            saveOrderFromDOM(false);
            setTimeout(() => { ignoreFolderClick = false; }, 50);
        }
    }

    function cancelPendingDrag() {
        document.body.style.userSelect = '';
        if (pendingDrag && pendingDrag.element) {
            try {
                pendingDrag.element.releasePointerCapture(pendingDrag.pointerId);
            } catch (err) { }
        }
        pendingDrag = null;
        dragPointerId = null;
        dragStarted = false;
        currentDragTarget = null;
        setTimeout(() => { ignoreFolderClick = false; }, 0);
    }

    function updateFolderDragTarget(target, clientY) {
        const folderTarget = target.closest('.folder-container');
        if (!folderTarget || folderTarget === draggingElement) return;

        const header = folderTarget.querySelector('.folder-header');
        if (!header) return;
        const rect = header.getBoundingClientRect();
        const targetCenterY = rect.top + rect.height / 2;
        const shouldInsertBefore = clientY < targetCenterY;

        const alreadyBefore = folderTarget.previousElementSibling === draggingElement;
        const alreadyAfter = folderTarget.nextElementSibling === draggingElement;
        if ((shouldInsertBefore && alreadyBefore) || (!shouldInsertBefore && alreadyAfter)) return;

        animateReorder(listContainer, () => {
            if (shouldInsertBefore) {
                folderTarget.insertAdjacentElement('beforebegin', draggingElement);
            } else {
                folderTarget.insertAdjacentElement('afterend', draggingElement);
            }
        });
    }

    function updateAccountDragTarget(target, clientY) {
        const accountTarget = target.closest('.account-item');
        const folderTarget = target.closest('.folder-container');

        if (accountTarget && accountTarget !== draggingElement) {
            const rect = accountTarget.getBoundingClientRect();
            const targetCenterY = rect.top + rect.height / 2;
            const shouldInsertBefore = clientY < targetCenterY;
            const parent = accountTarget.parentElement;

            if (parent) {
                const alreadyBefore = accountTarget.previousElementSibling === draggingElement;
                const alreadyAfter = accountTarget.nextElementSibling === draggingElement;
                if ((shouldInsertBefore && alreadyBefore) || (!shouldInsertBefore && alreadyAfter)) {
                    return;
                }
            }

            animateReorder(parent || listContainer, () => {
                if (shouldInsertBefore) {
                    accountTarget.insertAdjacentElement('beforebegin', draggingElement);
                } else {
                    accountTarget.insertAdjacentElement('afterend', draggingElement);
                }
            });
            clearFolderHover();
            return;
        }

        if (folderTarget) {
            const folderContent = folderTarget.querySelector('.folder-content');
            if (folderContent) {
                if (folderContent.contains(draggingElement) && draggingElement.parentElement === folderContent) {
                    return;
                }

                const emptyMsg = folderContent.querySelector('.folder-empty-msg');
                animateReorder(listContainer, () => {
                    if (emptyMsg) emptyMsg.style.display = 'none';
                    folderContent.appendChild(draggingElement);
                });
                updateFolderHover(folderTarget);
                return;
            }
        }

        const listArea = target.closest('#accountList') || target.closest('.uncategorized-label');
        if (listArea) {
            if (draggingElement.parentElement === listContainer && listContainer.lastElementChild === draggingElement) {
                return;
            }
            animateReorder(listContainer, () => {
                listContainer.appendChild(draggingElement);
            });
            clearFolderHover();
        }
    }

    function updateDragTarget(clientX, clientY) {
        const target = document.elementFromPoint(clientX, clientY);
        if (!target) return;

        const newTarget = draggingType === 'folder' ? target.closest('.folder-container') : target.closest('.account-item, .folder-container, #accountList, .uncategorized-label');
        currentDragTarget = newTarget;

        if (draggingType === 'folder') {
            updateFolderDragTarget(target, clientY);
        } else if (draggingType === 'account') {
            updateAccountDragTarget(target, clientY);
        }
    }

    function movePointerDrag(clientX, clientY) {
        if (dragProxy) {
            dragProxy.style.left = (clientX - dragOffsetX) + 'px';
            dragProxy.style.top = (clientY - dragOffsetY) + 'px';
        }

        handleAutoScroll({ clientY });

        if (dragProxy) {
            const rect = dragProxy.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            updateDragTarget(centerX, centerY);
        } else {
            updateDragTarget(clientX, clientY);
        }
    }

    function onPointerMove(e) {
        if (e.pointerId !== dragPointerId) return;
        if (!dragStarted && pendingDrag) {
            const distance = Math.hypot(e.clientX - pendingDrag.startX, e.clientY - pendingDrag.startY);
            if (distance >= DRAG_START_THRESHOLD) {
                beginPointerDrag(pendingDrag.element, pendingDrag.type, pendingDrag.pointerId, pendingDrag.startX, pendingDrag.startY);
            }
        }

        if (dragStarted) {
            movePointerDrag(e.clientX, e.clientY);
        }
    }

    function onPointerUp(e) {
        if (e.pointerId !== dragPointerId) return;
        if (dragStarted) {
            finishPointerDrag();
        } else {
            cancelPendingDrag();
        }
    }

    function onPointerCancel(e) {
        if (e.pointerId !== dragPointerId) return;
        if (dragStarted) {
            finishPointerDrag();
        } else {
            cancelPendingDrag();
        }
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);

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
    });

    function renderAccounts() {
        const savedScrollTop = listContainer ? listContainer.scrollTop : 0;
        listContainer.innerHTML = '';

        const filteredAccounts = searchQuery.trim() === ''
            ? accounts
            : accounts.filter(acc => {
                const query = searchQuery.toLowerCase();
                const matchesAcc = (acc.username && acc.username.toLowerCase().includes(query)) ||
                    (acc.global_name && acc.global_name.toLowerCase().includes(query));
                if (matchesAcc) return true;

                if (acc.folderId) {
                    const folder = folders.find(f => f.id === acc.folderId);
                    if (folder && folder.name.toLowerCase().includes(query)) return true;
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
            listContainer.innerHTML = '<div class="empty-state">No accounts added yet.</div>';
            return;
        }

        const visibleFolders = folders.filter(folder => {
            const query = searchQuery.toLowerCase();
            const folderMatches = folder.name.toLowerCase().includes(query);
            if (folderMatches) return true;

            return filteredAccounts.some(acc => acc.folderId === folder.id);
        });

        visibleFolders.forEach((folder) => {
            const folderContainer = document.createElement('div');
            folderContainer.className = `folder-container ${collapsedFolders.includes(folder.id) ? 'collapsed' : ''} ${folder.color ? 'color-' + folder.color : ''}`;
            folderContainer.dataset.id = folder.id;

            const folderAccounts = filteredAccounts.filter(acc => acc.folderId === folder.id);
            const count = folderAccounts.length;
            const isEditing = folder.isEditing;

            folderContainer.innerHTML = `
                <div class="folder-header" data-id="${folder.id}">
                    <div class="folder-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10L12 15L17 10H7Z"></path>
                        </svg>
                    </div>
                    <div class="folder-name-wrapper">
                        <div class="folder-name">${folder.name}</div>
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
                                <input type="text" class="folder-name-input" value="${folder.name}" autofocus placeholder="${getTranslation('folder.renamePlaceholder')}">
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
                    chrome.storage.local.set({ discordFolders: newFolders, discordAccounts: newAccounts }, () => {
                        folders = newFolders;
                        accounts = newAccounts;
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
                if (ignoreFolderClick) {
                    ignoreFolderClick = false;
                    return;
                }
                if (e.target.closest('.folder-actions, .icon-btn, .color-option, .folder-menu') || e.target.closest('input')) return;

                const id = folder.id;
                const isCollapsed = collapsedFolders.includes(id);
                if (isCollapsed) {
                    saveCollapsedFolders(collapsedFolders.filter(fid => fid !== id));
                    folderContainer.classList.remove('collapsed');
                    if (folderContent) {
                        folderContent.style.maxHeight = '';
                        folderContent.style.paddingTop = '';
                        folderContent.style.paddingBottom = '';
                        folderContent.style.opacity = '';
                        folderContent.style.pointerEvents = '';
                    }
                } else {
                    saveCollapsedFolders([...collapsedFolders, id]);
                    folderContainer.classList.add('collapsed');
                }
            });

            folderHeader.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('.icon-btn') || e.target.closest('input') || e.target.closest('.folder-menu')) return;
                e.preventDefault();

                pendingDrag = {
                    element: folderContainer,
                    type: 'folder',
                    pointerId: e.pointerId,
                    startX: e.clientX,
                    startY: e.clientY
                };
                dragPointerId = e.pointerId;
                try {
                    folderHeader.setPointerCapture(e.pointerId);
                } catch (err) { }
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

            listContainer.appendChild(folderContainer);
        });

        const uncategorizedAccounts = filteredAccounts.filter(acc => !acc.folderId);
        if (uncategorizedAccounts.length > 0 && folders.length > 0) {
            const label = document.createElement('div');
            label.className = 'uncategorized-label';
            label.textContent = getTranslation('uncategorized');
            listContainer.appendChild(label);
        }

        uncategorizedAccounts.forEach((acc) => {
            const accIndex = accounts.indexOf(acc);
            const item = createAccountItem(acc, accIndex);
            listContainer.appendChild(item);
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
        });
    }

    function createAccountItem(acc, index) {
        const item = document.createElement('div');
        item.className = 'account-item';
        item.dataset.index = index;
        item.dataset.token = acc.token;

        const avatarUrl = acc.avatar
            ? `https://cdn.discordapp.com/avatars/${acc.id}/${acc.avatar}.png?size=64`
            : `https://cdn.discordapp.com/embed/avatars/${(BigInt(acc.id) >> 22n) % 6n}.png`;

        item.innerHTML = `
            <div class="drag-handle" title="${getTranslation('actions.dragReorder')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 11H20V13H4V11ZM4 6H20V8H4V6ZM4 16H20V18H4V16Z"></path>
                </svg>
            </div>
            <img src="${avatarUrl}" class="account-avatar" alt="Avatar">
            <div class="account-info">
                <div class="account-name">${acc.global_name || acc.username}</div>
                <div class="account-id">${acc.username}</div>
            </div>
            <div class="actions-group">
                ${acc.invalid ? `
                    <div class="invalid-warning" title="${getTranslation('settings.tokenExpired')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                        </svg>
                    </div>
                ` : ''}
                <button class="icon-btn copy-btn" title="${getTranslation('account.copyToken')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <button class="icon-btn delete-btn" title="${getTranslation('account.delete')}" data-index="${index}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
                        <path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
                    </svg>
                </button>
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.closest('.icon-btn') || e.target.closest('.drag-handle')) return;
            switchAccount(acc.token, acc.id);
        });

        const copyBtn = item.querySelector('.copy-btn');
        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(acc.token);
                showSuccess();
            } catch (err) {
                const ta = document.createElement('textarea');
                ta.value = acc.token;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showSuccess();
            }
            function showSuccess() {
                const orig = copyBtn.innerHTML;
                copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                copyBtn.style.color = 'var(--success)';
                setTimeout(() => { copyBtn.innerHTML = orig; copyBtn.style.color = ''; }, 1500);
            }
        });

        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newAccs = accounts.filter((_, i) => i !== index);
            saveAccounts(newAccs);
        });

        item.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('.icon-btn')) return;
            e.preventDefault();

            pendingDrag = {
                element: item,
                type: 'account',
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY
            };
            dragPointerId = e.pointerId;
            try {
                item.setPointerCapture(e.pointerId);
            } catch (err) { }
        });

        return item;
    }

    async function validateToken(token) {
        try {
            const response = await fetch('https://discord.com/api/v10/users/@me', {
                headers: {
                    'Authorization': token
                }
            });

            if (response.status === 401 || response.status === 403) {
                return null;
            }

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data;
        } catch (err) {
            console.error(err);
            return null;
        }
    }


    showAddBtn.addEventListener('click', () => {
        addTokenForm.style.display = 'flex';
        footerActions.style.display = 'none';
        tokenInput.focus();
    });

    cancelAddBtn.addEventListener('click', () => {
        addTokenForm.style.display = 'none';
        footerActions.style.display = 'flex';
        tokenInput.value = '';
        errorMsg.textContent = '';
    });

    tokenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveTokenBtn.click();
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
        let token = tokenInput.value.trim();

        token = token.replace(/[^\x00-\x7F]/g, "");

        if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
            token = token.slice(1, -1);
        }

        token = token.trim();

        if (!token) {
            errorMsg.textContent = 'Please enter a token.';
            return;
        }

        if (accounts.some(a => a.token === token)) {
            errorMsg.textContent = 'This account is already added.';
            return;
        }

        saveTokenBtn.textContent = 'Validating...';
        saveTokenBtn.disabled = true;

        const userData = await validateToken(token);

        saveTokenBtn.textContent = 'Save';
        saveTokenBtn.disabled = false;

        if (userData) {
            const existingIndex = accounts.findIndex(a => a.id === userData.id);
            let newAccounts;

            if (existingIndex !== -1) {
                newAccounts = [...accounts];
                newAccounts[existingIndex] = {
                    ...newAccounts[existingIndex],
                    username: userData.username,
                    global_name: userData.global_name,
                    avatar: userData.avatar,
                    token: token,
                    invalid: false
                };
            } else {
                newAccounts = [...accounts, {
                    id: userData.id,
                    username: userData.username,
                    global_name: userData.global_name,
                    avatar: userData.avatar,
                    token: token,
                    folderId: null,
                    invalid: false
                }];
            }
            await saveAccounts(newAccounts);
            cancelAddBtn.click();
        } else {
            errorMsg.textContent = 'Invalid token. Please try again.';
        }
    });

    addFolderBtn.addEventListener('click', () => {
        const folderId = 'folder_' + Date.now();
        const newFolder = {
            id: folderId,
            name: 'New Folder',
            isEditing: false
        };
        const newFolders = [...folders, newFolder];

        saveCollapsedFolders([...collapsedFolders, folderId]);

        saveFolders(newFolders);
    });

    function handleAutoScroll(e) {
        const rect = listContainer.getBoundingClientRect();
        const topDist = e.clientY - rect.top;
        const bottomDist = rect.bottom - e.clientY;

        if (topDist < SCROLL_ZONE && topDist > 0) {
            scrollDirection = -1;
            scrollIntensity = (SCROLL_ZONE - topDist) / SCROLL_ZONE;
            if (!scrollInterval) startScrollLoop();
        } else if (bottomDist < SCROLL_ZONE && bottomDist > 0) {
            scrollDirection = 1;
            scrollIntensity = (SCROLL_ZONE - bottomDist) / SCROLL_ZONE;
            if (!scrollInterval) startScrollLoop();
        } else {
            stopScroll();
        }
    }

    function startScrollLoop() {
        if (scrollInterval) return;
        scrollInterval = setInterval(() => {
            if (listContainer) {
                listContainer.scrollTop += scrollDirection * (MAX_SCROLL_SPEED * scrollIntensity);
            }
        }, 16);
    }

    function stopScroll() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
    }

    function animateReorder(containerOrCallback, callback) {
        let container = listContainer;
        let action = containerOrCallback;

        if (typeof callback === 'function') {
            container = containerOrCallback;
            action = callback;
        }

        const items = Array.from(container.querySelectorAll('.account-item, .folder-container'));
        const firstPositions = new Map();

        items.forEach(item => {
            firstPositions.set(item, item.getBoundingClientRect());
        });

        action();

        const transforms = [];
        items.forEach(item => {
            if (item === draggingElement) return; // Skip the dragging element
            const firstRect = firstPositions.get(item);
            if (!firstRect) return;

            const lastRect = item.getBoundingClientRect();
            const deltaX = firstRect.left - lastRect.left;
            const deltaY = firstRect.top - lastRect.top;

            if (deltaX !== 0 || deltaY !== 0) {
                transforms.push({ item, deltaX, deltaY });
            }
        });

        transforms.forEach(({ item, deltaX, deltaY }) => {
            item.style.transition = 'none';
            item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            item.offsetHeight; // Force reflow
            item.style.transition = 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)';
            item.style.transform = '';
        });
    }

    async function saveOrderFromDOM(shouldRender = false) {
        const folderEls = Array.from(listContainer.querySelectorAll('.folder-container'));
        const newFoldersOrder = folderEls.map(el => {
            const folderId = el.dataset.id;
            const originalFolder = folders.find(f => f.id === folderId);
            return { ...originalFolder };
        });

        const newAccountsOrder = [];

        folderEls.forEach(folderEl => {
            const folderId = folderEl.dataset.id;
            const accountEls = folderEl.querySelectorAll('.account-item');
            accountEls.forEach(accEl => {
                const accToken = accEl.dataset.token;
                const originalAcc = accounts.find(a => a.token === accToken);
                if (originalAcc) {
                    newAccountsOrder.push({ ...originalAcc, folderId });
                }
            });
        });

        const topLevelAccEls = Array.from(listContainer.children).filter(el => el.classList.contains('account-item'));
        topLevelAccEls.forEach(accEl => {
            const accToken = accEl.dataset.token;
            const originalAcc = accounts.find(a => a.token === accToken);
            if (originalAcc) {
                newAccountsOrder.push({ ...originalAcc, folderId: null });
            }
        });

        accounts = newAccountsOrder;
        folders = newFoldersOrder;

        await Promise.all([
            chrome.storage.local.set({ discordAccounts: accounts }),
            chrome.storage.local.set({ discordFolders: folders.map(({ isEditing, menuOpen, ...rest }) => rest) })
        ]);

        if (shouldRender) {
            renderAccounts();
        }
    }

    function switchAccount(token, accId) {
        chrome.runtime.sendMessage({
            type: 'REFRESH_ACCOUNT',
            token: token,
            accId: accId
        });

        const encodedToken = encodeURIComponent(btoa(token));
        const loginUrl = `https://discord.com/login?token=${encodedToken}`;

        chrome.tabs.create({ url: loginUrl }, () => {
            setTimeout(() => {
                window.close();
            }, 500);
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
            }
        });
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
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
                settingsStatusText.textContent = 'Check canceled.';
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
                    const avatarUrl = acc.avatar
                        ? `https://cdn.discordapp.com/avatars/${acc.id}/${acc.avatar}.png?size=64`
                        : (acc.id ? `https://cdn.discordapp.com/embed/avatars/${(BigInt(acc.id) >> 22n) % 6n}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png');
                    return `
                        <div class="invalid-account-item">
                            <img src="${avatarUrl}" class="invalid-acc-avatar" alt="Avatar">
                            <div class="invalid-acc-info">
                                <div class="invalid-acc-name">${acc.global_name || acc.username || 'Unknown User'}</div>
                                <div class="invalid-acc-sub">${getTranslation('settings.tokenExpired')}</div>
                            </div>
                            <button class="icon-btn-sm delete-invalid-single-btn" title="${getTranslation('account.delete')}" data-token="${acc.token}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"></path>
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
        }
    });

    // Backup & Data Actions
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
                version: "2.2.0",
                exportedAt: new Date().toISOString(),
                accounts: accounts,
                folders: folders
            }, null, 2);
            downloadFile(dataStr, 'discord_accounts_backup.json', 'application/json');
            showBackupMessage('JSON backup downloaded!', 'success');
        });
    }

    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            const tokensList = accounts.map(a => a.token).filter(Boolean).join('\n');
            downloadFile(tokensList, 'discord_tokens.txt', 'text/plain');
            showBackupMessage('Tokens TXT list downloaded!', 'success');
        });
    }

    if (copyTokensBtn) {
        copyTokensBtn.addEventListener('click', () => {
            const tokensList = accounts.map(a => a.token).filter(Boolean).join('\n');
            if (!tokensList) {
                showBackupMessage('No accounts to copy.', 'error');
                return;
            }
            navigator.clipboard.writeText(tokensList).then(() => {
                showBackupMessage(`${accounts.length} token(s) copied to clipboard!`, 'success');
                if (copyTokensBtnTitle) {
                    const originalText = copyTokensBtnTitle.textContent;
                    copyTokensBtnTitle.textContent = 'Copied! ✔';
                    setTimeout(() => {
                        copyTokensBtnTitle.textContent = originalText;
                    }, 2500);
                }
            }).catch(() => {
                showBackupMessage('Failed to copy tokens.', 'error');
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

    // Custom Language Select Logic
    const langSelect = document.getElementById('langSelect');
    const customLangSelect = document.getElementById('customLangSelect');

    const langMap = {
        'en': { name: 'English', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><path fill="#bd3d44" d="M0 0h640v480H0z"/><path fill="#fff" d="M0 36.9h640v36.9H0zm0 73.8h640v36.9H0zm0 73.9h640v36.9H0zm0 73.8h640v36.9H0zm0 73.9h640v36.9H0zm0 73.8h640v36.9H0z"/><path fill="#192f5d" d="M0 0h280v258.5H0z"/></svg>' },
        'tr': { name: 'Türkçe', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="480" fill="#E30A17"/><circle cx="230" cy="240" r="140" fill="#ffffff"/><circle cx="265" cy="240" r="112" fill="#E30A17"/><path d="M342.3 216.7l15.6 48-40.8-29.6-40.8 29.6 15.6-48-40.8-29.7h50.4l15.6-48 15.6 48h50.4z" fill="#ffffff"/></svg>' },
        'de': { name: 'Deutsch', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="160" y="0" fill="#000000"/><rect width="640" height="160" y="160" fill="#DD0000"/><rect width="640" height="160" y="320" fill="#FFCC00"/></svg>' },
        'es': { name: 'Español', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="120" y="0" fill="#AA151B"/><rect width="640" height="240" y="120" fill="#F1BF00"/><rect width="640" height="120" y="360" fill="#AA151B"/></svg>' },
        'fr': { name: 'Français', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="213.3" height="480" x="0" fill="#002395"/><rect width="213.3" height="480" x="213.3" fill="#ffffff"/><rect width="213.3" height="480" x="426.6" fill="#ED2939"/></svg>' },
        'pt': { name: 'Português', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="256" height="480" fill="#046A38"/><rect width="384" height="480" x="256" fill="#DA291C"/><circle cx="256" cy="240" r="90" fill="#FFC72C"/><circle cx="256" cy="240" r="75" fill="#DA291C"/></svg>' },
        'ru': { name: 'Русский', flagSvg: '<svg class="flag-icon" width="18" height="13" viewBox="0 0 640 480"><rect width="640" height="160" y="0" fill="#ffffff"/><rect width="640" height="160" y="160" fill="#0039A6"/><rect width="640" height="160" y="320" fill="#D52B1E"/></svg>' }
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
                if (themeContainer) themeContainer.classList.remove('open');
                customLangSelect.classList.toggle('open');
            });

            options.forEach(opt => {
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = opt.dataset.value;
                    if (langSelect) langSelect.value = val;
                    window.updateCustomLangSelect(val);
                    setLanguage(val);
                    chrome.storage.local.set({ selectedLanguage: val });
                    customLangSelect.classList.remove('open');
                    renderAccounts();
                    loadSettingsStatus();
                });
            });

            document.addEventListener('click', (e) => {
                if (!customLangSelect.contains(e.target)) {
                    customLangSelect.classList.remove('open');
                }
            });
        }
    }

    loadInitialData();
});
