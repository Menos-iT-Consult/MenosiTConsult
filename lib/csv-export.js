function csvCell(value) {
  const text = value == null ? '' : String(value);
  const safe = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function serializeCsv(rows, columns) {
  const matrix = [
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => row[column.key])),
  ];
  return matrix.map((record) => record.map(csvCell).join(',')).join('\r\n');
}

function downloadCsv(filename, rows, columns) {
  const blob = new Blob([`\uFEFF${serializeCsv(rows, columns)}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

module.exports = { csvCell, serializeCsv, downloadCsv };
