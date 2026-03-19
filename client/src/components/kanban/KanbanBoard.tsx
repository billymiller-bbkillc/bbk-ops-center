import React, { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { useSSE } from '@/hooks/useSSE';
import { cn } from '@/lib/utils';
import type { GitHubTask, GitHubTaskStatus, TaskColumn, TaskPriority } from '@shared/types';
import {
  Plus,
  GripVertical,
  Trash2,
  ExternalLink,
  Search,
  GitBranch,
  X,
  Loader2,
  AlertCircle,
  Globe,
  Edit2,
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
  'SalesPipeCRM',
  'bbk-ops-center',
  'clarigo',
  'clawbot',
  'modivaro',
  'nexfolio-launchpad-crm',
  'realforeclosure-bot-files',
  'repo',
  'Billy-Miller-Professional-portfolio',
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

const SUB_STATUSES: { id: GitHubTaskStatus; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'transferring', label: 'Transferring' },
  { id: 'info_needed', label: 'Need More Info' },
];

const SUB_STATUS_BADGE: Record<GitHubTaskStatus, { class: string; label: string } | null> = {
  none: null,
  accepted: { class: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', label: 'Accepted' },
  transferring: { class: 'bg-teal-500/15 text-teal-400 border-teal-500/30', label: 'Transferring' },
  info_needed: { class: 'bg-rose-500/15 text-rose-400 border-rose-500/30', label: 'Need More Info' },
};

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

// ===== Task Card =====
function TaskCard({
  task,
  onDragStart,
  onDelete,
  onEdit,
}: {
  task: GitHubTask;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: GitHubTask) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
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
              onEdit(task);
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-blue-400 text-zinc-500 transition-all p-0.5 rounded"
            title="Edit issue"
          >
            <Edit2 className="w-3 h-3" />
          </button>
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
        {task.subStatus && task.subStatus !== 'none' && SUB_STATUS_BADGE[task.subStatus] && (
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-md border font-medium',
              SUB_STATUS_BADGE[task.subStatus]!.class
            )}
          >
            {SUB_STATUS_BADGE[task.subStatus]!.label}
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

// ===== Create/Edit Task Modal =====
function CreateTaskModal({
  open,
  onOpenChange,
  defaultColumn,
  onCreated,
  editTask,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultColumn: TaskColumn;
  onCreated: () => void;
  editTask?: GitHubTask | null;
}) {
  const isEditMode = !!editTask;
  const [repo, setRepo] = useState(REPOS[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [column, setColumn] = useState<TaskColumn>(defaultColumn);
  const [subStatus, setSubStatus] = useState<GitHubTaskStatus>('none');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when editTask changes
  React.useEffect(() => {
    if (editTask) {
      setRepo(editTask.repo);
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setAssignee(editTask.assignee || '');
      setPriority(editTask.priority);
      setColumn(editTask.column);
      setSubStatus(editTask.subStatus || 'none');
      setError('');
    }
  }, [editTask]);

  const reset = () => {
    setTitle('');
    setDescription('');
    setAssignee('');
    setPriority('medium');
    setColumn(defaultColumn);
    setSubStatus('none');
    setError('');
    setRepo(REPOS[0]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      if (isEditMode) {
        // Edit mode — PATCH existing issue
        const url = `/api/github-tasks/${editTask.repo}/${editTask.issueNumber}`;
        // Build sub-status label
        const subStatusLabelMap: Record<GitHubTaskStatus, string | null> = {
          none: null,
          accepted: 'status:accepted',
          transferring: 'status:transferring',
          info_needed: 'status:info-needed',
        };
        const subStatusLabel = subStatusLabelMap[subStatus];
        const body = {
          title,
          description,
          assignee: assignee || null,
          priority,
          column,
          // Rebuild labels so backend gets a full set (column + priority + subStatus labels preserved)
          labels: [
            ...(editTask.labels || []).filter(
              (l) =>
                !l.startsWith('assignee:') &&
                !Object.keys({ backlog: 1, todo: 1, 'in-progress': 1, review: 1, done: 1 }).includes(l.toLowerCase()) &&
                !l.toLowerCase().startsWith('priority:') &&
                !l.toLowerCase().startsWith('status:')
            ),
            // Column label
            ({ backlog: 'backlog', todo: 'todo', in_progress: 'in-progress', review: 'review', done: 'done' } as Record<TaskColumn, string>)[column],
            // Priority label
            `priority:${priority}`,
            // Sub-status label (if set)
            ...(subStatusLabel ? [subStatusLabel] : []),
          ],
        };
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to update task');
      } else {
        // Create mode
        const url = '/api/github-tasks';
        const body = { repo, title, description, assignee: assignee || null, priority, column, subStatus: subStatus !== 'none' ? subStatus : undefined };
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to create task');
      }

      reset();
      onOpenChange(false);
      setTimeout(() => {
        onCreated();
      }, 1500);
    } catch (err: any) {
      setError(err.message || (isEditMode ? 'Failed to update task' : 'Failed to create task'));
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
            {isEditMode ? 'Edit Task' : 'Create GitHub Issue'}
          </Dialog.Title>

          <div className="space-y-3">
            {isEditMode ? (
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Repository</label>
                <div className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-400 cursor-not-allowed flex items-center gap-1.5">
                  <GitBranch className="w-3 h-3" />
                  {editTask.repo}
                </div>
              </div>
            ) : (
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

            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Status Tag</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value as GitHubTaskStatus)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                >
                  {SUB_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
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
                  {isEditMode ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Save Changes' : 'Create'
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
  const { data: githubTasks, loading, error, refetch, setData: setGhTasks } = useApi<GitHubTask[]>('/api/github-tasks');

  // Live SSE updates — swap task list when server pushes new data
  useSSE({
    'github-task-update': (data) => {
      setGhTasks(data as GitHubTask[]);
    },
  });

  // Drag state
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskColumn | null>(null);

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<TaskColumn>('backlog');
  const [editingTask, setEditingTask] = useState<GitHubTask | null>(null);

  // Filters
  const [filterRepo, setFilterRepo] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterSubStatus, setFilterSubStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter logic
  const filtered = useMemo(() => {
    if (!githubTasks) return [];
    return githubTasks.filter((t) => {
      if (filterRepo !== 'all' && t.repo !== filterRepo) return false;
      if (filterAssignee !== 'all' && t.assignee !== filterAssignee.toLowerCase()) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterSubStatus !== 'all' && (t.subStatus || 'none') !== filterSubStatus) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [githubTasks, filterRepo, filterAssignee, filterPriority, filterSubStatus, searchQuery]);

  // Drag handlers
  const handleDragStart = useCallback((_e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, column: TaskColumn) => {
    e.preventDefault();
    setDragOverColumn(column);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, column: TaskColumn) => {
      e.preventDefault();
      if (!draggedTask) return;

      // Optimistic update
      setGhTasks(
        (prev) => prev?.map((t) => (t.id === draggedTask ? { ...t, column } : t)) || null
      );
      const [repo, issueNumber] = draggedTask.split('/');
      await fetch(`/api/github-tasks/${repo}/${issueNumber}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column }),
      });
      // Refetch after a short delay to get accurate state
      setTimeout(refetch, 1000);

      setDraggedTask(null);
      setDragOverColumn(null);
    },
    [draggedTask, setGhTasks, refetch]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setGhTasks((prev) => prev?.filter((t) => t.id !== id) || null);
      const [repo, issueNumber] = id.split('/');
      await fetch(`/api/github-tasks/${repo}/${issueNumber}`, { method: 'DELETE' });
    },
    [setGhTasks]
  );

  const openCreateModal = (column: TaskColumn) => {
    setEditingTask(null);
    setCreateColumn(column);
    setCreateOpen(true);
  };

  const openEditModal = (task: GitHubTask) => {
    setEditingTask(task);
    setCreateColumn(task.column);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Kanban Board</h2>
          <p className="text-sm text-zinc-500">
            {githubTasks?.length || 0} active GitHub issues
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
          value={filterRepo}
          onChange={(e) => setFilterRepo(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-600 text-zinc-300"
        >
          <option value="all">All Repos</option>
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

        <select
          value={filterSubStatus}
          onChange={(e) => setFilterSubStatus(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-600 text-zinc-300"
        >
          <option value="all">All Statuses</option>
          {SUB_STATUSES.filter((s) => s.id !== 'none').map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        {(filterRepo !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all' || filterSubStatus !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setFilterRepo('all');
              setFilterAssignee('all');
              setFilterPriority('all');
              setFilterSubStatus('all');
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
          <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={refetch}>
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
            const columnTasks = filtered.filter((t) => t.column === col.id);

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
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={handleDragStart}
                      onDelete={handleDelete}
                      onEdit={openEditModal}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Task Modal */}
      <CreateTaskModal
        open={createOpen}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditingTask(null); }}
        defaultColumn={createColumn}
        onCreated={refetch}
        editTask={editingTask}
      />
    </div>
  );
}
