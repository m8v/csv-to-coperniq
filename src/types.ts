// Coperniq API types
export interface CoperniqProject {
  title: string;
  description: string;
  address: string[];
  isActive: boolean;
  status: string;
  primaryEmail: string;
  primaryPhone: string;
  workflowId: number;
  clientId: number;
  value: number;
  size: number;
  ownerId: number;
  salesRepId: number;
  projectManagerId: number;
  trades: string[];
  custom: Record<string, unknown>;
}

// CSV row type with custom fields as columns
export interface CsvRow {
  title: string;
  description: string;
  address: string;
  isActive: string;
  status: string;
  primaryEmail: string;
  primaryPhone: string;
  workflowId: string;
  clientId: string;
  value: string;
  size: string;
  ownerId: string;
  salesRepId: string;
  projectManagerId: string;
  trades: string;
  [key: string]: string; // Allow any additional columns for custom fields
}

// Transform CSV row to Coperniq project
export function mapCsvToCoperniq(row: CsvRow): CoperniqProject {
  // Standard fields
  const standardFields = [
    'title', 'description', 'address', 'isActive', 'status',
    'primaryEmail', 'primaryPhone', 'workflowId', 'clientId',
    'value', 'size', 'ownerId', 'salesRepId', 'projectManagerId',
    'trades'
  ];

  // Extract custom fields (any column not in standard fields)
  const custom: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    if (!standardFields.includes(key)) {
      // Try to parse the value as JSON if it looks like a number, boolean, or JSON
      try {
        if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          custom[key] = value.toLowerCase() === 'true';
        } else if (!isNaN(Number(value))) {
          custom[key] = Number(value);
        } else if (value.startsWith('{') || value.startsWith('[')) {
          custom[key] = JSON.parse(value);
        } else {
          custom[key] = value;
        }
      } catch {
        custom[key] = value;
      }
    }
  });

  return {
    title: row.title,
    description: row.description,
    address: [row.address], // CSV has single address, API expects array
    isActive: row.isActive.toLowerCase() === 'true',
    status: row.status,
    primaryEmail: row.primaryEmail,
    primaryPhone: row.primaryPhone,
    workflowId: parseInt(row.workflowId, 10),
    clientId: parseInt(row.clientId, 10),
    value: parseFloat(row.value),
    size: parseFloat(row.size),
    ownerId: parseInt(row.ownerId, 10),
    salesRepId: parseInt(row.salesRepId, 10),
    projectManagerId: parseInt(row.projectManagerId, 10),
    trades: row.trades.split(',').map(t => t.trim()),
    custom
  };
} 