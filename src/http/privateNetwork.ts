// Private-network detection for the confirmation warning (ADR 0002).
// This is a guard against mistakes, not a security boundary: DNS can point any public name at a
// private address and we can't see that from the browser.
//
// Always pass a hostname that has been through `new URL()`. The WHATWG parser already turns
// "2130706433", "0x7f.1" and "127.1" into "127.0.0.1", so we only need to handle canonical forms.

export function isPrivateNetworkHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '') // "localhost." is the same host

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true

  if (host.startsWith('[') && host.endsWith(']')) return isPrivateIpv6(host.slice(1, -1))

  const ipv4 = parseIpv4(host)
  return ipv4 !== null && isPrivateIpv4(ipv4)
}

type Ipv4 = [number, number, number, number]

function parseIpv4(host: string): Ipv4 | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!match) return null
  const octets = match.slice(1).map(Number)
  if (octets.some((n) => n > 255)) return null
  return octets as Ipv4
}

function isPrivateIpv4([a, b]: Ipv4): boolean {
  return (
    a === 0 || // 0.0.0.0/8, reaches the local machine on most systems
    a === 10 || // 10/8
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local, includes the cloud metadata address 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) || // 172.16/12
    (a === 192 && b === 168) // 192.168/16
  )
}

function isPrivateIpv6(address: string): boolean {
  // The URL parser serialises IPv6 in compressed lower-case form, e.g. "::1", "fe80::1",
  // "::ffff:7f00:1" for ::ffff:127.0.0.1.
  if (address === '::1' || address === '::') return true
  if (/^f[cd][0-9a-f]{0,2}:/.test(address)) return true // fc00::/7 unique local
  if (/^fe[89ab][0-9a-f]?:/.test(address)) return true // fe80::/10 link-local

  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(address)
  if (mapped?.[1] && mapped[2]) {
    const high = parseInt(mapped[1], 16)
    const low = parseInt(mapped[2], 16)
    return isPrivateIpv4([high >> 8, high & 0xff, low >> 8, low & 0xff])
  }
  return false
}
