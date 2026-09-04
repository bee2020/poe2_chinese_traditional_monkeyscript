const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 1. 读取 UserScript 元数据 Header
const indexTsPath = path.join(__dirname, 'src', 'index.ts');
if (!fs.existsSync(indexTsPath)) {
    console.error(`[ERROR] 找不到入口文件: ${indexTsPath}`);
    process.exit(1);
}

const indexContent = fs.readFileSync(indexTsPath, 'utf8');
const headerMatch = indexContent.match(/(\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==)/);
const userScriptHeader = headerMatch ? headerMatch[1] : '';

console.log('🚀 [esbuild] 正在启动 TypeScript 模块化工程构建...');

// 2. 针对 src 目录下 JSON 字典启用深度精简插件 (剔除无用冗余元数据与长 URL，确保产物体积严格低于 Greasy Fork 2,097,152 字符限制)
function cleanStats(data) {
    if (!data || !Array.isArray(data.result)) return data;
    return {
        result: data.result.map(cat => ({
            id: cat.id,
            label: cat.label,
            ...(cat.zh_tw?.label ? { zh_tw: { label: cat.zh_tw.label } } : {}),
            entries: (cat.entries || []).map(e => {
                const item = { id: e.id, text: e.text };
                if (e.zh_tw && e.zh_tw.text) {
                    item.zh_tw = { text: e.zh_tw.text };
                }
                if (e.option && Array.isArray(e.option.options)) {
                    item.option = {
                        options: e.option.options.map(o => {
                            const opt = { id: o.id, text: o.text };
                            if (o.zh_tw && o.zh_tw.text) {
                                opt.zh_tw = { text: o.zh_tw.text };
                            }
                            return opt;
                        })
                    };
                }
                return item;
            })
        }))
    };
}

function cleanStatic(data) {
    if (!data || !Array.isArray(data.result)) return data;
    return {
        result: data.result.map(cat => ({
            id: cat.id,
            label: cat.label,
            ...(cat.zh_tw?.label ? { zh_tw: { label: cat.zh_tw.label } } : {}),
            entries: (cat.entries || []).map(e => {
                const item = { id: e.id, text: e.text };
                if (e.zh_tw && e.zh_tw.text) {
                    item.zh_tw = { text: e.zh_tw.text };
                }
                return item;
            })
        }))
    };
}

function cleanItems(data) {
    if (!Array.isArray(data)) return data;
    return data.map(group => ({
        id: group.id,
        label: group.label,
        ...(group.zh_tw?.label ? { zh_tw: { label: group.zh_tw.label } } : {}),
        entries: (group.entries || []).map(entry => {
            const clean = {};
            if (entry.type) clean.type = entry.type;
            if (entry.name) clean.name = entry.name;
            if (entry.text) clean.text = entry.text;
            if (entry.zh_tw) {
                clean.zh_tw = {};
                if (entry.zh_tw.type) clean.zh_tw.type = entry.zh_tw.type;
                if (entry.zh_tw.name) clean.zh_tw.name = entry.zh_tw.name;
                if (entry.zh_tw.text) clean.zh_tw.text = entry.zh_tw.text;
            }
            return clean;
        })
    }));
}

function cleanFilters(data) {
    if (!data || !Array.isArray(data.result)) return data;
    return {
        result: data.result.map(type => ({
            id: type.id,
            title: type.title,
            ...(type.zh_tw?.title ? { zh_tw: { title: type.zh_tw.title } } : {}),
            filters: (type.filters || []).map(f => {
                const item = { id: f.id, text: f.text, title: f.title };
                if (f.zh_tw?.text) {
                    item.zh_tw = { text: f.zh_tw.text };
                }
                if (f.option && Array.isArray(f.option.options)) {
                    item.option = {
                        options: f.option.options.map(o => {
                            const opt = { id: o.id, text: o.text };
                            if (o.zh_tw?.text) {
                                opt.zh_tw = { text: o.zh_tw.text };
                            }
                            return opt;
                        })
                    };
                }
                return item;
            })
        }))
    };
}

const minifyDictPlugin = {
    name: 'minify-dict-json',
    setup(build) {
        build.onLoad({ filter: /[\\/]src[\\/].*\.json$/ }, async (args) => {
            const jsonText = await fs.promises.readFile(args.path, 'utf8');
            let parsed = JSON.parse(jsonText);
            const baseName = path.basename(args.path);

            if (baseName === 'stats.json') {
                parsed = cleanStats(parsed);
            } else if (baseName === 'static.json') {
                parsed = cleanStatic(parsed);
            } else if (baseName === 'items.json') {
                parsed = cleanItems(parsed);
            } else if (baseName === 'filters.json') {
                parsed = cleanFilters(parsed);
            }

            const minified = JSON.stringify(parsed);
            return {
                contents: `export default ${minified};`,
                loader: 'js'
            };
        });
    }
};

async function buildProject() {
    try {
        const outDir = path.join(__dirname, 'dist');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        const outfile = path.join(outDir, 'poe_trade.user.js');

        await esbuild.build({
            entryPoints: [indexTsPath],
            bundle: true,
            minify: false, // 业务逻辑代码保持清晰多行排版
            format: 'iife',
            target: 'es2020',
            plugins: [minifyDictPlugin],
            banner: {
                js: userScriptHeader + '\n'
            },
            outfile: outfile,
            charset: 'utf8',
            legalComments: 'inline'
        });

        const outputStat = fs.statSync(outfile);
        const distLines = fs.readFileSync(outfile, 'utf8').split('\n').length;
        console.log(`\n🎉 [BUILD SUCCESS] 编译成功！产物已输出至: dist/poe_trade.user.js`);
        console.log(`   - 产物体积: ${(outputStat.size / 1024 / 1024).toFixed(2)} MB (${outputStat.size} 字节)`);
        console.log(`   - 产物行数: ${distLines} 行 (业务代码保持清晰，4 大官方字典紧凑内嵌)\n`);
    } catch (error) {
        console.error('❌ [BUILD ERROR] 编译失败:', error);
        process.exit(1);
    }
}

buildProject();
