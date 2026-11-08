// Browsers block http:// requests from an https:// page ("mixed content"), except to hosts they
// consider potentially trustworthy: localhost and loopback addresses. We say so before sending,
// because afterwards the failure looks exactly like CORS or a DNS error.

export function isBlockedMixedContent(pageProtocol: string, target: URL): boolean {
  if (pageProtocol !== 'https:' || target.protocol !== 'http:') return false
  return !isLoopbackHost(target.hostname)
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '[::1]' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  )
}
