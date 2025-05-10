export const InternetExplorer = {
    template: '#internet-explorer-template',
    props: ['data'],
    data() {
        return {
            url: '', 
            title: 'Internet Explorer',
            isLoading: false,
            history: [],
            historyIndex: -1,
            homePage: 'https://websim.ai',
            bookmarks: [],
            inputUrl: '' 
        };
    },
    mounted() {
        this.navigate(this.homePage); 
        this.inputUrl = this.homePage; 

        this.$nextTick(() => {
            if (this.$refs.addressBar) {
                 this.$refs.addressBar.select();
            }
        });
    },
    methods: {
        navigate(url) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
                this.inputUrl = url;
            }
            
            this.isLoading = true;
            
            if (this.url !== url) {
                if (this.historyIndex < this.history.length - 1) {
                    this.history = this.history.slice(0, this.historyIndex + 1);
                }
                
                this.history.push(url);
                this.historyIndex = this.history.length - 1;
            }
            
            this.url = url;
            this.inputUrl = url;
            
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
                const iframeDoc = this.$refs.webFrame.contentDocument;
                if (iframeDoc && iframeDoc.title) {
                    this.title = iframeDoc.title + ' - Internet Explorer';
                } else {
                    this.title = 'Internet Explorer';
                }
            } catch (e) {
                this.title = 'Internet Explorer';
            }
        },
        
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