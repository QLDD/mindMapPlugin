/* global zip:true */
/*
    http://www.xmind.net/developer/
    Parsing XMind file
    XMind files are generated in XMind Workbook (.xmind) format, an open format
    that is based on the principles of OpenDocument. It consists of a ZIP
    compressed archive containing separate XML documents for content and styles,
    a .jpg image file for thumbnails, and directories for related attachments.
 */
var path = require('path');
var fs = require('fs');
var archiver = require('archiver');

kityminder.data.registerProtocol('xmind', function(minder) {

    var xmindDefault = process.env.ALLUSERSPROFILE;

    // 标签 map
    var markerMap = {
        'priority-1': ['priority', 1],
        'priority-2': ['priority', 2],
        'priority-3': ['priority', 3],
        'priority-4': ['priority', 4],
        'priority-5': ['priority', 5],
        'priority-6': ['priority', 6],
        'priority-7': ['priority', 7],
        'priority-8': ['priority', 8],

        'task-start': ['progress', 1],
        'task-oct': ['progress', 2],
        'task-quarter': ['progress', 3],
        'task-3oct': ['progress', 4],
        'task-half': ['progress', 5],
        'task-5oct': ['progress', 6],
        'task-3quar': ['progress', 7],
        'task-7oct': ['progress', 8],
        'task-done': ['progress', 9]
    };

    function getMeta () {
        let meta = `        
        <?xml version="1.0" encoding="utf-8" standalone="no"?>
        <meta xmlns="urn:xmind:xmap:xmlns:meta:2.0" version="2.0">            
            <Creator>
                <Name>XMind</Name>
                <Version>R3.7.3.201708241944</Version>
            </Creator>
            <Thumbnail>
                <Origin>
                    <X>263</X>
                    <Y>162</Y>
                </Origin>
                <BackgroundColor>#FFFFFF</BackgroundColor>
            </Thumbnail>
        </meta>`;
        return meta;
    }

    function getManifest () {
        let manifest = `
        <?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <manifest
            xmlns="urn:xmind:xmap:xmlns:manifest:1.0" password-hint="">
            <file-entry full-path="content.xml" media-type="text/xml"/>
            <file-entry full-path="META-INF/" media-type=""/>
            <file-entry full-path="META-INF/manifest.xml" media-type="text/xml"/>
            <file-entry full-path="meta.xml" media-type="text/xml"/>            
        </manifest>`;        
        return manifest;
    }

    function getContent (data) {
        let content = '';

        if (!data) {
            return '';
        }        

        if (data.root) {
            let childrenData = ``;
            let snapData = ``;

            if (data.root.children && data.root.children.length > 0) {
                for (let item of data.root.children) {                    
                    snapData = snapData + getContent(item);
                }
                childrenData = `
                <children>
                    <topics type="attached">
                        ${snapData} 
                    </topics>
                </children>`;                
            }

            content = `
            <?xml version="1.0" encoding="UTF-8" standalone="no"?>
            <xmap-content
                xmlns="urn:xmind:xmap:xmlns:content:2.0"
                xmlns:fo="http://www.w3.org/1999/XSL/Format"
                xmlns:svg="http://www.w3.org/2000/svg"
                xmlns:xhtml="http://www.w3.org/1999/xhtml"
                xmlns:xlink="http://www.w3.org/1999/xlink" timestamp="1544076877461" version="2.0">
            <sheet id="435gdt41vctnj56n8rv2qbkrcg" theme="1ema0e3kojt4ukk25cj6cp5ihn" timestamp="1544076877461">
            <topic id="${data.root.data.id}" structure-class="org.xmind.ui.map.unbalanced" timestamp="${data.root.data.created}">
                <title>${data.root.data.text}</title>
                ${childrenData}          
                <extensions>
                    <extension provider="org.xmind.ui.map.unbalanced">
                        <content>
                            <right-number>3</right-number>
                        </content>
                    </extension>
                </extensions>
            </topic>
            <title>画布 1</title>
                </sheet>
            </xmap-content>`;
        } else {  
            let partData = ``;
            let snapData = ``;    

            if (data.children && data.children.length > 0) {                
                for (let item of data.children) {
                    snapData = snapData + getContent(item);
                }        
                partData = `
                    <children>
                        <topics type="attached">
                            ${snapData}
                        </topics>
                    </children>`;
            }

            content = `                       
                <topic id="${data.data.id}" timestamp="${data.data.created}">
                    <title>${data.data.text}</title>
                    ${partData}                    
                </topic>`;  
        }
        return content;
    }

    function saveToXml (xml, type) {
        let firstPath = path.join(xmindDefault, '/mindMapXmind');
        let secondPath = path.join(xmindDefault, '/mindMapXmind/test');
        let thirdPath = path.join(xmindDefault, '/mindMapXmind/test/META-INF');
        if (!fs.existsSync(thirdPath)) {
            if (!fs.existsSync(secondPath)) {
                if (!fs.existsSync(firstPath)) {
                    fs.mkdirSync(firstPath);
                    fs.mkdirSync(secondPath);
                    fs.mkdirSync(thirdPath);
                }
            }
        }        
        
        let xmlPath = path.join(xmindDefault, `/mindMapXmind/test/${type}.xml`);
        if (type == 'manifest') {
            xmlPath = path.join(xmindDefault, `/mindMapXmind/test/META-INF/${type}.xml`);
        }

        fs.open(xmlPath, 'a', (err, fd) => {    
            if (err) {
                throw err;
            }
            fs.appendFile(fd, xml, 'utf8', (err) => {
                if (err) {
                    throw err;
                }        
                fs.close(fd, (err) => {
                    if (err) {
                        throw err;
                    }
                })       
            });
        });
    }

    function deleteXmlFile () {        
        let metaPath = path.join(xmindDefault, `/mindMapXmind/test/meta.xml`);        
        let contentPath = path.join(xmindDefault, `/mindMapXmind/test/content.xml`);
        let manifestPath = path.join(xmindDefault, `/mindMapXmind/test/META-INF/manifest.xml`);

        // meta
        if (fs.existsSync(metaPath)) {
            fs.unlink(metaPath, err => {
                if (err) {
                    throw err;
                }   
                console.log();             
            });
        }

        // content
        if (fs.existsSync(contentPath)) {
            fs.unlink(contentPath, err => {
                if (err) {
                    throw err;
                }
                console.log();
            });
        }

        // manifest
        if (fs.existsSync(manifestPath)) {
            fs.unlink(manifestPath, err => {
                if (err) {
                    throw err;                    
                }
                console.log();
            });
        }
        return ;
    }

    return {
        fileDescription: 'XMind 格式',
        fileExtension: '.xmind',
        dataType: 'blob',
        mineType: 'application/octet-stream',

        decode: function(local) {

            function processTopic(topic, obj) {

                //处理文本
                obj.data = {
                    text: topic.title
                };

                // 处理标签
                if (topic.marker_refs && topic.marker_refs.marker_ref) {
                    var markers = topic.marker_refs.marker_ref;
                    var type;
                    if (markers.length && markers.length > 0) {
                        for (var i in markers) {
                            type = markerMap[markers[i].marker_id];
                            if (type) obj.data[type[0]] = type[1];
                        }
                    } else {
                        type = markerMap[markers.marker_id];
                        if (type) obj.data[type[0]] = type[1];
                    }
                }

                // 处理超链接
                if (topic['xlink:href']) {
                    obj.data.hyperlink = topic['xlink:href'];
                }
                //处理子节点
                var topics = topic.children && topic.children.topics;
                var subTopics = topics && (topics.topic || topics[0] && topics[0].topic);
                if (subTopics) {
                    var tmp = subTopics;
                    if (tmp.length && tmp.length > 0) { //多个子节点
                        obj.children = [];

                        for (var i in tmp) {
                            obj.children.push({});
                            processTopic(tmp[i], obj.children[i]);
                        }

                    } else { //一个子节点
                        obj.children = [{}];
                        processTopic(tmp, obj.children[0]);
                    }
                }
            }

            function xml2km(xml) {
                var json = $.xml2json(xml);
                var result = {};
                var sheet = json.sheet;
                var topic = utils.isArray(sheet) ? sheet[0].topic : sheet.topic;
                processTopic(topic, result);
                return result;
            }

            function getEntries(file, onend) {
                return new Promise(function(resolve, reject) {                    
                    zip.createReader(new zip.BlobReader(file), function(zipReader) {
                        zipReader.getEntries(resolve);
                    }, reject);
                });
            }

            function readDocument(entries) {
                return new Promise(function(resolve, reject) {
                    var entry, json;

                    // 查找文档入口
                    while ((entry = entries.pop())) {

                        if (entry.filename.split('/').pop() == 'content.xml') break;

                        entry = null;

                    }

                    // 找到了读取数据
                    if (entry) {

                        entry.getData(new zip.TextWriter(), function(text) {
                            try {
                                json = xml2km($.parseXML(text));
                                resolve(json);
                            } catch (e) {
                                reject(e);
                            }
                        });

                    } 

                    // 找不到返回失败
                    else {
                        reject(new Error('Content document missing'));
                    }
                });
            }

            return getEntries(local).then(readDocument);

        },

        encode: function(json, km, options) {                        
            
            let fileName = options.filename || 'xmind.xmind';     

            saveToXml(getContent(json), 'content');
            saveToXml(getManifest(), 'manifest');
            saveToXml(getMeta(), 'meta');            
            
            let pathZip = path.join(xmindDefault, `/mindMapXmind/testXmind.zip`);
            let pathFile = path.join(xmindDefault, '/mindMapXmind/test/');              
            let pathxmind = fileName;
            let pathXmind = path.join(xmindDefault, `/mindMapXmind/${path.basename(pathxmind)}`);
            let output = fs.createWriteStream(pathZip);
            let archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });

            archive.on('error', function(err) {
                throw err;
            });

            output.on('close', function() {
                fs.renameSync(pathZip, pathXmind);
                let readFile = fs.readFileSync(pathXmind);
                fs.writeFileSync(pathxmind, readFile);                                
                // 完毕 删除文件
                deleteXmlFile();
            });

            archive.pipe(output);
            archive.directory(pathFile, false);
            archive.finalize();

            return ;                        
        },

        // recognize: recognize,
        recognizePriority: -1
    };

} ());