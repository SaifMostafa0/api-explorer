// A native modal <dialog>: the browser traps focus, closes on Escape and returns focus to the
// Send button afterwards. Rendered only while open, so it can't linger in the accessibility tree.

import { useEffect, useRef } from 'react'
import styles from './ConfirmSendDialog.module.css'

interface ConfirmSendDialogProps {
  method: string
  url: string
  reasons: string[]
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSendDialog({ method, url, reasons, onConfirm, onCancel }: ConfirmSendDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const safeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    // Focus the safe choice after opening. React's autoFocus would run before showModal().
    safeButtonRef.current?.focus()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="confirm-send-title"
      aria-describedby="confirm-send-reasons"
      // Escape fires `cancel`; treat it like the Cancel button.
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <h2 id="confirm-send-title" className={styles.title}>
        Send this request?
      </h2>
      <p className={styles.target}>
        <span className={styles.method}>{method}</span> {url}
      </p>
      <ul id="confirm-send-reasons" className={styles.reasons}>
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <div className={styles.actions}>
        <button type="button" ref={safeButtonRef} className={styles.secondary} onClick={onCancel}>
          Don't send
        </button>
        <button type="button" className={styles.primary} onClick={onConfirm}>
          Send anyway
        </button>
      </div>
    </dialog>
  )
}
