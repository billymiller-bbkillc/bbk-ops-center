import { useEffect, useRef } from 'react';

type SSEHandler = (data: unknown) => void;

const SSE_EVENTS = [
  'agent-update',
  'health-update',
  'cost-update',
  'task-update',
  'crm-update',
  'n8n-update',
  'github-task-update',
] as const;

export function useSSE(handlers: Partial<Record<(typeof SSE_EVENTS)[number], SSEHandler>>) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const es = new EventSource('/api/sse/stream');
    eventSourceRef.current = es;

    // Register a listener for every known event type
    for (const event of SSE_EVENTS) {
      es.addEventListener(event, (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          handlersRef.current[event]?.(parsed);
        } catch {
          // ignore parse errors
        }
      });
    }

    es.addEventListener('connected', () => {
      console.log('SSE connected');
    });

    es.onerror = () => {
      console.warn('SSE connection error, reconnecting...');
    };

    return () => {
      es.close();
    };
  }, []);
}
