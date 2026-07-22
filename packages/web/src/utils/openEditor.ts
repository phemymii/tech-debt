export async function openFileInEditor(
  filePath: string,
  options?: { line?: number; column?: number },
): Promise<{ ok: boolean; error?: string; editor?: string }> {
  try {
    const res = await fetch('/api/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: filePath,
        line: options?.line,
        column: options?.column,
      }),
    })
    const data = (await res.json()) as {
      ok: boolean
      error?: string
      editor?: string
    }
    if (!res.ok || !data.ok) {
      const message = data.error ?? `Open failed (${res.status})`
      window.alert(message)
      return { ok: false, error: message }
    }
    return data
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to open'
    window.alert(message)
    return { ok: false, error: message }
  }
}
