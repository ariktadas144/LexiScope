import { useMemo } from 'react'; import { compile } from '../../core/pipeline'; export function useCompilerPipeline(source: string) { return useMemo(() => compile(source), [source]) }
