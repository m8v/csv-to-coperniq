import { config } from 'dotenv';
import { parse } from 'papaparse';
import { readFileSync } from 'fs';
import ora from 'ora';
import type { PromptModule } from 'inquirer';
import { CsvRow, mapCsvToCoperniq } from './types';

// Load environment variables
config();

const {
  COPERNIQ_BASE_URL,
  COPERNIQ_API_KEY,
  COPERNIQ_MATCH_BY,
  COPERNIQ_MATCH_STRATEGY,
  COPERNIQ_ALLOW_OPTIONS,
  BATCH_SIZE = '10',
  BATCH_TIMEOUT_MS = '1000'
} = process.env;

// Validate environment variables
if (!COPERNIQ_BASE_URL || !COPERNIQ_API_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

async function ingestToCoperniq(data: CsvRow, dryRun: boolean) {
  if (dryRun) {
    console.log('Dry run - would send:', JSON.stringify(mapCsvToCoperniq(data), null, 2));
    return true;
  }

  try {
    // We know COPERNIQ_API_KEY is defined from validation above
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-api-key': COPERNIQ_API_KEY
    };

    const queryParams = new URLSearchParams({
      match_by: COPERNIQ_MATCH_BY ?? 'primaryEmail', // Fallback if somehow undefined
      match_found_strategy: COPERNIQ_MATCH_STRATEGY ?? 'skip',
      allow_new_options: COPERNIQ_ALLOW_OPTIONS ?? 'true'
    }).toString();

    const response = await fetch(`${COPERNIQ_BASE_URL}/projects?${queryParams}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mapCsvToCoperniq(data))
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`HTTP error! status: ${response.status}${errorData ? `, message: ${JSON.stringify(errorData)}` : ''}`);
    }

    return true;
  } catch (error) {
    console.error(`Error ingesting row: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function processBatch(rows: CsvRow[], dryRun: boolean, spinner: ora.Ora): Promise<[number, number]> {
  let successful = 0;
  let failed = 0;

  for (const row of rows) {
    const success = await ingestToCoperniq(row, dryRun);
    if (success) {
      successful++;
    } else {
      failed++;
    }
  }

  return [successful, failed];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const spinner = ora('Select your CSV file').start();

  try {
    const { default: inquirer } = await import('inquirer') as { default: PromptModule };
    const { filePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: 'Enter the path to your CSV file:',
        default: 'data/projects.csv'
      }
    ]);

    spinner.text = 'Reading CSV file';
    const fileContent = readFileSync(filePath, 'utf-8');
    const { data, errors } = parse<CsvRow>(fileContent, {
      header: true,
      skipEmptyLines: true
    });

    if (errors.length > 0) {
      throw new Error(`CSV parsing errors: ${errors.map((e: { message: string }) => e.message).join(', ')}`);
    }

    spinner.text = `Processing ${data.length} rows${dryRun ? ' (DRY RUN)' : ''}`;

    let totalSuccessful = 0;
    let totalFailed = 0;
    const batchSize = parseInt(BATCH_SIZE, 10);
    const batchTimeout = parseInt(BATCH_TIMEOUT_MS, 10);

    // Process in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      spinner.text = `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}${dryRun ? ' (DRY RUN)' : ''}`;
      
      const [successful, failed] = await processBatch(batch, dryRun, spinner);
      totalSuccessful += successful;
      totalFailed += failed;

      // Wait between batches (except for the last one)
      if (i + batchSize < data.length) {
        await new Promise(resolve => setTimeout(resolve, batchTimeout));
      }
    }

    spinner.succeed(`Completed! ${totalSuccessful} successful, ${totalFailed} failed${dryRun ? ' (DRY RUN)' : ''}`);
  } catch (error) {
    spinner.fail(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

main(); 