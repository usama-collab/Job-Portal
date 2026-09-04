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
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">
      <section className="flex min-h-screen items-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <MobileAuthLogo />

          <Link to="/" className="mb-10 hidden w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600 lg:flex">
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </Link>

          <Card className="w-full gap-0 border-0 bg-transparent p-0 shadow-none">
            <CardHeader className="space-y-2 px-0 pb-8">
              <CardTitle className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Welcome back</CardTitle>
              <CardDescription className="text-base text-slate-500">
                Enter your credentials to manage your career
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
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
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus:bg-white focus:ring-blue-500"
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
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus:bg-white focus:ring-blue-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="mt-2 h-12 w-full rounded-xl bg-blue-600 text-base font-bold shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
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
        </div>
      </section>

      <AuthBrandPanel description="Sign in to continue exploring roles, tracking applications, and connecting with teams doing meaningful work." />
    </main>
  );
};

export default Login;
