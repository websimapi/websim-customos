import { sandboxTest } from '../sandbox.js';

export class CustomizationManager {
    constructor(app) {
        this.app = app;
    }
    
    toggleCustomizationMode() {
        this.app.customizationMode = !this.app.customizationMode;
        this.app.customizationPrompt = '';
        this.app.customizationResult = null;
    }
    
    async processCustomization() {
        if (!this.app.customizationPrompt.trim()) return;
        
        this.app.customizationLoading = true;
        this.app.customizationResult = null;
        
        try {
            // Step 1: Determine which part of the OS to customize
            const systemStructure = this.getSystemStructure();
            const identifyRequest = await this.callLLM({
                prompt: this.app.customizationPrompt,
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
                prompt: this.app.customizationPrompt,
                currentConfig,
                action: 'customize'
            });
            
            // Test the changes in a sandbox
            const sandboxResult = await sandboxTest(customizationResult.changes);
            
            if (sandboxResult.success) {
                // Apply the changes
                this.applyCustomization(customizationResult.changes);
                
                this.app.customizationResult = {
                    success: true,
                    message: "Customization applied successfully!"
                };
            } else {
                throw new Error(`Sandbox test failed: ${sandboxResult.error}`);
            }
        } catch (error) {
            console.error('Customization error:', error);
            this.app.customizationResult = {
                success: false,
                error: error.message
            };
        } finally {
            this.app.customizationLoading = false;
        }
    }
    
    getSystemStructure() {
        // Generate a description of the system structure to help the LLM identify which parts to change
        return {
            os: Object.keys(this.app.system.os),
            desktop: Object.keys(this.app.system.desktop),
            apps: {
                desktop: this.app.system.apps.desktop.map(app => app.id),
                installed: this.app.system.apps.installed.map(app => app.id)
            },
            taskbar: {
                ...Object.keys(this.app.system.taskbar),
                systemTray: this.app.system.taskbar.systemTray.map(item => item.id)
            },
            notifications: {
                ...Object.keys(this.app.system.notifications)
            },
            user: Object.keys(this.app.system.user),
            security: Object.keys(this.app.system.security),
            systemSettings: Object.keys(this.app.system.systemSettings),
            startMenu: {
                categories: this.app.system.startMenu.categories.map(cat => cat.id)
            },
            lockScreen: Object.keys(this.app.system.lockScreen),
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
    }
    
    async callLLM({ prompt, systemStructure, currentConfig, action }) {
        // This function will call the LLM to process customization requests
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
    }
    
    getConfigByPath(path) {
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
    
    applyCustomization(changes) {
        for (const [path, value] of Object.entries(changes)) {
            const parts = path.split('.');
            let current = this.app.system;
            
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (current[part] === undefined) {
                    current[part] = {};
                }
                current = current[part];
            }
            
            const finalProp = parts[parts.length - 1];
            current[finalProp] = value;
        }
        
        for (const path of Object.keys(changes)) {
            const configFile = this.getConfigFileForPath(path);
            if (configFile) {
                const configPath = path.split('.').slice(1).join('.');
                const configValue = changes[path];
                
                this.saveOverride(configFile, configPath, configValue);
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
            
            const nestedPath = path.split('.').slice(1).join('.');
            this.setNestedProperty(overrides[filename], nestedPath, value);
            
            localStorage.setItem('customos-overrides', JSON.stringify(overrides));
        } catch (error) {
            console.error('Error saving override:', error);
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
        this.app.customizationResult = null;
        this.processCustomization();
    }
}