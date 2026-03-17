import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { cn, getPriorityColor } from '@/lib/utils';
import type { Task, TaskColumn, TaskPriority } from '@shared/types';
import { Plus, Calendar, User, Building2, GripVertical, X, Trash2 } from 'lucide-react';

const COLUMNS: { id: TaskColumn; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'text-muted-foreground' },
  { id: 'todo', label: 'To Do', color: 'text-status-info' },
  { id: 'in_progress', label: 'In Progress', color: 'text-status-warning' },
  { id: 'review', label: 'Review', color: 'text-purple-400' },
  { id: 'done', label: 'Done', color: 'text-status-healthy' },
];

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDelete: (taskId: string) => void;
}

function TaskCard({ task, onDragStart, onDelete }: TaskCardProps) {
  const priorityColors: Record<TaskPriority, string> = {
    critical: 'border-l-status-critical',
    high: 'border-l-orange-400',
    medium: 'border-l-status-warning',
    low: 'border-l-status-info',
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={cn(
        'group bg-card border border-border rounded-md p-3 cursor-grab active:cursor-grabbing',
        'hover:border-primary/30 transition-all border-l-2',
        priorityColors[task.priority]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{task.title}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-muted-foreground transition-opacity p-0.5 rounded"
            title="Delete task"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <GripVertical className="w-3 h-3 text-muted-foreground mt-0.5" />
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <Badge
          variant={task.priority === 'critical' ? 'error' : task.priority === 'high' ? 'warning' : 'secondary'}
          className="text-[10px]"
        >
          {task.priority}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          <Building2 className="w-2.5 h-2.5 mr-1" />
          {task.businessUnit}
        </Badge>
      </div>

      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
        {task.assignee && (
          <div className="flex items-center gap-1">
            <User className="w-2.5 h-2.5" />
            {task.assignee}
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {task.dueDate}
          </div>
        )}
      </div>
    </div>
  );
}

interface CreateTaskFormProps {
  column: TaskColumn;
  onSubmit: (task: Partial<Task>) => void;
  onCancel: () => void;
}

function CreateTaskForm({ column, onSubmit, onCancel }: CreateTaskFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  return (
    <div className="bg-card border border-border rounded-md p-3 space-y-2">
      <input
        type="text"
        placeholder="Task title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-transparent border-none text-sm focus:outline-none placeholder:text-muted-foreground"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="bg-muted text-xs rounded px-2 py-1 border border-border"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <Button size="sm" className="h-6 text-xs" onClick={() => {
          if (title.trim()) onSubmit({ title, priority, column, businessUnit: 'BBK Holdings' });
        }}>
          Add
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onCancel}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const { data: tasks, setData: setTasks, refetch } = useApi<Task[]>('/api/tasks');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskColumn | null>(null);
  const [creatingInColumn, setCreatingInColumn] = useState<TaskColumn | null>(null);
  const [filterBU, setFilterBU] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const handleDragStart = useCallback((_e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, column: TaskColumn) => {
    e.preventDefault();
    setDragOverColumn(column);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, column: TaskColumn) => {
    e.preventDefault();
    if (!draggedTask) return;

    // Optimistic update
    setTasks(prev => prev?.map(t => t.id === draggedTask ? { ...t, column } : t) || null);

    await fetch(`/api/tasks/${draggedTask}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column, order: 0 }),
    });

    setDraggedTask(null);
    setDragOverColumn(null);
  }, [draggedTask, setTasks]);

  const handleCreateTask = useCallback(async (taskData: Partial<Task>) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    setCreatingInColumn(null);
    refetch();
  }, [refetch]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev?.filter(t => t.id !== taskId) || null);
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
  }, [setTasks]);

  const handleClearAllTasks = useCallback(async () => {
    if (!tasks?.length) return;
    setTasks([]);
    await Promise.all(tasks.map(t => fetch(`/api/tasks/${t.id}`, { method: 'DELETE' })));
  }, [tasks, setTasks]);

  // Get unique business units
  const businessUnits = [...new Set(tasks?.map(t => t.businessUnit) || [])];

  // Filter tasks
  const filtered = tasks?.filter(t => {
    if (filterBU !== 'all' && t.businessUnit !== filterBU) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Task Board</h2>
          <p className="text-sm text-muted-foreground">{tasks?.length || 0} total tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterBU}
            onChange={(e) => setFilterBU(e.target.value)}
            className="bg-muted text-xs rounded-md px-3 py-1.5 border border-border"
          >
            <option value="all">All Units</option>
            {businessUnits.map(bu => <option key={bu} value={bu}>{bu}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-muted text-xs rounded-md px-3 py-1.5 border border-border"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {tasks && tasks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
              onClick={() => { if (confirm('Delete all tasks?')) handleClearAllTasks(); }}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 flex-1 min-h-0">
        {COLUMNS.map(col => {
          const columnTasks = filtered.filter(t => t.column === col.id).sort((a, b) => a.order - b.order);

          return (
            <div
              key={col.id}
              className={cn(
                'flex flex-col rounded-lg bg-muted/30 border border-border p-2',
                dragOverColumn === col.id && 'border-primary/50 bg-primary/5'
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
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                    {columnTasks.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => setCreatingInColumn(col.id)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px]">
                {creatingInColumn === col.id && (
                  <CreateTaskForm
                    column={col.id}
                    onSubmit={handleCreateTask}
                    onCancel={() => setCreatingInColumn(null)}
                  />
                )}
                {columnTasks.map(task => (
                  <TaskCard key={task.id} task={task} onDragStart={handleDragStart} onDelete={handleDeleteTask} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
