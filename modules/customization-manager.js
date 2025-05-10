import { sandboxTest } from '../sandbox.js';

export class CustomizationManager {
    constructor(app) {
        this.app = app;
        this.lastCustomizationPrompt = '';
        this.generatedImages = {};
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
        this.generatedImages = {};
        
        try {
            // Step 1: Determine which part of the OS to customize
            const systemStructure = this.getSystemStructure();
            const identifyRequest = await this.callLLM({
                prompt: this.app.customizationPrompt,
                systemStructure,
                action: 'identify'
            });
            
            console.log('Identified affected paths:', identifyRequest.affectedPaths);
            console.log('Image generation needed:', identifyRequest.imageGeneration || false);
            
            // Step 2: Generate images if needed
            if (identifyRequest.imageGeneration && identifyRequest.imagePrompts) {
                await this.generateImages(identifyRequest.imagePrompts);
            }
            
            // Step 3: Generate the actual customization
            const affectedPaths = identifyRequest.affectedPaths || [];
            if (affectedPaths.length === 0) {
                throw new Error("I couldn't determine which parts of the OS to customize. Please provide more specific details about what you'd like to change.");
            }
            
            // Get the current configuration for affected paths
            const currentConfig = {};
            for (const path of affectedPaths) {
                currentConfig[path] = this.getConfigByPath(path);
            }
            
            // Add app information for app icon customization
            if (this.app.customizationPrompt.toLowerCase().includes('icon') || 
                this.app.customizationPrompt.toLowerCase().includes('app')) {
                currentConfig.allApps = this.app.system.apps.installed.map(app => ({
                    id: app.id,
                    name: app.name,
                    icon: app.icon,
                    component: app.component,
                    category: app.category
                }));
            }
            
            // Generate customization
            const customizationResult = await this.callLLM({
                prompt: this.app.customizationPrompt,
                currentConfig,
                generatedImages: this.generatedImages,
                action: 'customize'
            });
            
            if (!customizationResult.changes || Object.keys(customizationResult.changes).length === 0) {
                throw new Error("I couldn't generate valid changes based on your request. Please try again with more specific instructions.");
            }
            
            console.log('Generated changes:', customizationResult.changes);
            
            // Pre-validate the changes to ensure we don't corrupt the data structure
            this.preValidateChanges(customizationResult.changes);
            
            // Test the changes in a sandbox
            const sandboxResult = await sandboxTest(customizationResult.changes);
            
            if (sandboxResult.success) {
                // Apply the changes
                this.applyCustomization(customizationResult.changes);
                
                this.app.customizationResult = {
                    success: true,
                    message: "Your customization has been applied successfully! A reboot is required to see the changes.",
                    changes: customizationResult.changes,
                    imagesPreviews: this.generatedImages,
                    rebootRequired: true
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
    
    // New method to pre-validate changes before testing or applying them
    preValidateChanges(changes) {
        // Ensure no changes would break array structures
        for (const [path, value] of Object.entries(changes)) {
            // Prevent complete replacement of crucial arrays
            if (path === 'apps.installed' || path === 'apps.desktop') {
                if (!Array.isArray(value)) {
                    throw new Error(`Cannot replace ${path} with a non-array value`);
                }
            }
            
            // Check for invalid array modifications
            if (path.startsWith('apps.') && !path.includes('[') && !path.includes('appIcon.')) {
                const parts = path.split('.');
                if (parts.length === 2) { // Direct access to top-level array
                    const arrayPath = path;
                    const currentValue = this.getConfigByPath(arrayPath);
                    if (Array.isArray(currentValue) && !Array.isArray(value)) {
                        throw new Error(`Cannot replace array at ${arrayPath} with a non-array value`);
                    }
                }
            }
        }
    }
    
    async generateImages(imagePrompts) {
        const imageGenerationTasks = [];
        
        for (const [key, prompt] of Object.entries(imagePrompts)) {
            // Skip if image doesn't need generation
            if (!prompt) continue;
            
            // Generate images using the LLM image generation capability
            imageGenerationTasks.push(
                websim.imageGen({
                    prompt: prompt.description,
                    aspect_ratio: prompt.aspect || "1:1",
                    transparent: prompt.transparent || false
                }).then(result => {
                    console.log(`Generated image for ${key}:`, result.url);
                    this.generatedImages[key] = result.url;
                }).catch(error => {
                    console.error(`Failed to generate image for ${key}:`, error);
                })
            );
        }
        
        // Wait for all image generation tasks to complete
        if (imageGenerationTasks.length > 0) {
            await Promise.all(imageGenerationTasks);
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
                desktop: this.app.system.apps.desktop.map(app => ({id: app.id, name: app.name, icon: app.icon})),
                installed: this.app.system.apps.installed.map(app => ({id: app.id, name: app.name, icon: app.icon}))
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
            ],
            imageAssets: [
                'wallpaper images',
                'lock screen background',
                'app icons',
                'user avatar'
            ]
        };
    }
    
    async callLLM({ prompt, systemStructure, currentConfig, generatedImages, action }) {
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
  "affectedPaths": string[],  // Array of config paths that should be modified (e.g. ["desktop.wallpaper", "taskbar.position"])
  "imageGeneration": boolean,  // Whether image generation is needed
  "imagePrompts": {  // If imageGeneration is true, provide prompts for each image needed
    [key: string]: {
      "description": string,  // Detailed description for image generation
      "transparent": boolean,  // Whether the image should have a transparent background
      "aspect": string  // Aspect ratio - "1:1", "16:9", etc.
    }
  }
}

The OS has the following structure:
${JSON.stringify(systemStructure, null, 2)}

User's customization request: "${prompt}"

Reply with a detailed list of paths that need to be changed to fulfill this request. Be specific and include all relevant paths. 
For app icon changes, use paths like "appIcon.X" where X is the specific app that needs an icon change.
If the request involves generating or changing images (wallpapers, icons, etc.), set imageGeneration to true and provide detailed prompts.

For app icon changes, use "appIcon.X" as the key in imagePrompts where X is the app ID.

IMPORTANT: Never replace entire array structures like "apps.installed" or "apps.desktop"; 
instead specify individual items to modify within those arrays.`
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
    [path: string]: any  // e.g. "desktop.wallpaper": "data:image/..."
  }
}

Current configuration:
${JSON.stringify(currentConfig, null, 2)}

${generatedImages && Object.keys(generatedImages).length > 0 ? 
  `Generated images available:
${JSON.stringify(generatedImages, null, 2)}` : ''}

User's customization request: "${prompt}"

Reply with specific changes needed to fulfill this request. Provide exact values for each property that needs to be changed.
If images were generated, use their URLs in the appropriate config paths.

IMPORTANT LIMITATIONS:
1. NEVER replace entire array structures (like "apps.installed" or "apps.desktop") with non-array values
2. For app icons, use "appIcon.X" format where X is the app ID (e.g., "appIcon.terminal")
3. To modify a specific app, use the app's ID to target it rather than array indices
4. When modifying properties of individual array items, use the format "apps.installed[N].property" 
   where N is the index of the item

For app icon changes, you need to use the "appIcon.X" format, for example:
- "appIcon.terminal": "new-icon-url"  // This will update the terminal app icon in both installed and desktop arrays

These precautions are necessary to prevent data structure corruption.`
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
        // Special handling for app arrays
        if (path.startsWith('apps.installed') || path.startsWith('apps.desktop')) {
            const parts = path.split('.');
            // Return the whole array for the LLM to process
            if (parts.length === 2) {
                return this.app.system[parts[0]][parts[1]];
            }
        }
        
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
            // Handle special case for app icon updates
            if (path.includes('appIcon.')) {
                // Extract app ID from the path (e.g., "appIcon.terminal" -> "terminal")
                const appId = path.split('.')[1];
                this.updateAppIcon(appId, value);
                continue;
            }
            
            // Skip changes that would replace array structures
            if ((path === 'apps.installed' || path === 'apps.desktop') && !Array.isArray(value)) {
                console.warn(`Skipping invalid change to ${path} that would replace an array with a non-array`);
                continue;
            }
            
            // Handle array item updates (for apps.installed[x].icon, etc.)
            if (path.match(/apps\.(installed|desktop)\[\d+\]\./)) {
                this.updateArrayItem(path, value);
                continue;
            }
            
            const parts = path.split('.');
            let current = this.app.system;
            
            // Navigate to the object that will contain the final property
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                
                // Special safeguard for arrays
                if (part === 'installed' || part === 'desktop') {
                    if (!Array.isArray(current[part])) {
                        console.warn(`Cannot navigate to ${part} because it is not an array`);
                        current = null;
                        break;
                    }
                }
                
                if (current[part] === undefined) {
                    current[part] = {};
                }
                current = current[part];
            }
            
            // Set the property value if we didn't break out of the loop
            if (current) {
                const finalProp = parts[parts.length - 1];
                current[finalProp] = value;
            }
        }
        
        // Then save overrides to localStorage
        for (const [path, value] of Object.entries(changes)) {
            if (path.includes('appIcon.')) {
                // This is handled separately
                continue;
            }
            
            // Skip invalid changes
            if ((path === 'apps.installed' || path === 'apps.desktop') && !Array.isArray(value)) {
                continue;
            }
            
            if (path.match(/apps\.(installed|desktop)\[\d+\]\./)) {
                // Handle array item paths differently
                this.saveArrayItemOverride(path, value);
                continue;
            }
            
            const configFile = this.getConfigFileForPath(path);
            if (configFile) {
                const configPath = path.split('.').slice(1).join('.');
                this.saveOverride(configFile, configPath, value);
            }
        }
    }
    
