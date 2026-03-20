import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { AuthUser, UserRole, CronJob, Skill, EnvVar } from '@shared/types';
import {
  Settings, Users, Shield, Plus, Trash2, Edit2,
  Loader2, AlertCircle, CheckCircle, Lock, X,
  Clock, Play, Pause, Timer, Package, Key, Eye, EyeOff,
  ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; desc: string }> = {
  admin: { label: 'Admin', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', desc: 'Full access — manage users, settings, approve tasks' },
  operator: { label: 'Operator', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', desc: 'Read/write tasks, view all, approve reviews' },
  viewer: { label: 'Viewer', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30', desc: 'Read-only across all tabs' },
};

// ===== Create User Modal =====
function CreateUserModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const reset = () => { setUsername(''); setPassword(''); setDisplayName(''); setRole('viewer'); setError(''); };
  const handleSubmit = async () => {
    if (!username || !password || !displayName) { setError('All fields required'); return; }
    setSubmitting(true); setError('');
    try {
      const token = localStorage.getItem('ops_token');
      const res = await fetch('/api/auth/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ username, password, displayName, role }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      reset(); onOpenChange(false); onCreated();
    } catch (err: any) { setError(err.message || 'Failed'); }
    finally { setSubmitting(false); }
  };
  return (
    <Dialog.Root open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md z-50 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold mb-4">Create User</Dialog.Title>
          <div className="space-y-3">
            <div><label className="text-xs text-zinc-400 mb-1 block">Username</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500" autoFocus/></div>
            <div><label className="text-xs text-zinc-400 mb-1 block">Display Name</label><input type="text" value={displayName} onChange={e=>setDisplayName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"/></div>
            <div><label className="text-xs text-zinc-400 mb-1 block">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"/></div>
            <div><label className="text-xs text-zinc-400 mb-1 block">Role</label><select value={role} onChange={e=>setRole(e.target.value as UserRole)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"><option value="viewer">Viewer</option><option value="operator">Operator</option><option value="admin">Admin</option></select></div>
            {error && <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"><AlertCircle className="w-3.5 h-3.5 shrink-0"/>{error}</div>}
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild><Button variant="ghost" size="sm">Cancel</Button></Dialog.Close>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>{submitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/>Creating...</> : 'Create User'}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ===== Create Cron Job Modal =====
function CreateCronModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [cronExpr, setCronExpr] = useState('');
  const [tz, setTz] = useState('America/New_York');
  const [message, setMessage] = useState('');
  const [session, setSession] = useState<'isolated' | 'main'>('isolated');
  const [agentId, setAgentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const reset = () => { setName(''); setCronExpr(''); setMessage(''); setAgentId(''); setError(''); };

  const handleSubmit = async () => {
    if (!name || !cronExpr || !message) { setError('Name, schedule, and message required'); return; }
    setSubmitting(true); setError('');
    try {
      const token = localStorage.getItem('ops_token');
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, cron: cronExpr, tz, message, session, agentId: agentId || undefined, announce: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      reset(); onOpenChange(false); setTimeout(onCreated, 1000);
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md z-50 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold mb-4">Create Cron Job</Dialog.Title>
          <div className="space-y-3">
            <div><label className="text-xs text-zinc-400 mb-1 block">Name</label><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="morning-brief" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500" autoFocus/></div>
            <div><label className="text-xs text-zinc-400 mb-1 block">Cron Expression</label><input type="text" value={cronExpr} onChange={e=>setCronExpr(e.target.value)} placeholder="0 7 * * * (every day at 7am)" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-zinc-400 mb-1 block">Timezone</label><input type="text" value={tz} onChange={e=>setTz(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"/></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Session</label><select value={session} onChange={e=>setSession(e.target.value as any)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"><option value="isolated">Isolated</option><option value="main">Main</option></select></div>
            </div>
            <div><label className="text-xs text-zinc-400 mb-1 block">Agent ID (optional)</label><input type="text" value={agentId} onChange={e=>setAgentId(e.target.value)} placeholder="bubba, basil, etc." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"/></div>
            <div><label className="text-xs text-zinc-400 mb-1 block">Message / Prompt</label><textarea value={message} onChange={e=>setMessage(e.target.value)} rows={3} placeholder="What should the agent do?" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 resize-none"/></div>
            {error && <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"><AlertCircle className="w-3.5 h-3.5 shrink-0"/>{error}</div>}
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild><Button variant="ghost" size="sm">Cancel</Button></Dialog.Close>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>{submitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/>Creating...</> : 'Create Job'}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ===== Add Env Var Modal =====
function AddEnvVarModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const reset = () => { setKey(''); setValue(''); setError(''); };
  const handleSubmit = async () => {
    if (!key || !value) { setError('Key and value required'); return; }
    setSubmitting(true); setError('');
    try {
      const token = localStorage.getItem('ops_token');
      const res = await fetch('/api/envvars', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ key, value }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      reset(); onOpenChange(false); onCreated();
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };
  return (
    <Dialog.Root open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md z-50 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold mb-4">Add / Update Environment Variable</Dialog.Title>
          <div className="space-y-3">
            <div><label className="text-xs text-zinc-400 mb-1 block">Key</label><input type="text" value={key} onChange={e=>setKey(e.target.value.toUpperCase())} placeholder="MY_API_KEY" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500" autoFocus/></div>
            <div><label className="text-xs text-zinc-400 mb-1 block">Value</label><input type="text" value={value} onChange={e=>setValue(e.target.value)} placeholder="sk-..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500"/></div>
            {error && <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"><AlertCircle className="w-3.5 h-3.5 shrink-0"/>{error}</div>}
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild><Button variant="ghost" size="sm">Cancel</Button></Dialog.Close>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>{submitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/>Saving...</> : 'Save'}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ===== Collapsible Section =====
function Section({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-accent/30 transition-colors rounded-t-xl">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// ===== Cron Section =====
function CronSection() {
  const { data: cronJobs, refetch } = useApi<CronJob[]>('/api/cron');
  const [createOpen, setCreateOpen] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const handleToggle = async (id: string, enable: boolean) => {
    setToggling(id);
    try {
      const token = localStorage.getItem('ops_token');
      await fetch(`/api/cron/${id}/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ enabled: enable }) });
      setTimeout(refetch, 500);
    } catch {} finally { setToggling(null); }
  };

  const handleRun = async (id: string) => {
    setRunning(id);
    try {
      const token = localStorage.getItem('ops_token');
      await fetch(`/api/cron/${id}/run`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    } catch {} finally { setTimeout(() => setRunning(null), 2000); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete cron job "${name}"?`)) return;
    const token = localStorage.getItem('ops_token');
    await fetch(`/api/cron/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    refetch();
  };

  const formatNext = (ms?: number) => { if (!ms) return '—'; const d = new Date(ms); return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const formatDuration = (ms?: number) => { if (!ms) return '—'; if (ms < 1000) return `${ms}ms`; if (ms < 60000) return `${(ms/1000).toFixed(1)}s`; return `${Math.floor(ms/60000)}m ${Math.round((ms%60000)/1000)}s`; };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{cronJobs?.length || 0} scheduled jobs</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={refetch} className="h-7"><RefreshCw className="w-3 h-3" /></Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="h-7"><Plus className="w-3 h-3 mr-1" />New Job</Button>
        </div>
      </div>
      <div className="space-y-2">
        {cronJobs?.map(job => (
          <div key={job.id} className={cn('border rounded-lg p-3 transition-colors', job.enabled ? 'border-zinc-700/50 bg-zinc-900/40' : 'border-zinc-800/50 bg-zinc-900/20 opacity-60')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', job.enabled ? 'bg-emerald-400' : 'bg-zinc-600')} />
                <span className="text-sm font-medium">{job.name}</span>
                {job.agentId && <Badge variant="outline" className="text-[10px]">{job.agentId}</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRun(job.id)} disabled={running === job.id} title="Run now">
                  {running === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggle(job.id, !job.enabled)} disabled={toggling === job.id} title={job.enabled ? 'Disable' : 'Enable'}>
                  {toggling === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : job.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-400" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-400" onClick={() => handleDelete(job.id, job.name)} title="Delete">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
              <span className="font-mono">{job.schedule.expr || job.schedule.at || `${job.schedule.every}ms`}</span>
              {job.schedule.tz && <span>{job.schedule.tz}</span>}
              <span>Next: {formatNext(job.state?.nextRunAtMs)}</span>
              {job.state?.lastRunStatus && (
                <span className={job.state.lastRunStatus === 'ok' ? 'text-emerald-400' : 'text-red-400'}>
                  Last: {job.state.lastRunStatus} ({formatDuration(job.state.lastDurationMs)})
                </span>
              )}
            </div>
            {job.payload.message && <p className="text-[10px] text-zinc-500 mt-1 truncate">{job.payload.message.slice(0, 120)}...</p>}
          </div>
        ))}
        {(!cronJobs || cronJobs.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">No cron jobs configured</p>}
      </div>
      <CreateCronModal open={createOpen} onOpenChange={setCreateOpen} onCreated={refetch} />
    </>
  );
}

// ===== Skills Section =====
function SkillsSection() {
  const { data: skills, refetch } = useApi<Skill[]>('/api/skills');

  const sourceColor = (source?: string) => {
    if (source === 'built-in') return 'text-blue-400 bg-blue-500/15 border-blue-500/30';
    if (source === 'extension') return 'text-purple-400 bg-purple-500/15 border-purple-500/30';
    return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{skills?.length || 0} installed skills</p>
        <Button variant="ghost" size="sm" onClick={refetch} className="h-7"><RefreshCw className="w-3 h-3" /></Button>
      </div>
      <div className="space-y-2">
        {skills?.map(skill => (
          <div key={skill.name} className="flex items-center justify-between border border-zinc-700/50 rounded-lg p-3 bg-zinc-900/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{skill.name}</span>
                <Badge variant="outline" className={cn('text-[10px]', sourceColor(skill.source))}>{skill.source}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-md">{skill.description}</p>
            </div>
          </div>
        ))}
        {(!skills || skills.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">No skills found</p>}
      </div>
    </>
  );
}

// ===== Env Vars Section =====
function EnvVarsSection() {
  const { data: envVars, refetch } = useApi<EnvVar[]>('/api/envvars');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const handleReveal = async (key: string) => {
    if (revealedKeys.has(key)) {
      setRevealedKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
      return;
    }
    try {
      const token = localStorage.getItem('ops_token');
      const res = await fetch(`/api/envvars?reveal=true`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        const revealed = json.data.find((v: EnvVar) => v.key === key);
        if (revealed) {
          setRevealedKeys(prev => new Set(prev).add(key));
        }
      }
    } catch {}
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete env var "${key}"? The application may need a restart.`)) return;
    setDeletingKey(key);
    try {
      const token = localStorage.getItem('ops_token');
      await fetch(`/api/envvars/${key}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      refetch();
    } catch {} finally { setDeletingKey(null); }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{envVars?.length || 0} variables</p>
        <Button size="sm" onClick={() => setAddOpen(true)} className="h-7"><Plus className="w-3 h-3 mr-1" />Add Variable</Button>
      </div>
      <div className="space-y-1">
        {envVars?.map(v => (
          <div key={v.key} className="flex items-center justify-between border border-zinc-700/50 rounded-lg px-3 py-2 bg-zinc-900/40">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-mono font-medium text-amber-400 shrink-0">{v.key}</span>
              <span className="text-xs font-mono text-muted-foreground truncate">
                {revealedKeys.has(v.key) ? v.value || v.masked : v.masked}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReveal(v.key)} title={revealedKeys.has(v.key) ? 'Hide' : 'Reveal'}>
                {revealedKeys.has(v.key) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-400" onClick={() => handleDelete(v.key)} disabled={deletingKey === v.key} title="Delete">
                {deletingKey === v.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">⚠️ Changes to env vars require a server restart to take effect.</p>
      <AddEnvVarModal open={addOpen} onOpenChange={setAddOpen} onCreated={refetch} />
    </>
  );
}

// ===== Main Settings Panel =====
export function SettingsPanel() {
  const { user: currentUser, isAdmin } = useAuth();
  const { data: users, refetch: refetchUsers } = useApi<AuthUser[]>('/api/auth/users');
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    setDeletingId(userId);
    try {
      const token = localStorage.getItem('ops_token');
      await fetch(`/api/auth/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      refetchUsers();
    } catch {} finally { setDeletingId(null); }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-lg font-semibold tracking-tight">Settings</h2><p className="text-sm text-muted-foreground">Admin access required</p></div>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3 text-muted-foreground"><Lock className="w-5 h-5" /><div><p className="text-sm font-medium">Restricted Access</p><p className="text-xs">Signed in as <strong>{currentUser?.displayName}</strong> ({currentUser?.role})</p></div></div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-semibold tracking-tight">Settings</h2><p className="text-sm text-muted-foreground">System configuration and administration</p></div>

      {/* RBAC */}
      <Section title="Access Control (RBAC)" icon={Shield} defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {Object.entries(ROLE_CONFIG).map(([role, config]) => (
            <div key={role} className={cn('border rounded-lg p-3', config.bg)}>
              <span className={cn('text-sm font-semibold', config.color)}>{config.label}</span>
              <p className="text-xs text-muted-foreground mt-1">{config.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* User Management */}
      <Section title={`User Management (${users?.length || 0} users)`} icon={Users} defaultOpen>
        <div className="flex justify-end mb-3"><Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5 mr-1.5"/>Add User</Button></div>
        <div className="divide-y divide-border">
          {users?.map(u => {
            const rc = ROLE_CONFIG[u.role]; const isMe = u.id === currentUser?.id;
            return (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">{u.displayName.charAt(0).toUpperCase()}</div>
                  <div><div className="flex items-center gap-2"><span className="text-sm font-medium">{u.displayName}</span>{isMe && <span className="text-[10px] text-muted-foreground">(you)</span>}</div><span className="text-xs text-muted-foreground">@{u.username}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('text-[10px]', rc.color, rc.bg)}>{rc.label}</Badge>
                  {!isMe && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => handleDeleteUser(u.id, u.username)} disabled={deletingId === u.id}>{deletingId === u.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Trash2 className="w-3 h-3"/>}</Button>}
                </div>
              </div>
            );
          })}
        </div>
        <CreateUserModal open={createOpen} onOpenChange={setCreateOpen} onCreated={refetchUsers} />
      </Section>

      {/* Aegis */}
      <Section title="Aegis Quality Gates" icon={CheckCircle}>
        <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div><p className="text-sm font-medium text-emerald-400">Review → Done Gate</p><p className="text-xs text-muted-foreground">Tasks in Review require Admin/Operator approval</p></div>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">Active</Badge>
        </div>
      </Section>

      {/* Cron Jobs */}
      <Section title="Cron Scheduler" icon={Clock}>
        <CronSection />
      </Section>

      {/* Skills */}
      <Section title="Skills Hub" icon={Package}>
        <SkillsSection />
      </Section>

      {/* Env Vars */}
      <Section title="Environment Variables" icon={Key}>
        <EnvVarsSection />
      </Section>
    </div>
  );
}
