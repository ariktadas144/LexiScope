import { useEffect, useMemo, useState } from 'react'
import { compile, type PipelineResult } from '../../core/pipeline'

/**
 * Compile-as-you-type: the whole pipeline is re-run after the source has been
 * idle for `delay` ms. `pending` is true while an edit has not been compiled yet.
 */
export function useCompilerPipeline(source: string, delay = 300): { result: PipelineResult; pending: boolean } {
  const [settled, setSettled] = useState(source)

  useEffect(() => {
    if (source === settled) return
    const timer = setTimeout(() => setSettled(source), delay)
    return () => clearTimeout(timer)
  }, [source, settled, delay])

  const result = useMemo(() => compile(settled), [settled])
  return { result, pending: settled !== source }
}
