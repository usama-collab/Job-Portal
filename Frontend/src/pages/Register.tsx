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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../components/ui/select"
import { Briefcase, Loader2, UserPlus } from 'lucide-react'
import { useState } from 'react'

interface RegisterForm {
    email: string
    name: string
    password: string
    role: string
}

const Register = () => {
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const form = useForm<RegisterForm>({
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: "seeker" // Default role
        }
    })

    const onSubmit = async (data: RegisterForm) => {
        setError(null)
        try {
            await registerUser(data)
            navigate('/login')
        } catch (error) {
            setError("Registration failed. Please try a different email.")
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-start py-16 px-4 bg-linear-to-b from-blue-50/50 to-white">
            
            {/* Brand Header */}
            <div className="mb-8 flex flex-col items-center gap-2">
                <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
                    <Briefcase className="text-white w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Jobify</h2>
            </div>

            <Card className="w-full max-w-md shadow-xl border-slate-100 rounded-2xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-600" /> Create account
                    </CardTitle>
                    <CardDescription className="text-center text-slate-500">
                        Join Jobify to start your career journey
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                                            <Input placeholder="John Doe" className="h-11 rounded-lg" {...field} />
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
                                            <Input placeholder="name@example.com" type="email" className="h-11 rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">I am a...</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-11 rounded-lg">
                                                    <SelectValue placeholder="Select your role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="seeker">Job Seeker</SelectItem>
                                                <SelectItem value="employer">Employer / Recruiter</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                            <Input placeholder="••••••••" type="password" className="h-11 rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button 
                                type="submit" 
                                className="w-full h-11 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 mt-2 transition-all"
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

            <Link to="/" className="mt-8 text-sm text-slate-400 hover:text-slate-600 transition-colors">
                ← Back to homepage
            </Link>
        </div>
    )
}

export default Register