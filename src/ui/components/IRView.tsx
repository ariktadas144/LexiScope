import { useState } from 'react'
import { formatInstruction, type Instruction } from '../../core/codegen/instruction'

interface Props {
  instructions: Instruction[]
  unoptimized: Instruction[]
}

/** Three-address code, with a toggle between the constant-folded and raw output. */
export function IRView({ instructions, unoptimized }: Props) {
  const [optimized, setOptimized] = useState(true)
  const shown = optimized ? instructions : unoptimized
  const folded = unoptimized.length > 0 && instructions.length < unoptimized.length

  if (unoptimized.length === 0) return <div className="ir-list empty-hint">No IR generated</div>

  return (
    <div>
      <div className="ir-toggle">
        <button type="button" className={optimized ? 'active' : ''} onClick={() => setOptimized(true)}>
          Optimized ({instructions.length})
        </button>
        <button type="button" className={!optimized ? 'active' : ''} onClick={() => setOptimized(false)}>
          Unoptimized ({unoptimized.length})
        </button>
        {optimized && folded && <span className="muted ir-note">constant folding removed {unoptimized.length - instructions.length} instruction(s)</span>}
      </div>
      <div className="ir-list">
        {shown.map((instruction) => (
          <div className={`ir-row${instruction.op === 'label' ? ' ir-label' : ''}`} key={instruction.index}>
            <span>{String(instruction.index).padStart(2, '0')}</span>
            <code>{formatInstruction(instruction)}</code>
          </div>
        ))}
      </div>
    </div>
  )
}
