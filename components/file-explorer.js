export const FileExplorer = {
    template: '#file-explorer-template',
    props: ['data'],
    data() {
        return {
            currentPath: '/',
            currentItems: [],
            selectedItem: null,
            fileSystem: {
                '/': [
                    { name: 'Documents', path: '/Documents', type: 'folder', modified: Date.now() - 86400000, size: 0 },
                    { name: 'Pictures', path: '/Pictures', type: 'folder', modified: Date.now() - 172800000, size: 0 },
                    { name: 'Music', path: '/Music', type: 'folder', modified: Date.now() - 259200000, size: 0 },
                    { name: 'Videos', path: '/Videos', type: 'folder', modified: Date.now() - 345600000, size: 0 },
                    { name: 'Downloads', path: '/Downloads', type: 'folder', modified: Date.now() - 432000000, size: 0 },
                    { name: 'System', path: '/System', type: 'folder', modified: Date.now() - 518400000, size: 0 },
                    { name: 'readme.txt', path: '/readme.txt', type: 'text', modified: Date.now() - 604800000, size: 1024 }
                ],
                '/Documents': [
                    { name: 'Project1', path: '/Documents/Project1', type: 'folder', modified: Date.now() - 86400000, size: 0 },
                    { name: 'Project2', path: '/Documents/Project2', type: 'folder', modified: Date.now() - 172800000, size: 0 },
                    { name: 'report.txt', path: '/Documents/report.txt', type: 'text', modified: Date.now() - 259200000, size: 2048 },
                    { name: 'data.csv', path: '/Documents/data.csv', type: 'file', modified: Date.now() - 345600000, size: 4096 }
                ],
                '/Pictures': [
                    { name: 'Vacation', path: '/Pictures/Vacation', type: 'folder', modified: Date.now() - 86400000, size: 0 },
                    { name: 'Family', path: '/Pictures/Family', type: 'folder', modified: Date.now() - 172800000, size: 0 },
                    { name: 'profile.png', path: '/Pictures/profile.png', type: 'image', modified: Date.now() - 259200000, size: 1024 * 1024 },
                    { name: 'wallpaper.jpg', path: '/Pictures/wallpaper.jpg', type: 'image', modified: Date.now() - 345600000, size: 2 * 1024 * 1024 }
                ],
                '/Music': [
                    { name: 'Favorites', path: '/Music/Favorites', type: 'folder', modified: Date.now() - 86400000, size: 0 },
                    { name: 'Playlists', path: '/Music/Playlists', type: 'folder', modified: Date.now() - 172800000, size: 0 },
                    { name: 'song1.mp3', path: '/Music/song1.mp3', type: 'file', modified: Date.now() - 259200000, size: 5 * 1024 * 1024 },
                    { name: 'song2.mp3', path: '/Music/song2.mp3', type: 'file', modified: Date.now() - 345600000, size: 6 * 1024 * 1024 }
                ]
            }
        };
    },
    created() {
        this.loadCurrentDirectory();
    },
    methods: {
        loadCurrentDirectory() {
            this.currentItems = this.fileSystem[this.currentPath] || [];
            this.selectedItem = null;
        },
        navigateUp() {
            if (this.currentPath === '/') return;
            
            const parts = this.currentPath.split('/').filter(p => p);
            parts.pop();
            this.currentPath = parts.length ? '/' + parts.join('/') : '/';
            this.loadCurrentDirectory();
        },
        handleItemOpen(item) {
            if (item.type === 'folder') {
                this.currentPath = item.path;
                this.loadCurrentDirectory();
            } else {
                // Open file based on type
                console.log(`Opening file: ${item.path}`);
                // In a real implementation, this would open the appropriate app
            }
        },
        selectItem(item) {
            this.selectedItem = item;
        },
        formatSize(size) {
            if (size < 1024) {
                return `${size} B`;
            } else if (size < 1024 * 1024) {
                return `${(size / 1024).toFixed(2)} KB`;
            } else if (size < 1024 * 1024 * 1024) {
                return `${(size / (1024 * 1024)).toFixed(2)} MB`;
            } else {
                return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
            }
        },
        formatDate(timestamp) {
            return new Date(timestamp).toLocaleString();
        }
    }
};

