export * from './create-window'



const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

ipcMain.handle('get-temp-port-file', async () => {
  try {
    const tempDir = os.tmpdir();
    const portFilePath = path.join(tempDir, 'port.txt');
    const port = await fs.readFile(portFilePath, 'utf8');
    return port.trim();
  } catch (error) {
    console.error('Error reading the port file:', error);
    throw error;
  }
});

ipcMain.handle('fs-getResourcesPath', () => {
  return process.resourcesPath; // Path where app resources are stored
});

ipcMain.handle('fs-getDirname', () => {
  return __dirname; // Absolute path of the current directory
});


