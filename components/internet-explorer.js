export const InternetExplorer = {
    template: '#internet-explorer-template',
    props: ['data'],
    data() {
        return {
            url: 'https://example.com',
            title: 'Internet Explorer',
            isLoading: false,
            history: [],
            historyIndex: -1,
            homePage: 'https://websim.ai',
            bookmarks: [],
            inputUrl: 'https://example.com'
        };
    },
    mounted() {
        this.navigate(this.url);
        // Focus the address bar
        this.$nextTick(() => {
            this.$refs.addressBar.select();
        });
    },
    methods: {
        navigate(url) {
            // Validate URL format
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                // Add https:// prefix if missing
                url = 'https://' + url;
                this.inputUrl = url;
            }
            
            this.isLoading = true;
            
            // Add to history
            if (this.url !== url) {
                // If we navigated from history, truncate the forward history
                if (this.historyIndex < this.history.length - 1) {
                    this.history = this.history.slice(0, this.historyIndex + 1);
                }
                
                this.history.push(url);
                this.historyIndex = this.history.length - 1;
            }
            
            this.url = url;
            this.inputUrl = url;
            
            // Some platforms block iframe navigation, so handle errors
            setTimeout(() => {
                this.isLoading = false;
            }, 1000);
        },
        
        handleAddressSubmit() {
            this.navigate(this.inputUrl);
        },
        
        goBack() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.url = this.history[this.historyIndex];
                this.inputUrl = this.url;
            }
        },
        
        goForward() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.url = this.history[this.historyIndex];
                this.inputUrl = this.url;
            }
        },
        
        refresh() {
            this.isLoading = true;
            
            // Reloading iframe by temporarily clearing the URL
            const currentUrl = this.url;
            this.url = '';
            
            setTimeout(() => {
                this.url = currentUrl;
                this.isLoading = false;
            }, 100);
        },
        
        goHome() {
            this.navigate(this.homePage);
        },
        
        addBookmark() {
            if (!this.bookmarks.includes(this.url)) {
                this.bookmarks.push(this.url);
            }
        },
        
        handleIframeLoad() {
            this.isLoading = false;
            try {
                // Attempt to get the title from the iframe
                const iframeDoc = this.$refs.webFrame.contentDocument;
                if (iframeDoc && iframeDoc.title) {
                    this.title = iframeDoc.title + ' - Internet Explorer';
                } else {
                    this.title = 'Internet Explorer';
                }
            } catch (e) {
                // Security restrictions may prevent accessing iframe content
                this.title = 'Internet Explorer';
            }
        },
        
        // Updates the window title (for the parent window manager)
        updateWindowTitle() {
            const window = this.findParentWindow();
            if (window && window.updateTitle) {
                window.updateTitle(this.title);
            }
        },
        
        findParentWindow() {
            let parent = this.$parent;
            while (parent) {
                if (parent.isWindowComponent) {
                    return parent;
                }
                parent = parent.$parent;
            }
            return null;
        }
    },
    watch: {
        title() {
            this.updateWindowTitle();
        }
    }
};