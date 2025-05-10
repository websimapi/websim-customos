export const Terminal = {
    template: '#terminal-app-template',
    props: ['data'],
    data() {
        return {
            terminalOutput: [
                'Welcome to CustomOS Terminal',
                'Type "help" for a list of commands.',
                ''
            ],
            terminalCommand: '',
            terminalPrompt: 'user@customos:~$ ',
            commandHistory: [],
            historyIndex: -1,
            fileSystem: {
                '/': {
                    type: 'directory',
                    contents: {
                        'home': { type: 'directory', contents: {} },
                        'bin': { type: 'directory', contents: {} },
                        'etc': { type: 'directory', contents: {} },
                        'usr': { type: 'directory', contents: {} },
                        'var': { type: 'directory', contents: {} },
                        'tmp': { type: 'directory', contents: {} }
                    }
                }
            },
            currentDirectory: '/'
        };
    },
    mounted() {
        // Set up home directory with user directory
        this.fileSystem['/'].contents.home.contents.user = { 
            type: 'directory', 
            contents: {
                'readme.txt': { type: 'file', content: 'Welcome to the terminal! This is your home directory.' }
            } 
        };
        
        // Focus the terminal input
        this.$refs.terminalInput.focus();
    },
    methods: {
        executeCommand() {
            if (!this.terminalCommand.trim()) return;
            
            // Add command to output
            this.terminalOutput.push(`${this.terminalPrompt}${this.terminalCommand}`);
            
            // Add to command history
            this.commandHistory.push(this.terminalCommand);
            this.historyIndex = this.commandHistory.length;
            
            // Parse and execute command
            const parts = this.terminalCommand.trim().split(/\s+/);
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);
            
            // Execute the command
            switch (command) {
                case 'help':
                    this.showHelp();
                    break;
                case 'echo':
                    this.echo(args);
                    break;
                case 'clear':
                    this.clear();
                    break;
                case 'ls':
                    this.listDirectory(args);
                    break;
                case 'cd':
                    this.changeDirectory(args);
                    break;
                case 'pwd':
                    this.printWorkingDirectory();
                    break;
                case 'mkdir':
                    this.makeDirectory(args);
                    break;
                case 'touch':
                    this.createFile(args);
                    break;
                case 'cat':
                    this.catFile(args);
                    break;
                case 'date':
                    this.showDate();
                    break;
                case 'whoami':
                    this.showUser();
                    break;
                case 'uname':
                    this.showSystemInfo();
                    break;
                default:
                    this.terminalOutput.push(`Command not found: ${command}`);
            }
            
            // Add blank line after command output
            this.terminalOutput.push('');
            
            // Clear command input
            this.terminalCommand = '';
            
            // Scroll to bottom
            this.$nextTick(() => {
                const terminalOutput = this.$el.querySelector('.terminal-output');
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            });
        },
        showHelp() {
            this.terminalOutput.push(
                'Available commands:',
                '  help     - Show this help message',
                '  echo     - Display a line of text',
                '  clear    - Clear the terminal screen',
                '  ls       - List directory contents',
                '  cd       - Change directory',
                '  pwd      - Print working directory',
                '  mkdir    - Make directory',
                '  touch    - Create a file',
                '  cat      - Display file contents',
                '  date     - Show current date and time',
                '  whoami   - Show current user',
                '  uname    - Show system information'
            );
        },
        echo(args) {
            this.terminalOutput.push(args.join(' '));
        },
        clear() {
            this.terminalOutput = [];
        },
        listDirectory(args) {
            let path = args.length > 0 ? args[0] : this.currentDirectory;
            path = this.resolvePath(path);
            
            const directory = this.getFileSystemItem(path);
            
            if (!directory || directory.type !== 'directory') {
                this.terminalOutput.push(`ls: cannot access '${path}': No such directory`);
                return;
            }
            
            const entries = Object.entries(directory.contents);
            if (entries.length === 0) {
                return; // Empty directory
            }
            
            const output = entries.map(([name, item]) => {
                const prefix = item.type === 'directory' ? 'd ' : '- ';
                return prefix + name;
            });
            
            this.terminalOutput.push(...output);
        },
        changeDirectory(args) {
            if (args.length === 0) {
                this.currentDirectory = '/home/user';
                return;
            }
            
            const path = this.resolvePath(args[0]);
            const directory = this.getFileSystemItem(path);
            
            if (!directory) {
                this.terminalOutput.push(`cd: no such directory: ${args[0]}`);
                return;
            }
            
            if (directory.type !== 'directory') {
                this.terminalOutput.push(`cd: not a directory: ${args[0]}`);
                return;
            }
            
            this.currentDirectory = path;
            this.updatePrompt();
        },
        printWorkingDirectory() {
            this.terminalOutput.push(this.currentDirectory);
        },
        makeDirectory(args) {
            if (args.length === 0) {
                this.terminalOutput.push('mkdir: missing operand');
                return;
            }
            
            const dirName = args[0];
            const parentPath = this.currentDirectory;
            const parent = this.getFileSystemItem(parentPath);
            
            if (!parent || parent.type !== 'directory') {
                this.terminalOutput.push(`mkdir: cannot create directory '${dirName}': No such file or directory`);
                return;
            }
            
            if (parent.contents[dirName]) {
                this.terminalOutput.push(`mkdir: cannot create directory '${dirName}': File exists`);
                return;
            }
            
            parent.contents[dirName] = { type: 'directory', contents: {} };
        },
        createFile(args) {
            if (args.length === 0) {
                this.terminalOutput.push('touch: missing file operand');
                return;
            }
            
            const fileName = args[0];
            const parentPath = this.currentDirectory;
            const parent = this.getFileSystemItem(parentPath);
            
            if (!parent || parent.type !== 'directory') {
                this.terminalOutput.push(`touch: cannot touch '${fileName}': No such file or directory`);
                return;
            }
            
            if (!parent.contents[fileName]) {
                parent.contents[fileName] = { type: 'file', content: '' };
            }
        },
        catFile(args) {
            if (args.length === 0) {
                this.terminalOutput.push('cat: missing file operand');
                return;
            }
            
            const filePath = this.resolvePath(args[0]);
            const file = this.getFileSystemItem(filePath);
            
            if (!file) {
                this.terminalOutput.push(`cat: ${args[0]}: No such file or directory`);
                return;
            }
            
            if (file.type !== 'file') {
                this.terminalOutput.push(`cat: ${args[0]}: Is a directory`);
                return;
            }
            
            this.terminalOutput.push(file.content);
        },
        showDate() {
            this.terminalOutput.push(new Date().toString());
        },
        showUser() {
            this.terminalOutput.push('user');
        },
        showSystemInfo() {
            this.terminalOutput.push('CustomOS 1.0.0');
        },
        updatePrompt() {
            // Simplify the prompt for deeper directories
            let displayPath = this.currentDirectory;
            if (displayPath.startsWith('/home/user/')) {
                displayPath = '~/' + displayPath.substring('/home/user/'.length);
            } else if (displayPath === '/home/user') {
                displayPath = '~';
            }
            
            this.terminalPrompt = `user@customos:${displayPath}$ `;
        },
        resolvePath(path) {
            // Handle absolute paths
            if (path.startsWith('/')) {
                return path;
            }
            
            // Handle home directory shortcut
            if (path === '~' || path.startsWith('~/')) {
                return path === '~' ? '/home/user' : '/home/user' + path.substring(1);
            }
            
            // Handle parent directory
            if (path === '..') {
                if (this.currentDirectory === '/') {
                    return '/';
                }
                
                const parts = this.currentDirectory.split('/').filter(Boolean);
                parts.pop();
                return '/' + parts.join('/');
            }
            
            // Handle current directory
            if (path === '.') {
                return this.currentDirectory;
            }
            
            // Handle relative paths
            return this.currentDirectory === '/' 
                ? '/' + path 
                : this.currentDirectory + '/' + path;
        },
        getFileSystemItem(path) {
            if (path === '/') {
                return this.fileSystem['/'];
            }
            
            const parts = path.split('/').filter(Boolean);
            let current = this.fileSystem['/'];
            
            for (const part of parts) {
                if (!current || current.type !== 'directory' || !current.contents[part]) {
                    return null;
                }
                current = current.contents[part];
            }
            
            return current;
        }
    }
};

