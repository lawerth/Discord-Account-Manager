document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('accountList');
    const showAddBtn = document.getElementById('showAddBtn');
    const addTokenForm = document.getElementById('addTokenForm');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    const tokenInput = document.getElementById('tokenInput');
    const errorMsg = document.getElementById('errorMsg');
    const themeBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const accountCount = document.getElementById('accountCount');
    const addFolderBtn = document.getElementById('addFolderBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const footerActions = document.getElementById('footerActions');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchContainer = document.querySelector('.search-container');
    const checkAllTokensBtn = document.getElementById('checkAllTokensBtn');
    const addCurrentAccountBtn = document.getElementById('addCurrentAccountBtn');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressCount = document.getElementById('progressCount');
    const invalidSummary = document.getElementById('invalidSummary');

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

    listContainer.addEventListener('dragover', (e) => {
        if (draggingType === 'account' || draggingType === 'folder') {
            e.preventDefault();
            handleAutoScroll(e);
            if (draggingType === 'account' && (e.target === listContainer || e.target.classList.contains('uncategorized-label'))) {
                animateReorder(listContainer, () => {
                    listContainer.appendChild(draggingElement);
                });
            }
        }
    });

    listContainer.addEventListener('drop', (e) => {
        stopScroll();
        if (draggingType === 'account') {
            e.preventDefault();
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
                            if (foundToken) return foundToken.replace(/^"|"$/g, '');
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
                                const newAccounts = [...accounts, {
                                    id: userData.id,
                                    username: userData.username,
                                    global_name: userData.global_name,
                                    avatar: userData.avatar,
                                    token: token,
                                    folderId: null
                                }];
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
            chrome.storage.local.get(['discordAccounts', 'discordFolders', 'collapsedFolders', 'selectedTheme'], async function (result) {
                if (result.selectedTheme) {
                    currentThemeIndex = Math.max(0, themes.indexOf(result.selectedTheme));
                    applyTheme(result.selectedTheme);
                }

                accounts = result.discordAccounts || [];
                folders = result.discordFolders || [];
                collapsedFolders = folders.map(f => f.id);

                let hasChanges = false;
                const folderIds = new Set(folders.map(f => f.id));
                const cleanedAccounts = accounts.map(acc => {
                    if (acc.folderId && !folderIds.has(acc.folderId)) {
                        hasChanges = true;
                        return { ...acc, folderId: null };
                    }
                    return acc;
                });

                if (hasChanges) {
                    accounts = cleanedAccounts;
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

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            const newTheme = themes[currentThemeIndex];
            applyTheme(newTheme);
            chrome.storage.local.set({ selectedTheme: newTheme });
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
            const foldersToSave = newFolders.map(({ isEditing, ...rest }) => rest);
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

    function renderAccounts() {
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

        if (invalidSummary) {
            const invalidCount = accounts.filter(acc => acc.invalid).length;
            if (invalidCount > 0) {
                invalidSummary.style.display = 'flex';
                invalidSummary.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                    </svg>
                    <span>${invalidCount} Invalid token${invalidCount > 1 ? 's' : ''} detected</span>
                `;
            } else {
                invalidSummary.style.display = 'none';
            }
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

        visibleFolders.forEach((folder, folderIndex) => {
            const folderContainer = document.createElement('div');
            folderContainer.className = `folder-container ${collapsedFolders.includes(folder.id) ? 'collapsed' : ''} ${folder.color ? 'color-' + folder.color : ''}`;
            folderContainer.dataset.id = folder.id;

            const folderAccounts = filteredAccounts.filter(acc => acc.folderId === folder.id);
            const count = folderAccounts.length;
            const isEditing = folder.isEditing;

            folderContainer.innerHTML = `
                <div class="folder-header" draggable="${!isEditing}" data-id="${folder.id}">
                    <div class="folder-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10L12 15L17 10H7Z"></path>
                        </svg>
                    </div>
                    ${isEditing ? `
                        <div class="edit-mode-controls">
                            <input type="text" class="folder-name-input" value="${folder.name}" autofocus placeholder="Folder Name">
                            <div class="color-palette">
                                <div class="color-option default ${!folder.color ? 'active' : ''}" data-color=""></div>
                                <div class="color-option blue ${folder.color === 'blue' ? 'active' : ''}" data-color="blue" title="Blue"></div>
                                <div class="color-option green ${folder.color === 'green' ? 'active' : ''}" data-color="green" title="Green"></div>
                                <div class="color-option yellow ${folder.color === 'yellow' ? 'active' : ''}" data-color="yellow" title="Yellow"></div>
                                <div class="color-option red ${folder.color === 'red' ? 'active' : ''}" data-color="red" title="Red"></div>
                                <div class="color-option purple ${folder.color === 'purple' ? 'active' : ''}" data-color="purple" title="Purple"></div>
                            </div>
                        </div>
                    ` : `
                        <div class="folder-name-wrapper">
                            <div class="folder-name">${folder.name}</div>
                            ${count > 0 ? `<span class="folder-count">${count}</span>` : ''}
                        </div>
                    `}
                    <div class="folder-actions">
                        <button class="icon-btn edit-folder-btn" title="Edit Folder">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"></path>
                            </svg>
                        </button>
                        <button class="icon-btn delete-folder-btn" title="Delete Folder">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
                                <path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="folder-content"></div>
            `;

            const folderHeader = folderContainer.querySelector('.folder-header');
            const folderContent = folderContainer.querySelector('.folder-content');

            folderHeader.addEventListener('click', (e) => {
                if (e.target.closest('.icon-btn') || e.target.closest('input')) return;
                const id = folder.id;
                if (collapsedFolders.includes(id)) {
                    saveCollapsedFolders(collapsedFolders.filter(fid => fid !== id));
                } else {
                    saveCollapsedFolders([...collapsedFolders, id]);
                }
                folderContainer.classList.toggle('collapsed');
            });

            const editBtn = folderContainer.querySelector('.edit-folder-btn');
            editBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();

                if (folder.isEditing) {
                    const input = folderContainer.querySelector('.folder-name-input');
                    if (input) {
                        folder.name = input.value || 'New Folder';
                    }
                    delete folder.isEditing;
                    saveFolders([...folders]);
                } else {
                    folders.forEach(f => {
                        if (f.id !== folder.id && f.isEditing) {
                            const otherInput = document.querySelector(`.folder-container[data-id="${f.id}"] .folder-name-input`);
                            if (otherInput) {
                                f.name = otherInput.value || 'New Folder';
                            }
                            delete f.isEditing;
                        }
                    });

                    folder.isEditing = true;
                    renderAccounts();
                }
            });

            const nameInput = folderContainer.querySelector('.folder-name-input');
            if (nameInput) {
                nameInput.addEventListener('mousedown', (e) => e.stopPropagation());
                nameInput.addEventListener('blur', () => {
                    folder.name = nameInput.value || 'New Folder';
                });
                nameInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        folder.name = nameInput.value || 'New Folder';
                        delete folder.isEditing;
                        saveFolders([...folders]);
                    }
                });
            }

            const colorOptions = folderContainer.querySelectorAll('.color-option');
            colorOptions.forEach(opt => {
                opt.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    if (nameInput) {
                        folder.name = nameInput.value || 'New Folder';
                    }
                    const color = opt.dataset.color || null;
                    folder.color = color;
                    saveFolders([...folders]);
                });
            });

            const deleteBtn = folderContainer.querySelector('.delete-folder-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newFolders = folders.filter(f => f.id !== folder.id);
                const newAccounts = accounts.map(acc => acc.folderId === folder.id ? { ...acc, folderId: null } : acc);
                chrome.storage.local.set({ discordFolders: newFolders, discordAccounts: newAccounts }, () => {
                    folders = newFolders;
                    accounts = newAccounts;
                    renderAccounts();
                });
            });

            folderHeader.addEventListener('dragstart', (e) => {
                draggingElement = folderContainer;
                draggingType = 'folder';

                dragProxy = folderContainer.cloneNode(true);
                dragProxy.classList.add('drag-proxy');
                const rect = folderContainer.getBoundingClientRect();
                draggingHeight = rect.height;
                dragProxy.style.width = rect.width + 'px';
                dragProxy.style.height = rect.height + 'px';

                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;

                document.body.appendChild(dragProxy);

                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                e.dataTransfer.setDragImage(img, 0, 0);

                setTimeout(() => folderContainer.classList.add('dragging'), 0);
            });

            folderHeader.addEventListener('drag', (e) => {
                if (dragProxy && e.clientX > 0) {
                    dragProxy.style.left = (e.clientX - dragOffsetX) + 'px';
                    dragProxy.style.top = (e.clientY - dragOffsetY) + 'px';
                }
            });

            folderHeader.addEventListener('dragend', () => {
                stopScroll();

                const finalSnap = () => {
                    folderContainer.classList.remove('dragging');
                    draggingElement = null;
                    draggingType = null;
                    saveOrderFromDOM();
                };

                if (dragProxy) {
                    const rect = folderContainer.getBoundingClientRect();
                    dragProxy.style.transition = 'all 0.2s cubic-bezier(0.2, 0, 0, 1)';
                    dragProxy.style.left = rect.left + 'px';
                    dragProxy.style.top = rect.top + 'px';
                    dragProxy.style.transform = 'scale(1)';
                    dragProxy.style.opacity = '0.7';

                    setTimeout(() => {
                        if (dragProxy) {
                            dragProxy.remove();
                            dragProxy = null;
                        }
                        finalSnap();
                    }, 200);
                } else {
                    finalSnap();
                }
            });

            folderHeader.addEventListener('dragover', (e) => {
                e.preventDefault();
                handleAutoScroll(e);
                if (draggingType !== 'folder' || draggingElement === folderContainer) return;

                const bounding = folderHeader.getBoundingClientRect();
                const targetCenterY = bounding.y + (bounding.height / 2);
                const draggedCenterY = (e.clientY - dragOffsetY) + (draggingHeight / 2);

                animateReorder(listContainer, () => {
                    if (draggedCenterY < targetCenterY) {
                        folderContainer.insertAdjacentElement('beforebegin', draggingElement);
                    } else {
                        folderContainer.insertAdjacentElement('afterend', draggingElement);
                    }
                });
            });

            folderContainer.addEventListener('dragover', (e) => {
                if (draggingType === 'account') {
                    e.preventDefault();
                    handleAutoScroll(e);
                    folderContainer.classList.add('drag-over');

                    const content = folderContainer.querySelector('.folder-content');
                    if (content) {
                        const emptyMsg = content.querySelector('.folder-empty-msg');
                        const accountsInFolder = Array.from(content.querySelectorAll('.account-item')).filter(item => item !== draggingElement);

                        const draggedCenterY = (e.clientY - dragOffsetY) + (draggingHeight / 2);

                        let closestItem = null;
                        let minDistance = Infinity;

                        accountsInFolder.forEach(item => {
                            const rect = item.getBoundingClientRect();
                            const itemCenterY = rect.y + rect.height / 2;
                            const distance = Math.abs(draggedCenterY - itemCenterY);
                            if (distance < minDistance) {
                                minDistance = distance;
                                closestItem = item;
                            }
                        });

                        if (draggingElement.parentElement !== content || (closestItem && draggingElement.nextElementSibling !== closestItem && draggingElement.previousElementSibling !== closestItem)) {
                            animateReorder(listContainer, () => {
                                if (emptyMsg) emptyMsg.style.display = 'none';

                                if (closestItem) {
                                    const rect = closestItem.getBoundingClientRect();
                                    const itemCenterY = rect.y + rect.height / 2;
                                    if (draggedCenterY < itemCenterY) {
                                        closestItem.insertAdjacentElement('beforebegin', draggingElement);
                                    } else {
                                        closestItem.insertAdjacentElement('afterend', draggingElement);
                                    }
                                } else {
                                    content.appendChild(draggingElement);
                                }
                            });
                        }
                    }
                }
            });
            folderContainer.addEventListener('dragleave', () => folderContainer.classList.remove('drag-over'));
            folderContainer.addEventListener('drop', (e) => {
                if (draggingType === 'account') {
                    e.preventDefault();
                    folderContainer.classList.remove('drag-over');
                }
            });

            folderContent.addEventListener('dragover', (e) => {
                if (draggingType === 'account') {
                    e.preventDefault();
                }
            });

            if (folderAccounts.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'folder-empty-msg';
                emptyMsg.textContent = 'No accounts in this folder';
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
            label.textContent = 'Uncategorized';
            listContainer.appendChild(label);
        }

        uncategorizedAccounts.forEach((acc) => {
            const accIndex = accounts.indexOf(acc);
            const item = createAccountItem(acc, accIndex);
            listContainer.appendChild(item);
        });

        if (filteredAccounts.length === 0 && visibleFolders.length === 0 && searchQuery.trim() !== '') {
            listContainer.innerHTML = '<div class="empty-state">No matching accounts found.</div>';
        }
    }

    function createAccountItem(acc, index) {
        const item = document.createElement('div');
        item.className = 'account-item';
        item.setAttribute('draggable', 'true');
        item.dataset.index = index;
        item.dataset.token = acc.token;

        const avatarUrl = acc.avatar
            ? `https://cdn.discordapp.com/avatars/${acc.id}/${acc.avatar}.png?size=64`
            : `https://cdn.discordapp.com/embed/avatars/${(BigInt(acc.id) >> 22n) % 6n}.png`;

        item.innerHTML = `
            <div class="drag-handle" title="Drag to reorder">
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
                    <div class="invalid-warning" title="Token Invalid">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                        </svg>
                    </div>
                ` : ''}
                <button class="icon-btn copy-btn" title="Copy Token">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <button class="icon-btn delete-btn" title="Remove Account" data-index="${index}">
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

        item.addEventListener('dragstart', (e) => {
            draggingElement = item;
            draggingType = 'account';

            dragProxy = item.cloneNode(true);
            dragProxy.classList.add('drag-proxy');
            const rect = item.getBoundingClientRect();
            draggingHeight = rect.height;
            dragProxy.style.width = rect.width + 'px';
            dragProxy.style.height = rect.height + 'px';

            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;

            document.body.appendChild(dragProxy);

            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(img, 0, 0);

            setTimeout(() => item.classList.add('dragging'), 0);
        });

        item.addEventListener('drag', (e) => {
            if (dragProxy && e.clientX > 0) {
                dragProxy.style.left = (e.clientX - dragOffsetX) + 'px';
                dragProxy.style.top = (e.clientY - dragOffsetY) + 'px';
            }
        });

        item.addEventListener('dragend', () => {
            stopScroll();

            const finalSnap = () => {
                item.classList.remove('dragging');
                draggingElement = null;
                draggingType = null;
                saveOrderFromDOM();
            };

            if (dragProxy) {
                const rect = item.getBoundingClientRect();
                dragProxy.style.transition = 'all 0.2s cubic-bezier(0.2, 0, 0, 1)';
                dragProxy.style.left = rect.left + 'px';
                dragProxy.style.top = rect.top + 'px';
                dragProxy.style.transform = 'scale(1)';
                dragProxy.style.opacity = '0.7';

                setTimeout(() => {
                    if (dragProxy) {
                        dragProxy.remove();
                        dragProxy = null;
                    }
                    finalSnap();
                }, 200);
            } else {
                finalSnap();
            }
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            handleAutoScroll(e);
            if (draggingType !== 'account' || draggingElement === item) return;

            const bounding = item.getBoundingClientRect();
            const targetCenterY = bounding.y + (bounding.height / 2);
            const draggedCenterY = (e.clientY - dragOffsetY) + (draggingHeight / 2);

            animateReorder(item.parentElement, () => {
                if (draggedCenterY < targetCenterY) {
                    item.insertAdjacentElement('beforebegin', draggingElement);
                } else {
                    item.insertAdjacentElement('afterend', draggingElement);
                }
            });
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

    deleteAllBtn.addEventListener('click', () => {
        if (accounts.length === 0 && folders.length === 0) return;

        if (confirm('Are you sure you want to delete all accounts and folders? This action cannot be undone.')) {
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
                    token: token
                };
            } else {
                newAccounts = [...accounts, {
                    id: userData.id,
                    username: userData.username,
                    global_name: userData.global_name,
                    avatar: userData.avatar,
                    token: token,
                    folderId: null
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

    function animateReorder(container, callback) {
        const items = Array.from(listContainer.querySelectorAll('.account-item, .folder-container'));
        const firstPositions = new Map();

        items.forEach(item => {
            firstPositions.set(item, item.getBoundingClientRect());
        });

        callback();

        items.forEach(item => {
            const firstRect = firstPositions.get(item);
            if (!firstRect) return;

            const lastRect = item.getBoundingClientRect();
            const deltaX = firstRect.left - lastRect.left;
            const deltaY = firstRect.top - lastRect.top;

            if (deltaX !== 0 || deltaY !== 0) {
                item.style.transition = 'none';
                item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                item.offsetHeight;
                item.style.transition = '';
                item.style.transform = '';
            }
        });
    }

    async function saveOrderFromDOM() {
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
            chrome.storage.local.set({ discordFolders: folders.map(({ isEditing, ...rest }) => rest) })
        ]);

        renderAccounts();
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

    if (checkAllTokensBtn) {
        checkAllTokensBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'START_CHECK' });
        });
    }

    function updateProgressUI(isChecking, progress, target, count, results) {
        if (!checkAllTokensBtn || !progressBarContainer || !progressBar) return;

        if (isChecking) {
            checkAllTokensBtn.classList.add('loading');
            checkAllTokensBtn.title = 'Check in progress...';
            progressBarContainer.style.display = 'block';
            progressBar.style.width = progress + '%';
            if (progressText) progressText.textContent = target ? `Checking: ${target}` : 'Checking...';
            if (progressCount) progressCount.textContent = count || '0/0';
        } else {
            checkAllTokensBtn.classList.remove('loading');
            checkAllTokensBtn.title = 'Check All Tokens';
            if (progress >= 100) {
                if (progressText) {
                    if (results) {
                        progressText.textContent = `Completed: ${results.valid} Valid, ${results.invalid} Invalid`;
                    } else {
                        progressText.textContent = 'Check Completed';
                    }
                }
                if (progressCount) progressCount.textContent = count || '';
                progressBar.style.width = '100%';
                setTimeout(() => {
                    chrome.storage.local.get(['isChecking'], (res) => {
                        if (!res.isChecking) progressBarContainer.style.display = 'none';
                    });
                }, 4000);
            } else {
                progressBarContainer.style.display = 'none';
            }
        }
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.isChecking || changes.checkProgress || changes.checkTarget || changes.checkCount || changes.checkResults) {
                chrome.storage.local.get(['isChecking', 'checkProgress', 'checkTarget', 'checkCount', 'checkResults'], (res) => {
                    updateProgressUI(res.isChecking, res.checkProgress || 0, res.checkTarget, res.checkCount, res.checkResults);
                });
            }
            if (changes.discordAccounts) {
                accounts = changes.discordAccounts.newValue || [];
                renderAccounts();
            }
        }
    });

    loadInitialData();
});