    updateAppIcon(appId, iconUrl) {
        // Update icon in installed apps
        const installedApp = this.app.system.apps.installed.find(app => app.id === appId);
        if (installedApp) {
            installedApp.icon = iconUrl;
            
            // Save to localStorage
            this.saveAppIconOverride('installed', appId, iconUrl);
        }
        
        // Update icon in desktop apps if present
        const desktopApp = this.app.system.apps.desktop.find(app => app.id === appId);
        if (desktopApp) {
            desktopApp.icon = iconUrl;
            
            // Save to localStorage
            this.saveAppIconOverride('desktop', appId, iconUrl);
        }
    }
    
    saveAppIconOverride(arrayName, appId, iconUrl) {
        try {
            const filename = 'apps-config.json';
            const overridesJSON = localStorage.getItem('customos-overrides') || '{}';
            const overrides = JSON.parse(overridesJSON);
            
            if (!overrides[filename]) {
                overrides[filename] = {};
            }
            
            // Create the nested path if it doesn't exist
            if (!overrides[filename][arrayName]) {
                overrides[filename][arrayName] = {};
            }
            
            // Instead of using array index, we'll use a special format to identify by id
            // This ensures the override works even if array order changes
            overrides[filename][arrayName][appId] = { icon: iconUrl };
            
            localStorage.setItem('customos-overrides', JSON.stringify(overrides));
            console.log(`Saved app icon override for ${appId} in ${arrayName}:`, iconUrl);
        } catch (error) {
            console.error('Error saving app icon override:', error);
        }
    }
    
