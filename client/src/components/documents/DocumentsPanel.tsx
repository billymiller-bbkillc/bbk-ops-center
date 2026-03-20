import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import type { DocumentItem, DocumentFull, DocumentMeta } from '@shared/types';
import { FileText, Search, X, ArrowLeft, Bot, FolderOpen, Clock } from 'lucide-react';

function MarkdownViewer({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h1>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold mt-3 mb-1 text-blue-400">{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-bold mt-2 mb-1 text-zinc-300">{line.slice(4)}</h3>;
        if (line.startsWith('- ')) return <li key={i} className="text-xs text-zinc-300 ml-4 list-disc">{line.slice(2)}</li>;
        if (line.startsWith('```')) return <hr key={i} className="border-zinc-700 my-1" />;
        if (line.match(/^\|/)) return <p key={i} className="text-xs text-zinc-400 font-mono">{line}</p>;
        if (line.trim() === '') return <div key={i} className="h-2" />;
        return <p key={i} className="text-xs text-zinc-400 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DocumentsPanel() {
  const { data: meta } = useApi<DocumentMeta>('/api/documents/meta/categories');
  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('q', search);
  if (filterAgent !== 'all') queryParams.set('agent', filterAgent);
  if (filterCategory !== 'all') queryParams.set('category', filterCategory);

  const { data: docs, loading } = useApi<DocumentItem[]>(
    `/api/documents?${queryParams.toString()}`,
    [search, filterAgent, filterCategory]
  );

  const { data: fullDoc } = useApi<DocumentFull>(
    viewingDoc ? `/api/documents/${viewingDoc}` : '/api/documents/meta/categories',
    [viewingDoc]
  );

  // If viewing a document, show full view
  if (viewingDoc && fullDoc && 'content' in fullDoc) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setViewingDoc(null)} className="gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Documents
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">{fullDoc.title}</CardTitle>
              <Badge variant="outline" className="text-[10px]">{fullDoc.category}</Badge>
              <Badge variant="outline" className="text-[10px] capitalize">{fullDoc.agent}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{fullDoc.filename} · {(fullDoc.sizeBytes / 1024).toFixed(1)}KB · Modified {timeAgo(fullDoc.modifiedAt)}</p>
          </CardHeader>
          <CardContent>
            <MarkdownViewer content={fullDoc.content} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Documents</h2>
        <p className="text-sm text-muted-foreground">{meta?.totalDocs || 0} documents across {meta?.agents?.length || 0} workspaces</p>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-8 pr-8 py-1.5 text-xs w-64 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"><X className="w-3 h-3" /></button>}
        </div>
        <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none text-zinc-300">
          <option value="all">All Agents</option>
          {meta?.agents?.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none text-zinc-300">
          <option value="all">All Categories</option>
          {meta?.categories?.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || filterAgent !== 'all' || filterCategory !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterAgent('all'); setFilterCategory('all'); }}
            className="text-xs text-zinc-500 hover:text-zinc-300">Clear filters</button>
        )}
      </div>

      {/* Document list */}
      <div className="space-y-2">
        {docs?.map(doc => (
          <Card key={doc.id} className="cursor-pointer hover:border-zinc-600 transition-colors" onClick={() => setViewingDoc(doc.id)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-sm font-medium truncate">{doc.title}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-2 ml-6">{doc.preview}</p>
                  <div className="flex items-center gap-3 mt-2 ml-6">
                    <Badge variant="outline" className="text-[10px]">{doc.category}</Badge>
                    <span className="text-[10px] text-muted-foreground capitalize flex items-center gap-1"><Bot className="w-3 h-3" />{doc.agent}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(doc.modifiedAt)}</span>
                    <span className="text-[10px] text-muted-foreground">{(doc.sizeBytes / 1024).toFixed(1)}KB</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!docs || docs.length === 0) && !loading && (
        <Card><CardContent className="py-8 text-center">
          <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No documents found</p>
        </CardContent></Card>
      )}
    </div>
  );
}
