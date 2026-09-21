'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Store, Loader2, CheckCircle2, User, Mail, Lock, Phone, MapPin, Sparkles, Globe, ArrowRight, Truck, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { divisions, getDistrictsByDivision, getThanasByDistrict } from '@/lib/bd-locations';

const createSchema = (isLoggedIn: boolean) => z.object({
  name: isLoggedIn ? z.string().optional() : z.string().min(2, 'Please enter your full name'),
  email: isLoggedIn ? z.string().optional() : z.string().email('Please enter a valid email address'),
  password: isLoggedIn ? z.string().optional() : z.string().min(6, 'Password must be at least 6 characters'),
  storeName: z.string().min(3, 'Store name must be at least 3 characters'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(30, 'Subdomain cannot exceed 30 characters')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Only lowercase letters, numbers, and hyphens (-) are allowed'),
  phone: z.string().min(11, 'Please enter a valid 11-digit phone number'),
  division: z.string().min(1, 'Please select your division (বিভাগ)'),
  district: z.string().min(1, 'Please select your district (জেলা)'),
  thana: z.string().min(1, 'Please select your thana/upazila (থানা/উপজেলা)'),
  address: z.string().min(5, 'Please enter complete pickup address (Road, House, Area)'),
  hubName: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<ReturnType<typeof createSchema>>;

export default function ResellerRegisterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const schema = createSchema(isLoggedIn);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      storeName: '',
      subdomain: '',
      phone: '',
      division: '',
      district: '',
      thana: '',
      address: '',
      hubName: '',
      description: ''
    },
  });

  const subdomainValue = form.watch('subdomain');
  const selectedDivision = form.watch('division');
  const selectedDistrict = form.watch('district');

  const availableDistricts = selectedDivision ? getDistrictsByDivision(selectedDivision) : [];
  const availableThanas = selectedDistrict ? getThanasByDistrict(selectedDistrict) : [];

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    form.setValue('division', val, { shouldValidate: true });
    form.setValue('district', '', { shouldValidate: true });
    form.setValue('thana', '', { shouldValidate: true });
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    form.setValue('district', val, { shouldValidate: true });
    form.setValue('thana', '', { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload: any = {
        storeName: values.storeName.trim(),
        subdomain: values.subdomain.toLowerCase().trim(),
        phone: values.phone.trim(),
        division: values.division,
        district: values.district,
        thana: values.thana,
        address: values.address.trim(),
        hubName: values.hubName?.trim() || `${values.storeName.trim()} Hub`,
        description: values.description?.trim() || '',
        pickupAddress: {
          hubName: values.hubName?.trim() || `${values.storeName.trim()} Hub`,
          contactPerson: values.name?.trim() || session?.user?.name || values.storeName.trim(),
          phone: values.phone.trim(),
          division: values.division,
          district: values.district,
          thana: values.thana,
          address: values.address.trim(),
        }
      };

      if (!isLoggedIn) {
        payload.name = values.name?.trim();
        payload.email = values.email?.trim().toLowerCase();
        payload.password = values.password;
      }

      const res = await fetch('/api/reseller/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        toast.success('Reseller application submitted successfully!');

        // If guest registered, attempt automatic signIn in background
        if (!isLoggedIn && values.email && values.password) {
          try {
            await signIn('credentials', {
              email: values.email,
              password: values.password,
              redirect: false,
            });
          } catch (e) {
            console.error('Auto login error:', e);
          }
        }
      } else {
        toast.error(data.error || 'Failed to submit application. Please try again.');
      }
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-muted/20 font-sans">
        <Card className="max-w-md w-full text-center border-border shadow-2xl">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-black text-foreground">Application Submitted!</CardTitle>
            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              Your reseller application has been received and is being reviewed. Once approved by our team, your storefront will be activated and you will have full access to your reseller dashboard.
            </CardDescription>
            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={() => router.push('/reseller/dashboard')} className="w-full font-bold">
                Go to Reseller Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.push('/')} className="w-full">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 py-12 bg-muted/20 font-sans">
      <Card className="max-w-2xl w-full border-border/80 shadow-2xl bg-card">
        <CardHeader className="text-center space-y-2">
          <div className="h-12 w-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto border border-primary/20">
            <Store className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Become a Reseller
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground max-w-sm mx-auto">
            Launch your own branded e-commerce store with zero upfront inventory investment
          </CardDescription>

          {isLoggedIn && session?.user && (
            <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full mt-1">
              <Sparkles className="h-3.5 w-3.5" />
              Logged in as: {session.user.name || session.user.email}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Guest Account Details */}
            {!isLoggedIn && (
              <div className="space-y-4 p-4 rounded-xl bg-muted/40 border border-border/60">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal & Account Details
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input {...form.register('name')} placeholder="John Doe" className="pl-9" />
                  </div>
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message as string}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input {...form.register('email')} type="email" placeholder="you@example.com" className="pl-9" />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input {...form.register('password')} type="password" placeholder="At least 6 characters" className="pl-9" />
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-xs text-destructive">{form.formState.errors.password.message as string}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Store Information */}
            <div className="space-y-4 p-4 rounded-xl bg-muted/40 border border-border/60">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" /> Store Information
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Store / Brand Name</Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input {...form.register('storeName')} placeholder="e.g. Apex Trends" className="pl-9" />
                  </div>
                  {form.formState.errors.storeName && (
                    <p className="text-xs text-destructive">{form.formState.errors.storeName.message as string}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Contact Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input {...form.register('phone')} placeholder="017XXXXXXXX" type="tel" className="pl-9" />
                  </div>
                  {form.formState.errors.phone && (
                    <p className="text-xs text-destructive">{form.formState.errors.phone.message as string}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Subdomain</Label>
                <div className="flex items-center">
                  <Input
                    {...form.register('subdomain')}
                    placeholder="apextrends"
                    className="rounded-r-none border-r-0 font-medium"
                  />
                  <span className="h-10 px-3 bg-muted border border-l-0 text-xs sm:text-sm font-semibold text-muted-foreground flex items-center rounded-r-md select-none">
                    .swapnobaz.com
                  </span>
                </div>
                {subdomainValue && (
                  <p className="text-[11px] text-primary mt-1 font-medium flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Your store URL will be: <strong>https://{subdomainValue.toLowerCase().trim()}.swapnobaz.com</strong>
                  </p>
                )}
                {form.formState.errors.subdomain && (
                  <p className="text-xs text-destructive">{form.formState.errors.subdomain.message as string}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Store Description (Optional)</Label>
                <Textarea {...form.register('description')} placeholder="Tell us briefly about your business niche or plan..." rows={2} />
              </div>
            </div>

            {/* Warehouse & Courier Pickup Point (Location Cascading Dropdowns) */}
            <div className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Warehouse & Pickup Point (পিকআপ পয়েন্ট)
                </div>
                <span className="text-[11px] text-muted-foreground">For Courier Delivery & Returns</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Division Dropdown */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Division / বিভাগ <span className="text-destructive">*</span></Label>
                  <select
                    value={selectedDivision}
                    onChange={handleDivisionChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- বিভাগ নির্বাচন করুন --</option>
                    {divisions.map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                  {form.formState.errors.division && (
                    <p className="text-xs text-destructive">{form.formState.errors.division.message as string}</p>
                  )}
                </div>

                {/* District Dropdown */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">District / জেলা <span className="text-destructive">*</span></Label>
                  <select
                    value={selectedDistrict}
                    onChange={handleDistrictChange}
                    disabled={!selectedDivision}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{selectedDivision ? '-- জেলা নির্বাচন করুন --' : '-- আগে বিভাগ বাছুন --'}</option>
                    {availableDistricts.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                  {form.formState.errors.district && (
                    <p className="text-xs text-destructive">{form.formState.errors.district.message as string}</p>
                  )}
                </div>

                {/* Thana Dropdown */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Thana / থানা / উপজেলা <span className="text-destructive">*</span></Label>
                  <select
                    {...form.register('thana')}
                    disabled={!selectedDistrict}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{selectedDistrict ? '-- থানা বাছুন --' : '-- আগে জেলা বাছুন --'}</option>
                    {availableThanas.map(th => (
                      <option key={th} value={th}>{th}</option>
                    ))}
                  </select>
                  {form.formState.errors.thana && (
                    <p className="text-xs text-destructive">{form.formState.errors.thana.message as string}</p>
                  )}
                </div>
              </div>

              {/* Detailed Address */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Detailed Pickup Address (Road, House, Landmark) / বিস্তারিত পিকআপ ঠিকানা <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    {...form.register('address')} 
                    placeholder="e.g. Holding 45/A, Road 3, Sector 4, Uttara" 
                    className="pl-9" 
                  />
                </div>
                {form.formState.errors.address && (
                  <p className="text-xs text-destructive">{form.formState.errors.address.message as string}</p>
                )}
              </div>

              {/* Hub / Warehouse Nickname (Optional) */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Warehouse / Hub Name (ঐচ্ছিক)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    {...form.register('hubName')} 
                    placeholder="e.g. Main Outlet / Central Warehouse" 
                    className="pl-9" 
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full font-bold text-base py-6 shadow-md hover:shadow-lg transition-all">
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Submitting Application...
                </>
              ) : (
                <span className="flex items-center gap-2">
                  Complete Reseller Registration
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>

        {!isLoggedIn && (
          <CardFooter className="flex justify-center border-t border-border/40 pt-4 text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login?redirect=/reseller/register" className="text-primary font-semibold hover:underline ml-1">
              Sign In here
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
