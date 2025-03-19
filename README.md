# CSV to Coperniq

Batch import projects from CSV into Coperniq.

## Flow Diagram

```
CSV Row
├─> Standard Fields ──> Parse & Transform ──┐
│   title, address, etc.                   │
│                                         ├─> API Payload ──> POST /projects
│                                         │
└─> Custom Fields ───> Auto-type values ───┘
    mount_type: string
    panel_count: number
    etc.
```

## Setup

```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
```

## Usage

```bash
# Dry run (preview mode)
npm start -- --dry-run

# Actual import
npm start
```

## CSV Format

Your CSV should have these standard columns:
- `title`, `description`, `address`
- `isActive`, `status`
- `primaryEmail`, `primaryPhone`
- `workflowId`, `clientId`, `value`, `size`
- `ownerId`, `salesRepId`, `projectManagerId`
- `trades` (comma-separated)

Any additional columns will be treated as custom fields.

## Environment Variables

- `COPERNIQ_BASE_URL`: Coperniq API URL
- `COPERNIQ_API_KEY`: Your API key
- `COPERNIQ_MATCH_BY`: Match strategy field (default: primaryEmail)
- `COPERNIQ_MATCH_STRATEGY`: Strategy for matches (default: skip)
- `COPERNIQ_ALLOW_OPTIONS`: Allow new options (default: true)
- `BATCH_SIZE`: Records per batch (default: 10)
- `BATCH_TIMEOUT_MS`: Delay between batches (default: 1000) 