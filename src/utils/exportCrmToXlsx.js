import * as XLSX from 'xlsx';
import { getContactTypes } from '../services/crmService';

const row = (item, sheetName) => {
  const pc = item.primaryContact;
  const primaryContactStr = pc && (pc.name || pc.email || pc.phone || pc.role)
    ? [pc.name, pc.role, pc.email, pc.phone].filter(Boolean).join(' · ')
    : '—';
  return {
    'Contact Name': item.contactName || item.clientName || '—',
    'Email': item.email || item.clientEmail || '—',
    'Type': getContactTypes(item).join(', ') || 'N/A',
    'Location': (item.location || '').trim() || '—',
    'Primary Contact': primaryContactStr,
    'Phone': item.phone || '—',
    'Instagram': item.instagram || '—',
    'Organization': item.organization || '—',
    'Website': item.website || '—',
    'Notes': item.notes || '—',
    'Status': item.status || '—',
    'Last Contact': item.lastContact || '—',
    'Sheet': sheetName
  };
};

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
