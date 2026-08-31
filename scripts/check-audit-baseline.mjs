import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baselineUrl = new URL('../.github/audit-baseline.json', import.meta.url);
const baseline = JSON.parse(readFileSync(baselineUrl, 'utf8'));
const severities = ['high', 'critical'];
let failed = false;

for (const [workspace, allowed] of Object.entries(baseline)) {
  const auditArgs = [
    'audit',
    '--prefix',
    workspace,
    '--omit=dev',
    '--audit-level=high',
    '--json',
  ];
  const command =
    process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'npm';
  const commandArgs =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm.cmd', ...auditArgs]
      : auditArgs;
  const result = spawnSync(
    command,
    commandArgs,
    {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  if (result.error) {
    console.error(`${workspace}: npm audit could not start: ${result.error.message}`);
    failed = true;
    continue;
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    console.error(`${workspace}: npm audit did not return valid JSON.`);
    if (result.stderr) console.error(result.stderr.trim());
    failed = true;
    continue;
  }

  const counts = report.metadata?.vulnerabilities;
  if (!counts) {
    console.error(`${workspace}: npm audit returned no vulnerability summary.`);
    failed = true;
    continue;
  }

  console.log(
    `${workspace}: high=${counts.high ?? 0}/${allowed.high}, ` +
      `critical=${counts.critical ?? 0}/${allowed.critical}`,
  );

  for (const severity of severities) {
    const actual = counts[severity] ?? 0;
    const maximum = allowed[severity] ?? 0;
    if (actual > maximum) {
      console.error(
        `${workspace}: ${severity} vulnerabilities increased from ` +
          `${maximum} to ${actual}.`,
      );
      failed = true;
    }
  }
}

if (failed) {
  console.error('Dependency audit baseline failed. Fix the new advisories before merging.');
  process.exit(1);
}

console.log('Dependency audit baseline passed; no high/critical count increased.');
