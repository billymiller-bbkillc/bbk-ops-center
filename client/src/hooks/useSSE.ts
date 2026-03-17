import { useEffect, useRef, useCallback } from 'react';

type SSEHandler = (data: unknown) => void;

export function useSSE(handlers: Record<string, SSEHandler>) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const es = new EventSource('/api/sse/stream');
    eventSourceRef.current = es;

    es.addEventListener('agent-update', (e) => {
      handlersRef.current['agent-update']?.(JSON.parse(e.data));
    });

    es.addEventListener('health-update', (e) => {
      handlersRef.current['health-update']?.(JSON.parse(e.data));
    });

    es.addEventListener('cost-update', (e) => {
      handlersRef.current['cost-update']?.(JSON.parse(e.data));
    });

    es.addEventListener('task-update', (e) => {
      handlersRef.current['task-update']?.(JSON.parse(e.data));
    });

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
