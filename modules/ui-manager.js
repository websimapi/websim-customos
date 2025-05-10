export class UIManager {
    constructor(app) {
        this.app = app;
    }
    
    initClock() {
        // Initialize clock
        this.updateClock();
        setInterval(this.updateClock.bind(this), 1000);
    }
    
    updateClock() {
        const now = new Date();
        
        // Update time based on system settings
        if (this.app.system?.systemSettings?.timeFormat === '24h') {
            this.app.currentTime = now.toLocaleTimeString('en-US', { hour12: false });
        } else {
            this.app.currentTime = now.toLocaleTimeString('en-US', { hour12: true });
        }
        
        // Update date based on system settings
        let dateFormat = this.app.system?.systemSettings?.dateFormat || 'MM/DD/YYYY';
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.app.currentDate = now.toLocaleDateString('en-US', options);
    }
    
    // Lock Screen Methods
    unlock() {
        if (this.app.system.security.passwordEnabled) {
            if (this.app.password === this.app.system.security.password) {
                this.app.lockScreen = false;
                this.app.password = '';
            } else {
                // TODO: Show password error
                alert("Incorrect password");
                this.app.password = '';
            }
        } else {
            this.app.lockScreen = false;
        }
    }
    
    lock() {
        this.app.lockScreen = true;
        this.closeStartMenu();
        this.closePowerOptions();
    }
    
    // Start Menu Methods
    toggleStartMenu() {
        this.app.startMenuOpen = !this.app.startMenuOpen;
        if (this.app.startMenuOpen) {
            this.app.powerOptionsOpen = false;
        }
    }
    
    closeStartMenu() {
        this.app.startMenuOpen = false;
    }
    
    getStartMenuPosition() {
        const position = this.app.system?.taskbar?.position || 'bottom';
        if (position === 'top') return 'top';
        if (position === 'left') return 'left';
        if (position === 'right') return 'right';
        return '';
    }
    
    // Power Options Methods
    togglePowerOptions() {
        this.app.powerOptionsOpen = !this.app.powerOptionsOpen;
    }
    
    closePowerOptions() {
        this.app.powerOptionsOpen = false;
    }
    
    shutDown() {
        this.app.loading = true;
        setTimeout(() => {
            // Simulate shutdown by reloading page
            window.location.reload();
        }, 2000);
    }
    
    restart() {
        this.app.loading = true;
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }
    
    sleep() {
        this.lock();
        this.closePowerOptions();
    }
    
    // Taskbar Methods
    taskbarItemClick(app) {
        const openWindow = this.app.openWindows.find(w => w.appId === app.id);
        if (openWindow) {
            if (openWindow.minimized || this.app.activeWindowId !== openWindow.id) {
                // Restore and activate window
                openWindow.minimized = false;
                this.app.windowManager.activateWindow(openWindow.id);
            } else {
                // Minimize window if it's already active
                this.app.windowManager.minimizeWindow(openWindow.id);
            }
        } else {
            // Launch app if not open
            this.app.appManager.launchApp(app);
        }
    }
    
    isAppActive(appId) {
        const window = this.app.openWindows.find(w => w.appId === appId);
        return window && !window.minimized && window.id === this.app.activeWindowId;
    }
    
    // System Tray Methods
    systemTrayItemClick(item) {
        // Handle system tray item clicks (wifi, volume, etc.)
        console.log(`Clicked system tray item: ${item.name}`);
        if (item.id === 'notifications') {
            this.toggleNotificationsPanel();
        }
    }
    
    // Notifications Methods
    toggleNotificationsPanel() {
        this.app.notificationsPanelOpen = !this.app.notificationsPanelOpen;
    }
    
    dismissNotification(notificationId) {
        const index = this.app.system.notifications.items.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            this.app.system.notifications.items.splice(index, 1);
        }
    }
    
    clearAllNotifications() {
        this.app.system.notifications.items = [];
    }
    
    formatNotificationTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)} min ago`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)} hr ago`;
        } else {
            return new Date(timestamp).toLocaleDateString();
        }
    }
    
    // Settings
    openSettings() {
        const settingsApp = this.app.appManager.findAppById('settings');
        if (settingsApp) {
            this.app.appManager.launchApp(settingsApp);
        }
        this.closeStartMenu();
    }
    
    // Global Event Handlers
    handleGlobalClick(event) {
        // Close start menu if clicking outside
        if (this.app.startMenuOpen) {
            const startMenu = document.querySelector('.start-menu');
            const startButton = document.querySelector('.start-button');
            if (startMenu && !startMenu.contains(event.target) && 
                startButton && !startButton.contains(event.target)) {
                this.closeStartMenu();
            }
        }
        
        // Close power options if clicking outside
        if (this.app.powerOptionsOpen) {
            const powerMenu = document.querySelector('.power-options-menu');
            if (powerMenu && !powerMenu.contains(event.target)) {
                this.closePowerOptions();
            }
        }
    }
    
    handleGlobalKeydown(event) {
        // Global keyboard shortcuts
        if (event.key === 'Escape') {
            if (this.app.startMenuOpen) {
                this.closeStartMenu();
            }
            if (this.app.powerOptionsOpen) {
                this.closePowerOptions();
            }
        }
    }
}