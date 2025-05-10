/**
 * This module provides functions for loading and overriding JSON configuration
 * files for the CustomOS application.
 */

// Cache for loaded configuration files
const configCache = {};

/**
 * Loads a JSON configuration file
 * @param {string} filename - The name of the configuration file to load
 * @returns {Promise<Object>} - The loaded configuration object
 */
export async function loadConfig(filename) {
    // If the file is already in the cache, return it
    if (configCache[filename]) {
        return configCache[filename];
    }
    
    try {
        // Load the configuration file
        const response = await fetch(`config/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load configuration file: ${filename}`);
        }
        
        const config = await response.json();
        
        // Store in cache
        configCache[filename] = config;
        
        return config;
    } catch (error) {
        console.error(`Error loading config file ${filename}:`, error);
        // Return an empty object instead of throwing
        return {};
    }
}

/**
 * Applies saved overrides to the configuration
 * @param {Object} config - The system configuration object
 * @returns {Object} - The system configuration with overrides applied
 */
export function applyOverrides(config) {
    try {
        // Get overrides from localStorage
        const overridesJSON = localStorage.getItem('customos-overrides');
        if (!overridesJSON) {
            return config;
        }
        
        const overrides = JSON.parse(overridesJSON);
        
        // Apply each override
        for (const [filename, fileOverrides] of Object.entries(overrides)) {
            const configSection = getConfigSectionForFile(config, filename);
            if (configSection) {
                applyOverridesToSection(configSection, fileOverrides);
            }
        }
        
        return config;
    } catch (error) {
        console.error('Error applying overrides:', error);
        return config;
    }
}

/**
 * Saves an override for a specific configuration path
 * @param {string} filename - The name of the configuration file
 * @param {string} path - The path to the property to override (e.g., 'wallpaper', 'position.x')
 * @param {any} value - The new value
 */
export function saveOverride(filename, path, value) {
    try {
        // Get existing overrides
        const overridesJSON = localStorage.getItem('customos-overrides') || '{}';
        const overrides = JSON.parse(overridesJSON);
        
        // Initialize file overrides if not exist
        if (!overrides[filename]) {
            overrides[filename] = {};
        }
        
        // Set the override
        setNestedProperty(overrides[filename], path, value);
        
        // Save back to localStorage
        localStorage.setItem('customos-overrides', JSON.stringify(overrides));
    } catch (error) {
        console.error('Error saving override:', error);
    }
}

/**
 * Removes an override
 * @param {string} filename - The name of the configuration file
 * @param {string} path - The path to the property to remove
 */
export function removeOverride(filename, path) {
    try {
        // Get existing overrides
        const overridesJSON = localStorage.getItem('customos-overrides') || '{}';
        const overrides = JSON.parse(overridesJSON);
        
        // Check if file overrides exist
        if (!overrides[filename]) {
            return;
        }
        
        // Remove the override
        removeNestedProperty(overrides[filename], path);
        
        // If no overrides left for this file, remove the file entry
        if (Object.keys(overrides[filename]).length === 0) {
            delete overrides[filename];
        }
        
        // Save back to localStorage
        localStorage.setItem('customos-overrides', JSON.stringify(overrides));
    } catch (error) {
        console.error('Error removing override:', error);
    }
}

/**
 * Gets the corresponding section of the config for a file
 * @param {Object} config - The system configuration
 * @param {string} filename - The configuration file name
 * @returns {Object|null} - The configuration section
 */
function getConfigSectionForFile(config, filename) {
    if (!config) return null;
    
    const mapping = {
        'os-config.json': config.os,
        'desktop-config.json': config.desktop,
        'apps-config.json': config.apps,
        'taskbar-config.json': config.taskbar,
        'notifications-config.json': config.notifications,
        'user-config.json': config.user,
        'security-config.json': config.security,
        'system-config.json': config.systemSettings,
        'startmenu-config.json': config.startMenu,
        'lockscreen-config.json': config.lockScreen
    };
    
    return mapping[filename] || null;
}

/**
 * Applies overrides to a configuration section
 * @param {Object} section - The configuration section
 * @param {Object} overrides - The overrides to apply
 */
function applyOverridesToSection(section, overrides) {
    for (const [path, value] of Object.entries(overrides)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Special handling for app arrays
            if (path === 'installed' || path === 'desktop') {
                // Handle app overrides by ID
                if (Array.isArray(section[path])) {
                    for (const [appId, appOverrides] of Object.entries(value)) {
                        // Find the app by ID in the array
                        const app = section[path].find(a => a.id === appId);
                        if (app) {
                            // Apply the overrides to the app
                            Object.assign(app, appOverrides);
                        }
                    }
                }
                continue;
            }
            
            // If value is an object, recursively apply overrides
            const nestedSection = getNestedProperty(section, path);
            if (nestedSection) {
                applyOverridesToSection(nestedSection, value);
            } else {
                // If the nested section doesn't exist, create it
                setNestedProperty(section, path, {});
                applyOverridesToSection(getNestedProperty(section, path), value);
            }
        } else {
            // For other types, directly set the value
            setNestedProperty(section, path, value);
        }
    }
}

/**
 * Gets a nested property from an object using a dot-separated path
 * @param {Object} obj - The object to get the property from
 * @param {string} path - The path to the property (e.g., 'a.b.c')
 * @returns {any} - The property value
 */
function getNestedProperty(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[part];
    }
    
    return current;
}

/**
 * Sets a nested property on an object using a dot-separated path
 * @param {Object} obj - The object to set the property on
 * @param {string} path - The path to the property (e.g., 'a.b.c')
 * @param {any} value - The value to set
 */
function setNestedProperty(obj, path, value) {
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
}

/**
 * Removes a nested property from an object using a dot-separated path
 * @param {Object} obj - The object to remove the property from
 * @param {string} path - The path to the property (e.g., 'a.b.c')
 */
function removeNestedProperty(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    // Navigate to the object that contains the property to remove
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined) {
            return; // Property doesn't exist
        }
        current = current[part];
    }
    
    // Remove the property
    const finalPart = parts[parts.length - 1];
    delete current[finalPart];
}