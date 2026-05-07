const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function readJson(file) {
  return JSON.parse(read(file));
}

const manifest = readJson('language.json');
const html = read('index.html');

assert.strictEqual(manifest.defaultLocale, 'zh-CN', 'language.json should declare zh-CN as the default locale');
assert.ok(manifest.locales, 'language.json should expose a locales map');

assert.deepStrictEqual(
  manifest.locales['zh-CN'],
  {
    dict: 'locales/zh-cn.json',
    questions: 'questions/questions_zh_cn.js',
    label: '简体中文',
    enabled: true
  },
  'zh-CN should be configured from language.json'
);

assert.deepStrictEqual(
  manifest.locales['en-US'],
  {
    dict: 'locales/en_us.json',
    questions: 'questions/questions_en_us.js',
    label: 'English',
    enabled: true
  },
  'en-US should be unlocked and point at the new English files'
);

assert.ok(
  html.includes("LANGUAGE_CONFIG_PATH = 'language.json'"),
  'index.html should load language settings from language.json'
);
assert.ok(
  html.includes('loadLanguageConfig'),
  'index.html should have a manifest loading step'
);
assert.ok(
  !html.includes('const SUPPORTED_LOCALES = {'),
  'supported locales should not be hard-coded as an object literal in index.html'
);
assert.ok(
  html.includes('source[key]'),
  'translation lookup should support flat dictionary keys such as meta.title'
);
assert.ok(
  html.includes('option.textContent = config.label'),
  'language selector option labels should come directly from language.json'
);
assert.ok(
  !html.includes('option.textContent = t(`language.options.${locale}`'),
  'language selector should not depend on locale dictionaries for option labels'
);
assert.ok(
  html.includes('content: attr(data-punish-stamp)'),
  'punishment stamp pseudo-element should read localized text from a data attribute'
);
assert.ok(
  !html.includes('content: "你乱点的吧"'),
  'punishment stamp should not hard-code Chinese text in CSS'
);
assert.ok(
  html.includes('getRadarLabels()'),
  'radar chart axis labels should come from localized dimension names'
);
assert.ok(
  !html.includes("labels: ['审美', '行为', '心理', '社交']"),
  'radar chart axis labels should not be hard-coded in Chinese'
);

console.log('language-config tests passed');
