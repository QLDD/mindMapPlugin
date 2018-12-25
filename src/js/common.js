var defaultPath = null;
var isSutoSave = true;
var fs = require('fs');
var { remote, globalShortcut, shell } = require('electron');
var { dialog, Menu, app } = require('electron').remote;
var { BrowserWindow, Menu, MenuItem } = require('electron').remote;    
var http = require('http');
var path = require('path');       
var os = require('os');
var platform = os.platform();
var confPath = path.join(getUserDataDir(), '/naotu.config.json');
var unzip = require('unzip2');
var convert = require('xml-js');
var xmindDefault = process.env.ALLUSERSPROFILE;
$(function () {
    bootbox.setLocale("zh_CN");    
    try {
        // 若没有用户文件夹，则创建
        var defFolder = path.join(getUserDataDir(), '/');
        if (!fs.existsSync(defFolder)) {
            fs.mkdirSync(defFolder);
        }
        // 检查或创建配置文件
        fs.exists(confPath, function (exists) {
            if(!exists){
                fs.writeFileSync(confPath, JSON.stringify(getDefConf()));
            }
        });
    } catch (ex) {
        //错误日志
    }
});

// 重选自动保存的目录
function setSavePath() {
    try {        
        var defPath = getUserDataDir();
        var confObj = JSON.parse(fs.readFileSync(confPath));
        defPath = confObj.defSavePath;
        dialog.showOpenDialog({properties: ['openDirectory'], defaultPath : defPath}, function (filenames) {
            if (filenames && filenames.length > 0) { 
                confObj.defSavePath = filenames[0];
                fs.writeFileSync(confPath, JSON.stringify(confObj));
            }
        });
    } catch (ex) {
        //错误日志
    }
}

function readFile(fileName) {
    if (!fileName) return;    
    defaultPath = fileName;
    fs.readFile(fileName, 'utf8', function (err, data) {                
        var json = JSON.parse(data);
        editor.minder.importJson(json);
        showFileName(fileName);
    });
    saveRecords(defaultPath);
}

function writeFile(fileName, content, isExport) {
    if (!fileName) return;    
    fs.writeFile(fileName, content, function (err) {
        if (err) {
            //错误日志
        } else {
            showFileName(fileName);
        }
    });
    if(!isExport){
        saveRecords(fileName);
    }
}

// 新建文件
function newDialog() {    
    if (hasData()) {
        bootbox.confirm({
            message: '新建文件会关闭当前文件，是否继续？',
            callback: function (result) {
                if (result) {
                    initRoot();
                }
            }
        });
    } else {
        initRoot();
    }
}

function hasData() {
    var nodes = editor.minder.getAllNode().length;
    var rootText = editor.minder.getRoot().data.text;
    return nodes != 1 || rootText != '中心主题';
}

function initRoot() {
    defaultPath = null;
    getAppInstance().setTitle('管家脑图');
    editor.minder.importJson({ "root": { "data": { "text": "中心主题" } }, "template": "filetree", "theme": "fresh-blue" });
    editor.minder.select(minder.getRoot(), true);
}

// 自动保存
function autoSave(obj) {
    isSutoSave = obj.checked;
}

// 打开文件
function openDialog() {
    dialog.showOpenDialog(
        { filters: [
            { name: 'KityMinder', extensions: ['km'] },
            { name: 'Xmind', extensions: ['xmind'] },
        ] },
        (fileName) => {                                    
            if (!fileName) { return; }             
            let fileExtension = fileName[0].substring(fileName[0].lastIndexOf('.') + 1);         
            if (fileExtension == 'xmind') {                
                readXmindFile(fileName[0], data => {
                    readFile(data);
                });
            } else {
                readFile(fileName[0]);
            }            
        }
    );
}

