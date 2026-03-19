import React, { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import type { Task, GitHubTask, TaskColumn, TaskPriority } from '@shared/types';
import {
  Plus,
  User,
  GripVertical,
  Trash2,
  ExternalLink,
  Search,
  GitBranch,
  X,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  Globe,
  HardDrive,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

// ===== Constants =====
const COLUMNS: { id: TaskColumn; label: string; color: string; bg: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'text-zinc-400', bg: 'bg-zinc-500/20' },
  { id: 'todo', label: 'To Do', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { id: 'in_progress', label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { id: 'review', label: 'Review', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { id: 'done', label: 'Done', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
];

const ASSIGNEES = ['Billy', 'Ashley', 'Basil', 'Bo', 'Bubba', 'Butter', 'Kosi', 'Maria', 'Sophie', 'Woody'];

const REPOS = [
  'Billy-Miller-Professional-portfolio',
  'SalesPipeCRM',
  'bbk-ops-center',
  'clarigo',
  'clawbot',
  'modivaro',
  'nexfolio-launchpad-crm',
  'realforeclosure-bot-files',
  'repo',
];

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-400',
  medium: 'border-l-amber-400',
  low: 'border-l-blue-400',
};

const PRIORITY_BADGE: Record<TaskPriority, { class: string; label: string }> = {
  critical: { class: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Critical' },
  high: { class: 'bg-orange-500/15 text-orange-400 border-orange-500/30', label: 'High' },
  medium: { class: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Medium' },
  low: { class: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: 'Low' },
};

type TaskSource = 'github' | 'local';

// Unified wrapper so both types can live in the same list
interface UnifiedTask {
  source: TaskSource;
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  column: TaskColumn;
  assignee: string | null;
  updatedAt: string;
  // GitHub-specific
  repo?: string;
  issueNumber?: number;
  url?: string;
  labels?: string[];
  assignees?: string[];
  // Local-specific
  businessUnit?: string;
  order?: number;
  createdAt?: string;
  dueDate?: string | null;
}

function toUnifiedGitHub(t: GitHubTask): UnifiedTask {
  return { source: 'github', ...t };
}

function toUnifiedLocal(t: Task): UnifiedTask {
  return { source: 'local', ...t };
}

// ===== Utility =====
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ===== GitHub Task Card =====
function GitHubTaskCard({
  task,
  onDragStart,
  onDelete,
}: {
  task: UnifiedTask;
  onDragStart: (e: React.DragEvent, id: string, source: TaskSource) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id, 'github')}
      className={cn(
        'group bg-zinc-900/60 border border-zinc-700/50 rounded-xl p-3 cursor-grab active:cursor-grabbing',
        'hover:border-zinc-600 transition-all duration-200 border-l-[3px]',
        PRIORITY_BORDER[task.priority]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium leading-tight hover:text-blue-400 transition-colors flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {task.title}
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
        </a>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Close this issue?')) onDelete(task.id);
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-zinc-500 transition-all p-0.5 rounded"
            title="Close issue"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <GripVertical className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-60" />
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-0.5">
          <GitBranch className="w-2.5 h-2.5" />
          GitHub
        </span>
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-md border font-medium',
            PRIORITY_BADGE[task.priority].class
          )}
        >
          {PRIORITY_BADGE[task.priority].label}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50 flex items-center gap-1">
          <GitBranch className="w-2.5 h-2.5" />
          {task.repo}
        </span>
      </div>

      <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500">
        {task.assignee && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300">
              {capitalize(task.assignee).charAt(0)}
            </div>
            <span>{capitalize(task.assignee)}</span>
          </div>
        )}
        <span className="ml-auto">{timeAgo(task.updatedAt)}</span>
      </div>
    </div>
  );
}

// ===== Local Task Card =====
function LocalTaskCard({
  task,
  onDragStart,
  onDelete,
  onMigrateToGitHub,
}: {
  task: UnifiedTask;
  onDragStart: (e: React.DragEvent, id: string, source: TaskSource) => void;
  onDelete: (id: string) => void;
  onMigrateToGitHub: (task: UnifiedTask) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id, 'local')}
      className={cn(
        'group bg-zinc-900/60 border border-zinc-700/50 rounded-xl p-3 cursor-grab active:cursor-grabbing',
        'hover:border-zinc-600 transition-all duration-200 border-l-[3px]',
        PRIORITY_BORDER[task.priority]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{task.title}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMigrateToGitHub(task);
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-emerald-400 text-zinc-500 transition-all p-0.5 rounded"
            title="Migrate to GitHub Issue"
          >
            <ArrowUpRight className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this task?')) onDelete(task.id);
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-zinc-500 transition-all p-0.5 rounded"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <GripVertical className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-60" />
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/30 font-medium flex items-center gap-0.5">
          <HardDrive className="w-2.5 h-2.5" />
          Local
        </span>
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-md border font-medium',
            PRIORITY_BADGE[task.priority].class
          )}
        >
          {PRIORITY_BADGE[task.priority].label}
        </span>
        {task.businessUnit && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            {task.businessUnit}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500">
        {task.assignee && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300">
              {capitalize(task.assignee).charAt(0)}
            </div>
            <span>{capitalize(task.assignee)}</span>
          </div>
        )}
        <span className="ml-auto">{timeAgo(task.updatedAt)}</span>
      </div>
    </div>
  );
}

// ===== Migrate to GitHub Modal =====
function MigrateToGitHubModal({
  open,
  onOpenChange,
  task,
  onMigrated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: UnifiedTask | null;
  onMigrated: () => void;
}) {
  const [repo, setRepo] = useState(REPOS[1]); // Default to SalesPipeCRM
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleMigrate = async () => {
    if (!task) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${task.id}/migrate-to-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Migration failed');
      onOpenChange(false);
      setTimeout(() => onMigrated(), 1500);
    } catch (err: any) {
      setError(err.message || 'Migration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md z-50 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold mb-2">
            Migrate to GitHub Issue
          </Dialog.Title>
          <p className="text-sm text-zinc-400 mb-4">
            This will create a GitHub issue and delete the local task.
          </p>

          {task && (
            <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium">{task.title}</p>
              {task.description && (
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Target Repository</label>
            <select
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
            >
              {REPOS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-3">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" className="text-zinc-400">
                Cancel
              </Button>
            </Dialog.Close>
            <Button size="sm" onClick={handleMigrate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />
                  Migrate
                </>
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ===== Create Task Modal =====
function CreateTaskModal({
  open,
  onOpenChange,
  defaultColumn,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultColumn: TaskColumn;
  onCreated: () => void;
}) {
  const [taskSource, setTaskSource] = useState<TaskSource>('github');
  const [repo, setRepo] = useState(REPOS[1]); // Default to SalesPipeCRM
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [column, setColumn] = useState<TaskColumn>(defaultColumn);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setAssignee('');
    setPriority('medium');
    setColumn(defaultColumn);
    setError('');
    setRepo(REPOS[1]);
    setTaskSource('github');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const url = taskSource === 'github' ? '/api/github-tasks' : '/api/tasks';
      const body =
        taskSource === 'github'
          ? { repo, title, description, assignee: assignee || null, priority, column }
          : {
              title,
              description,
              assignee: assignee || null,
              priority,
              column,
              businessUnit: 'BBK Holdings',
            };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to create task');

      reset();
      onOpenChange(false);
      setTimeout(() => onCreated(), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md z-50 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold mb-4">
            Create Task
          </Dialog.Title>

          <div className="space-y-3">
            {/* Source selector */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Task Type</label>
              <div className="flex items-center gap-1 bg-zinc-800/50 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setTaskSource('github')}
                  className={cn(
                    'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                    taskSource === 'github'
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-300'
                  )}
                >
                  <GitBranch className="w-3 h-3" />
                  GitHub Issue
                </button>
                <button
                  type="button"
                  onClick={() => setTaskSource('local')}
                  className={cn(
                    'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                    taskSource === 'local'
                      ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-300'
                  )}
                >
                  <HardDrive className="w-3 h-3" />
                  Local Task
                </button>
              </div>
            </div>

            {taskSource === 'github' && (
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Repository</label>
                <select
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                >
                  {REPOS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Markdown supported..."
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Assignee</label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                >
                  <option value="">Unassigned</option>
                  {ASSIGNEES.map((a) => (
                    <option key={a} value={a.toLowerCase()}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{capitalize(p)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Column</label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value as TaskColumn)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" className="text-zinc-400">
                Cancel
              </Button>
            </Dialog.Close>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ===== Main Kanban Board =====
export function KanbanBoard() {
  // Data fetching — both sources simultaneously
  const {
    data: githubTasks,
    loading: ghLoading,
    error: ghError,
    refetch: ghRefetch,
    setData: setGhTasks,
  } = useApi<GitHubTask[]>('/api/github-tasks');

  const {
    data: localTasks,
    loading: localLoading,
    error: localError,
    refetch: localRefetch,
    setData: setLocalTasks,
  } = useApi<Task[]>('/api/tasks');

  // Drag state
  const [draggedTask, setDraggedTask] = useState<{ id: string; source: TaskSource } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskColumn | null>(null);

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<TaskColumn>('backlog');

  // Migrate modal
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [migrateTask, setMigrateTask] = useState<UnifiedTask | null>(null);

  // Filters
  const [filterSource, setFilterSource] = useState('all');
  const [filterRepo, setFilterRepo] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loading = ghLoading || localLoading;
  const error = ghError || localError;

  const refetchAll = useCallback(() => {
    ghRefetch();
    localRefetch();
  }, [ghRefetch, localRefetch]);

  // Unified + filtered task list
  const unifiedTasks = useMemo(() => {
    const ghUnified = (githubTasks || []).map(toUnifiedGitHub);
    const localUnified = (localTasks || []).map(toUnifiedLocal);
    const all = [...ghUnified, ...localUnified];

    return all.filter((t) => {
      if (filterSource === 'github' && t.source !== 'github') return false;
      if (filterSource === 'local' && t.source !== 'local') return false;
      if (filterRepo !== 'all') {
        if (filterRepo === '__local__') {
          if (t.source !== 'local') return false;
        } else {
          if (t.source !== 'github' || t.repo !== filterRepo) return false;
        }
      }
      if (filterAssignee !== 'all' && t.assignee !== filterAssignee.toLowerCase()) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [githubTasks, localTasks, filterSource, filterRepo, filterAssignee, filterPriority, searchQuery]);

  const totalCount = (githubTasks?.length || 0) + (localTasks?.length || 0);

  // Drag handlers
  const handleDragStart = useCallback((_e: React.DragEvent, taskId: string, source: TaskSource) => {
    setDraggedTask({ id: taskId, source });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, column: TaskColumn) => {
    e.preventDefault();
    setDragOverColumn(column);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, column: TaskColumn) => {
      e.preventDefault();
      if (!draggedTask) return;

      const { id, source } = draggedTask;

      if (source === 'github') {
        setGhTasks(
          (prev) => prev?.map((t) => (t.id === id ? { ...t, column } : t)) || null
        );
        const [repo, issueNumber] = id.split('/');
        await fetch(`/api/github-tasks/${repo}/${issueNumber}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column }),
        });
        setTimeout(ghRefetch, 1000);
      } else {
        setLocalTasks(
          (prev) => prev?.map((t) => (t.id === id ? { ...t, column } : t)) || null
        );
        await fetch(`/api/tasks/${id}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column, order: 0 }),
        });
      }

      setDraggedTask(null);
      setDragOverColumn(null);
    },
    [draggedTask, setGhTasks, setLocalTasks, ghRefetch]
  );

  const handleDeleteGitHub = useCallback(
    async (id: string) => {
      setGhTasks((prev) => prev?.filter((t) => t.id !== id) || null);
      const [repo, issueNumber] = id.split('/');
      await fetch(`/api/github-tasks/${repo}/${issueNumber}`, { method: 'DELETE' });
    },
    [setGhTasks]
  );

  const handleDeleteLocal = useCallback(
    async (id: string) => {
      setLocalTasks((prev) => prev?.filter((t) => t.id !== id) || null);
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    },
    [setLocalTasks]
  );

  const handleMigrateToGitHub = useCallback((task: UnifiedTask) => {
    setMigrateTask(task);
    setMigrateOpen(true);
  }, []);

  const openCreateModal = (column: TaskColumn) => {
    setCreateColumn(column);
    setCreateOpen(true);
  };

  const hasActiveFilters = filterSource !== 'all' || filterRepo !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all' || searchQuery;

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Task Board</h2>
          <p className="text-sm text-zinc-500">
            {totalCount} total tasks
            <span className="mx-1.5">·</span>
            <span className="text-emerald-500">{githubTasks?.length || 0} GitHub</span>
            <span className="mx-1.5">·</span>
            <span className="text-violet-400">{localTasks?.length || 0} Local</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => openCreateModal('backlog')}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <select
          value={filterSource}
          onChange={(e) => {
            setFilterSource(e.target.value);
            if (e.target.value === 'local') setFilterRepo('all');
          }}
          className="bg-zinc-800/50 border border-zinc-700/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-600 text-zinc-300"
        >
          <option value="all">All Sources</option>
          <option value="github">GitHub Only</option>
          <option value="local">Local Only</option>
        </select>

        <select
          value={filterRepo}
          onChange={(e) => setFilterRepo(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-600 text-zinc-300"
        >
          <option value="all">All Repos / Local</option>
          <option value="__local__">Local Tasks</option>
          {REPOS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-600 text-zinc-300"
        >
          <option value="all">All Assignees</option>
          {ASSIGNEES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-600 text-zinc-300"
        >
          <option value="all">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{capitalize(p)}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setFilterSource('all');
              setFilterRepo('all');
              setFilterAssignee('all');
              setFilterPriority('all');
              setSearchQuery('');
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={refetchAll}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="flex items-center justify-center py-12 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading tasks...
        </div>
      )}

      {/* Columns */}
      {!loading && (
        <div className="grid grid-cols-5 gap-3 flex-1 min-h-0">
          {COLUMNS.map((col) => {
            const columnTasks = unifiedTasks
              .filter((t) => t.column === col.id)
              .sort((a, b) => {
                // GitHub tasks first, then local sorted by order
                if (a.source !== b.source) return a.source === 'github' ? -1 : 1;
                if (a.source === 'local' && b.source === 'local') return (a.order || 0) - (b.order || 0);
                return 0;
              });

            return (
              <div
                key={col.id}
                className={cn(
                  'flex flex-col rounded-xl bg-zinc-800/20 border border-zinc-800/50 p-2',
                  dragOverColumn === col.id && 'border-blue-500/40 bg-blue-500/5'
                )}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold uppercase tracking-wider', col.color)}>
                      {col.label}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] rounded-full px-1.5 py-0.5 font-medium',
                        col.bg,
                        col.color
                      )}
                    >
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreateModal(col.id)}
                    className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px]">
                  {columnTasks.map((task) =>
                    task.source === 'github' ? (
                      <GitHubTaskCard
                        key={`gh-${task.id}`}
                        task={task}
                        onDragStart={handleDragStart}
                        onDelete={handleDeleteGitHub}
                      />
                    ) : (
                      <LocalTaskCard
                        key={`local-${task.id}`}
                        task={task}
                        onDragStart={handleDragStart}
                        onDelete={handleDeleteLocal}
                        onMigrateToGitHub={handleMigrateToGitHub}
                      />
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultColumn={createColumn}
        onCreated={refetchAll}
      />

      {/* Migrate to GitHub Modal */}
      <MigrateToGitHubModal
        open={migrateOpen}
        onOpenChange={setMigrateOpen}
        task={migrateTask}
        onMigrated={refetchAll}
      />
    </div>
  );
}
