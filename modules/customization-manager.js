import { sandboxTest } from '../sandbox.js';

export class CustomizationManager {
    constructor(app) {
        this.app = app;
        this.lastCustomizationPrompt = '';
    }
    
    toggleCustomizationMode() {
        this.app.customizationMode = !this.app.customizationMode;
        this.app.customizationResult = null;
    }
    
    async processCustomization() {
        if (!this.app.customizationPrompt.trim()) return;
        
        this.app.customizationLoading = true;
        this.app.customizationResult = null;
        this.lastCustomizationPrompt = this.app.customizationPrompt;
        
        try {
            // Step 1: Determine which part of the OS to customize
            const systemStructure = this.getSystemStructure();
            const identifyRequest = await this.callLLM({
                prompt: this.app.customizationPrompt,
                systemStructure,
                action: 'identify'
            });
            
            console.log('Identified affected paths:', identifyRequest.affectedPaths);
            
            // Step 2: Generate the actual customization
            const affectedPaths = identifyRequest.affectedPaths || [];
            if (affectedPaths.length === 0) {
                throw new Error("I couldn't determine which parts of the OS to customize. Please provide more specific details about what you'd like to change.");
            }
            
            // Get the current configuration for affected paths
            const currentConfig = {};
            for (const path of affectedPaths) {
                currentConfig[path] = this.getConfigByPath(path);
            }
            
            // Generate customization
            const customizationResult = await this.callLLM({
                prompt: this.app.customizationPrompt,
                currentConfig,
                action: 'customize'
            });
            
            if (!customizationResult.changes || Object.keys(customizationResult.changes).length === 0) {
                throw new Error("I couldn't generate valid changes based on your request. Please try again with more specific instructions.");
            }
            
            console.log('Generated changes:', customizationResult.changes);
            
            // Test the changes in a sandbox
            const sandboxResult = await sandboxTest(customizationResult.changes);
            
            if (sandboxResult.success) {
                // Apply the changes
                this.applyCustomization(customizationResult.changes);
                
                this.app.customizationResult = {
                    success: true,
                    message: "Your customization has been applied successfully!",
                    changes: customizationResult.changes
                };
            } else {
                throw new Error(`Couldn't apply changes: ${sandboxResult.error}`);
            }
        } catch (error) {
            console.error('Customization error:', error);
            this.app.customizationResult = {
                success: false,
                error: error.message || "An unknown error occurred"
            };
        } finally {
            this.app.customizationLoading = false;
        }
    }
    
    getSystemStructure() {
        // Generate a description of the system structure to help the LLM identify which parts to change
        return {
            os: {
                name: this.app.system.os.name,
                version: this.app.system.os.version,
                properties: Object.keys(this.app.system.os)
            },
            desktop: {
                wallpaper: this.app.system.desktop.wallpaper,
                properties: Object.keys(this.app.system.desktop)
            },
            apps: {
                desktop: this.app.system.apps.desktop.map(app => ({id: app.id, name: app.name})),
                installed: this.app.system.apps.installed.map(app => ({id: app.id, name: app.name}))
            },
            taskbar: {
                position: this.app.system.taskbar.position,
                properties: Object.keys(this.app.system.taskbar),
                systemTray: this.app.system.taskbar.systemTray.map(item => ({id: item.id, name: item.name}))
            },
            notifications: {
                properties: Object.keys(this.app.system.notifications)
            },
            user: {
                name: this.app.system.user.name,
                properties: Object.keys(this.app.system.user)
            },
            security: {
                passwordEnabled: this.app.system.security.passwordEnabled,
                properties: Object.keys(this.app.system.security)
            },
            systemSettings: {
                language: this.app.system.systemSettings.language,
                timeFormat: this.app.system.systemSettings.timeFormat,
                properties: Object.keys(this.app.system.systemSettings)
            },
            startMenu: {
                categories: this.app.system.startMenu.categories.map(cat => ({id: cat.id, name: cat.name})),
                properties: Object.keys(this.app.system.startMenu)
            },
            lockScreen: {
                wallpaper: this.app.system.lockScreen.wallpaper,
                properties: Object.keys(this.app.system.lockScreen)
            },
            configFiles: [
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
    }
    
    async callLLM({ prompt, systemStructure, currentConfig, action }) {
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

User's customization request: "${prompt}"

Reply with a detailed list of paths that need to be changed to fulfill this request. Be specific and include all relevant paths.`
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

User's customization request: "${prompt}"

Reply with specific changes needed to fulfill this request. Provide exact values for each property that needs to be changed.`
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
            throw new Error('Failed to process customization request. Please try again or be more specific.');
        }
    }
    
    getConfigByPath(path) {
        const parts = path.split('.');
        let current = this.app.system;
        
        for (const part of parts) {
            if (current === undefined || current === null) {
                return null;
            }
            current = current[part];
        }
        
        return current;
    }
    
    applyCustomization(changes) {
        // First update the data model
        for (const [path, value] of Object.entries(changes)) {
            const parts = path.split('.');
            let current = this.app.system;
            
            // Navigate to the object that will contain the final property
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (current[part] === undefined) {
                    current[part] = {};
                }
                current = current[part];
            }
            
            // Set the property value
            const finalProp = parts[parts.length - 1];
            current[finalProp] = value;
        }
        
        // Then save overrides to localStorage
        for (const [path, value] of Object.entries(changes)) {
            const configFile = this.getConfigFileForPath(path);
            if (configFile) {
                const configPath = path.split('.').slice(1).join('.');
                this.saveOverride(configFile, configPath, value);
            }
        }
    }
    
    getConfigFileForPath(path) {
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
    
    saveOverride(filename, path, value) {
        try {
            const overridesJSON = localStorage.getItem('customos-overrides') || '{}';
            const overrides = JSON.parse(overridesJSON);
            
            if (!overrides[filename]) {
                overrides[filename] = {};
            }
            
            this.setNestedProperty(overrides[filename], path, value);
            
            localStorage.setItem('customos-overrides', JSON.stringify(overrides));
            
            // Also log for debugging
            console.log(`Saved override: ${filename} - ${path} = `, value);
        } catch (error) {
            console.error('Error saving override:', error);
            throw new Error('Failed to save customization settings');
        }
    }
    
    setNestedProperty(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (current[part] === undefined) {
                current[part] = {};
            }
            current = current[part];
        }
        
        const finalPart = parts[parts.length - 1];
        current[finalPart] = value;
    }
    
    cancelCustomization() {
        this.app.customizationMode = false;
        this.app.customizationPrompt = '';
        this.app.customizationResult = null;
    }
    
    retryCustomization() {
        this.app.customizationPrompt = this.lastCustomizationPrompt;
        this.app.customizationResult = null;
        this.processCustomization();
    }
}