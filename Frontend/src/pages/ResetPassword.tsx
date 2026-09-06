import axios from "axios"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { resetPassword } from "../api/auth"
import { AuthBrandPanel, MobileAuthLogo } from "../components/auth-brand-panel"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form"
import { Input } from "../components/ui/input"
import { useAuthStore } from "../store/authStore"

interface ResetPasswordForm {
  password: string
  confirmation: string
}

const readFragmentToken = () => {
  const token = new URLSearchParams(window.location.hash.slice(1)).get("token")
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null
}

const ResetPassword = () => {
  const [token] = useState<string | null>(readFragmentToken)
  const [invalid, setInvalid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logout = useAuthStore((state) => state.logout)
  const form = useForm<ResetPasswordForm>({ defaultValues: { password: "", confirmation: "" } })

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search)
    }
  }, [])

  const onSubmit = async ({ password }: ResetPasswordForm) => {
    if (!token) return
    setError(null)
    try {
      await resetPassword(token, password)
      logout()
      queryClient.removeQueries({ queryKey: ["profile-me"] })
      toast.success("Password reset successfully. Please sign in.")
      navigate("/login", { replace: true })
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 400) {
        setInvalid(true)
      } else if (axios.isAxiosError(requestError) && !requestError.response) {
        setError("Unable to reach the server. Your details are still here—check your connection and try again.")
      } else {
        setError("Password recovery is temporarily unavailable. Your details are still here; please try again.")
      }
    }
  }

  const linkInvalid = !token || invalid

  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-2">
      <section className="relative flex min-h-dvh items-center overflow-y-auto bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)]">
        <div className="mx-auto w-full max-w-lg px-5 py-8 sm:px-8">
          <div className="relative mb-6 flex items-center justify-center">
            <MobileAuthLogo />
            <Link to="/" className="absolute right-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 lg:hidden"><ArrowLeft className="h-3.5 w-3.5" /> Home</Link>
          </div>
          <Card className="w-full gap-0 rounded-[1.75rem] border-slate-200/80 bg-white py-0 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.32)]">
            <CardHeader className="space-y-1.5 px-7 pb-5 pt-7 text-center sm:px-9 sm:pt-8">
              <CardTitle className="text-2xl font-black tracking-[-0.035em] text-slate-900">Choose a new password</CardTitle>
              <CardDescription className="text-sm text-slate-500">Set a new password for your Jobify account.</CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-7 sm:px-9 sm:pb-8">
              {linkInvalid ? (
                <div className="space-y-5 text-center" role="alert">
                  <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
                  <div><h2 className="font-bold text-slate-900">This link can’t be used</h2><p className="mt-2 text-sm leading-6 text-slate-500">It may be invalid, expired, already used, or replaced by a newer request.</p></div>
                  <Button asChild className="h-11 w-full rounded-xl bg-blue-600 font-bold hover:bg-blue-700"><Link to="/forgot-password">Request a new reset link</Link></Button>
                  <Link to="/login" className="block text-sm font-bold text-blue-600 hover:underline">Back to login</Link>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {error && <div role="alert" className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs font-medium leading-relaxed text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
                    <FormField control={form.control} name="password" rules={{ required: "Password is required" }} render={({ field }) => (
                      <FormItem><FormLabel>New password</FormLabel><FormControl><Input type="password" autoComplete="new-password" className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="confirmation" rules={{ required: "Please confirm your password", validate: (value) => value === form.getValues("password") || "Passwords do not match" }} render={({ field }) => (
                      <FormItem><FormLabel>Confirm new password</FormLabel><FormControl><Input type="password" autoComplete="new-password" className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" disabled={form.formState.isSubmitting} className="h-11 w-full rounded-xl bg-blue-600 text-sm font-bold hover:bg-blue-700">{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting...</> : "Reset password"}</Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      <AuthBrandPanel description="Create a fresh password, secure your account, and return to your next career move with confidence." />
    </main>
  )
}

export default ResetPassword
