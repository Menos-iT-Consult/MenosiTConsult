const test = require('node:test');
const assert = require('node:assert/strict');
const { csvCell, serializeCsv } = require('../lib/csv-export');

test('CSV export quotes delimiters, line breaks, and embedded quotes', () => {
  assert.equal(csvCell('Smith, "Sam"\nSecond line'), '"Smith, ""Sam""\nSecond line"');
  assert.equal(
    serializeCsv([{ name: 'Ama', message: 'Hello, world' }], [
      { key: 'name', label: 'Name' },
      { key: 'message', label: 'Message' },
    ]),
    '"Name","Message"\r\n"Ama","Hello, world"'
  );
});

test('CSV export neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('=HYPERLINK("https://example.test")'), `"'=HYPERLINK(""https://example.test"")"`);
  assert.equal(csvCell('  @SUM(A1:A2)'), '"\'  @SUM(A1:A2)"');
});
