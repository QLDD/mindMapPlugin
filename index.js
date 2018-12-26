import { app, BrowserWindow, globalShortcut, dialog } from "electron";

let win = new BrowserWindow({
    width: 1000,
    minWidth: 650,    
    height: 800,
    minHeight:600,
    fullscreenable: true,
    show: false,    
    backgroundColor: '#2e2c29'
});

win.loadURL();

win.on('closed', () => {

});

win.on('ready-to-show', () => {

});