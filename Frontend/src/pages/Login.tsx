import { useForm } from "react-hook-form";
import { useAuthStore } from "../store/authStore";
import { useNavigate, Link } from "react-router-dom"; // Added Link
import { loginUser, type LoginResponse } from "../api/auth";
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
import axios from "axios";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthBrandPanel, MobileAuthLogo } from "../components/auth-brand-panel";
import { getAuthenticatedLandingPath } from "../lib/auth-session";

interface LoginForm {
  email: string;
  password: string;
}

const Login = () => {
  const queryClient = useQueryClient();
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

    let response: LoginResponse;
    try {
      response = await loginUser(data);
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        setError("Invalid email or password. Please try again.");
      } else if (axios.isAxiosError(requestError) && !requestError.response) {
        setError("Unable to reach the server. Please check your connection and try again.");
      } else {
        setError("We couldn't sign you in right now. Please try again shortly.");
      }
      return;
    }

    const destination = getAuthenticatedLandingPath(response.access_token);
    if (!destination || !response.refresh_token) {
      setError("The server returned an invalid session. Please try again.");
      return;
    }

    try {
      // Remove data from any previous account before the authenticated layout mounts.
      queryClient.removeQueries({ queryKey: ["profile-me"] });
      login(response.access_token, response.refresh_token);
      navigate(destination, { replace: true });
    } catch {
      setError("Your session could not be saved. Please enable browser storage and try again.");
    }
  };

  return (
    <main className="grid h-dvh overflow-hidden bg-white lg:grid-cols-2">
      <section className="auth-form-scroll relative h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)]">
        <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-5 py-8 sm:px-8">
          <div className="relative mb-6 flex items-center justify-center">
            <MobileAuthLogo />
            <Link to="/" className="absolute right-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600 lg:hidden">
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
          </div>

          <Card className="w-full gap-0 rounded-[1.75rem] border-slate-200/80 bg-white py-0 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.32)]">
            <CardHeader className="space-y-1.5 px-7 pb-5 pt-7 text-center sm:px-9 sm:pt-8">
              <CardTitle className="text-2xl font-black tracking-[-0.035em] text-slate-900">Welcome back</CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Sign in to continue your career journey
              </CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-7 sm:px-9 sm:pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                <div className="animate-in rounded-xl border border-red-100 bg-red-50 p-3.5 fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-red-100 p-1">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-red-700">Login failed</p>
                      <p className="text-xs font-medium leading-relaxed text-red-700">
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
                    <FormLabel className="text-sm font-semibold text-slate-700">Email address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="name@example.com" 
                        type="email" 
                        autoComplete="email"
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4 transition-colors focus:bg-white"
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
                        <FormLabel className="text-sm font-semibold text-slate-700">Password</FormLabel>
                        <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="••••••••" 
                        type="password" 
                        autoComplete="current-password"
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4 transition-colors focus:bg-white"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="mt-1 h-11 w-full rounded-xl bg-blue-600 text-sm font-bold shadow-lg shadow-blue-200/80 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : "Sign in"}
              </Button>

              <p className="mt-3 text-center text-xs text-slate-500 sm:text-sm">
                Don't have an account?{" "}
                <Link to="/register" className="font-bold text-blue-600 hover:underline">
                    Create one for free
                </Link>
              </p>
            </form>
          </Form>
            </CardContent>
          </Card>
        </div>
      </section>

      <AuthBrandPanel description="Sign in to continue exploring roles, tracking applications, and connecting with teams doing meaningful work." />
    </main>
  );
};

export default Login;
