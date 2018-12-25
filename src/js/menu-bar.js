var remote = require('electron').remote;
var Menu = remote.Menu;
var os = require('os');
var platform = os.platform();

var template = [{
    label: '同程管家',    
    submenu: [        
        {
            label: '退出',
            accelerator: 'Cmd+Q',
            click: exitApp
        }        
    ]
},{
    label: '文件(&F)',
    submenu: [
        {
            label: '新建文件(&N)',
            accelerator: 'CmdOrCtrl+N',
            click: newDialog
        },
        {
            label: '打开文件(&O)',
            accelerator: 'CmdOrCtrl+O',
            click: openDialog
        },
        { type: 'separator' },
        {
            // label: '在文件夹中打开文件(&L)',
            label: '文件位置...(&L)',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: openFileInFolder
        },
        {
            label: '打开最近的文件(&R)',
            submenu: [
                { type: 'separator' },
                {
                    id: 1,
                    label: '清除最近打开记录',
                    click: clearRecently
                }
            ]
        },
        { type: 'separator' },
        {
            label: '保存(&S)',
            accelerator: 'CmdOrCtrl+S',
            click: saveDialog
        },
        {
            label: '另存为(&A)...',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: saveAsDialog
        },
        {
            label: '导出(&E)...',
            accelerator: 'CmdOrCtrl+E',
            click: exportDialog
        },
        { type: 'separator' },
        {
            label: '自动保存',
            type: 'checkbox',
            checked: true,
            click: autoSave
        },
        {
            label: '重选自动保存的目录(&R)',
            accelerator: 'CmdOrCtrl+R',
            click: setSavePath
        }        
    ]
}, {
    label: "编辑(&E)",
    submenu: [
        {
            label: "撤销(&U)",
            accelerator: 'CmdOrCtrl+Z',
            click: undo,
            selector: 'undo:'
        },
        {
            label: "恢复(&R)",
            accelerator: 'CmdOrCtrl+Y',
            click: redo,
            selector: 'redo:'
        },
        { type: 'separator' },
        {
            label: "剪切(&T)",
            accelerator: 'CmdOrCtrl+X',
            selector: 'cut:',
            role: 'cut'
        },
        {
            label: "复制(&C)",
            accelerator: 'CmdOrCtrl+C',
            selector: 'copy:',
            role: 'copy'
        },
        {
            label: "粘贴(&P)",
            accelerator: 'CmdOrCtrl+V',
            selector: 'paste:',
            role: 'paste'
        }
    ]
}, {
    label: "帮助(&H)",
    submenu: [
        {
            label: '快捷键(&H)...',
            accelerator: 'CmdOrCtrl+/',
            click: shortcut
        },
        { type: 'separator' },
        { label: "查看帮助(&V)", click: license },                
        { label: "关于(&A)", click: about }
    ]
}];

if (platform != 'darwin') {
    // template 去除第一个元素
    template.splice(0, 1);
}

var menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
