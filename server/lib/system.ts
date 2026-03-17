import fs from 'fs';
import { execSync } from 'child_process';
import type { NodeHealth } from '../../shared/types';

let prevCpuIdle = 0;
let prevCpuTotal = 0;
let cpuPercent = 0;

function parseCpuUsage(): number {
  try {
    const stat = fs.readFileSync('/proc/stat', 'utf-8');
    const cpuLine = stat.split('\n')[0]; // "cpu  user nice system idle iowait irq softirq steal"
    const parts = cpuLine.split(/\s+/).slice(1).map(Number);
    const idle = parts[3] + (parts[4] || 0); // idle + iowait
    const total = parts.reduce((a, b) => a + b, 0);

    if (prevCpuTotal > 0) {
      const deltaTotal = total - prevCpuTotal;
      const deltaIdle = idle - prevCpuIdle;
      cpuPercent = deltaTotal > 0 ? ((deltaTotal - deltaIdle) / deltaTotal) * 100 : 0;
    }

    prevCpuIdle = idle;
    prevCpuTotal = total;

    return Math.round(cpuPercent * 10) / 10;
  } catch {
    // Fallback to loadavg
    try {
      const loadavg = fs.readFileSync('/proc/loadavg', 'utf-8');
      const load1 = parseFloat(loadavg.split(' ')[0]);
      // Approximate: load / nproc * 100
      const nproc = parseInt(execSync('nproc').toString().trim(), 10) || 1;
      return Math.round((load1 / nproc) * 1000) / 10;
    } catch {
      return 0;
    }
  }
}

function parseMemory(): { usedMb: number; totalMb: number; percent: number } {
  try {
    const meminfo = fs.readFileSync('/proc/meminfo', 'utf-8');
    const lines = meminfo.split('\n');
    const values: Record<string, number> = {};

    for (const line of lines) {
      const match = line.match(/^(\w+):\s+(\d+)/);
      if (match) {
        values[match[1]] = parseInt(match[2], 10); // in kB
      }
    }

    const totalKb = values['MemTotal'] || 0;
    const availableKb = values['MemAvailable'] || values['MemFree'] || 0;
    const usedKb = totalKb - availableKb;
    const totalMb = Math.round(totalKb / 1024);
    const usedMb = Math.round(usedKb / 1024);
    const percent = totalKb > 0 ? Math.round((usedKb / totalKb) * 1000) / 10 : 0;

    return { usedMb, totalMb, percent };
  } catch {
    return { usedMb: 0, totalMb: 0, percent: 0 };
  }
}

function parseDisk(): { usedGb: number; totalGb: number; percent: number } {
  try {
    const output = execSync('df / --output=used,size --block-size=1G 2>/dev/null || df / -k').toString();
    const lines = output.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].trim().split(/\s+/);
      // If --block-size=1G worked, parts are in GB
      const usedGb = parseInt(parts[0], 10);
      const totalGb = parseInt(parts[1], 10);
      const percent = totalGb > 0 ? Math.round((usedGb / totalGb) * 1000) / 10 : 0;
      return { usedGb, totalGb, percent };
    }
  } catch { /* ignore */ }
  return { usedGb: 0, totalGb: 0, percent: 0 };
}

function parseUptime(): number {
  try {
    const uptime = fs.readFileSync('/proc/uptime', 'utf-8');
    return Math.floor(parseFloat(uptime.split(' ')[0]));
  } catch {
    return 0;
  }
}

function getHostname(): string {
  try {
    return fs.readFileSync('/etc/hostname', 'utf-8').trim() || execSync('hostname').toString().trim();
  } catch {
    return 'vps-main';
  }
}

export function getNodeHealth(agentCount: number): NodeHealth {
  const cpu = parseCpuUsage();
  const mem = parseMemory();
  const disk = parseDisk();
  const uptime = parseUptime();
  const hostname = getHostname();

  let status: 'healthy' | 'warning' | 'critical' | 'offline' = 'healthy';
  if (cpu > 90 || mem.percent > 90 || disk.percent > 90) status = 'critical';
  else if (cpu > 70 || mem.percent > 75 || disk.percent > 80) status = 'warning';

  return {
    id: 'vps-main',
    name: 'VPS Main',
    hostname,
    status,
    cpuPercent: cpu,
    memoryPercent: mem.percent,
    memoryUsedMb: mem.usedMb,
    memoryTotalMb: mem.totalMb,
    diskPercent: disk.percent,
    diskUsedGb: disk.usedGb,
    diskTotalGb: disk.totalGb,
    uptime,
    lastUpdated: new Date().toISOString(),
    agentCount,
  };
}
