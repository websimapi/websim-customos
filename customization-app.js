export const CustomizationApp = {
    template: '#customization-app-template',
    props: ['data'],
    data() {
        return {
            customizationPrompt: '',
            customizationLoading: false,
            customizationResult: null,
            examples: [
                "Change the desktop wallpaper to a scenic mountain landscape",
                "Make the taskbar transparent and move it to the top",
                "Change the system theme to dark mode",
                "Create a custom app icon for the terminal",
                "Change my user avatar to a cartoon robot",
                "Set a vibrant sunset as my lock screen background"
            ],
            recentCustomizations: [],
            imagePreviewUrl: null,
            imagePreviewType: null
        };
    },
    mounted() {
        // Load recent customizations from localStorage
        try {
            const recentCustomizationsJson = localStorage.getItem('customos-recent-customizations');
            if (recentCustomizationsJson) {
                this.recentCustomizations = JSON.parse(recentCustomizationsJson);
            }
        } catch (error) {
            console.error('Error loading recent customizations:', error);
        }
    },
    methods: {
        async applyCustomization() {
            if (!this.customizationPrompt.trim()) return;
            
            this.customizationLoading = true;
            this.customizationResult = null;
            this.imagePreviewUrl = null;
            this.imagePreviewType = null;
            
            try {
                // Find the parent OS Vue instance
                const osApp = this.findOSApp();
                if (!osApp) {
                    throw new Error('Could not connect to OS system');
                }
                
                // Call the OS's customization manager to process the customization
                osApp.customizationPrompt = this.customizationPrompt;
                await osApp.processCustomization();
                
                // Wait for customization to complete
                const result = osApp.customizationResult;
                this.customizationResult = result;
                
                // If successful, add to recent customizations
                if (result && result.success) {
                    this.addToRecentCustomizations(this.customizationPrompt);
                    
                    // Display ALL image previews if available
                    if (result.imagesPreviews && Object.keys(result.imagesPreviews).length > 0) {
                        // Get the image preview that corresponds to a specific type
                        // Try to find the most relevant image preview first (wallpaper, lockscreen, avatar)
                        const previewKeys = Object.keys(result.imagesPreviews);
                        
                        // Determine most relevant image to show
                        let imageKey = previewKeys[0]; // Default to first image
                        
                        // Priority order for specific types
                        const priorityTypes = ['wallpaper', 'desktop.wallpaper', 'lockScreen.wallpaper', 
                                               'user.avatar', 'appIcon'];
                        
                        for (const type of priorityTypes) {
                            const matchingKey = previewKeys.find(key => key.includes(type));
                            if (matchingKey) {
                                imageKey = matchingKey;
                                break;
                            }
                        }
                        
                        this.imagePreviewUrl = result.imagesPreviews[imageKey];
                        this.imagePreviewType = this.getDisplayTypeFromKey(imageKey);
                    }
                }
                
            } catch (error) {
                console.error('Customization error:', error);
                this.customizationResult = {
                    success: false,
                    error: error.message || 'An unknown error occurred'
                };
            } finally {
                this.customizationLoading = false;
            }
        },
        
        // New helper method to get a user-friendly display type from a key
        getDisplayTypeFromKey(key) {
            if (key.includes('wallpaper') || key === 'desktop.wallpaper') {
                return 'wallpaper';
            } else if (key.includes('lockScreen') || key === 'lockscreen') {
                return 'lockscreen';
            } else if (key.includes('avatar')) {
                return 'avatar';
            } else if (key.includes('appIcon.')) {
                // Extract app ID from the key (e.g., "appIcon.terminal" -> "terminal")
                const appId = key.split('.')[1];
                return `app-icon-${appId}`;
            } else {
                return key;
            }
        },
        
        findOSApp() {
            // Traverse up the component tree to find the OS app
            let current = this;
            while (current.$parent) {
                current = current.$parent;
                if (current.system && current.processCustomization) {
                    return current;
                }
            }
            return null;
        },
        
        resetCustomization() {
            if (!confirm('Are you sure you want to reset all OS customizations to default?')) {
                return;
            }
            
            try {
                // Clear all overrides from localStorage
                localStorage.removeItem('customos-overrides');
                
                this.customizationResult = {
                    success: true,
                    message: "All customizations have been reset to default. A reboot is required to apply changes.",
                    rebootRequired: true
                };
                
                // Don't automatically reload - wait for user to confirm
            } catch (error) {
                console.error('Error resetting customizations:', error);
                this.customizationResult = {
                    success: false,
                    error: 'Error resetting customizations: ' + error.message
                };
            }
        },
        
        rebootSystem() {
            window.location.reload();
        },
        
        useExample(example) {
            this.customizationPrompt = example;
        },
        
        useRecentCustomization(customization) {
            this.customizationPrompt = customization;
        },
        
        addToRecentCustomizations(prompt) {
            // Add to recent customizations, avoiding duplicates
            if (!this.recentCustomizations.includes(prompt)) {
                this.recentCustomizations.unshift(prompt);
                // Keep only the last 5 customizations
                this.recentCustomizations = this.recentCustomizations.slice(0, 5);
                
                // Save to localStorage
                try {
                    localStorage.setItem('customos-recent-customizations', 
                        JSON.stringify(this.recentCustomizations));
                } catch (error) {
                    console.error('Error saving recent customizations:', error);
                }
            }
        },
        
        clearRecentCustomizations() {
            if (confirm('Clear all recent customizations?')) {
                this.recentCustomizations = [];
                localStorage.removeItem('customos-recent-customizations');
            }
        }
    }
};