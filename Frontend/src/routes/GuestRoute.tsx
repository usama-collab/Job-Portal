import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Navigate, Outlet } from "react-router-dom"
import { refreshAccessToken } from "../api/axios"
import { getAuthenticatedLandingPath } from "../lib/auth-session"
import { useAuthStore } from "../store/authStore"

type SessionStatus =
  | { state: "checking" }
  | { state: "guest" }
  | { state: "authenticated"; destination: string }

const GuestRoute = () => {
  const token = useAuthStore((state) => state.token)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const logout = useAuthStore((state) => state.logout)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({ state: "checking" })

  useEffect(() => {
    let isCurrent = true

    const resolveSession = async () => {
      const destination = token ? getAuthenticatedLandingPath(token) : null
      if (destination) {
        if (isCurrent) setSessionStatus({ state: "authenticated", destination })
        return
      }

      if (!refreshToken) {
        if (token) logout()
        if (isCurrent) setSessionStatus({ state: "guest" })
        return
      }

      if (isCurrent) setSessionStatus({ state: "checking" })
      const refreshedToken = await refreshAccessToken()
      const refreshedDestination = refreshedToken
        ? getAuthenticatedLandingPath(refreshedToken)
        : null

      if (!isCurrent) return

      if (refreshedDestination) {
        setSessionStatus({ state: "authenticated", destination: refreshedDestination })
      } else {
        logout()
        setSessionStatus({ state: "guest" })
      }
    }

    void resolveSession()

    return () => {
      isCurrent = false
    }
  }, [logout, refreshToken, token])

  if (sessionStatus.state === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white" aria-live="polite">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Checking your session…
        </div>
      </main>
    )
  }

  if (sessionStatus.state === "authenticated") {
    return <Navigate to={sessionStatus.destination} replace />
  }

  return <Outlet />
}

export default GuestRoute
