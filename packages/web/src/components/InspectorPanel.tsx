import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useExplorerStore } from '../store/explorer';
import {
  ageColor,
  ageLabel,
  formatAge,
  kindColor,
  kindLabel,
} from '../utils/format';

export function InspectorPanel() {
  const report = useExplorerStore((s) => s.report);
  const selectedItemId = useExplorerStore((s) => s.selectedItemId);
  const selectItem = useExplorerStore((s) => s.selectItem);

  if (!selectedItemId || !report) return null;

  const item = report.items.find((i) => i.id === selectedItemId);
  if (!item) return null;

  return (
    <aside
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600 }}>Inspector</div>
        <button
          type="button"
          onClick={() => selectItem(null)}
          aria-label="Close"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: kindColor(item.kind),
            background: 'var(--accent-soft)',
            padding: '4px 8px',
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          {kindLabel(item.kind)}
        </div>

        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.4,
            marginBottom: 16,
          }}
        >
          {item.message}
        </h2>

        <Field label="File" mono>
          {item.relativePath}:{item.line}
        </Field>
        <Field label="Age">
          <span style={{ color: ageColor(item.ageBucket) }}>
            {ageLabel(item.ageBucket)}
            {item.blame ? ` · ${formatAge(item.blame.ageDays)}` : ''}
          </span>
        </Field>
        {item.blame && (
          <>
            <Field label="Author">{item.blame.author}</Field>
            {item.blame.authorEmail && (
              <Field label="Email">{item.blame.authorEmail}</Field>
            )}
            <Field label="Committed" mono>
              {new Date(item.blame.committedAt).toLocaleDateString()}
            </Field>
            <Field label="Commit" mono>
              {item.blame.commitHash}
            </Field>
            {item.blame.summary && (
              <Field label="Commit message">{item.blame.summary}</Field>
            )}
          </>
        )}

        {item.context && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 8,
              }}
            >
              Context
            </div>
            <pre
              style={{
                margin: 0,
                padding: 12,
                borderRadius: 8,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                lineHeight: 1.5,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                color: 'var(--text-secondary)',
              }}
            >
              {item.context}
            </pre>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 8,
            }}
          >
            Raw
          </div>
          <code
            style={{
              display: 'block',
              padding: 12,
              borderRadius: 8,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              wordBreak: 'break-all',
              color: 'var(--text-secondary)',
            }}
          >
            {item.raw}
          </code>
        </div>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontFamily: mono ? 'var(--font-mono)' : undefined,
          color: 'var(--text-primary)',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </div>
    </div>
  );
}
