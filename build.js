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

// 2. 针对 src 目录下所有 JSON 字典启用紧凑单行打包插件 (保证业务代码可读，字典紧凑轻量)
const minifyDictPlugin = {
    name: 'minify-dict-json',
    setup(build) {
        build.onLoad({ filter: /[\\/]src[\\/].*\.json$/ }, async (args) => {
            const jsonText = await fs.promises.readFile(args.path, 'utf8');
            const minified = JSON.stringify(JSON.parse(jsonText));
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
