import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function getCurrentSha(repoPath: string): Promise<string> {
  const { stdout } = await execAsync('git rev-parse HEAD', { cwd: repoPath });
  return stdout.trim();
}

export async function getChangedFiles(repoPath: string, storedSha: string): Promise<string[]> {
  if (!storedSha) {
    // Empty/undefined storedSha means caller should do a full scan
    // Return empty array — caller determines scan scope
    return [];
  }

  const currentSha = await getCurrentSha(repoPath);

  if (currentSha === storedSha) {
    return [];
  }

  const { stdout } = await execAsync(
    `git diff --name-only ${storedSha} ${currentSha}`,
    { cwd: repoPath }
  );

  return stdout.trim().split('\n').filter(Boolean);
}

export async function needsScan(
  repoPath: string,
  storedSha: string | undefined
): Promise<{ needed: boolean; currentSha: string; changedFiles: string[] }> {
  const currentSha = await getCurrentSha(repoPath);

  if (!storedSha) {
    // First run — full scan needed
    return { needed: true, currentSha, changedFiles: [] };
  }

  if (currentSha === storedSha) {
    return { needed: false, currentSha, changedFiles: [] };
  }

  const changedFiles = await getChangedFiles(repoPath, storedSha);
  return { needed: true, currentSha, changedFiles };
}
