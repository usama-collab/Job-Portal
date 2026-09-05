import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../api/auth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form"
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { AuthBrandPanel, MobileAuthLogo } from '../components/auth-brand-panel'

interface RegisterForm {
    email: string
    name: string
    password: string
    confirmPassword: string
}

const Register = () => {
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const form = useForm<RegisterForm>({
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: ""
        }
    })

    const onSubmit = async (data: RegisterForm) => {
        setError(null)
        try {
            await registerUser({
                name: data.name,
                email: data.email,
                password: data.password,
            })
            navigate('/login')
        } catch {
            setError("Registration failed. Please try a different email.")
        }
    }

    return (
        <main className="grid h-dvh overflow-hidden bg-white lg:grid-cols-2">
            <section className="relative h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)]">
                <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-5 py-7 sm:px-8">
                    <div className="relative mb-5 flex items-center justify-center">
                        <MobileAuthLogo />
                        <Link to="/" className="absolute right-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600 lg:hidden">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Home
                        </Link>
                    </div>

                    <Card className="w-full gap-0 rounded-[1.75rem] border-slate-200/80 bg-white py-0 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.32)]">
                        <CardHeader className="space-y-1.5 px-7 pb-4 pt-6 text-center sm:px-9 sm:pt-7">
                    <CardTitle className="text-2xl font-black tracking-[-0.035em] text-slate-900">
                        Create account
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-500">
                        Build your profile and find your next role
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-7 pb-6 sm:px-9 sm:pb-7">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
                            
                            {error && (
                                <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-center text-xs font-medium text-red-600">
                                    {error}
                                </p>
                            )}

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-semibold text-slate-700">Full name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" autoComplete="name" className="h-10 rounded-xl border-slate-200 bg-slate-50/70 px-4 transition-colors focus:bg-white" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-semibold text-slate-700">Email address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@example.com" type="email" autoComplete="email" className="h-10 rounded-xl border-slate-200 bg-slate-50/70 px-4 transition-colors focus:bg-white" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-semibold text-slate-700">Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="••••••••"
                                                type="password"
                                                autoComplete="new-password"
                                                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 px-4 transition-colors focus:bg-white"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                rules={{ required: "Password is required" }}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-semibold text-slate-700">Confirm password</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="••••••••"
                                                type="password"
                                                autoComplete="new-password"
                                                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 px-4 transition-colors focus:bg-white"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                rules={{
                                    required: "Please confirm your password",
                                    validate: (value) => value === form.getValues("password") || "Passwords do not match"
                                }}
                            />

                            <Button 
                                type="submit" 
                                className="mt-1 h-11 w-full rounded-xl bg-blue-600 text-sm font-bold shadow-lg shadow-blue-200/80 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating account...
                                    </>
                                ) : "Register"}
                            </Button>

                            <p className="mt-3 text-center text-xs text-slate-500 sm:text-sm">
                                Already have an account?{" "}
                                <Link to="/login" className="font-bold text-blue-600 hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
                    </Card>
                </div>
            </section>

            <AuthBrandPanel description="Create your profile, find the right opportunity, and take the next step in your career with confidence." />
        </main>
    )
}

export default Register
