import { useEffect } from 'react';
import { useExplorerStore, type GitUser } from '../store/explorer';
import type { DebtReport, SearchEntry } from '@tech-debt/core';

export function useDebtData() {
  const setReport = useExplorerStore((s) => s.setReport);
  const setLoading = useExplorerStore((s) => s.setLoading);
  const setScanning = useExplorerStore((s) => s.setScanning);
  const setGitUser = useExplorerStore((s) => s.setGitUser);
  const showTriaged = useExplorerStore((s) => s.showTriaged);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;

    async function fetchReport() {
      setLoading(true);
      try {
        const [reportRes, meRes] = await Promise.all([
          fetch(reportUrl(showTriaged)),
          fetch('/api/me'),
        ]);
        if (cancelled) return;
        const data = (await reportRes.json()) as DebtReport;
        setReport(data);
        if (meRes.ok) {
          const me = (await meRes.json()) as GitUser;
          setGitUser(me.name || me.email ? me : null);
        }
      } catch (err) {
        console.error('Failed to fetch report:', err);
        if (!cancelled) setLoading(false);
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
        // Server publishes with its current include flag; refetch to match UI toggle.
        void fetch(reportUrl(useExplorerStore.getState().showTriaged))
          .then((res) => res.json())
          .then((data: DebtReport) => setReport(data))
          .catch(() => {
            if (message.data) setReport(message.data);
          });
      }
    };

    ws.onerror = () => {
      // Optional in Vite-only mode
    };

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [setReport, setLoading, setScanning, setGitUser, showTriaged]);
}

function reportUrl(showTriaged: boolean): string {
  return showTriaged ? '/api/report?triaged=1' : '/api/report';
}

export async function searchApi(query: string): Promise<SearchEntry[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  return res.json() as Promise<SearchEntry[]>;
}

export async function rescan(): Promise<void> {
  await fetch('/api/rescan', { method: 'POST' });
}

export async function triageItem(options: {
  itemId: string;
  action: 'dismiss' | 'snooze' | 'restore';
  days?: number;
  note?: string;
  includeTriaged?: boolean;
}): Promise<DebtReport | null> {
  const res = await fetch('/api/triage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  const data = (await res.json()) as {
    ok: boolean;
    report?: DebtReport;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    window.alert(data.error ?? 'Triage failed');
    return null;
  }
  return data.report ?? null;
}
