import { createApp } from 'vue';
import { loadConfig, applyOverrides, saveOverride } from './json-override.js';
import { FileExplorer } from './components/file-explorer.js';
import { SettingsApp } from './components/settings-app.js';
import { Terminal } from './components/terminal.js';
import { TextEditor } from './components/text-editor.js';
import { CustomizationApp } from './components/customization-app.js';
import { sandboxTest } from './sandbox.js';

// Main OS application
const CustomOS = {
    data() {
        return {
            loading: true,
            lockScreen: false,
            password: '',
            
            // System configuration (will be loaded from JSON)
            system: {
                os: { name: 'CustomOS', version: '1.0.0' },
                desktop: { wallpaper: 'assets/default-wallpaper.jpg' },
                apps: { desktop: [], installed: [] },
                taskbar: { position: 'bottom', systemTray: [] },
                notifications: { items: [] },
                user: { name: 'User', avatar: 'assets/default-avatar.png' },
                security: { passwordEnabled: false },
                systemSettings: {},
                startMenu: { categories: [] },
                lockScreen: { wallpaper: 'assets/default-lockscreen.jpg' }
            },
            
            // UI state
            currentTime: '',
            currentDate: '',
            startMenuOpen: false,
            powerOptionsOpen: false,
            notificationsPanelOpen: false,
            customizationMode: false,
            
            // Window management
            openWindows: [],
            activeWindowId: null,
            nextWindowId: 1,
            dragInfo: null,
            resizeInfo: null,
            
            // Customization
            customizationPrompt: '',
            customizationLoading: false,
            customizationResult: null,
            
            // App components registry
            appComponents: {}
        };
    },
    computed: {
        taskbarApps() {
            // Get apps pinned to taskbar + open apps
            const pinnedApps = this.system?.taskbar?.pinnedApps || [];
            const openAppIds = this.openWindows.map(w => w.appId);
            
            // Combine pinned apps and open apps (without duplicates)
            return pinnedApps.map(id => {
                const app = this.findAppById(id);
                return app;
            }).filter(app => app !== null);
        }
    },
    async created() {
        // Register app components
        this.registerAppComponents();
        
        // Load configuration
        await this.loadSystemConfig();
        
        // Initialize clock
        this.updateClock();
        setInterval(this.updateClock, 1000);
        
        // Simulate loading
        setTimeout(() => {
            this.loading = false;
            if (this.system?.security?.lockOnStartup) {
                this.lockScreen = true;
            }
        }, 2000);
        
        // Set up global event listeners
        window.addEventListener('click', this.handleGlobalClick);
        window.addEventListener('keydown', this.handleGlobalKeydown);
    },
    beforeDestroy() {
        // Clean up event listeners
        window.removeEventListener('click', this.handleGlobalClick);
        window.removeEventListener('keydown', this.handleGlobalKeydown);
    },
    methods: {
        registerAppComponents() {
            // Register app components
            this.appComponents = {
                'file-explorer': FileExplorer,
                'settings-app': SettingsApp,
                'terminal': Terminal,
                'text-editor': TextEditor,
                'customization-app': CustomizationApp
            };
        },
        async loadSystemConfig() {
            try {
                // Load all configuration files
                const osConfig = await loadConfig('os-config.json').catch(() => ({ name: 'CustomOS', version: '1.0.0' }));
                const desktopConfig = await loadConfig('desktop-config.json').catch(() => ({ wallpaper: 'assets/default-wallpaper.jpg' }));
                const appsConfig = await loadConfig('apps-config.json').catch(() => ({ desktop: [], installed: [] }));
                const taskbarConfig = await loadConfig('taskbar-config.json').catch(() => ({ position: 'bottom', pinnedApps: [], systemTray: [] }));
                const notificationsConfig = await loadConfig('notifications-config.json').catch(() => ({ items: [] }));
                const userConfig = await loadConfig('user-config.json').catch(() => ({ name: 'User', avatar: 'assets/default-avatar.png' }));
                const securityConfig = await loadConfig('security-config.json').catch(() => ({ passwordEnabled: false }));
                const systemConfig = await loadConfig('system-config.json').catch(() => ({}));
                const startMenuConfig = await loadConfig('startmenu-config.json').catch(() => ({ categories: [] }));
                const lockScreenConfig = await loadConfig('lockscreen-config.json').catch(() => ({ wallpaper: 'assets/default-lockscreen.jpg' }));
                
                // Combine all configs into a single system object
                this.system = {
                    os: osConfig,
                    desktop: desktopConfig,
                    apps: appsConfig,
                    taskbar: taskbarConfig,
                    notifications: notificationsConfig,
                    user: userConfig,
                    security: securityConfig,
                    systemSettings: systemConfig,
                    startMenu: startMenuConfig,
                    lockScreen: lockScreenConfig
                };
                
                // Apply any saved overrides from localStorage
                this.system = applyOverrides(this.system);
                
            } catch (error) {
                console.error('Error loading system configuration:', error);
                // Use default fallback configs if loading fails
                this.loadFallbackConfig();
            }
        },
        loadFallbackConfig() {
            // Fallback configuration if JSON files can't be loaded
            this.system = {
                os: {
                    name: 'CustomOS',
                    version: '1.0.0',
                    buildDate: '2023-07-01'
                },
                desktop: {
                    wallpaper: 'assets/default-wallpaper.jpg',
                    iconSize: 'medium',
                    iconSpacing: 'medium'
                },
                apps: {
                    desktop: [
                        { id: 'file-explorer', name: 'Files', icon: 'assets/file-explorer-icon.png' },
                        { id: 'settings', name: 'Settings', icon: 'assets/settings-icon.png' }
                    ],
                    installed: [
                        { id: 'file-explorer', name: 'Files', icon: 'assets/file-explorer-icon.png', component: 'file-explorer' },
                        { id: 'settings', name: 'Settings', icon: 'assets/settings-icon.png', component: 'settings-app' },
                        { id: 'terminal', name: 'Terminal', icon: 'assets/terminal-icon.png', component: 'terminal' },
                        { id: 'text-editor', name: 'Text Editor', icon: 'assets/text-editor-icon.png', component: 'text-editor' },
                        { id: 'customization', name: 'Customize OS', icon: 'assets/customize-icon.png', component: 'customization-app' }
                    ]
                },
                taskbar: {
                    position: 'bottom',
                    startButtonIcon: 'assets/start-icon.png',
                    pinnedApps: ['file-explorer', 'settings', 'terminal'],
                    systemTray: [
                        { id: 'wifi', name: 'Wi-Fi', icon: 'assets/wifi-icon.png' },
                        { id: 'volume', name: 'Volume', icon: 'assets/volume-icon.png' },
                        { id: 'battery', name: 'Battery', icon: 'assets/battery-icon.png' }
                    ]
                },
                notifications: {
                    position: 'right',
                    sound: true,
                    doNotDisturb: false,
                    items: [
                        {
                            id: 'welcome',
                            title: 'Welcome to CustomOS',
                            message: 'Welcome to your new operating system! Click Customize OS to personalize your experience.',
                            icon: 'assets/notification-icon.png',
                            time: Date.now()
                        }
                    ]
                },
                user: {
                    name: 'User',
                    avatar: 'assets/default-avatar.png',
                    email: 'user@example.com'
                },
                security: {
                    passwordEnabled: false,
                    password: '',
                    lockOnStartup: false,
                    autoLockAfterMinutes: 0
                },
                systemSettings: {
                    language: 'en',
                    timeFormat: '12h',
                    dateFormat: 'MM/DD/YYYY',
                    animations: true,
                    soundEffects: true
                },
                startMenu: {
                    categories: [
                        { id: 'productivity', name: 'Productivity' },
                        { id: 'utilities', name: 'Utilities' },
                        { id: 'system', name: 'System' }
                    ]
                },
                lockScreen: {
                    wallpaper: 'assets/default-lockscreen.jpg',
                    showTime: true,
                    showDate: true
                }
            };
        },
        updateClock() {
            const now = new Date();
            
            // Update time based on system settings
            if (this.system?.systemSettings?.timeFormat === '24h') {
                this.currentTime = now.toLocaleTimeString('en-US', { hour12: false });
            } else {
                this.currentTime = now.toLocaleTimeString('en-US', { hour12: true });
            }
            
            // Update date based on system settings
            let dateFormat = this.system?.systemSettings?.dateFormat || 'MM/DD/YYYY';
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            this.currentDate = now.toLocaleDateString('en-US', options);
        },
        // Lock Screen Methods
        unlock() {
            if (this.system.security.passwordEnabled) {
                if (this.password === this.system.security.password) {
                    this.lockScreen = false;
                    this.password = '';
                } else {
                    // TODO: Show password error
                    alert("Incorrect password");
                    this.password = '';
                }
            } else {
                this.lockScreen = false;
            }
        },
        lock() {
            this.lockScreen = true;
            this.closeStartMenu();
            this.closePowerOptions();
        },
        // Start Menu Methods
        toggleStartMenu() {
            this.startMenuOpen = !this.startMenuOpen;
            if (this.startMenuOpen) {
                this.powerOptionsOpen = false;
            }
        },
        closeStartMenu() {
            this.startMenuOpen = false;
        },
        getStartMenuPosition() {
            const position = this.system?.taskbar?.position || 'bottom';
            if (position === 'top') return 'top';
            if (position === 'left') return 'left';
            if (position === 'right') return 'right';
            return '';
        },
        // Power Options Methods
        togglePowerOptions() {
            this.powerOptionsOpen = !this.powerOptionsOpen;
        },
        closePowerOptions() {
            this.powerOptionsOpen = false;
        },
        shutDown() {
            this.loading = true;
            setTimeout(() => {
                // Simulate shutdown by reloading page
                window.location.reload();
            }, 2000);
        },
        restart() {
            this.loading = true;
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        },
        sleep() {
            this.lock();
            this.closePowerOptions();
        },
        // App and Window Management
        findAppById(id) {
            if (!id || !this.system?.apps?.installed) return null;
            return this.system.apps.installed.find(app => app.id === id) || null;
        },
        launchApp(app) {
            // Check if app is already open
            const existingWindow = this.openWindows.find(w => w.appId === app.id);
            if (existingWindow) {
                // Bring existing window to front
                this.activateWindow(existingWindow.id);
                return;
            }
            
            // Create a new window for the app
            const windowId = this.nextWindowId++;
            const newWindow = {
                id: windowId,
                appId: app.id,
                title: app.name,
                icon: app.icon,
                component: app.component,
                data: app.defaultData || {},
                position: { x: 100 + (this.openWindows.length * 30), y: 100 + (this.openWindows.length * 30) },
                size: { width: 800, height: 600 },
                minimized: false,
                maximized: false,
                zIndex: 100 + this.openWindows.length
            };
            
            this.openWindows.push(newWindow);
            this.activateWindow(windowId);
        },
        activateWindow(windowId) {
            // Bring window to front
            this.activeWindowId = windowId;
            
            // Update z-index for all windows
            const maxZ = Math.max(...this.openWindows.map(w => w.zIndex));
            const activeWindow = this.openWindows.find(w => w.id === windowId);
            if (activeWindow) {
                activeWindow.zIndex = maxZ + 1;
                
                // If window is minimized, restore it
                if (activeWindow.minimized) {
                    activeWindow.minimized = false;
                }
            }
        },
        closeWindow(windowId) {
            const index = this.openWindows.findIndex(w => w.id === windowId);
            if (index !== -1) {
                this.openWindows.splice(index, 1);
                
                // Update active window if needed
                if (this.activeWindowId === windowId) {
                    if (this.openWindows.length > 0) {
                        // Find window with highest z-index
                        const highestZWindow = this.openWindows.reduce((prev, curr) => 
                            (curr.zIndex > prev.zIndex) ? curr : prev, this.openWindows[0]);
                        this.activeWindowId = highestZWindow.id;
                    } else {
                        this.activeWindowId = null;
                    }
                }
            }
        },
        minimizeWindow(windowId) {
            const window = this.openWindows.find(w => w.id === windowId);
            if (window) {
                window.minimized = true;
                
                // Update active window
                if (this.activeWindowId === windowId) {
                    // Find next highest z-index window
                    const visibleWindows = this.openWindows.filter(w => !w.minimized);
                    if (visibleWindows.length > 0) {
                        const highestZWindow = visibleWindows.reduce((prev, curr) => 
                            (curr.zIndex > prev.zIndex) ? curr : prev, visibleWindows[0]);
                        this.activeWindowId = highestZWindow.id;
                    } else {
                        this.activeWindowId = null;
                    }
                }
            }
        },
        maximizeWindow(windowId) {
            const window = this.openWindows.find(w => w.id === windowId);
            if (window) {
                if (!window.maximized) {
                    // Save current position and size for later restoration
                    window._restorePosition = { ...window.position };
                    window._restoreSize = { ...window.size };
                    
                    // Calculate available space (accounting for taskbar)
                    const taskbarHeight = 48; // Adjust based on actual taskbar size
                    window.position = { x: 0, y: 0 };
                    window.size = { 
                        width: document.documentElement.clientWidth, 
                        height: document.documentElement.clientHeight - taskbarHeight 
                    };
                    window.maximized = true;
                } else {
                    // Restore previous position and size
                    window.position = window._restorePosition;
                    window.size = window._restoreSize;
                    window.maximized = false;
                }
            }
        },
        startDrag(windowId, event) {
            // Don't drag maximized windows
            const window = this.openWindows.find(w => w.id === windowId);
            if (window && window.maximized) {
                return;
            }
            
            // Activate window being dragged
            this.activateWindow(windowId);
            
            // Set up dragging
            this.dragInfo = {
                windowId,
                startX: event.clientX,
                startY: event.clientY,
                originalPosition: { ...window.position }
            };
            
            // Add event listeners for drag
            document.addEventListener('mousemove', this.handleDrag);
            document.addEventListener('mouseup', this.endDrag);
            
            // Prevent text selection during drag
            event.preventDefault();
        },
        handleDrag(event) {
            if (!this.dragInfo) return;
            
            const window = this.openWindows.find(w => w.id === this.dragInfo.windowId);
            if (window) {
                const deltaX = event.clientX - this.dragInfo.startX;
                const deltaY = event.clientY - this.dragInfo.startY;
                
                window.position = {
                    x: this.dragInfo.originalPosition.x + deltaX,
                    y: this.dragInfo.originalPosition.y + deltaY
                };
            }
        },
        endDrag() {
            this.dragInfo = null;
            document.removeEventListener('mousemove', this.handleDrag);
            document.removeEventListener('mouseup', this.endDrag);
        },
        startResize(windowId, event) {
            const window = this.openWindows.find(w => w.id === windowId);
            if (!window || window.maximized) return;
            
            // Set up resizing
            this.resizeInfo = {
                windowId,
                startX: event.clientX,
                startY: event.clientY,
                originalSize: { ...window.size }
            };
            
            // Add event listeners for resize
            document.addEventListener('mousemove', this.handleResize);
            document.addEventListener('mouseup', this.endResize);
            
            // Prevent text selection during resize
            event.preventDefault();
        },
        handleResize(event) {
            if (!this.resizeInfo) return;
            
            const window = this.openWindows.find(w => w.id === this.resizeInfo.windowId);
            if (window) {
                const deltaX = event.clientX - this.resizeInfo.startX;
                const deltaY = event.clientY - this.resizeInfo.startY;
                
                const newWidth = Math.max(300, this.resizeInfo.originalSize.width + deltaX);
                const newHeight = Math.max(200, this.resizeInfo.originalSize.height + deltaY);
                
                window.size = {
                    width: newWidth,
                    height: newHeight
                };
            }
        },
        endResize() {
            this.resizeInfo = null;
            document.removeEventListener('mousemove', this.handleResize);
            document.removeEventListener('mouseup', this.endResize);
        },
        // Taskbar Methods
        taskbarItemClick(app) {
            const openWindow = this.openWindows.find(w => w.appId === app.id);
            if (openWindow) {
                if (openWindow.minimized || this.activeWindowId !== openWindow.id) {
                    // Restore and activate window
                    openWindow.minimized = false;
                    this.activateWindow(openWindow.id);
                } else {
                    // Minimize window if it's already active
                    this.minimizeWindow(openWindow.id);
                }
            } else {
                // Launch app if not open
                this.launchApp(app);
            }
        },
        isAppActive(appId) {
            const window = this.openWindows.find(w => w.appId === appId);
            return window && !window.minimized && window.id === this.activeWindowId;
        },
        // System Tray Methods
        systemTrayItemClick(item) {
            // Handle system tray item clicks (wifi, volume, etc.)
            console.log(`Clicked system tray item: ${item.name}`);
            if (item.id === 'notifications') {
                this.toggleNotificationsPanel();
            }
        },
        // Notifications Methods
        toggleNotificationsPanel() {
            this.notificationsPanelOpen = !this.notificationsPanelOpen;
        },
        dismissNotification(notificationId) {
            const index = this.system.notifications.items.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                this.system.notifications.items.splice(index, 1);
            }
        },
        clearAllNotifications() {
            this.system.notifications.items = [];
        },
        formatNotificationTime(timestamp) {
            const now = Date.now();
            const diff = now - timestamp;
            
            if (diff < 60000) {
                return 'Just now';
            } else if (diff < 3600000) {
                return `${Math.floor(diff / 60000)} min ago`;
            } else if (diff < 86400000) {
                return `${Math.floor(diff / 3600000)} hr ago`;
            } else {
                return new Date(timestamp).toLocaleDateString();
            }
        },
        // App Category Methods
        getAppsByCategory(categoryId) {
            return (this.system?.apps?.installed || []).filter(app => app.category === categoryId);
        },
        // Settings
        openSettings() {
            const settingsApp = this.findAppById('settings');
            if (settingsApp) {
                this.launchApp(settingsApp);
            }
            this.closeStartMenu();
        },
        // Global Event Handlers
        handleGlobalClick(event) {
            // Close start menu if clicking outside
            if (this.startMenuOpen) {
                const startMenu = document.querySelector('.start-menu');
                const startButton = document.querySelector('.start-button');
                if (startMenu && !startMenu.contains(event.target) && 
                    startButton && !startButton.contains(event.target)) {
                    this.closeStartMenu();
                }
            }
            
            // Close power options if clicking outside
            if (this.powerOptionsOpen) {
                const powerMenu = document.querySelector('.power-options-menu');
                if (powerMenu && !powerMenu.contains(event.target)) {
                    this.closePowerOptions();
                }
            }
        },
        handleGlobalKeydown(event) {
            // Global keyboard shortcuts
            if (event.key === 'Escape') {
                if (this.startMenuOpen) {
                    this.closeStartMenu();
                }
                if (this.powerOptionsOpen) {
                    this.closePowerOptions();
                }
            }
        },
        // Customization Methods
        toggleCustomizationMode() {
            this.customizationMode = !this.customizationMode;
            this.customizationPrompt = '';
            this.customizationResult = null;
        },
        async processCustomization() {
            if (!this.customizationPrompt.trim()) return;
            
            this.customizationLoading = true;
            this.customizationResult = null;
            
            try {
                // Step 1: Determine which part of the OS to customize
                const systemStructure = this.getSystemStructure();
                const identifyRequest = await this.callLLM({
                    prompt: this.customizationPrompt,
                    systemStructure,
                    action: 'identify'
                });
                
                // Step 2: Generate the actual customization
                const affectedPaths = identifyRequest.affectedPaths || [];
                if (affectedPaths.length === 0) {
                    throw new Error("I couldn't determine which part of the OS to customize. Please provide more details.");
                }
                
                // Get the current configuration for affected paths
                const currentConfig = {};
                for (const path of affectedPaths) {
                    currentConfig[path] = this.getConfigByPath(path);
                }
                
                // Generate customization
                const customizationResult = await this.callLLM({
                    prompt: this.customizationPrompt,
                    currentConfig,
                    action: 'customize'
                });
                
                // Test the changes in a sandbox
                const sandboxResult = await sandboxTest(customizationResult.changes);
                
                if (sandboxResult.success) {
                    // Apply the changes
                    this.applyCustomization(customizationResult.changes);
                    
                    this.customizationResult = {
                        success: true,
                        message: "Customization applied successfully!"
                    };
                } else {
                    throw new Error(`Sandbox test failed: ${sandboxResult.error}`);
                }
            } catch (error) {
                console.error('Customization error:', error);
                this.customizationResult = {
                    success: false,
                    error: error.message
                };
            } finally {
                this.customizationLoading = false;
            }
        },
        getSystemStructure() {
            // Generate a description of the system structure to help the LLM identify which parts to change
            return {
                os: Object.keys(this.system.os),
                desktop: Object.keys(this.system.desktop),
                apps: {
                    desktop: this.system.apps.desktop.map(app => app.id),
                    installed: this.system.apps.installed.map(app => app.id)
                },
                taskbar: {
                    ...Object.keys(this.system.taskbar),
                    systemTray: this.system.taskbar.systemTray.map(item => item.id)
                },
                notifications: {
                    ...Object.keys(this.system.notifications)
                },
                user: Object.keys(this.system.user),
                security: Object.keys(this.system.security),
                systemSettings: Object.keys(this.system.systemSettings),
                startMenu: {
                    categories: this.system.startMenu.categories.map(cat => cat.id)
                },
                lockScreen: Object.keys(this.system.lockScreen),
                availableConfigFiles: [
                    'os-config.json',
                    'desktop-config.json', 
                    'apps-config.json',
                    'taskbar-config.json',
                    'notifications-config.json',
                    'user-config.json',
                    'security-config.json',
                    'system-config.json',
                    'startmenu-config.json',
                    'lockscreen-config.json'
                ]
            };
        },
        getConfigByPath(path) {
            // Convert a path like 'desktop.wallpaper' to the actual value
            const parts = path.split('.');
            let current = this.system;
            
            for (const part of parts) {
                if (current[part] === undefined) {
                    return null;
                }
                current = current[part];
            }
            
            return current;
        },
        async callLLM({ prompt, systemStructure, currentConfig, action }) {
            // This function will call the LLM to process customization requests
            // In a real implementation, this would make an API call to a language model

            try {
                // Prepare the message content based on the action
                let content;
                let json = true;
                
                if (action === 'identify') {
                    content = [
                        {
                            type: "text",
                            text: `Analyze the following customization request and determine which parts of the OS need to be modified.
Respond directly with JSON, following this schema, and no other text:
{
  "affectedPaths": string[]  // Array of config paths that should be modified (e.g. ["desktop.wallpaper", "taskbar.position"])
}

The OS has the following structure:
${JSON.stringify(systemStructure, null, 2)}

User's customization request: "${prompt}"`
                        }
                    ];
                } else if (action === 'customize') {
                    content = [
                        {
                            type: "text",
                            text: `Generate JSON changes to customize the OS based on the user's request.
Respond directly with JSON, following this schema, and no other text:
{
  "changes": {
    [path: string]: any  // e.g. "desktop.wallpaper": "assets/new-wallpaper.jpg"
  }
}

Current configuration:
${JSON.stringify(currentConfig, null, 2)}

User's customization request: "${prompt}"`
                        }
                    ];
                }
                
                const completion = await websim.chat.completions.create({
                    messages: [
                        {
                            role: "user",
                            content: content
                        }
                    ],
                    json: json
                });
                
                return JSON.parse(completion.content);
            } catch (error) {
                console.error('Error calling LLM:', error);
                throw new Error('Failed to process customization request');
            }
        },
        applyCustomization(changes) {
            // Apply changes to the system object
            for (const [path, value] of Object.entries(changes)) {
                const parts = path.split('.');
                let current = this.system;
                
                // Navigate to the object that contains the property to change
                for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    if (current[part] === undefined) {
                        current[part] = {};
                    }
                    current = current[part];
                }
                
                // Set the new value
                const finalProp = parts[parts.length - 1];
                current[finalProp] = value;
            }
            
            // Save changes to localStorage
            for (const path of Object.keys(changes)) {
                // Determine which config file this change belongs to
                const configFile = this.getConfigFileForPath(path);
                if (configFile) {
                    const configPath = path.split('.').slice(1).join('.');
                    const configValue = changes[path];
                    
                    saveOverride(configFile, configPath, configValue);
                }
            }
        },
        getConfigFileForPath(path) {
            // Map a system path to the corresponding config file
            const mapping = {
                'os': 'os-config.json',
                'desktop': 'desktop-config.json',
                'apps': 'apps-config.json',
                'taskbar': 'taskbar-config.json',
                'notifications': 'notifications-config.json',
                'user': 'user-config.json',
                'security': 'security-config.json',
                'systemSettings': 'system-config.json',
                'startMenu': 'startmenu-config.json',
                'lockScreen': 'lockscreen-config.json'
            };
            
            const rootProp = path.split('.')[0];
            return mapping[rootProp] || null;
        },
        cancelCustomization() {
            this.customizationMode = false;
            this.customizationPrompt = '';
            this.customizationResult = null;
        },
        retryCustomization() {
            this.customizationResult = null;
            this.processCustomization();
        }
    }
};

// Create the Vue app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = createApp(CustomOS);
    app.mount('#custom-os');
});