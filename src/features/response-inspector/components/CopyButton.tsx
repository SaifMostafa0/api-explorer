// Copy with feedback. The clipboard API is missing on insecure pages and can be denied, so on
// failure we select the text on screen and say how to copy it by hand.

import { useEffect, useRef, useState, type RefObject } from 'react'
import styles from './CopyButton.module.css'

type CopyState = 'idle' | 'copied' | 'failed'

interface CopyButtonProps {
  /** Visible label, e.g. "Copy body". */
  label: string
  getText: () => string
  /** Selected when copying fails, so Ctrl+C works straight away. */
  fallbackTarget?: RefObject<HTMLElement | null>
}

const RESET_AFTER_MS = 2500

export function CopyButton({ label, getText, fallbackTarget }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    clearTimeout(timer.current)
    try {
      // TypeScript says it always exists, but outside secure contexts it is undefined.
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(getText())
      setState('copied')
      timer.current = setTimeout(() => setState('idle'), RESET_AFTER_MS)
    } catch {
      setState('failed')
      const target = fallbackTarget?.current
      if (target) selectContents(target)
    }
  }

  return (
    <span className={styles.wrapper}>
      <button type="button" className={styles.button} onClick={() => void copy()}>
        {label}
      </button>
      {/* Its own small live region, so the result of a copy is announced without moving focus. */}
      <span role="status" aria-label={`${label} result`} className={styles.feedback} data-state={state}>
        {state === 'copied' ? 'Copied.' : null}
        {state === 'failed'
          ? fallbackTarget
            ? "Couldn't copy: the browser blocked clipboard access. The text is selected; press Ctrl+C (⌘C on Mac)."
            : "Couldn't copy: the browser blocked clipboard access."
          : null}
      </span>
    </span>
  )
}

function selectContents(element: HTMLElement) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
  element.focus()
}
