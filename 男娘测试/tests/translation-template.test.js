const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'locales', 'template.json');

assert.ok(fs.existsSync(templatePath), 'locales/template.json should exist as the translator reference file');

const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

for (const key of [
  '__translatorNotes',
  'meta.title',
  'language.selectLabel',
  'question.standardOptions',
  'dimensions.names',
  'dimensions.meta',
  'result.sections.report',
  'punish.stampText',
  'punish.descs.1',
  'punish.analysis.1',
  'tiers',
  'traits',
  'files.downloadName'
]) {
  assert.ok(Object.prototype.hasOwnProperty.call(template, key), `template should document ${key}`);
}

assert.ok(Array.isArray(template['question.standardOptions']), 'template should show the quiz option array shape');
assert.ok(Array.isArray(template.tiers), 'template should show the result tier array shape');
assert.ok(template.traits && typeof template.traits === 'object', 'template should show the traits object shape');

console.log('translation template tests passed');
