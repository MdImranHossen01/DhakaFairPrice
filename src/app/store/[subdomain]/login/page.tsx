/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const loginSchema = z.object({
  email: z.string().min(1, { message: 'Email or Mobile Number is required' }),
  password: z.string().optional().or(z.literal('')),
});

interface StoreInfo { storeName: string; logoUrl?: string; }

export default function StoreLoginPage() {
  const router = useRouter();
  const params = useParams();
  const subdomain = params?.subdomain as string;
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);

  useEffect(() => {
    if (subdomain) {
      fetch(`/api/store/${subdomain}/info`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.storeName) setStoreInfo(data); })
        .catch(() => { });
    }
  }, [subdomain]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role;
      const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect');
      if (callbackUrl) { router.replace(callbackUrl); }
      else if (role === 'admin' || role === 'super_admin') { router.replace('/admin/dashboard'); }
      else if (role === 'reseller') { router.replace('/reseller/dashboard'); }
      else { router.replace('/'); }
    }
  }, [status, session, router, searchParams]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const response = await signIn('credentials', { email: values.email, password: values.password || '', redirect: false });
      if (response?.error) { toast.error(response.error); }
      else {
        toast.success('Login successful!');
        const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect');
        router.push(callbackUrl || '/');
        router.refresh();
      }
    } catch { toast.error('Something went wrong. Please try again.'); }
    finally { setIsLoading(false); }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex flex-col p-6 md:p-8 bg-card border rounded-2xl shadow-sm w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-6">
          {storeInfo?.logoUrl
            ? <Image src={storeInfo.logoUrl} alt={storeInfo.storeName} width={80} height={80} className="rounded-xl object-contain" />
            : <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center"><span className="text-3xl">{storeInfo?.storeName?.[0] || 'S'}</span></div>
          }
          {storeInfo?.storeName && <h2 className="text-lg font-bold text-foreground">{storeInfo.storeName}</h2>}
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full space-y-8">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Welcome Back!</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Mobile Number</FormLabel>
                  <FormControl><Input placeholder="01XXXXXXXXX" type="text" {...field} disabled={isLoading} className="h-11 focus-visible:ring-primary/20" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password <span className="text-xs font-normal text-muted-foreground">(Optional)</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="••••••••" type={showPassword ? 'text' : 'password'} {...field} disabled={isLoading} className="h-11 focus-visible:ring-primary/20 pr-10" />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:text-primary transition-colors rounded-r-lg flex items-center justify-center" disabled={isLoading}>
                              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p>{showPassword ? 'Hide' : 'Show'}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span className="flex items-center justify-center">Sign In <ArrowRight className="ml-2 h-4 w-4" /></span>}
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>
    </main>
  );
}