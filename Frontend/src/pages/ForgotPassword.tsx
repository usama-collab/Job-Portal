import axios from "axios"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"

import { requestPasswordReset } from "../api/auth"
import { AuthBrandPanel, MobileAuthLogo } from "../components/auth-brand-panel"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form"
import { Input } from "../components/ui/input"

interface ForgotPasswordForm {
  email: string
}

const ForgotPassword = () => {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ForgotPasswordForm>({ defaultValues: { email: "" } })

  const onSubmit = async ({ email }: ForgotPasswordForm) => {
    setError(null)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 429) {
        setError("Too many requests were made. Please wait before trying again.")
      } else if (axios.isAxiosError(requestError) && !requestError.response) {
        setError("Unable to reach the server. Check your connection and try again.")
      } else {
        setError("Password recovery is temporarily unavailable. Please try again shortly.")
      }
    }
  }

  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-2">
      <section className="relative flex min-h-dvh items-center overflow-y-auto bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)]">
        <div className="mx-auto w-full max-w-lg px-5 py-8 sm:px-8">
          <div className="relative mb-6 flex items-center justify-center">
            <MobileAuthLogo />
            <Link to="/" className="absolute right-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 lg:hidden">
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
          </div>
          <Card className="w-full gap-0 rounded-[1.75rem] border-slate-200/80 bg-white py-0 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.32)]">
            <CardHeader className="space-y-1.5 px-7 pb-5 pt-7 text-center sm:px-9 sm:pt-8">
              <CardTitle className="text-2xl font-black tracking-[-0.035em] text-slate-900">Forgot your password?</CardTitle>
              <CardDescription className="text-sm text-slate-500">We’ll send recovery instructions if your account is eligible.</CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-7 sm:px-9 sm:pb-8">
              {sent ? (
                <div className="space-y-5 text-center" role="status">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                  <div>
                    <h2 className="font-bold text-slate-900">Check your email</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">If an eligible account exists, a password reset link has been sent. The link expires in 15 minutes.</p>
                  </div>
                  <Button asChild className="h-11 w-full rounded-xl bg-blue-600 font-bold hover:bg-blue-700"><Link to="/login">Back to login</Link></Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {error && <div role="alert" className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs font-medium leading-relaxed text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
                    <FormField control={form.control} name="email" rules={{ required: "Email is required" }} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">Email address</FormLabel>
                        <FormControl><Input type="email" autoComplete="email" placeholder="name@example.com" className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={form.formState.isSubmitting} className="h-11 w-full rounded-xl bg-blue-600 text-sm font-bold hover:bg-blue-700">
                      {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send reset link"}
                    </Button>
                    <p className="text-center text-sm"><Link to="/login" className="font-bold text-blue-600 hover:underline">Back to login</Link></p>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      <AuthBrandPanel description="Securely regain access and get back to discovering opportunities, tracking applications, and connecting with great teams." />
    </main>
  )
}

export default ForgotPassword
