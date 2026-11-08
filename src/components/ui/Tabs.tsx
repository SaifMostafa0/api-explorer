// WAI-ARIA tabs with automatic activation: arrow keys move between tabs, Home/End jump to the
// ends, and only the selected tab is in the Tab order. Inactive panels stay mounted (hidden) so
// their inputs keep focusable ids and their state.

import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import styles from './Tabs.module.css'

export interface TabItem<Id extends string> {
  id: Id
  label: ReactNode
  panel: ReactNode
}

interface TabsProps<Id extends string> {
  /** Accessible name of the tab list. */
  label: string
  idPrefix: string
  items: TabItem<Id>[]
  selected: Id
  onSelect: (id: Id) => void
}

export function Tabs<Id extends string>({ label, idPrefix, items, selected, onSelect }: TabsProps<Id>) {
  const tabRefs = useRef(new Map<Id, HTMLButtonElement>())

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const count = items.length
    // Arrows wrap around at both ends.
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % count,
      ArrowLeft: (index - 1 + count) % count,
      Home: 0,
      End: count - 1,
    }
    const target = moves[event.key]
    if (target === undefined) return
    event.preventDefault()
    const item = items[target]
    if (!item) return
    onSelect(item.id)
    tabRefs.current.get(item.id)?.focus()
  }

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label={label} className={styles.list}>
        {items.map((item, index) => {
          const isSelected = item.id === selected
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node)
                else tabRefs.current.delete(item.id)
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${item.id}`}
              aria-selected={isSelected}
              aria-controls={`${idPrefix}-panel-${item.id}`}
              tabIndex={isSelected ? 0 : -1}
              className={styles.tab}
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${idPrefix}-panel-${item.id}`}
          aria-labelledby={`${idPrefix}-tab-${item.id}`}
          hidden={item.id !== selected}
          className={styles.panel}
        >
          {item.panel}
        </div>
      ))}
    </div>
  )
}
