/**
 * Utility esportazione report CSV compatibile con Microsoft Excel (UTF-8 BOM + separatore ;)
 */
export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): void {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/\r?\n/g, ' ');
    if (str.includes(';') || str.includes('"') || str.includes(',')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    '\uFEFF' +
    [
      headers.map(escapeCell).join(';'),
      ...rows.map((row) => row.map(escapeCell).join(';')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
