import { useEffect } from 'react';
import { useExplorerStore } from '../store/explorer';
import type { DebtReport, SearchEntry } from '@tech-debt/core';

export function useDebtData() {
  const setReport = useExplorerStore((s) => s.setReport);
  const setLoading = useExplorerStore((s) => s.setLoading);
  const setScanning = useExplorerStore((s) => s.setScanning);

  useEffect(() => {
    let ws: WebSocket | null = null;

    async function fetchReport() {
      setLoading(true);
      try {
        const res = await fetch('/api/report');
        const data = (await res.json()) as DebtReport;
        setReport(data);
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setLoading(false);
      }
    }

    fetchReport();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string) as {
        type: string;
        data?: DebtReport;
      };
      if (message.type === 'scanning') {
        setScanning(true);
      } else if (message.type === 'report-update' && message.data) {
        setReport(message.data);
      }
    };

    ws.onerror = () => {
      // Optional in Vite-only mode
    };

    return () => ws?.close();
  }, [setReport, setLoading, setScanning]);
}

export async function searchApi(query: string): Promise<SearchEntry[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  return res.json() as Promise<SearchEntry[]>;
}

export async function rescan(): Promise<void> {
  await fetch('/api/rescan', { method: 'POST' });
}
