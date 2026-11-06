// 构建端复用运行时的 TS 校验规则，不维护另一套占位符算法。
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { transformSync } = require('esbuild');

const filename = path.resolve(__dirname, '../src/core/statTemplate.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled._compile(transformSync(fs.readFileSync(filename, 'utf8'), {
    loader: 'ts', format: 'cjs', target: 'es2020'
}).code, filename);
const templates = compiled.exports;

function auditStatTemplates(data) {
    const report = { total: 0, missing: 0, usable: 0, unsafe: 0, issues: [] };
    for (const category of data.result || data) {
        for (const entry of category.entries || []) {
            report.total++;
            if (!entry.zh_tw?.text) { report.missing++; continue; }
            const result = templates.compileStatTemplate(entry.text, entry.zh_tw.template || entry.zh_tw.text);
            if (result.template) { report.usable++; continue; }
            report.unsafe++;
            report.issues.push({
                id: entry.id, source: entry.zh_tw.source,
                en: entry.text, tw: entry.zh_tw.text, reason: result.reason
            });
        }
    }
    return report;
}

module.exports = { ...templates, auditStatTemplates };
