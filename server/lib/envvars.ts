import fs from 'fs';
import path from 'path';

const ENV_FILE = path.resolve(__dirname, '../../.env');

export interface EnvVar {
  key: string;
  value: string;
  masked: string; // masked version for display
}

function maskValue(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}

// Read all env vars from .env file
export function getEnvVars(reveal: boolean = false): EnvVar[] {
  try {
    const content = fs.readFileSync(ENV_FILE, 'utf-8');
    const vars: EnvVar[] = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();

      vars.push({
        key,
        value: reveal ? value : '',
        masked: maskValue(value),
      });
    }

    return vars;
  } catch (err) {
    console.error('Failed to read .env:', err);
    return [];
  }
}

// Set/update an env var
export function setEnvVar(key: string, value: string): { success: boolean; error?: string } {
  try {
    let content = '';
    try {
      content = fs.readFileSync(ENV_FILE, 'utf-8');
    } catch { /* file doesn't exist yet */ }

    const lines = content.split('\n');
    let found = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('#') || !trimmed) continue;

      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;

      const lineKey = trimmed.slice(0, eqIdx).trim();
      if (lineKey === key) {
        lines[i] = `${key}=${value}`;
        found = true;
        break;
      }
    }

    if (!found) {
      // Add new var
      if (content && !content.endsWith('\n')) lines.push('');
      lines.push(`${key}=${value}`);
    }

    fs.writeFileSync(ENV_FILE, lines.join('\n'));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Delete an env var
export function deleteEnvVar(key: string): { success: boolean; error?: string } {
  try {
    const content = fs.readFileSync(ENV_FILE, 'utf-8');
    const lines = content.split('\n');
    const filtered = lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return true;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) return true;
      return trimmed.slice(0, eqIdx).trim() !== key;
    });

    fs.writeFileSync(ENV_FILE, filtered.join('\n'));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
