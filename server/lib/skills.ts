import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface Skill {
  name: string;
  description: string;
  location: string;
  version?: string;
  source?: string;
}

// List installed skills by reading skill directories
export function getInstalledSkills(): Skill[] {
  const skills: Skill[] = [];

  // Check common skill locations
  const skillDirs = [
    '/data/.npm-global/lib/node_modules/openclaw/skills',
    '/data/.openclaw/skills',
  ];

  for (const dir of skillDirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const skillMd = path.join(dir, entry, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          const content = fs.readFileSync(skillMd, 'utf-8');
          // Extract description from first paragraph or heading
          const lines = content.split('\n').filter(Boolean);
          let description = '';
          for (const line of lines) {
            if (!line.startsWith('#') && !line.startsWith('---') && line.trim()) {
              description = line.trim();
              break;
            }
          }

          skills.push({
            name: entry,
            description: description || 'No description',
            location: path.join(dir, entry),
            source: dir.includes('.npm-global') ? 'built-in' : 'custom',
          });
        }
      }
    } catch { /* ignore */ }
  }

  // Check extension skills
  const extDir = '/data/.openclaw/extensions';
  try {
    if (fs.existsSync(extDir)) {
      const entries = fs.readdirSync(extDir);
      for (const entry of entries) {
        const skillsSubDir = path.join(extDir, entry, 'skills');
        if (fs.existsSync(skillsSubDir)) {
          const subSkills = fs.readdirSync(skillsSubDir);
          for (const sub of subSkills) {
            const skillMd = path.join(skillsSubDir, sub, 'SKILL.md');
            if (fs.existsSync(skillMd)) {
              const content = fs.readFileSync(skillMd, 'utf-8');
              const lines = content.split('\n').filter(Boolean);
              let description = '';
              for (const line of lines) {
                if (!line.startsWith('#') && !line.startsWith('---') && line.trim()) {
                  description = line.trim();
                  break;
                }
              }
              skills.push({
                name: sub,
                description: description || 'No description',
                location: path.join(skillsSubDir, sub),
                source: 'extension',
              });
            }
          }
        }
      }
    }
  } catch { /* ignore */ }

  return skills;
}

// Search ClawHub for available skills
export function searchSkills(query?: string): { success: boolean; output?: string; error?: string } {
  try {
    const cmd = query ? `clawhub search "${query}"` : 'clawhub search';
    const output = execSync(cmd, { timeout: 15000, encoding: 'utf-8' });
    return { success: true, output };
  } catch (err: any) {
    return { success: false, error: err.stderr || err.message };
  }
}

// Install a skill from ClawHub
export function installSkill(name: string): { success: boolean; output?: string; error?: string } {
  try {
    const output = execSync(`clawhub install ${name}`, { timeout: 30000, encoding: 'utf-8' });
    return { success: true, output };
  } catch (err: any) {
    return { success: false, error: err.stderr || err.message };
  }
}
