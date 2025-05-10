export class AppManager {
    constructor(app) {
        this.app = app;
    }
    
    findAppById(id) {
        if (!id || !this.app.system?.apps?.installed) return null;
        return this.app.system.apps.installed.find(app => app.id === id) || null;
    }
    
    launchApp(appInput) { 
        const app = this.findAppById(appInput.id);
        
        if (!app) {
            console.error(`AppManager: App with ID '${appInput.id}' not found in installed apps.`);
            return;
        }
        
        const existingWindow = this.app.openWindows.find(w => w.appId === app.id);
        if (existingWindow) {
            this.app.windowManager.activateWindow(existingWindow.id);
            if (existingWindow.minimized) {
                existingWindow.minimized = false; 
            }
            return;
        }
        
        const windowId = this.app.windowManager.createWindow(
            app.id,
            app.name,
            app.icon,
            app.component, 
            app.defaultData || {}
        );
        
        this.app.windowManager.activateWindow(windowId);
    }
    
    getTaskbarApps() {
        const pinnedApps = this.app.system?.taskbar?.pinnedApps || [];
        
        return pinnedApps.map(id => {
            const app = this.findAppById(id);
            return app;
        }).filter(app => app !== null);
    }
    
    getAppsByCategory(categoryId) {
        return (this.app.system?.apps?.installed || []).filter(app => app.category === categoryId);
    }
}