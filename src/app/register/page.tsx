'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Loader2, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Phone, 
  Home, 
  Lock, 
  Sparkles, 
  ShieldCheck,
  Compass,
  MapPin,
  Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { divisions, bdDivisions, bdLocations } from '@/lib/bd-locations';
import { Logo } from '@/components/ui/logo';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  phone: z.string().min(11, { message: 'Enter a valid mobile number' }),
  address: z.string().min(5, { message: 'Address is required' }),
  division: z.string().min(1, { message: 'Division is required' }),
  district: z.string().min(1, { message: 'District is required' }),
  thana: z.string().min(1, { message: 'Thana is required' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(1, { message: 'Confirm your password' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      division: '',
      district: '',
      thana: '',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedDivision = form.watch('division');
  const selectedDistrict = form.watch('district');

  const availableDistricts = selectedDivision ? bdDivisions[selectedDivision] || [] : [];
  const availableThanas = selectedDistrict ? bdLocations[selectedDistrict] || [] : [];

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || 'Server returned a non-JSON response');
      }

      if (!response.ok) {
        toast.error(data.message || 'Registration failed');
      } else {
        toast.success('Registered successfully! Please log in.');
        router.push('/login');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 sm:py-12 overflow-x-hidden">
      {/* Background Graphic Elements & Dynamic Theme Glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[450px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-10 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Subtle geometric dot grid pattern */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-[0.035] dark:opacity-[0.06] pointer-events-none" 
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="register-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#register-grid)" />
        </svg>
      </div>

      {/* Brand Logo Header */}
      <div className="flex justify-center mb-6 relative z-10">
        <Logo imageClassName="size-8 md:size-10" textClassName="text-2xl md:text-3xl" />
      </div>

      {/* Main Container Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-4xl relative z-10"
      >
        <div className="bg-card/95 dark:bg-card/80 backdrop-blur-xl border border-primary/20 dark:border-primary/30 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl shadow-primary/5">
          {/* Header Title & Subtitle */}
          <div className="text-center space-y-2.5 mb-8 md:mb-10">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Sparkles className="size-3.5" />
              <span>Fast & Secure Registration</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Join us today to unlock fast checkout, order tracking, and exclusive discounts.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Row 1: Full Name & Mobile Number (2 Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Full Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <User className="absolute left-3.5 size-4.5 text-primary pointer-events-none" />
                          <Input
                            placeholder="John Doe"
                            {...field}
                            disabled={isLoading}
                            className="h-12 pl-11 bg-muted/40 hover:bg-muted/60 dark:bg-background/60 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl text-sm md:text-base transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Mobile Number <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <Phone className="absolute left-3.5 size-4.5 text-primary pointer-events-none" />
                          <Input
                            placeholder="017XXXXXXXX"
                            {...field}
                            disabled={isLoading}
                            className="h-12 pl-11 bg-muted/40 hover:bg-muted/60 dark:bg-background/60 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl text-sm md:text-base transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Email Address & Street Address (2 Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Email Address <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <Mail className="absolute left-3.5 size-4.5 text-primary pointer-events-none" />
                          <Input
                            placeholder="john@example.com"
                            type="email"
                            {...field}
                            disabled={isLoading}
                            className="h-12 pl-11 bg-muted/40 hover:bg-muted/60 dark:bg-background/60 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl text-sm md:text-base transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Address Line <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <Home className="absolute left-3.5 size-4.5 text-primary pointer-events-none" />
                          <Input
                            placeholder="House #, Road #, Area"
                            {...field}
                            disabled={isLoading}
                            className="h-12 pl-11 bg-muted/40 hover:bg-muted/60 dark:bg-background/60 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl text-sm md:text-base transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 3: Division, District, Thana (3 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
                <FormField
                  control={form.control}
                  name="division"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Division <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('district', '');
                          form.setValue('thana', '');
                        }}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <div className="relative flex items-center">
                            <Compass className="absolute left-3.5 size-4.5 text-primary pointer-events-none z-10" />
                            <SelectTrigger className="h-12 pl-11 bg-muted/40 hover:bg-muted/60 dark:bg-background/60 border-border/80 focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl text-sm transition-all">
                              <SelectValue placeholder="Select division" />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {divisions.map((division) => (
                            <SelectItem key={division} value={division}>
                              {division}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        District <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('thana', '');
                        }}
                        value={field.value}
                        disabled={!selectedDivision || isLoading}
                      >
                        <FormControl>
                          <div className="relative flex items-center">
                            <MapPin className="absolute left-3.5 size-4.5 text-primary pointer-events-none z-10" />
                            <SelectTrigger className="h-12 pl-11 bg-muted/40 hover:bg-muted/60 dark:bg-background/60 border-border/80 focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl text-sm transition-all disabled:opacity-50">
                              <SelectValue placeholder="Select district" />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {availableDistricts.map((district) => (
                            <SelectItem key={district} value={district}>
                              {district}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thana"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Thana / Upazila <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedDistrict || isLoading}
                      >
                        <FormControl>
                          <div className="relative flex items-center">
                            <Navigation className="absolute left-3.5 size-4.5 text-primary pointer-events-none z-10" />
                            <SelectTrigger className="h-12 pl-11 bg-muted/40 hover:bg-muted/60 dark:bg-background/60 border-border/80 focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl text-sm transition-all disabled:opacity-50">
                              <SelectValue placeholder="Select thana" />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {availableThanas.map((thana) => (
                            <SelectItem key={thana} value={thana}>
                              {thana}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 4: Password & Confirm Password (2 Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Password <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-3.5 size-4.5 text-primary pointer-events-none" />
                          <Input
                            placeholder="••••••••"
                            type={showPassword ? "text" : "password"}
                            {...field}
                            disabled={isLoading}
                            className="h-12 pl-11 pr-11 bg-muted/40 hover:bg-muted/60 dark:bg-background/60 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl text-sm md:text-base transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded outline-none"
                            disabled={isLoading}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Confirm Password <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-3.5 size-4.5 text-primary pointer-events-none" />
                          <Input
                            placeholder="••••••••"
                            type={showConfirmPassword ? "text" : "password"}
                            {...field}
                            disabled={isLoading}
                            className="h-12 pl-11 pr-11 bg-muted/40 hover:bg-muted/60 dark:bg-background/60 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl text-sm md:text-base transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3.5 text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded outline-none"
                            disabled={isLoading}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Bottom Action Section: Already User? Login (Left) & Create Account Button (Right) */}
              <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-5 border-t border-border/80">
                <div className="text-sm font-medium text-muted-foreground">
                  ALREADY REGISTERED?{' '}
                  <Link
                    href="/login"
                    className="font-bold text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-colors uppercase ml-1"
                  >
                    SIGN IN
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto px-10 h-12 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4.5 animate-spin" />
                      <span>CREATING ACCOUNT...</span>
                    </>
                  ) : (
                    <>
                      <span>CREATE ACCOUNT</span>
                      <ArrowRight className="size-4.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Trust & Security Badges below card */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="size-4 text-primary" /> 256-bit SSL Secure Encryption
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="size-4 text-primary" /> Verified Customer Protection
          </span>
        </div>
      </motion.div>
    </div>
  );
}
