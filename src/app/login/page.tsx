'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, GalleryVerticalEnd, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { Logo } from '@/components/ui/logo';

const loginSchema = z.object({
  email: z.string().min(1, { message: 'Email or Mobile Number is required' }),
  password: z.string().optional().or(z.literal('')),
});

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated based on role
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role;
      const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect');

      if (callbackUrl) {
        router.replace(callbackUrl);
      } else if (role === 'admin' || role === 'super_admin') {
        router.replace('/admin/dashboard');
      } else if (role === 'reseller') {
        router.replace('/reseller/dashboard');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [status, session, router, searchParams]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const response = await signIn('credentials', {
        email: values.email,
        password: values.password || '',
        redirect: false,
      });

      if (response?.error) {
        if (response.error === 'CredentialsSignin' || response.error === 'Configuration') {
          toast.error('Invalid credentials or password required.');
        } else {
          toast.error(response.error);
        }
      } else {
        toast.success('Logged in successfully!');
        const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect');
        if (callbackUrl) {
          router.push(callbackUrl);
          router.refresh();
        } else {
          router.replace('/admin/dashboard');
          router.refresh();
        }
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex flex-col p-6 md:p-8 bg-card border rounded-2xl shadow-sm w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-1 items-center justify-center"
        >
          <div className="w-full space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email or phone number to access your account
              </p>
            </div>

            <div className="grid gap-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email or Mobile Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="01XXXXXXXXX or email@example.com"
                            type="text"
                            {...field}
                            disabled={isLoading}
                            className="h-11 focus-visible:ring-primary/20"
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
                          <FormLabel>Password <span className="text-xs font-normal text-muted-foreground">(Optional if not set)</span></FormLabel>
                          <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-foreground/80 hover:text-primary hover:underline underline-offset-4 transition-colors"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="••••••••"
                              type={showPassword ? "text" : "password"}
                              {...field}
                              disabled={isLoading}
                              className="h-11 focus-visible:ring-primary/20 pr-10"
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-r-lg outline-none flex items-center justify-center"
                                    disabled={isLoading}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                  >
                                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>{showPassword ? "Hide password" : "Show password"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <span className="flex items-center justify-center">
                        Sign In <ArrowRight className="ml-2 h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </div>


            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold text-foreground/90 hover:text-primary hover:underline underline-offset-4 transition-colors">
                Create an account
              </Link>
            </div>
          </div>
        </motion.div>


      </div>
    </main>
  );
}

