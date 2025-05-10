/**
 * This module provides a sandbox environment for testing customization changes
 * before applying them to the live system.
 */

/**
 * Tests customization changes in a sandbox to verify they won't break the system
 * @param {Object} changes - The changes to test
 * @returns {Promise<Object>} - Result of the sandbox test
 */
export async function sandboxTest(changes) {
    try {
        // Clone the current system configuration for testing
        const testSystem = await getClonedSystemConfig();
        
        // Apply changes to the test system
        for (const [path, value] of Object.entries(changes)) {
            const parts = path.split('.');
            let current = testSystem;
            
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
        
        // Run validation tests on the modified system
        const validationResult = validateSystem(testSystem);
        
        if (!validationResult.valid) {
            return {
                success: false,
                error: validationResult.error
            };
        }
        
        return {
            success: true,
            message: "Changes validated successfully"
        };
    } catch (error) {
        console.error('Sandbox test error:', error);
        return {
            success: false,
            error: `Sandbox test failed: ${error.message}`
        };
    }
}

/**
 * Gets a cloned copy of the current system configuration
 * @returns {Promise<Object>} - A deep clone of the system configuration
 */
async function getClonedSystemConfig() {
    // Load all configuration files
    const configs = await Promise.all([
        fetch('config/os-config.json').then(r => r.json()),
        fetch('config/desktop-config.json').then(r => r.json()),
        fetch('config/apps-config.json').then(r => r.json()),
        fetch('config/taskbar-config.json').then(r => r.json()),
        fetch('config/notifications-config.json').then(r => r.json()),
        fetch('config/user-config.json').then(r => r.json()),
        fetch('config/security-config.json').then(r => r.json()),
        fetch('config/system-config.json').then(r => r.json()),
        fetch('config/startmenu-config.json').then(r => r.json()),
        fetch('config/lockscreen-config.json').then(r => r.json())
    ]);
    
    // Apply any existing overrides
    const overridesJSON = localStorage.getItem('customos-overrides');
    let overrides = {};
    if (overridesJSON) {
        overrides = JSON.parse(overridesJSON);
    }
    
    // Build system object
    const system = {
        os: applyFileOverrides(configs[0], overrides['os-config.json']),
        desktop: applyFileOverrides(configs[1], overrides['desktop-config.json']),
        apps: applyFileOverrides(configs[2], overrides['apps-config.json']),
        taskbar: applyFileOverrides(configs[3], overrides['taskbar-config.json']),
        notifications: applyFileOverrides(configs[4], overrides['notifications-config.json']),
        user: applyFileOverrides(configs[5], overrides['user-config.json']),
        security: applyFileOverrides(configs[6], overrides['security-config.json']),
        systemSettings: applyFileOverrides(configs[7], overrides['system-config.json']),
        startMenu: applyFileOverrides(configs[8], overrides['startmenu-config.json']),
        lockScreen: applyFileOverrides(configs[9], overrides['lockscreen-config.json'])
    };
    
    return system;
}

/**
 * Applies overrides to a file configuration
 * @param {Object} config - The original configuration
 * @param {Object} overrides - The overrides to apply
 * @returns {Object} - The configuration with overrides applied
 */
function applyFileOverrides(config, overrides) {
    if (!overrides) {
        return config;
    }
    
    const result = deepClone(config);
    
    // Apply each override
    for (const [path, value] of Object.entries(overrides)) {
        const parts = path.split('.');
        let current = result;
        
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
    
    return result;
}

/**
 * Creates a deep clone of an object
 * @param {Object} obj - The object to clone
 * @returns {Object} - The cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Validates a system configuration to ensure it's valid
 * @param {Object} system - The system configuration to validate
 * @returns {Object} - Validation result
 */
function validateSystem(system) {
    try {
        // Check that required properties exist
        if (!system.os || !system.desktop || !system.apps || !system.taskbar) {
            return {
                valid: false,
                error: "Missing required system components"
            };
        }
        
        // Check OS properties
        if (!system.os.name || typeof system.os.name !== 'string') {
            return {
                valid: false,
                error: "OS name must be a non-empty string"
            };
        }
        
        if (!system.os.version || typeof system.os.version !== 'string') {
            return {
                valid: false,
                error: "OS version must be a non-empty string"
            };
        }
        
        // Check desktop wallpaper
        if (!system.desktop.wallpaper || typeof system.desktop.wallpaper !== 'string') {
            return {
                valid: false,
                error: "Desktop wallpaper must be a valid string path"
            };
        }
        
        // Check taskbar position
        if (system.taskbar.position && !['top', 'bottom', 'left', 'right'].includes(system.taskbar.position)) {
            return {
                valid: false,
                error: "Taskbar position must be 'top', 'bottom', 'left', or 'right'"
            };
        }
        
        // Check apps array
        if (!Array.isArray(system.apps.installed)) {
            return {
                valid: false,
                error: "Apps installed must be an array"
            };
        }
        
        // Check desktop apps array
        if (!Array.isArray(system.apps.desktop)) {
            return {
                valid: false,
                error: "Desktop apps must be an array"
            };
        }
        
        // Additional validations can be added here
        
        return {
            valid: true
        };
    } catch (error) {
        return {
            valid: false,
            error: `Validation error: ${error.message}`
        };
    }
}

