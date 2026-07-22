import { ExternalLink, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { triageItem } from '../hooks/useDebtData'
import { useExplorerStore } from '../store/explorer'
import {
  ageColor,
  ageLabel,
  formatAge,
  kindColor,
  kindLabel,
} from '../utils/format'
import { openFileInEditor } from '../utils/openEditor'

export function InspectorPanel() {
  const report = useExplorerStore((s) => s.report)
  const selectedItemId = useExplorerStore((s) => s.selectedItemId)
  const showTriaged = useExplorerStore((s) => s.showTriaged)
  const selectItem = useExplorerStore((s) => s.selectItem)
  const setReport = useExplorerStore((s) => s.setReport)

  if (!selectedItemId || !report) return null

  const item = report.items.find((i) => i.id === selectedItemId)
  if (!item) return null

  return (
    <aside
      className="panel"
      style={{
        width: 328,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'riseIn 0.22s ease both',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 18px 8px',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 650,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Inspector
        </div>
        <button
          type="button"
          onClick={() => selectItem(null)}
          aria-label="Close"
          style={{
            border: 'none',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: '8px 18px 20px', overflow: 'auto', flex: 1 }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: kindColor(item.kind),
            background: 'var(--bg-tertiary)',
            padding: '5px 9px',
            borderRadius: 7,
            marginBottom: 14,
            letterSpacing: '0.03em',
          }}
        >
          {kindLabel(item.kind)}
        </div>

        <h2
          style={{
            fontSize: 16,
            fontWeight: 650,
            lineHeight: 1.4,
            marginBottom: 18,
            letterSpacing: '-0.02em',
          }}
        >
          {item.message}
        </h2>

        <Field label="File" mono>
          {item.relativePath}:{item.line}
        </Field>
        {item.tickets && item.tickets.length > 0 && (
          <Field label="Tickets">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {item.tickets.map((ticket) =>
                ticket.url ? (
                  <a
                    key={ticket.key}
                    href={ticket.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--accent)',
                      textDecoration: 'none',
                    }}
                  >
                    {ticket.key}
                  </a>
                ) : (
                  <span
                    key={ticket.key}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {ticket.key}
                  </span>
                ),
              )}
            </div>
          </Field>
        )}
        <button
          type="button"
          onClick={() =>
            void openFileInEditor(item.relativePath, {
              line: item.line,
              column: item.column,
            })
          }
          style={{
            marginBottom: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12,
            fontWeight: 550,
            padding: '8px 12px',
            borderRadius: 9,
            border: 'none',
            background: 'var(--accent)',
            color: '#f7faf8',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <ExternalLink size={13} />
          Open in editor
        </button>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 16,
          }}
        >
          {item.triage ? (
            <TriageButton
              label="Restore"
              onClick={async () => {
                const next = await triageItem({
                  itemId: item.id,
                  action: 'restore',
                  includeTriaged: showTriaged,
                })
                if (next) setReport(next)
              }}
            />
          ) : (
            <>
              <TriageButton
                label="Dismiss"
                onClick={async () => {
                  const next = await triageItem({
                    itemId: item.id,
                    action: 'dismiss',
                    includeTriaged: showTriaged,
                  })
                  if (next) {
                    setReport(next)
                    if (!showTriaged) selectItem(null)
                  }
                }}
              />
              {[7, 30, 90].map((days) => (
                <TriageButton
                  key={days}
                  label={`Snooze ${days}d`}
                  onClick={async () => {
                    const next = await triageItem({
                      itemId: item.id,
                      action: 'snooze',
                      days,
                      includeTriaged: showTriaged,
                    })
                    if (next) {
                      setReport(next)
                      if (!showTriaged) selectItem(null)
                    }
                  }}
                />
              ))}
            </>
          )}
        </div>

        {item.triage && (
          <Field label="Triage">
            <span style={{ textTransform: 'capitalize' }}>
              {item.triage.status}
              {item.triage.until
                ? ` until ${new Date(item.triage.until).toLocaleDateString()}`
                : ''}
            </span>
          </Field>
        )}

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
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 650,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 8,
              }}
            >
              Context
            </div>
            <pre
              style={{
                margin: 0,
                padding: 14,
                borderRadius: 10,
                background: 'var(--bg-tertiary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                lineHeight: 1.55,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                color: 'var(--text-secondary)',
              }}
            >
              {item.context}
            </pre>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 650,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 8,
            }}
          >
            Raw
          </div>
          <code
            style={{
              display: 'block',
              padding: 14,
              borderRadius: 10,
              background: 'var(--bg-tertiary)',
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
  )
}

function TriageButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void | Promise<void>
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      style={{
        fontSize: 11,
        fontWeight: 550,
        padding: '7px 10px',
        borderRadius: 8,
        border: 'none',
        background: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )
}

function Field({
  label,
  children,
  mono,
}: {
  label: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 650,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 5,
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
          lineHeight: 1.4,
        }}
      >
        {children}
      </div>
    </div>
  )
}
