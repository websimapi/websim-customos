export const CustomizationApp = {
    template: '#customization-app-template',
    props: ['data'],
    data() {
        return {
            customizationPrompt: '',
            customizationLoading: false,
            customizationResult: null
        };
    },
    methods: {
        async applyCustomization() {
            if (!this.customizationPrompt.trim()) return;
            
            this.customizationLoading = true;
            this.customizationResult = null;
            
            try {
                // Tell the parent OS to handle the customization
                // In a real implementation, this would pass the customization to the OS
                
                // Simulate communication with the OS
                // Find the parent OS Vue instance
                // In a real implementation, this would use a proper event bus or Vuex
                const osApp = this.findOSApp();
                if (!osApp) {
                    throw new Error('Could not connect to OS system');
                }
                
                // Call the OS's customization method
                osApp.customizationPrompt = this.customizationPrompt;
                osApp.toggleCustomizationMode();
                
                // Wait for customization to complete
                // In a real implementation, this would use a proper callback or promise
                await new Promise(resolve => {
                    const checkInterval = setInterval(() => {
                        if (osApp.customizationResult) {
                            clearInterval(checkInterval);
                            this.customizationResult = osApp.customizationResult;
                            resolve();
                        }
                    }, 100);
                });
                
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
        resetCustomization() {
            if (!confirm('Are you sure you want to reset all OS customizations to default?')) {
                return;
            }
            
            try {
                // Clear all overrides from localStorage
                localStorage.removeItem('customos-overrides');
                
                // Reload the page to apply defaults
                window.location.reload();
            } catch (error) {
                console.error('Error resetting customizations:', error);
                alert('Error resetting customizations: ' + error.message);
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
        }
    }
};