function readXmindFile (xmindFile, callback) { 
    
    // xmindAction 文件夹
    let firstPath = path.join(xmindDefault, '/tmXmindAction');
    let secondPath = path.join(xmindDefault, '/tmXmindAction/content.xml');
    if (!fs.existsSync(firstPath)) {
        fs.mkdirSync(firstPath);
    } 

    // 解压 unzip
    let unzip_extract = unzip.Extract({ path: firstPath });
    //监听解压缩、传输数据过程中的错误回调
    unzip_extract.on('error',(err)=>{
        console.log(err);
    });
    //监听解压缩、传输数据结束
    unzip_extract.on('finish',()=>{
        console.log('解压完成');
    });
    unzip_extract.on('close',()=>{        
        var xml = fs.readFileSync(secondPath, 'utf8');
        var options = { ignoreComment: true, compact: true };
        var result = convert.xml2js(xml, options);   
        console.log(result);     
        let json = {
            root: {
                data: {
                    text: ''
                },
                children: []
            },
            template: 'default',
            theme: 'fresh-blue',
            version: '1.4.43'
        };
        let content = result["xmap-content"];
        if (content.sheet.topic) {
            json.root.data.text = content.sheet.topic.title._text;
        }
        json.root.children = getchildren(content.sheet.topic.children);        
        // tostring
        let str = JSON.stringify(json);   
        // 得到路径
        let strPath = xmindFile.substring(0, xmindFile.lastIndexOf('.')) + '.km';
        // strPath = duplicateName(strPath, 0, md); // md 为xmind 的
        // 存为 km文件
        fs.writeFileSync(strPath, str);  
        callback(strPath);        
    });
    fs.createReadStream(xmindFile).pipe(unzip_extract);             
}

// function duplicateName (pathName, num, md) {    
//     if (fs.existsSync(pathName)) {
//         // 对比 md5 
//         if ('相等') {
//             return pathName;
//         } else {
//             let numb = num + 1;
//             let ttpath = pathName.substring(0, pathName.file.lastIndexOf('.')) + `(${numb})` + `.km`;
//             ttpath = duplicateName(ttpath, numb, md);
//             return ttpath;
//         }        
//     }
//     return pathName;
// }

function getchildren (children) {
    let childrenArray = [];
    if (children) {
        let topics = children.topics;
        let topic = children.topics.topic;
        if (Array.isArray(topics)) {
            topic = [];
            for (let item of topics) {
                if (Array.isArray(item.topic)) {
                    for (let i of item.topic) {
                        topic.push(i);
                    }
                } else {
                    topic.push(item.topic);
                }                
            }
        }
        if (Array.isArray(topic)) {
            for (let item of topic) {
                if (!item.title) {
                    item.title = { _text: 'null' };
                }
                if (!item.children) {
                    let childrenItem = {
                        data: {
                            text: item.title._text
                        },
                        children: []
                    };
                    childrenArray.push(childrenItem);
                } else {                    
                    let childrenItem = {
                        data: {
                            text: item.title._text
                        },
                        children: []
                    };
                    childrenItem.children = this.getchildren(item.children);
                    childrenArray.push(childrenItem);
                }
            }
        } else {
            let childrenItem = {
                data: {
                    text: topic.title._text
                },
                children: []
            };
            if (topic.children) {
                childrenItem.children = this.getchildren(topic.children);
            }
            childrenArray.push(childrenItem);                            
        }        
    }
    return childrenArray;
}

// 在文件夹中打开文件
function openFileInFolder() {
    if (defaultPath != null) {
        shell.showItemInFolder(defaultPath);
    } else {
        bootbox.alert("您当前还未打开任何文件。");
    }
}

// 保存
function saveDialog() {
    if (!defaultPath) {
        defaultPath = getDefaultPath();
    }
    var json = editor.minder.exportJson();
    var data = JSON.stringify(editor.minder.exportJson());
    writeFile(defaultPath, data);
}

// 另存为
function saveAsDialog() {
    var newPath = path.join(getUserDataDir(), '/' + minder.getRoot().data.text + '.km');
    dialog.showSaveDialog(
        {
            title: "保存 KityMinder 文件",
            defaultPath: newPath,
            filters: [{ name: 'KityMinder', extensions: ['km'] }]
        },
        (fileName) => {
            if (!fileName) { return; }// cancel save
            defaultPath = fileName;
            var json = editor.minder.exportJson();
            var data = JSON.stringify(editor.minder.exportJson());
            writeFile(fileName, data);
        }
    );
}

// 导出
function exportDialog() {
    var newPath = path.join(getUserDataDir(), '/' + minder.getRoot().data.text);
    var filters = [];
    var pool = kityminder.data.getRegisterProtocol();
    console.log(pool);    
    for (var name in pool) {
        if (pool.hasOwnProperty(name) && pool[name].encode) {
            filters.push({ name: pool[name].fileDescription, extensions: [pool[name].fileExtension.replace('.', '')] });
        }
    }
    dialog.showSaveDialog(
        {
            title: "导出 KityMinder 文件",
            defaultPath: newPath,
            filters: filters
        },
        (fileName) => {
            if (!fileName) { return; }// cancel export
            var ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
            var protocol = null;
            var pool = kityminder.data.getRegisterProtocol();
            for (var name in pool) {
                if (pool.hasOwnProperty(name) && pool[name].encode) {
                    if (pool[name].fileExtension === ext) {
                        protocol = pool[name];
                        break;
                    }
                }
            }
            exportFile(protocol, fileName)
        }
    );
}

