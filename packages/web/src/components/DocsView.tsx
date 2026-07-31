import { useEffect, useState } from 'react'
import { BookOpen, ExternalLink, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fetchDocContent, fetchDocList, type DocEntry } from '../hooks/useDebtData'
import { openFileInEditor } from '../utils/openEditor'

export function DocsView() {
  const [docs, setDocs] = useState<DocEntry[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingContent, setLoadingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingList(true)
    void fetchDocList()
      .then((list) => {
        if (cancelled) return
        setDocs(list)
        const preferred =
          list.find((d) => d.path.toLowerCase() === 'readme.md') ??
          list.find((d) => /^readme\.mdx?$/i.test(d.name)) ??
          list[0] ??
          null
        setSelectedPath(preferred?.path ?? null)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load docs')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedPath) {
      setContent('')
      return
    }
    let cancelled = false
    setLoadingContent(true)
    setError(null)
    void fetchDocContent(selectedPath)
      .then((doc) => {
        if (!cancelled) setContent(doc.content)
      })
      .catch((err) => {
        if (!cancelled) {
          setContent('')
          setError(err instanceof Error ? err.message : 'Failed to load file')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedPath])

  return (
    <div className="fade-up" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            marginBottom: 4,
            letterSpacing: '-0.03em',
          }}
        >
          Docs
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Project markdown files, rendered for reading
        </p>
      </header>

      {loadingList ? (
        <div style={{ color: 'var(--text-muted)', padding: 24 }}>
          Loading markdown files…
        </div>
      ) : docs.length === 0 ? (
        <div
          className="surface"
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          No markdown files found in this project.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 14,
            alignItems: 'start',
            minHeight: 420,
          }}
        >
          <aside
            className="surface"
            style={{
              padding: 8,
              maxHeight: 'calc(100vh - 180px)',
              overflow: 'auto',
              position: 'sticky',
              top: 0,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 650,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '8px 10px 10px',
              }}
            >
              {docs.length} files
            </div>
            {docs.map((doc) => {
              const active = selectedPath === doc.path
              const isReadme = /^readme\.mdx?$/i.test(doc.name)
              return (
                <button
                  key={doc.path}
                  type="button"
                  className="row-btn"
                  onClick={() => setSelectedPath(doc.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 10px',
                    borderRadius: 8,
                    background: active ? 'var(--row-selected)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                >
                  {isReadme ? (
                    <BookOpen size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                  ) : (
                    <FileText size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                  )}
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.name}
                    </span>
                    {doc.path !== doc.name && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: 2,
                        }}
                      >
                        {doc.path}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </aside>

          <section className="surface" style={{ padding: '20px 24px 28px' }}>
            {selectedPath && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 18,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  {selectedPath}
                </div>
                <button
                  type="button"
                  onClick={() => void openFileInEditor(selectedPath)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
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
                  <ExternalLink size={12} />
                  Open in editor
                </button>
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>
            )}
            {loadingContent && !error && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Loading…
              </div>
            )}
            {!loadingContent && !error && content && (
              <article className="md-doc">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </article>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
