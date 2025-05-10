import { createApp } from 'vue';
import { SystemConfig } from './modules/system-config.js';
import { WindowManager } from './modules/window-manager.js';
import { UIManager } from './modules/ui-manager.js';
import { CustomizationManager } from './modules/customization-manager.js';
import { AppManager } from './modules/app-manager.js';
import { registerComponents } from './modules/component-registry.js';

// Main OS application
const CustomOS = {
    data() {
        return {
            loading: true,
            lockScreen: false,
            password: '',
            
            // System configuration (will be loaded from JSON)
            system: {
                os: { name: 'CustomOS', version: '1.0.0' },
                desktop: { wallpaper: 'assets/default-wallpaper.jpg' },
                apps: { desktop: [], installed: [] },
                taskbar: { position: 'bottom', systemTray: [] },
                notifications: { items: [] },
                user: { name: 'User', avatar: 'assets/default-avatar.png' },
                security: { passwordEnabled: false },
                systemSettings: {},
                startMenu: { categories: [] },
                lockScreen: { wallpaper: 'assets/default-lockscreen.jpg' }
            },
            
            // These properties are now managed by the respective modules
            // but remain in the data for reactivity and compatibility
            currentTime: '',
            currentDate: '',
            startMenuOpen: false,
            powerOptionsOpen: false,
            notificationsPanelOpen: false,
            customizationMode: false,
            openWindows: [],
            activeWindowId: null,
            nextWindowId: 1,
            customizationPrompt: '',
            customizationLoading: false,
            customizationResult: null,
            appComponents: {}
        };
    },
    computed: {
        taskbarApps() {
            return this.appManager.getTaskbarApps();
        }
    },
    async created() {
        // Initialize managers
        this.systemConfig = new SystemConfig(this);
        this.windowManager = new WindowManager(this);
        this.uiManager = new UIManager(this);
        this.customizationManager = new CustomizationManager(this);
        this.appManager = new AppManager(this);
        
        // Register app components
        registerComponents(this);
        
        // Load configuration
        await this.systemConfig.loadSystemConfig();
        
        // Initialize clock
        this.uiManager.initClock();
        
        // Simulate loading
        setTimeout(() => {
            this.loading = false;
            if (this.system?.security?.lockOnStartup) {
                this.lockScreen = true;
            }
        }, 2000);
        
        // Set up global event listeners
        window.addEventListener('click', this.handleGlobalClick);
        window.addEventListener('keydown', this.handleGlobalKeydown);
    },
    beforeDestroy() {
        // Clean up event listeners
        window.removeEventListener('click', this.handleGlobalClick);
        window.removeEventListener('keydown', this.handleGlobalKeydown);
    },
    methods: {
        // Lock Screen Methods - Delegated to UIManager
        unlock() {
            this.uiManager.unlock();
        },
        lock() {
            this.uiManager.lock();
        },
        
        // Start Menu Methods - Delegated to UIManager
        toggleStartMenu() {
            this.uiManager.toggleStartMenu();
        },
        closeStartMenu() {
            this.uiManager.closeStartMenu();
        },
        getStartMenuPosition() {
            return this.uiManager.getStartMenuPosition();
        },
        
        // Power Options Methods - Delegated to UIManager
        togglePowerOptions() {
            this.uiManager.togglePowerOptions();
        },
        closePowerOptions() {
            this.uiManager.closePowerOptions();
        },
        shutDown() {
            this.uiManager.shutDown();
        },
        restart() {
            this.uiManager.restart();
        },
        sleep() {
            this.uiManager.sleep();
        },
        
        // App and Window Management - Delegated to AppManager and WindowManager
        findAppById(id) {
            return this.appManager.findAppById(id);
        },
        launchApp(app) {
            this.appManager.launchApp(app);
        },
        
        // Window Management Methods - Delegated to WindowManager
        activateWindow(windowId) {
            this.windowManager.activateWindow(windowId);
        },
        closeWindow(windowId) {
            this.windowManager.closeWindow(windowId);
        },
        minimizeWindow(windowId) {
            this.windowManager.minimizeWindow(windowId);
        },
        maximizeWindow(windowId) {
            this.windowManager.maximizeWindow(windowId);
        },
        startDrag(windowId, event) {
            this.windowManager.startDrag(windowId, event);
        },
        startResize(windowId, event) {
            this.windowManager.startResize(windowId, event);
        },
        
        // Taskbar Methods - Delegated to UIManager
        taskbarItemClick(app) {
            this.uiManager.taskbarItemClick(app);
        },
        isAppActive(appId) {
            return this.uiManager.isAppActive(appId);
        },
        
        // System Tray Methods - Delegated to UIManager
        systemTrayItemClick(item) {
            this.uiManager.systemTrayItemClick(item);
        },
        
        // Notifications Methods - Delegated to UIManager
        toggleNotificationsPanel() {
            this.uiManager.toggleNotificationsPanel();
        },
        dismissNotification(notificationId) {
            this.uiManager.dismissNotification(notificationId);
        },
        clearAllNotifications() {
            this.uiManager.clearAllNotifications();
        },
        formatNotificationTime(timestamp) {
            return this.uiManager.formatNotificationTime(timestamp);
        },
        
        // App Category Methods - Delegated to AppManager
        getAppsByCategory(categoryId) {
            return this.appManager.getAppsByCategory(categoryId);
        },
        
        // Settings - Delegated to UIManager
        openSettings() {
            this.uiManager.openSettings();
        },
        
        // Global Event Handlers - Delegated to UIManager
        handleGlobalClick(event) {
            this.uiManager.handleGlobalClick(event);
        },
        handleGlobalKeydown(event) {
            this.uiManager.handleGlobalKeydown(event);
        },
        
        // Customization Methods - Delegated to CustomizationManager
        toggleCustomizationMode() {
            this.customizationManager.toggleCustomizationMode();
        },
        processCustomization() {
            this.customizationManager.processCustomization();
        },
        cancelCustomization() {
            this.customizationManager.cancelCustomization();
        },
        retryCustomization() {
            this.customizationManager.retryCustomization();
        }
    }
};

// Create the Vue app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = createApp(CustomOS);
    app.mount('#custom-os');
});