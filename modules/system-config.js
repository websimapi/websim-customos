import { loadConfig, applyOverrides, saveOverride } from '../json-override.js';

export class SystemConfig {
    constructor(app) {
        this.app = app;
    }
    
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
            this.app.system = {
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
            this.app.system = applyOverrides(this.app.system);
            
        } catch (error) {
            console.error('Error loading system configuration:', error);
            // Use default fallback configs if loading fails
            this.loadFallbackConfig();
        }
    }
    
    loadFallbackConfig() {
        // Fallback configuration if JSON files can't be loaded
        this.app.system = {
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
    }
    
    // Method to get mapping from system path to config file
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
    }
    
    // Get a configuration value by path
    getConfigByPath(path) {
        // Convert a path like 'desktop.wallpaper' to the actual value
        const parts = path.split('.');
        let current = this.app.system;
        
        for (const part of parts) {
            if (current[part] === undefined) {
                return null;
            }
            current = current[part];
        }
        
        return current;
    }
    
    // Save configuration changes to localStorage
    saveConfig(changes) {
        // Apply changes to the system object
        for (const [path, value] of Object.entries(changes)) {
            const parts = path.split('.');
            let current = this.app.system;
            
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
    }
}