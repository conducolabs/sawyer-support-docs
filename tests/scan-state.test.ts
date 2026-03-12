import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { readScanState, writeScanState, SAWYER_DOCS_DIR } from '../src/scanner/state.js';
import type { ScanState } from '../src/scanner/schema.js';

let tempDir: string;

beforeEach(() => {
  // Create a fresh temp directory for each test
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sawyer-test-'));
});

afterEach(() => {
  // Clean up temp directory after each test
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('readScanState', () => {
  it('returns empty state object when scan-state.json does not exist', () => {
    const state = readScanState(tempDir);
    expect(state).toEqual({});
  });

  it('reads back state that was written by writeScanState', () => {
    const state: ScanState = {
      mobile: { sha: 'abc123', scannedAt: '2026-03-12T10:00:00.000Z' },
    };
    writeScanState(tempDir, state);
    const readBack = readScanState(tempDir);
    expect(readBack).toEqual(state);
  });

  it('reads state with all three repos', () => {
    const state: ScanState = {
      mobile: { sha: 'abc123', scannedAt: '2026-03-12T10:00:00.000Z' },
      dashboard: { sha: 'def456', scannedAt: '2026-03-12T11:00:00.000Z' },
      platform: { sha: 'ghi789', scannedAt: '2026-03-12T12:00:00.000Z' },
    };
    writeScanState(tempDir, state);
    const readBack = readScanState(tempDir);
    expect(readBack).toEqual(state);
  });
});

describe('writeScanState', () => {
  it('creates .sawyer-docs/ directory if it does not exist', () => {
    const sawyerDocsPath = path.join(tempDir, SAWYER_DOCS_DIR);
    expect(fs.existsSync(sawyerDocsPath)).toBe(false);

    writeScanState(tempDir, {});

    expect(fs.existsSync(sawyerDocsPath)).toBe(true);
    expect(fs.statSync(sawyerDocsPath).isDirectory()).toBe(true);
  });

  it('writes valid JSON to scan-state.json', () => {
    const state: ScanState = {
      mobile: { sha: 'abc123', scannedAt: '2026-03-12T10:00:00.000Z' },
    };
    writeScanState(tempDir, state);

    const stateFilePath = path.join(tempDir, SAWYER_DOCS_DIR, 'scan-state.json');
    expect(fs.existsSync(stateFilePath)).toBe(true);

    const raw = fs.readFileSync(stateFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual(state);
  });

  it('writes JSON with 2-space indentation', () => {
    writeScanState(tempDir, { mobile: { sha: 'abc', scannedAt: '2026-03-12T00:00:00.000Z' } });

    const stateFilePath = path.join(tempDir, SAWYER_DOCS_DIR, 'scan-state.json');
    const raw = fs.readFileSync(stateFilePath, 'utf-8');
    // Check 2-space indentation
    expect(raw).toContain('  "mobile"');
  });

  it('overwrites existing state file on subsequent writes', () => {
    const state1: ScanState = { mobile: { sha: 'abc123', scannedAt: '2026-03-12T10:00:00.000Z' } };
    const state2: ScanState = {
      mobile: { sha: 'def456', scannedAt: '2026-03-12T11:00:00.000Z' },
      dashboard: { sha: 'ghi789', scannedAt: '2026-03-12T11:00:00.000Z' },
    };

    writeScanState(tempDir, state1);
    writeScanState(tempDir, state2);

    const readBack = readScanState(tempDir);
    expect(readBack).toEqual(state2);
  });
});

describe('SAWYER_DOCS_DIR constant', () => {
  it('equals ".sawyer-docs"', () => {
    expect(SAWYER_DOCS_DIR).toBe('.sawyer-docs');
  });
});
