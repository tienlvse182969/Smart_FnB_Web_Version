import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve('deliverables/iteration-1');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const catalogue = JSON.parse(await readFile(resolve(root, 'requirements.json'), 'utf8'));
const ids = catalogue.requirements.map((requirement) => requirement.id);
assert.equal(ids.length, 33, 'Expected the 33 baseline use cases');
assert.equal(new Set(ids).size, ids.length, 'Requirement IDs must be unique');
const models = new Set(catalogue.models.map((model) => model.name));
for (const requirement of catalogue.requirements) {
  assert.equal(requirement.design, `SDD-${requirement.id}`);
  assert.equal(requirement.testId, `AT-${requirement.id}`);
  for (const model of requirement.models.split(',')) {
    assert(models.has(model), `${requirement.id}: missing model ${model}`);
  }
  if (!requirement.test.startsWith('backend:')) {
    assert((await stat(requirement.test)).isFile(), `Missing test ${requirement.test}`);
  }
}
for (const file of manifest.files) {
  const absolute = resolve(root, file.path);
  const rel = relative(root, absolute);
  assert(!isAbsolute(rel) && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\'), 'Manifest path must stay inside release');
  const bytes = await readFile(absolute);
  assert.equal(bytes.length, file.bytes, `Size mismatch: ${file.path}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, `Checksum mismatch: ${file.path}`);
}
for (const required of [
  'reports/Report1_Project_Introduction.docx',
  'reports/Report2_Project_Management_Plan.docx',
  'reports/Report3_SRS.docx',
  'reports/Report4_SDD.docx',
  'reports/Report5_Test_Documentation.docx',
  'tracking/Project_Tracking.xlsx', 'tracking/Test_Report.xlsx',
  'database/001-baseline.sql', 'database/schema.prisma',
  'source/backend.zip', 'diagrams/source.drawio', 'evidence/web-tests.json',
]) {
  assert(manifest.files.some((file) => file.path === required), `Unmanifested deliverable: ${required}`);
}
console.log(`Verified ${manifest.files.length} files and ${ids.length} requirement/design/test mappings.`);
console.log('Integrity verification is not acceptance, database restore, or device-test evidence.');
