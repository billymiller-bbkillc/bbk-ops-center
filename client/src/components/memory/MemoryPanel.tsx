import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import type { MemoryFile, MemoryAgent } from '@shared/types';
import { Brain, Calendar, Bot, ChevronDown, ChevronRight, BookOpen, X } from 'lucide-react';

function MarkdownViewer({ content }: { content: string }) {
  // Simple markdown rendering — headers, bold, lists, code blocks
  const lines = content.split('\n');
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="text-base font-bold mt-4 mb-2">{line.slice(2)}</h1>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold mt-3 mb-1 text-blue-400">{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-bold mt-2 mb-1 text-zinc-300">{line.slice(4)}</h3>;
        if (line.startsWith('- ')) return <li key={i} className="text-xs text-zinc-300 ml-4 list-disc">{line.slice(2)}</li>;
        if (line.startsWith('```')) return <hr key={i} className="border-zinc-700 my-1" />;
        if (line.trim() === '') return <div key={i} className="h-2" />;
        return <p key={i} className="text-xs text-zinc-400 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

export function MemoryPanel() {
  const { data: agents } = useApi<MemoryAgent[]>('/api/memory/agents');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (selectedAgent !== 'all') queryParams.set('agent', selectedAgent);
  if (selectedType !== 'all') queryParams.set('type', selectedType);

  const { data: memories, loading } = useApi<MemoryFile[]>(
    `/api/memory?${queryParams.toString()}`,
    [selectedAgent, selectedType]
  );

  // Group by date
  const grouped = useMemo(() => {
    if (!memories) return [];
    const map = new Map<string, MemoryFile[]>();
    for (const m of memories) {
      const key = m.type === 'long-term' ? 'Long-Term Memory' : m.date;
      const list = map.get(key) || [];
      list.push(m);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [memories]);

  const entryKey = (m: MemoryFile) => `${m.agent}-${m.date}-${m.filename}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Agent Memory</h2>
        <p className="text-sm text-muted-foreground">Daily notes and long-term memory across all bots</p>
      </div>

      {/* Agent summary cards */}
      {agents && agents.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button variant={selectedAgent === 'all' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setSelectedAgent('all')}>All Bots</Button>
          {agents.map(a => (
            <Button key={a.id} variant={selectedAgent === a.id ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1.5" onClick={() => setSelectedAgent(a.id)}>
              <span className="capitalize">{a.id}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1">{a.dailyCount}</Badge>
              {a.hasLongTerm && <Brain className="w-3 h-3 text-purple-400" />}
            </Button>
          ))}
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-1.5">
        {['all', 'daily', 'long-term'].map(t => (
          <Button key={t} variant={selectedType === t ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setSelectedType(t)}>
            {t === 'all' ? 'All' : t === 'daily' ? '📝 Daily Notes' : '🧠 Long-Term'}
          </Button>
        ))}
      </div>

      {/* Memory entries */}
      {grouped.map(([dateGroup, entries]) => (
        <div key={dateGroup}>
          <div className="flex items-center gap-2 mb-2">
            {dateGroup === 'Long-Term Memory' ? (
              <Brain className="w-4 h-4 text-purple-400" />
            ) : (
              <Calendar className="w-4 h-4 text-blue-400" />
            )}
            <h3 className="text-sm font-semibold">{dateGroup}</h3>
            <Badge variant="outline" className="text-[10px]">{entries.length} entries</Badge>
          </div>
          <div className="space-y-2">
            {entries.map(m => {
              const key = entryKey(m);
              const isExpanded = expandedEntry === key;
              return (
                <Card key={key} className="overflow-hidden">
                  <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors text-left" onClick={() => setExpandedEntry(isExpanded ? null : key)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                        {m.agent.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium capitalize">{m.agent}</span>
                          <span className="text-[10px] text-muted-foreground">{m.filename}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate max-w-lg">{m.content.slice(0, 120).replace(/\n/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{(m.sizeBytes / 1024).toFixed(1)}KB</span>
                      {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <CardContent className="border-t border-zinc-800 pt-4 pb-4 max-h-96 overflow-y-auto">
                      <MarkdownViewer content={m.content} />
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {(!memories || memories.length === 0) && !loading && (
        <Card><CardContent className="py-8 text-center">
          <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No memory files found</p>
        </CardContent></Card>
      )}
    </div>
  );
}
