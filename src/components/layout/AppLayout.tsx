import { NavLink, Outlet } from 'react-router'
import styles from './AppLayout.module.css'

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <span className={styles.brand}>API Explorer</span>
        <nav aria-label="Main">
          <ul className={styles.nav}>
            <li>
              <NavLink to="/" end>
                Workspace
              </NavLink>
            </li>
            <li>
              <NavLink to="/history">History</NavLink>
            </li>
            <li>
              <NavLink to="/settings">Settings</NavLink>
            </li>
          </ul>
        </nav>
      </header>
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
