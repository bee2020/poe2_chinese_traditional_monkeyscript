const fs = require('fs');
const path = require('path');
const { buildReportFromDictionaries, generateDiffAndChangelog, takeDictSnapshot, restoreBaseline } = require('../build_dict/scripts/diff.cjs');
const savedFile = path.resolve(__dirname, '../build_dict/changelogs/CHANGELOG.diff.json');
const saved = fs.existsSync(savedFile) ? JSON.parse(fs.readFileSync(savedFile, 'utf8')) : null;
const report = buildReportFromDictionaries();
report.provenance = saved?.provenance || [];
// 重排版时保留上一轮真实差异；若产物不再匹配，则不伪造历史基准。
const baseline = restoreBaseline(saved, takeDictSnapshot());
generateDiffAndChangelog(report, baseline);
