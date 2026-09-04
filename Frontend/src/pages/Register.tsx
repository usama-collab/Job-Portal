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
        <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">
            <section className="flex min-h-screen items-center px-5 py-8 sm:px-10 lg:px-16 xl:px-24">
                <div className="mx-auto w-full max-w-md lg:mx-0">
                    <MobileAuthLogo />

                    <Link to="/" className="mb-7 hidden w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600 lg:flex">
                        <ArrowLeft className="h-4 w-4" />
                        Back to homepage
                    </Link>

                    <Card className="w-full gap-0 border-0 bg-transparent p-0 shadow-none">
                        <CardHeader className="space-y-2 px-0 pb-6">
                    <CardTitle className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                        Create account
                    </CardTitle>
                    <CardDescription className="text-base text-slate-500">
                        Join Jobify to start your career journey
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            
                            {error && (
                                <p className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                                    {error}
                                </p>
                            )}

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus:bg-white" {...field} />
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
                                        <FormLabel className="text-slate-700 font-semibold">Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@example.com" type="email" className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus:bg-white" {...field} />
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
                                        <FormLabel className="text-slate-700 font-semibold">Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="••••••••"
                                                type="password"
                                                autoComplete="new-password"
                                                className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus:bg-white"
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
                                        <FormLabel className="text-slate-700 font-semibold">Confirm Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="••••••••"
                                                type="password"
                                                autoComplete="new-password"
                                                className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus:bg-white"
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
                                className="mt-2 h-12 w-full rounded-xl bg-blue-600 text-base font-bold shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating account...
                                    </>
                                ) : "Register"}
                            </Button>

                            <p className="text-center text-sm text-slate-500 mt-4">
                                Already have an account?{" "}
                                <Link to="/login" className="text-blue-600 font-bold hover:underline">
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
