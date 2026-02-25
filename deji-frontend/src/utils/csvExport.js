// CSV export utility for analytics tables
export function exportToCSV(rows, filename = "analytics-export.csv") {
  if (!rows || rows.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get all keys from first row
  const headers = Object.keys(rows[0]);

  // Build CSV header
  const csvHeader = headers.join(",");

  // Build CSV rows
  const csvRows = rows.map((row) =>
    headers.map((header) => {
      const value = row[header];
      // Escape quotes and wrap strings with commas
      if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(",")
  );

  // Combine header and rows
  const csv = [csvHeader, ...csvRows].join("\n");

  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
