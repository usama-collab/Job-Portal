import { jwtDecode } from "jwt-decode"

interface AccessTokenClaims {
  exp?: number
  role?: string
  sub?: string
}

export function getValidAccessTokenClaims(token: string | null): AccessTokenClaims | null {
  if (!token) return null

  try {
    const claims = jwtDecode<AccessTokenClaims>(token)
    const nowInSeconds = Date.now() / 1000

    if (
      typeof claims.exp !== "number" ||
      claims.exp <= nowInSeconds ||
      typeof claims.sub !== "string" ||
      typeof claims.role !== "string"
    ) {
      return null
    }

    return claims
  } catch {
    return null
  }
}

export function getAuthenticatedLandingPath(token: string): string | null {
  const claims = getValidAccessTokenClaims(token)
  if (!claims) return null

  return claims.role === "admin" || claims.role === "employer"
    ? "/employer/dashboard"
    : "/jobs"
}
