export const SettingsApp = {
    template: '#settings-app-template',
    props: ['data'],
    data() {
        return {
            activeCategory: 'personalization',
            settings: {},
            settingsCategories: [
                { id: 'personalization', name: 'Personalization', icon: 'assets/personalization-icon.png' },
                { id: 'system', name: 'System', icon: 'assets/system-icon.png' },
                { id: 'accounts', name: 'Accounts', icon: 'assets/accounts-icon.png' },
                { id: 'time', name: 'Time & Language', icon: 'assets/time-language-icon.png' },
                { id: 'security', name: 'Security', icon: 'assets/security-icon.png' },
                { id: 'customization', name: 'Custom OS', icon: 'assets/customize-icon.png' }
            ]
        };
    },
    async created() {
        try {
            // Load all relevant settings with error handling
            const osConfig = await fetch('config/os-config.json').then(r => r.json()).catch(() => ({}));
            const desktopConfig = await fetch('config/desktop-config.json').then(r => r.json()).catch(() => ({}));
            const taskbarConfig = await fetch('config/taskbar-config.json').then(r => r.json()).catch(() => ({}));
            const userConfig = await fetch('config/user-config.json').then(r => r.json()).catch(() => ({}));
            const securityConfig = await fetch('config/security-config.json').then(r => r.json()).catch(() => ({}));
            const systemConfig = await fetch('config/system-config.json').then(r => r.json()).catch(() => ({}));
            
            this.settings = {
                personalization: {
                    desktop: desktopConfig,
                    taskbar: taskbarConfig
                },
                system: {
                    info: osConfig,
                    settings: systemConfig
                },
                accounts: {
                    user: userConfig
                },
                time: {
                    language: systemConfig.language || 'en',
                    timeFormat: systemConfig.timeFormat || '12h',
                    dateFormat: systemConfig.dateFormat || 'MM/DD/YYYY'
                },
                security: securityConfig,
                customization: {}
            };
            
            // Apply overrides from localStorage
            this.applySettingsOverrides();
            
        } catch (error) {
            console.error('Error loading settings:', error);
            // Initialize with empty defaults to prevent errors
            this.settings = {
                personalization: { desktop: {}, taskbar: {} },
                system: { info: {}, settings: {} },
                accounts: { user: {} },
                time: { language: 'en', timeFormat: '12h', dateFormat: 'MM/DD/YYYY' },
                security: {},
                customization: {}
            };
        }
    },
    methods: {
        applySettingsOverrides() {
            try {
                const overridesJSON = localStorage.getItem('customos-overrides');
                if (!overridesJSON) return;
                
                const overrides = JSON.parse(overridesJSON);
                
                // Apply desktop overrides
                if (overrides['desktop-config.json']) {
                    this.applyOverridesToSection(this.settings.personalization.desktop, overrides['desktop-config.json']);
                }
                
                // Apply taskbar overrides
                if (overrides['taskbar-config.json']) {
                    this.applyOverridesToSection(this.settings.personalization.taskbar, overrides['taskbar-config.json']);
                }
                
                // Apply user overrides
                if (overrides['user-config.json']) {
                    this.applyOverridesToSection(this.settings.accounts.user, overrides['user-config.json']);
                }
                
                // Apply security overrides
                if (overrides['security-config.json']) {
                    this.applyOverridesToSection(this.settings.security, overrides['security-config.json']);
                }
                
                // Apply system overrides
                if (overrides['system-config.json']) {
                    this.applyOverridesToSection(this.settings.system.settings, overrides['system-config.json']);
                    
                    // Update time & language settings
                    if (overrides['system-config.json'].language) {
                        this.settings.time.language = overrides['system-config.json'].language;
                    }
                    if (overrides['system-config.json'].timeFormat) {
                        this.settings.time.timeFormat = overrides['system-config.json'].timeFormat;
                    }
                    if (overrides['system-config.json'].dateFormat) {
                        this.settings.time.dateFormat = overrides['system-config.json'].dateFormat;
                    }
                }
                
            } catch (error) {
                console.error('Error applying settings overrides:', error);
            }
        },
        applyOverridesToSection(section, overrides) {
            for (const [path, value] of Object.entries(overrides)) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // If value is an object, recursively apply overrides
                    const nestedSection = this.getNestedProperty(section, path);
                    if (nestedSection) {
                        this.applyOverridesToSection(nestedSection, value);
                    } else {
                        // If the nested section doesn't exist, create it
                        this.setNestedProperty(section, path, {});
                        this.applyOverridesToSection(this.getNestedProperty(section, path), value);
                    }
                } else {
                    // For other types, directly set the value
                    this.setNestedProperty(section, path, value);
                }
            }
        },
        getNestedProperty(obj, path) {
            if (!obj || !path) return undefined;
            
            const parts = path.split('.');
            let current = obj;
            
            for (const part of parts) {
                if (current === undefined || current === null) {
                    return undefined;
                }
                current = current[part];
            }
            
            return current;
        },
        setNestedProperty(obj, path, value) {
            const parts = path.split('.');
            let current = obj;
            
            // Navigate to the object that will contain the final property
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (current[part] === undefined) {
                    current[part] = {};
                }
                current = current[part];
            }
            
            // Set the property value
            const finalPart = parts[parts.length - 1];
            current[finalPart] = value;
        },
        updateSettings(newSettings) {
            // This method is called when a settings component changes a setting
            console.log('Settings updated:', newSettings);
            
            // In a real implementation, this would save the changes to localStorage
            // and potentially trigger a system update
        }
    }
};