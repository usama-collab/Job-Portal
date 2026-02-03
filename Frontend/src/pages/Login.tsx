import { useForm } from "react-hook-form";
import { useAuthStore } from "../store/authStore";
import { useNavigate, Link } from "react-router-dom"; // Added Link
import { loginUser } from "../api/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { AlertCircle, Briefcase, Loader2 } from "lucide-react"; // Added Icons

interface DecodedToken {
  email: string;
  role: string;
  exp: number;
}

interface LoginForm {
  email: string;
  password: string;
}

const Login = () => {
  const [error, setError] = useState<string | null>(null)  
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const form = useForm<LoginForm>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const res = await loginUser(data);
      login(res.access_token);

      const decoded = jwtDecode<DecodedToken>(res.access_token);
      const userRole = decoded.role;

      if (userRole === "admin" || userRole === "employer") {
        navigate("/employer/dashboard");
      } else {
        navigate("/jobs");
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    // Matching the homepage gradient
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4 bg-linear-to-b from-blue-50/50 to-white">
      
      {/* Brand Logo Header */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
          <Briefcase className="text-white w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Jobify</h2>
      </div>

      <Card className="w-full max-w-md shadow-xl border-slate-100 rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
          <CardDescription className="text-center text-slate-500">
            Enter your credentials to manage your career
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <div className="bg-red-100 p-1 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-red-700">Login Failed</p>
                      <p className="text-xs text-red-700 font-medium leading-relaxed">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="name@example.com" 
                        type="email" 
                        className="h-11 rounded-lg border-slate-200 focus:ring-blue-500"
                        {...field} 
                      />
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
                    <div className="flex items-center justify-between">
                        <FormLabel className="text-slate-700 font-semibold">Password</FormLabel>
                        <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">
                            Forgot password?
                        </Link>
                    </div>
                    <FormControl>
                      <Input 
                        placeholder="••••••••" 
                        type="password" 
                        className="h-11 rounded-lg border-slate-200 focus:ring-blue-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-bold bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-100 mt-2" 
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : "Sign in"}
              </Button>

              <p className="text-center text-sm text-slate-500 mt-4">
                Don't have an account?{" "}
                <Link to="/register" className="text-blue-600 font-bold hover:underline">
                    Create one for free
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Footer link back to home */}
      <Link to="/" className="mt-8 text-sm text-slate-600 hover:text-slate-400 transition-colors">
        ← Back to homepage
      </Link>
    </div>
  );
};

export default Login;