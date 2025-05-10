export class AppManager {
    constructor(app) {
        this.app = app;
    }
    
    findAppById(id) {
        if (!id || !this.app.system?.apps?.installed) return null;
        return this.app.system.apps.installed.find(app => app.id === id) || null;
    }
    
    launchApp(app) {
        // If the app doesn't have component info (which desktop icons don't), 
        // find the full app definition from installed apps
        let appToLaunch = app;
        if (!app.component) {
            const installedApp = this.findAppById(app.id);
            if (installedApp) {
                appToLaunch = installedApp; // Use the full app definition from installed apps
            } else {
                console.error(`Cannot launch app ${app.id}: not found in installed apps`);
                return;
            }
        }
        
        // Check if app is already open
        const existingWindow = this.app.openWindows.find(w => w.appId === appToLaunch.id);
        if (existingWindow) {
            // Bring existing window to front
            this.app.windowManager.activateWindow(existingWindow.id);
            return;
        }
        
        // Create a new window for the app
        const windowId = this.app.windowManager.createWindow(
            appToLaunch.id,
            appToLaunch.name,
            appToLaunch.icon,
            appToLaunch.component,
            appToLaunch.defaultData || {}
        );
        
        this.app.windowManager.activateWindow(windowId);
    }
    
    getTaskbarApps() {
        // Get apps pinned to taskbar + open apps
        const pinnedApps = this.app.system?.taskbar?.pinnedApps || [];
        
        // Combine pinned apps and open apps (without duplicates)
        return pinnedApps.map(id => {
            const app = this.findAppById(id);
            return app;
        }).filter(app => app !== null);
    }
    
    getAppsByCategory(categoryId) {
        return (this.app.system?.apps?.installed || []).filter(app => app.category === categoryId);
    }
}