// 退出
function exitApp() {
    app.quit();
}

// 恢复
function redo() {
    editor.history.redo();
}

// 撤销
function undo() {
    editor.history.undo();
}

// 剪切
function cut() {
    minder.execCommand('Cut');
}

// 复制
function copy() {
    minder.execCommand('Copy');
}

// 粘贴
function paste() {
    minder.execCommand('Paste');
}

// 查看帮助
function license() {
    // shell.openExternal("https://github.com/NaoTu/NaotuApp")
    var text = `    
A.文件保存位置：
    1、默认保存路径为上一次文件保存位置，若找不到位置，可先编辑当前脑图，文件位置自动同步
    2、可根据 -重选自动保存的目录- 方便管理脑图文件 
B.支持 Xmind
    1、导入 .xmind 文件不会改变原文件，会新建 .km 文件进行编辑
    `;
    dialog.showMessageBox({ type: "none", title: "管家脑图", message: text, buttons: ["OK"] });
}

// 关于
function about() {
    var text = `
    Copyright (c) 2018 IT - 同程艺龙

    版本： 4.3.1 (1.7.16)
    `;
    dialog.showMessageBox({ type: "info", title: "管家脑图", message: text, buttons: ["OK"] });
}

// 快捷键
function shortcut() {
    var shortcutKeys = [
        {
            groupName: '节点操作',
            groupItem: [
                { key: "Enter", desc: " 插入兄弟节点" },
                { key: "Tab, Insert", desc: " 插入子节点" },
                { key: "Shift + Tab", desc: " 插入父节点" },
                { key: "Delete", desc: " 删除节点" },
                { key: "Up, Down, Left, Right", desc: " 节点导航" },
                { key: "Alt + Up, Down", desc: " 向上/向下调整顺序" },
                { key: "/", desc: " 展开/收起节点" },
                { key: "F2", desc: " 编辑节点" },
                { key: "Shift + Enter", desc: " 文本换行" },
                { key: "Ctrl + A", desc: " 全选节点" },
                { key: "Ctrl + C", desc: " 复制节点" },
                { key: "Ctrl + X", desc: " 剪切节点" },
                { key: "Ctrl + V", desc: " 粘贴节点" },
                { key: "Ctrl + B", desc: " 加粗" },
                { key: "Ctrl + I", desc: " 斜体" },
                { key: "Ctrl + F", desc: " 查找节点" }
            ]
        }, {
            groupName: '视野控制',
            groupItem: [
                //{ key:"Ctrl + ESC",desc:" 全屏切换"},
                { key: "Alt + 拖动, 右键拖动", desc: " 拖动视野" },
                { key: "滚轮, 触摸板", desc: " 移动视野" },
                //{ key:"Ctrl + Up, Down, Left, Right",desc:" 视野导航"},
                { key: "空白处双击, Ctrl + Enter", desc: " 居中根节点" },
                { key: "Ctrl + +, -", desc: " 放大/缩小视野" }
            ]
        }, {
            groupName: '文件操作',
            groupItem: [
                { key: "Ctrl + O", desc: " 打开" },
                { key: "Ctrl + S", desc: " 保存" },
                { key: "Ctrl + Shift + S", desc: " 另存为" },
                // { key: "Ctrl + Alt + S", desc: " 分享" }
            ]
        }, {
            groupName: '布局',
            groupItem: [
                { key: "Ctrl + Shift + L", desc: " 整理布局" }
            ]
        }, {
            groupName: '后悔药',
            groupItem: [
                { key: "Ctrl + Z", desc: " 撤销" },
                { key: "Ctrl + Y", desc: " 重做" }
            ]
        }
    ];
    var text = "";
    for (var i = 0; i < shortcutKeys.length; i++) {
        var group = shortcutKeys[i];
        text += `\n` + group.groupName + `\n`;
        for (var j = 0; j < group.groupItem.length; j++) {
            var item = group.groupItem[j];
            text += `       ` + item.desc + `   ` + item.key + `\n`;
        }
    }
    dialog.showMessageBox({ type: "none", title: "快捷键", message: text, buttons: ["OK"] });
}

