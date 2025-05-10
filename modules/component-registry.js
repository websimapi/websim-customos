import { FileExplorer } from '../components/file-explorer.js';
import { SettingsApp } from '../components/settings-app.js';
import { Terminal } from '../components/terminal.js';
import { TextEditor } from '../components/text-editor.js';
import { CustomizationApp } from '../components/customization-app.js';

export function registerComponents(app) {
    // Register app components
    app.appComponents = {
        'file-explorer': FileExplorer,
        'settings-app': SettingsApp,
        'terminal': Terminal,
        'text-editor': TextEditor,
        'customization-app': CustomizationApp
    };
}

