export const TextEditor = {
    template: '#text-editor-template',
    props: ['data'],
    data() {
        return {
            content: '',
            fileName: '',
            fontSize: 14,
            fontFamily: 'monospace',
            modified: false
        };
    },
    mounted() {
        // Focus the editor
        this.$refs.editorArea.focus();
        
        // If data includes a file to open, load it
        if (this.data && this.data.fileName) {
            this.openFile(this.data.fileName);
        }
    },
    methods: {
        saveFile() {
            if (!this.fileName) {
                // In a real implementation, this would open a save dialog
                this.fileName = prompt('Enter a filename:', 'untitled.txt');
                if (!this.fileName) return;
            }
            
            // In a real implementation, this would save to the virtual file system
            console.log(`Saving file ${this.fileName}:`, this.content);
            alert(`File ${this.fileName} saved!`);
            this.modified = false;
        },
        openFile(fileName) {
            // In a real implementation, this would load from the virtual file system
            if (!fileName) {
                // In a real implementation, this would open a file dialog
                fileName = prompt('Enter a filename to open:');
                if (!fileName) return;
            }
            
            // Simulated file loading
            console.log(`Opening file: ${fileName}`);
            this.fileName = fileName;
            
            if (fileName === 'readme.txt') {
                this.content = 'Welcome to CustomOS!\n\nThis is a simulated web-based operating system environment. You can customize various aspects of the OS by using the Customize OS app.\n\nEnjoy exploring!';
            } else {
                this.content = `This is the content of ${fileName}.\n\nYou can edit this text and save it.`;
            }
            
            this.modified = false;
        },
        getCursorPosition() {
            const textarea = this.$refs.editorArea;
            const cursorPos = textarea.selectionStart;
            
            // Calculate line and column
            const textBeforeCursor = this.content.substring(0, cursorPos);
            const lines = textBeforeCursor.split('\n');
            const lineNumber = lines.length;
            const columnNumber = lines[lines.length - 1].length + 1;
            
            return `Ln ${lineNumber}, Col ${columnNumber}`;
        }
    }
};

