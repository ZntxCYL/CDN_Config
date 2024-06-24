'use strict';

const path = require('path');
const fs = require('fs');
const CurPath = './';
var dest = '';

/** 获取可能包含md5的文件 */
function getFile(file, dir = dest) {
    let ext = path.extname(file);
    let name = file.replace(ext, '');

    let files = fs.readdirSync(dir);
    for (const file2 of files) {
        if (file2.startsWith(name) && file2.endsWith(ext))
            return file2;
    }
    return file;
}

/** 获取配置中的远程地址 */
function getRemoteUrl(dest) {
    // 读取配置
    let configPath = path.join(dest + '/../../settings/cdn.json');
    if (!fs.existsSync(configPath)) return CurPath;

    let configTxt = fs.readFileSync(configPath, 'utf-8');
    let json = JSON.parse(configTxt);
    let url = json.remoteUrl;

    // 返回配置中的CDN地址
    return url ? `${url}${url.endsWith('/') ? '' : '/'}` : CurPath;
}

function onBuildFinish(options, callback) {
    if (options.platform != 'web-mobile') return;

    // 定义目录
    dest = options.dest;
    const remoteUrl = getRemoteUrl(dest);
    if (remoteUrl && remoteUrl != CurPath) Editor.log("替换CDN地址：", remoteUrl);

    const assets = path.join(dest, 'assets');
    const src = path.join(dest, 'src');
    const data = path.join(dest, 'data');
    const js = path.join(dest, 'js');
    const lib = path.join(js, 'lib');
    const css = path.join(dest, 'css');
    const img = path.join(dest, 'img');

    // 处理目录和文件
    fs.renameSync(assets, data);
    fs.renameSync(src, js);
    fs.mkdirSync(lib);
    fs.mkdirSync(css);
    fs.mkdirSync(img);

    // 正式或调试
    var mainJs = getFile('cocos2d-js-min.js');
    var mainJsPath = path.join(dest, mainJs);
    var physicsJs = getFile('physics-min.js');

    if (!fs.existsSync(mainJsPath)) {
        mainJs = getFile('cocos2d-js.js');
        mainJsPath = path.join(dest, mainJs);
        physicsJs = getFile('physics.js');
    }

    // 替换动态资源内容：index.html
    var indexhtml = path.join(dest, "index.html");
    var script = fs.readFileSync(indexhtml, 'utf-8');

    if (remoteUrl) {
        script = script
            .replace(/css" href="/g, `css" href="${remoteUrl}css/`)
            .replace(/icon" href="/g, `icon" href="${remoteUrl}img/`)
            .replace(/src="src\/|src="/g, `src="${remoteUrl}js/`)
            .replace('.src = ', `.src = '${remoteUrl}js/lib/' + `);
    }
    fs.writeFileSync(indexhtml, script);

    // 替换框架内容
    var script = fs.readFileSync(mainJsPath, 'utf-8');
    script = script.replace('"assets/"', '"data/"');
    fs.writeFileSync(mainJsPath, script);

    if (remoteUrl) {
        // 替换CDN地址：main.js
        var mainjs = path.join(dest, getFile("main.js"));
        var script = fs.readFileSync(mainjs, 'utf-8');
        script = script
            .replace(/cc.assetManager.loadBundle\(/g, `cc.assetManager.loadBundle("${remoteUrl}data/" + `);
        fs.writeFileSync(mainjs, script);

        // 替换CDN地址：data/main/index.js
        var indexPath = path.join(data, "main/");
        var indexjs = path.join(indexPath, getFile("index.js", indexPath));
        var script = fs.readFileSync(indexjs, 'utf-8');
        script = script
            .replace(/cc.assetManager.loadBundle\(/g, `cc.assetManager.loadBundle("${remoteUrl}data/" + `);
        fs.writeFileSync(indexjs, script);
    }

    //#region 移动文件

    // 移动引擎文件
    moveFile(mainJs, lib);
    // 移动物理引擎文件
    if (fs.existsSync(path.join(dest, physicsJs))) moveFile(physicsJs, lib);
    // 遍历移动文件
    fs.readdir(dest, (err, files) => {
        files.forEach(name => {
            let ext = path.extname(name);
            switch (ext) {
                case '.js':
                    moveFile(name, js);
                    break;
                case '.css':
                    let cssFile = path.join(dest, name);
                    let script = fs.readFileSync(cssFile, 'utf-8');
                    script = script
                        .replace(/url\(\.\//g, `url(${remoteUrl != CurPath ? remoteUrl : '.' + remoteUrl}img/`);
                    fs.writeFileSync(cssFile, script);

                    moveFile(name, css);
                    break;
                case '.png':
                case '.ico':
                    moveFile(name, img);
                    break;
            }
        });
    });

    //#endregion

    callback();
}

/** 移动文件 */
function moveFile(filename, dir) {
    fs.renameSync(path.join(dest, filename), path.join(dir, filename));
}

module.exports = {
    load() {
        Editor.Builder.on('build-finished', onBuildFinish);
    },

    unload() {
        Editor.Builder.removeListener('build-finished', onBuildFinish);
    },

    // register your ipc messages here
    messages: {
        open() {
            // open entry panel registered in package.json
            Editor.Panel.open('cdn');
        },
    }
}