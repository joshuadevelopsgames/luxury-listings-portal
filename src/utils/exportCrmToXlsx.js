import * as XLSX from 'xlsx';

const row = (item, sheetName) => ({
  'Contact Name': item.contactName || item.clientName || '—',
  'Email': item.email || item.clientEmail || '—',
  'Type': item.type || 'N/A',
  'Phone': item.phone || '—',
  'Instagram': item.instagram || '—',
  'Organization': item.organization || '—',
  'Website': item.website || '—',
  'Notes': item.notes || '—',
  'Status': item.status || '—',
  'Last Contact': item.lastContact || '—',
  'Sheet': sheetName
});

export function exportCrmToXlsx({ warmLeads = [], contactedClients = [], coldLeads = [], existingClients = [] }) {
  const wb = XLSX.utils.book_new();
  const warmRows = warmLeads.map((c) => row(c, 'Warm Leads'));
  const contactedRows = contactedClients.map((c) => row(c, 'Contacted'));
  const coldRows = coldLeads.map((c) => row(c, 'Cold Leads'));
  const clientRows = existingClients.map((c) => row(c, 'Clients'));

  if (warmRows.length) {
    const ws = XLSX.utils.json_to_sheet(warmRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Warm Leads');
  }
  if (contactedRows.length) {
    const ws = XLSX.utils.json_to_sheet(contactedRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Contacted');
  }
  if (coldRows.length) {
    const ws = XLSX.utils.json_to_sheet(coldRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Cold Leads');
  }
  if (clientRows.length) {
    const ws = XLSX.utils.json_to_sheet(clientRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
  }

  if (wb.SheetNames.length === 0) {
    const ws = XLSX.utils.json_to_sheet([{ 'Contact Name': 'No data', 'Email': '', 'Sheet': '—' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'CRM');
  }

  const filename = `CRM-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
