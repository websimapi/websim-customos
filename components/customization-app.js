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
                    
                    // Show image preview if available
                    if (result.imagesPreviews && Object.keys(result.imagesPreviews).length > 0) {
                        const imageKey = Object.keys(result.imagesPreviews)[0];
                        this.imagePreviewUrl = result.imagesPreviews[imageKey];
                        this.imagePreviewType = imageKey;
                    }
                    
                    // Don't clear the input yet - user might want to see what they requested
                    // after the OS reloads
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
                    message: "All customizations have been reset to default. Reloading..."
                };
                
                // Reload the page after a brief delay to show the success message
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                
            } catch (error) {
                console.error('Error resetting customizations:', error);
                this.customizationResult = {
                    success: false,
                    error: 'Error resetting customizations: ' + error.message
                };
            }
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