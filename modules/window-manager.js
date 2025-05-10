export class WindowManager {
    constructor(app) {
        this.app = app;
        this.dragInfo = null;
        this.resizeInfo = null;
    }
    
    activateWindow(windowId) {
        // Bring window to front
        this.app.activeWindowId = windowId;
        
        // Update z-index for all windows
        const maxZ = Math.max(...this.app.openWindows.map(w => w.zIndex));
        const activeWindow = this.app.openWindows.find(w => w.id === windowId);
        if (activeWindow) {
            activeWindow.zIndex = maxZ + 1;
            
            // If window is minimized, restore it
            if (activeWindow.minimized) {
                activeWindow.minimized = false;
            }
        }
    }
    
    closeWindow(windowId) {
        const index = this.app.openWindows.findIndex(w => w.id === windowId);
        if (index !== -1) {
            this.app.openWindows.splice(index, 1);
            
            // Update active window if needed
            if (this.app.activeWindowId === windowId) {
                if (this.app.openWindows.length > 0) {
                    // Find window with highest z-index
                    const highestZWindow = this.app.openWindows.reduce((prev, curr) => 
                        (curr.zIndex > prev.zIndex) ? curr : prev, this.app.openWindows[0]);
                    this.app.activeWindowId = highestZWindow.id;
                } else {
                    this.app.activeWindowId = null;
                }
            }
        }
    }
    
    minimizeWindow(windowId) {
        const window = this.app.openWindows.find(w => w.id === windowId);
        if (window) {
            window.minimized = true;
            
            // Update active window
            if (this.app.activeWindowId === windowId) {
                // Find next highest z-index window
                const visibleWindows = this.app.openWindows.filter(w => !w.minimized);
                if (visibleWindows.length > 0) {
                    const highestZWindow = visibleWindows.reduce((prev, curr) => 
                        (curr.zIndex > prev.zIndex) ? curr : prev, visibleWindows[0]);
                    this.app.activeWindowId = highestZWindow.id;
                } else {
                    this.app.activeWindowId = null;
                }
            }
        }
    }
    
    maximizeWindow(windowId) {
        const window = this.app.openWindows.find(w => w.id === windowId);
        if (window) {
            if (!window.maximized) {
                // Save current position and size for later restoration
                window._restorePosition = { ...window.position };
                window._restoreSize = { ...window.size };
                
                // Calculate available space (accounting for taskbar)
                const taskbarHeight = 48; // Adjust based on actual taskbar size
                window.position = { x: 0, y: 0 };
                window.size = { 
                    width: document.documentElement.clientWidth, 
                    height: document.documentElement.clientHeight - taskbarHeight 
                };
                window.maximized = true;
            } else {
                // Restore previous position and size
                window.position = window._restorePosition;
                window.size = window._restoreSize;
                window.maximized = false;
            }
        }
    }
    
    startDrag(windowId, event) {
        // Don't drag maximized windows
        const window = this.app.openWindows.find(w => w.id === windowId);
        if (window && window.maximized) {
            return;
        }
        
        // Activate window being dragged
        this.activateWindow(windowId);
        
        // Set up dragging
        this.dragInfo = {
            windowId,
            startX: event.clientX,
            startY: event.clientY,
            originalPosition: { ...window.position }
        };
        
        // Add event listeners for drag
        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));
        
        // Prevent text selection during drag
        event.preventDefault();
    }
    
    handleDrag(event) {
        if (!this.dragInfo) return;
        
        const window = this.app.openWindows.find(w => w.id === this.dragInfo.windowId);
        if (window) {
            const deltaX = event.clientX - this.dragInfo.startX;
            const deltaY = event.clientY - this.dragInfo.startY;
            
            window.position = {
                x: this.dragInfo.originalPosition.x + deltaX,
                y: this.dragInfo.originalPosition.y + deltaY
            };
        }
    }
    
    endDrag() {
        this.dragInfo = null;
        document.removeEventListener('mousemove', this.handleDrag.bind(this));
        document.removeEventListener('mouseup', this.endDrag.bind(this));
    }
    
    startResize(windowId, event) {
        const window = this.app.openWindows.find(w => w.id === windowId);
        if (!window || window.maximized) return;
        
        // Set up resizing
        this.resizeInfo = {
            windowId,
            startX: event.clientX,
            startY: event.clientY,
            originalSize: { ...window.size }
        };
        
        // Add event listeners for resize
        document.addEventListener('mousemove', this.handleResize.bind(this));
        document.addEventListener('mouseup', this.endResize.bind(this));
        
        // Prevent text selection during resize
        event.preventDefault();
    }
    
    handleResize(event) {
        if (!this.resizeInfo) return;
        
        const window = this.app.openWindows.find(w => w.id === this.resizeInfo.windowId);
        if (window) {
            const deltaX = event.clientX - this.resizeInfo.startX;
            const deltaY = event.clientY - this.resizeInfo.startY;
            
            const newWidth = Math.max(300, this.resizeInfo.originalSize.width + deltaX);
            const newHeight = Math.max(200, this.resizeInfo.originalSize.height + deltaY);
            
            window.size = {
                width: newWidth,
                height: newHeight
            };
        }
    }
    
    endResize() {
        this.resizeInfo = null;
        document.removeEventListener('mousemove', this.handleResize.bind(this));
        document.removeEventListener('mouseup', this.endResize.bind(this));
    }
    
    createWindow(appId, appName, appIcon, component, data = {}) {
        const windowId = this.app.nextWindowId++;
        const newWindow = {
            id: windowId,
            appId: appId,
            title: appName,
            icon: appIcon,
            component: component,
            data: data || {},
            position: { x: 100 + (this.app.openWindows.length * 30), y: 100 + (this.app.openWindows.length * 30) },
            size: { width: 800, height: 600 },
            minimized: false,
            maximized: false,
            zIndex: 100 + this.app.openWindows.length
        };
        
        this.app.openWindows.push(newWindow);
        return windowId;
    }
}