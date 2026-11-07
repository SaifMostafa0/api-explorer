import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title">
      <h1 id="not-found-title">Page not found</h1>
      <p>There is nothing at this address.</p>
      <Link to="/">Back to the request workspace</Link>
    </section>
  )
}
