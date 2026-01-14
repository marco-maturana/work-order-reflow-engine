import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { ReflowService } from './reflow/reflow.service';
import type { ReflowInput, ScenarioDocument } from './reflow/types';

async function loadScenario(path: string): Promise<ScenarioDocument[]> {
  const raw = await readFile(path, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Scenario file must be a JSON array of documents.');
  }
  return parsed as ScenarioDocument[];
}

async function main(): Promise<void> {
  const [, , scenarioPath] = process.argv;
  if (!scenarioPath) {
    console.error('Usage: npm run dev -- <scenario.json>');
    process.exit(1);
  }

  const documents = await loadScenario(scenarioPath);
  const service = new ReflowService();
  const input: ReflowInput = { documents };
  const result = await service.reflow(input);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('Reflow failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