    updateArrayItem(path, value) {
        // Parse the path to extract array name, index, and property
        // Format: apps.installed[0].icon
        const match = path.match(/^(\w+)\.(\w+)\[(\d+)\]\.(.+)$/);
        if (!match) return;
        
        const [_, objName, arrayName, indexStr, propPath] = match;
        const index = parseInt(indexStr);
        
        // Verify the array exists and has that index
        if (!this.app.system[objName] || 
            !Array.isArray(this.app.system[objName][arrayName]) || 
            !this.app.system[objName][arrayName][index]) {
            console.warn(`Cannot update array item at ${path}: invalid path or index out of bounds`);
            return;
        }
        
        // Navigate to the property and set its value
        const parts = propPath.split('.');
        let current = this.app.system[objName][arrayName][index];
        
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
    
    saveArrayItemOverride(path, value) {
        // Parse the path
        const match = path.match(/^(\w+)\.(\w+)\[(\d+)\]\.(.+)$/);
        if (!match) return;
        
        const [_, objName, arrayName, indexStr, propPath] = match;
        const index = parseInt(indexStr);
        
        // Get the array item to find its ID
        if (!this.app.system[objName] || 
            !Array.isArray(this.app.system[objName][arrayName]) || 
            !this.app.system[objName][arrayName][index]) {
            console.warn(`Cannot save override for array item at ${path}: invalid path or index out of bounds`);
            return;
        }
        
        const item = this.app.system[objName][arrayName][index];
        if (!item || !item.id) return;
        
        const itemId = item.id;
        
        try {
            const filename = this.getConfigFileForPath(objName);
            if (!filename) return;
            
            const overridesJSON = localStorage.getItem('customos-overrides') || '{}';
            const overrides = JSON.parse(overridesJSON);
            
            if (!overrides[filename]) {
                overrides[filename] = {};
            }
            
            if (!overrides[filename][arrayName]) {
                overrides[filename][arrayName] = {};
            }
            
            // Store by ID instead of index
            if (!overrides[filename][arrayName][itemId]) {
                overrides[filename][arrayName][itemId] = {};
            }
            
            // Set the property value
            this.setNestedProperty(overrides[filename][arrayName][itemId], propPath, value);
            
            localStorage.setItem('customos-overrides', JSON.stringify(overrides));
            console.log(`Saved array item override for ${itemId} in ${arrayName}.${propPath}:`, value);
        } catch (error) {
            console.error('Error saving array item override:', error);
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
    
    rebootSystem() {
        // Method to reboot the system when the user confirms
        window.location.reload();
    }
}