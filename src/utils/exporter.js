/**
 * Export utilities for CSV and Excel formats
 */

/**
 * Export data to CSV format
 */
export function exportToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return { format: 'csv', data: '' };
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  return {
    format: 'csv',
    data: csvContent,
    filename: `report_${Date.now()}.csv`,
  };
}

/**
 * Export data to Excel format (returns JSON for now, can be enhanced with xlsx lib)
 */
export function exportToExcel(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return { format: 'excel', data: [] };
  }

  return {
    format: 'excel',
    data,
    filename: `report_${Date.now()}.xlsx`,
  };
}
