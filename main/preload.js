import { contextBridge, ipcRenderer } from 'electron';


contextBridge.exposeInMainWorld('ipc', {

  predefinedComments: {
    get() {
      return ipcRenderer.invoke('getPredefinedComments'); // Communicate with the main process
    },
  },
  apiEndpoint: {
    get() {
      return ipcRenderer.invoke('getApiEndpoint'); // Communicate with the main process
    },
  },

  scraper: {
    get() {
      return ipcRenderer.invoke('getScraper'); // Communicate with the main process
    },
  },

  // Store API methods
  store: {
    get(key) {
      return ipcRenderer.invoke('electron-store-get', key); // Async get
    },
    set(key, value) {
      return ipcRenderer.invoke('electron-store-set', key, value); // Async set
    },
    delete(key) {
      return ipcRenderer.invoke('electron-store-delete', key); // Async delete
    },
  },

  // IPC helpers
  send(channel, value) {
    ipcRenderer.send(channel, value);
  },
  on(channel, callback) {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  fs: {
    /**
     * Check if a file exists.
     * @param {string} relativePath - The relative path of the file to check.
     * @returns {Promise<boolean>} - Resolves to true if exists, false otherwise.
     */
    exists: async (relativePath) => {
      const absolutePath = path.resolve(relativePath);
      return ipcRenderer.invoke('fs-exists', absolutePath);
    },

    /**
     * Read a file's contents as a string.
     * @param {string} relativePath - The relative path of the file to read.
     * @returns {Promise<string>} - Resolves to the file contents.
     */
    readFile: async (relativePath) => {
      const absolutePath = path.resolve(relativePath);
      return ipcRenderer.invoke('fs-readFile', absolutePath);
    },

    /**
     * Get the application's resources path.
     * @returns {Promise<string>} - Resolves to the resources path.
     */
    getResourcesPath: async () => {
      return ipcRenderer.invoke('fs-getResourcesPath');
    },

    /**
     * Get the absolute path of the current directory.
     * @returns {Promise<string>} - Resolves to the directory path.
     */
    getDirname: async () => {
      return ipcRenderer.invoke('fs-getDirname');
    },
  },

  tempFile: {
    /**
     * Get the port value from the temp file.
     * @returns {Promise<string>} - The port value as a string.
     */
    getPort: async () => {
      return ipcRenderer.invoke('get-temp-port-file');
    },
  },
  
});