function exportFile(protocol, filename) {
    var options = {
        download: true,
        filename: filename
    };
    minder.exportData(protocol.name, options).then(function (data) {
        switch (protocol.dataType) {
            case 'text':
                writeFile(filename, data, true);
                break;
            case 'base64':
                var base64Data = data.replace(/^data:image\/\w+;base64,/, "");
                var dataBuffer = new Buffer(base64Data, 'base64');

                writeFile(filename, dataBuffer, true);
                break;
            case 'blob':
                break;
        }
        return null;
    });
}

function getDefaultPath() {
    try {
        var time = new Date().format("yyyy-MM-dd_hhmmss");
        var confObj = JSON.parse(fs.readFileSync(confPath));
        var defPath = confObj.defSavePath || getUserDataDir();        
        // 若没有用户文件夹，则创建
        fs.exists(defPath, (exists) => {
            if (!exists) {
                fs.mkdir(defPath)
            }
        });
        var filePath = path.join(defPath, '/' + time + '.km');        
        return filePath;
    } catch (ex) {
        //错误日志
    }
}

function getUserDataDir() {
    return (app || remote.app).getPath('userData');
}

function showFileName(fileName) {
    if (fileName != undefined) {
        var index = fileName.lastIndexOf('\\') > -1 ? fileName.lastIndexOf('\\') : fileName.lastIndexOf('/');
        var title = fileName.substring(index + 1) + ' - 管家脑图';
        getAppInstance().setTitle(title);
    }
}

function getAppInstance() {
    return BrowserWindow.getAllWindows()[0];
}

function getDefConf(){
    return {
        'defSavePath': getUserDataDir(),
        'recently': []
    };
}

// 清除最近打开记录
function clearRecently() {
    try {
        // 读取配置文件
        var confObj = JSON.parse(fs.readFileSync(confPath));
        if(confObj != null){
            // 清空历史记录的列表
            confObj.recently = [];
            fs.writeFileSync(confPath, JSON.stringify(confObj));
        } else {
            // 读失败了，则创建一个默认的配置文件
            fs.writeFileSync(confPath, JSON.stringify(getDefConf()));
        }
        // 更新菜单
        updateMenus();
    } catch (ex) {
        //错误日志
    }
};

function saveRecords(filePath) {
    var time = new Date().format("yyyy-MM-dd hh:mm:ss");
    fs.exists(confPath, function (exists) {
        if (!exists) {// 不存在，则创建
            var confObj = getDefConf();
            confObj.recently.push({ 'time': time, 'path': filePath });
            fs.writeFileSync(confPath, JSON.stringify(confObj));
        } else {// 存在，则读取
            var confObj = JSON.parse(fs.readFileSync(confPath));
            var list = confObj.recently;
            // 查重
            var items = [], selected = null;
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                if (item.path == filePath) {
                    selected = item;
                } else {
                    items.push(item);
                }
            }
            if (selected == null) {
                items.splice(0, 0, { 'time': time, 'path': filePath });
            } else {// 在原来的清单中，则更新
                selected.time = time;
                items.splice(0, 0, selected);
            }
            confObj.recently = items;
            // 更新列表
            fs.writeFileSync(confPath, JSON.stringify(confObj));
        }
    });
    // 更新菜单
    updateMenus();
}

function updateMenus() {
    fs.exists(confPath, function (exists) {
        if (exists) {// 存在，则读取
            // 深度复制
            var menus = $.extend(true, [], template);
            var confObj = JSON.parse(fs.readFileSync(confPath));
            var list = confObj.recently;
            for (var i = 0; i < Math.min(list.length, 5); i++) {// 只显示最近5次
                var item = list[i];
                if (platform == 'darwin') {
                    // 追加到菜单
                    menus[1].submenu[4].submenu.splice(menus[1].submenu[4].submenu.length - 2, 0, {
                        label: item.path,
                        click: openRecently
                    });
                } else {
                    // 追加到菜单
                    menus[0].submenu[4].submenu.splice(menus[0].submenu[4].submenu.length - 2, 0, {
                        label: item.path,
                        click: openRecently
                    });
                }                
            }
            // 更新菜单
            var menu = Menu.buildFromTemplate(menus);
            Menu.setApplicationMenu(menu);
        } else {
            var menu = Menu.buildFromTemplate(template);
            Menu.setApplicationMenu(menu);
        }
    });
}

function openRecently(item) {
    var path = item.label;
    if (path) {
        fs.exists(path, function (result) {
            if (result) {// 存在，则读取
                readFile(path);
            } else {
                bootbox.alert("文件路径不存在");
            }
        });
    }
}

