'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import {
  Store,
  Loader2,
  CheckCircle2,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Sparkles,
  Globe,
  ArrowRight,
  Truck,
  Building2,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
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
  division: z.string().min(1, 'Please select your division'),
  district: z.string().min(1, 'Please select your district'),
  thana: z.string().min(1, 'Please select your thana/upazila'),
  address: z.string().min(5, 'Please enter complete pickup address (Road, House, Area)'),
  hubName: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<ReturnType<typeof createSchema>>;

function CosmicAuthBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none bg-[#07080e]">
      {/* Cosmic Nebula Radial Glows */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[550px] opacity-75 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 25%, rgba(20, 184, 166, 0.18) 0%, rgba(13, 148, 136, 0.10) 40%, rgba(6, 78, 59, 0.05) 65%, transparent 80%)'
        }}
      />
      <div
        className="absolute top-1/4 right-0 w-[450px] h-[450px] opacity-35 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(223, 178, 72, 0.15) 0%, transparent 70%)'
        }}
      />
      <div
        className="absolute bottom-10 left-0 w-[500px] h-[500px] opacity-30 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)'
        }}
      />

      {/* Hexagonal Honeycomb Geometric Mesh */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.14] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="cosmic-hex-mesh-reseller"
            width="56"
            height="96.995"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 28 0 L 56 16.166 L 56 48.497 L 28 64.663 L 0 48.497 L 0 16.166 Z M 0 64.663 L 28 80.83 L 28 113.16 L 0 129.33 L -28 113.16 L -28 80.83 Z M 56 64.663 L 84 80.83 L 84 113.16 L 56 129.33 L 28 113.16 L 28 80.83 Z"
              fill="none"
              stroke="#dfb248"
              strokeWidth="0.8"
              strokeOpacity="0.4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cosmic-hex-mesh-reseller)" />
      </svg>

      {/* Subtle Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
    </div>
  );
}

export default function ResellerRegisterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
  const selectedThana = form.watch('thana');

  const availableDistricts = selectedDivision ? getDistrictsByDivision(selectedDivision) : [];
  const availableThanas = selectedDistrict ? getThanasByDistrict(selectedDistrict) : [];

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    form.setValue('division', val, { shouldValidate: true });
    form.setValue('district', '', { shouldValidate: false });
    form.setValue('thana', '', { shouldValidate: false });
    form.clearErrors(['district', 'thana']);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    form.setValue('district', val, { shouldValidate: true });
    form.setValue('thana', '', { shouldValidate: false });
    form.clearErrors('thana');
  };

  const handleThanaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    form.setValue('thana', val, { shouldValidate: true });
    if (val) form.clearErrors('thana');
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload: any = {
        storeName: values.storeName.trim(),
        subdomain: values.subdomain.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '').trim(),
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
      <div className="relative min-h-[90vh] flex items-center justify-center p-4 text-slate-100 font-sans overflow-hidden">
        <CosmicAuthBackground />
        <div className="w-full max-w-lg bg-[#12141a]/95 backdrop-blur-xl border-2 border-[#dfb248] rounded-2xl p-8 sm:p-10 text-center shadow-[0_0_50px_rgba(223,178,72,0.18)] relative z-10 space-y-6">
          <div className="h-20 w-20 bg-[#dfb248]/10 text-[#dfb248] border border-[#dfb248]/30 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(223,178,72,0.25)]">
            <CheckCircle2 className="h-10 w-10 text-[#dfb248]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-transparent bg-gradient-to-b from-[#ffea9f] via-[#dfb248] to-[#9e7623] bg-clip-text">
              Application Submitted!
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Your reseller application has been received and is under review. Once approved, your custom storefront will be activated and you will gain full access to your Reseller Dashboard.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => router.push('/reseller/dashboard')}
              className="w-full py-3.5 px-6 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest text-black bg-gradient-to-r from-[#dfb248] via-[#fae69e] to-[#c29633] hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(223,178,72,0.3)]"
            >
              Go to Reseller Dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-300 border border-neutral-700 bg-neutral-900/60 hover:bg-neutral-800 transition-all"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-slate-100 font-sans overflow-x-hidden pt-6 pb-12 sm:pt-10 sm:pb-16 px-4">
      {/* Background Graphic Elements & Hexagonal Mesh */}
      <CosmicAuthBackground />

      {/* Main Content Area */}
      <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">
        {/* Page Title: Metallic Gold BECOME A RESELLER with generous spacing */}
        <div className="text-center mb-8 md:mb-12 space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-[0.14em] uppercase bg-gradient-to-b from-[#ffea9f] via-[#dfb248] to-[#9e7623] bg-clip-text text-transparent drop-shadow-[0_4px_25px_rgba(223,178,72,0.35)]">
            BECOME A RESELLER
          </h1>

          {isLoggedIn && session?.user && (
            <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3.5 py-1 rounded-full mt-2">
              <Sparkles className="size-3.5" />
              Logged in as: {session.user.name || session.user.email}
            </div>
          )}
        </div>

        {/* Gold Bordered Luxury Container Card (ABSInternational Style) */}
        <div className="w-full bg-[#12141a]/95 backdrop-blur-md border-2 border-[#dfb248] rounded-2xl p-6 sm:p-8 md:p-10 shadow-[0_0_35px_rgba(223,178,72,0.12)]">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Guest Personal & Account Details */}
            {!isLoggedIn && (
              <div className="space-y-5 pb-2">
                <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider border-b border-neutral-800 pb-2">
                  <User className="size-4.5 text-[#dfb248]" /> Personal & Account Details
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-[#dfb248] transition-all">
                    <User className="size-5 text-[#dfb248] mr-3 shrink-0" />
                    <input
                      {...form.register('name')}
                      placeholder="Enter Full Name"
                      className="w-full bg-transparent text-white placeholder:text-neutral-500 text-sm md:text-base outline-none font-medium"
                    />
                  </div>
                  {form.formState.errors.name && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{form.formState.errors.name.message as string}</p>
                  )}
                </div>

                {/* Email Address & Password (2 Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-[#dfb248] transition-all">
                      <Mail className="size-5 text-[#dfb248] mr-3 shrink-0" />
                      <input
                        {...form.register('email')}
                        type="email"
                        placeholder="you@example.com"
                        className="w-full bg-transparent text-white placeholder:text-neutral-500 text-sm md:text-base outline-none font-medium"
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="mt-1 text-xs text-rose-400 font-medium">{form.formState.errors.email.message as string}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-[#dfb248] transition-all">
                      <Lock className="size-5 text-[#dfb248] mr-3 shrink-0" />
                      <input
                        {...form.register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters"
                        className="w-full bg-transparent text-white placeholder:text-neutral-500 text-sm md:text-base outline-none font-medium pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-neutral-400 hover:text-amber-400 transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                      </button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="mt-1 text-xs text-rose-400 font-medium">{form.formState.errors.password.message as string}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Store Information Section */}
            <div className="space-y-5 pt-1 pb-2">
              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider border-b border-neutral-800 pb-2">
                <Store className="size-4.5 text-[#dfb248]" /> Store Information
              </div>

              {/* Store Name & Phone Number (2 Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                    Store / Brand Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-[#dfb248] transition-all">
                    <Store className="size-5 text-[#dfb248] mr-3 shrink-0" />
                    <input
                      {...form.register('storeName')}
                      placeholder="e.g. Apex Trends"
                      className="w-full bg-transparent text-white placeholder:text-neutral-500 text-sm md:text-base outline-none font-medium"
                    />
                  </div>
                  {form.formState.errors.storeName && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{form.formState.errors.storeName.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                    Contact / WhatsApp Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-[#dfb248] transition-all">
                    <Phone className="size-5 text-[#dfb248] mr-3 shrink-0" />
                    <input
                      {...form.register('phone')}
                      placeholder="017XXXXXXXX"
                      type="tel"
                      className="w-full bg-transparent text-white placeholder:text-neutral-500 text-sm md:text-base outline-none font-medium"
                    />
                  </div>
                  {form.formState.errors.phone && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{form.formState.errors.phone.message as string}</p>
                  )}
                </div>
              </div>

              {/* Store Subdomain */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                  Store Subdomain <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3 focus-within:border-[#dfb248] transition-all">
                  <Globe className="size-5 text-[#dfb248] mr-3 shrink-0" />
                  <input
                    {...form.register('subdomain')}
                    onChange={(e) => {
                      const sanitized = e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, '')
                        .replace(/[^a-z0-9-]/g, '')
                        .replace(/-+/g, '-');
                      form.setValue('subdomain', sanitized, { shouldValidate: true });
                    }}
                    placeholder="apextrends"
                    className="w-full bg-transparent text-white placeholder:text-neutral-500 text-sm md:text-base outline-none font-medium"
                  />
                  <span className="text-xs sm:text-sm font-bold text-[#dfb248] bg-[#dfb248]/10 border border-[#dfb248]/30 px-3 py-1.5 rounded-lg shrink-0 ml-2 select-none">
                    .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com'}
                  </span>
                </div>
                {subdomainValue && (
                  <p className="text-xs text-[#dfb248] mt-1.5 font-medium flex items-center gap-1.5 pl-1">
                    <Globe className="size-3.5 shrink-0" />
                    <span>Your store link: <strong>https://{subdomainValue.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '')}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com'}</strong></span>
                  </p>
                )}
                {form.formState.errors.subdomain && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{form.formState.errors.subdomain.message as string}</p>
                )}
              </div>

              {/* Store Description */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                  Store Description <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative bg-[#07080c] border border-neutral-800 rounded-xl p-3 focus-within:border-[#dfb248] transition-all">
                  <textarea
                    {...form.register('description')}
                    rows={2}
                    placeholder="Briefly tell us about your products or niche..."
                    className="w-full bg-transparent text-white placeholder:text-neutral-500 text-sm md:text-base outline-none resize-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Warehouse & Pickup Location (Cascading Dropdowns) */}
            <div className="space-y-5 pt-1 pb-2">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider">
                  <Truck className="size-4.5 text-[#dfb248]" /> Warehouse & Pickup Location
                </div>
                <span className="text-[11px] text-neutral-400 font-medium">For Courier Pickups & Returns</span>
              </div>

              {/* Division, District, Thana (3 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
                {/* Division */}
                <div>
                  <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                    Division <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-[#dfb248] transition-all">
                    <select
                      value={selectedDivision}
                      onChange={handleDivisionChange}
                      className="w-full bg-transparent text-white text-sm md:text-base outline-none appearance-none cursor-pointer font-medium"
                    >
                      <option value="" className="bg-[#0c0d12] text-neutral-400">Select Division</option>
                      {divisions.map((div) => (
                        <option key={div} value={div} className="bg-[#0c0d12] text-white">
                          {div}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.formState.errors.division && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{form.formState.errors.division.message as string}</p>
                  )}
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                    District <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-[#dfb248] transition-all">
                    <select
                      value={selectedDistrict}
                      onChange={handleDistrictChange}
                      disabled={!selectedDivision}
                      className="w-full bg-transparent text-white text-sm md:text-base outline-none appearance-none cursor-pointer font-medium disabled:text-neutral-500 disabled:cursor-not-allowed"
                    >
                      <option value="" className="bg-[#0c0d12] text-neutral-400">
                        {selectedDivision ? 'Select District' : 'Select Division First'}
                      </option>
                      {availableDistricts.map((dist) => (
                        <option key={dist} value={dist} className="bg-[#0c0d12] text-white">
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.formState.errors.district && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{form.formState.errors.district.message as string}</p>
                  )}
                </div>

                {/* Thana */}
                <div>
                  <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                    Thana / Upazila <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-[#dfb248] transition-all">
                    <select
                      value={selectedThana}
                      onChange={handleThanaChange}
                      disabled={!selectedDistrict}
                      className="w-full bg-transparent text-white text-sm md:text-base outline-none appearance-none cursor-pointer font-medium disabled:text-neutral-500 disabled:cursor-not-allowed"
                    >
                      <option value="" className="bg-[#0c0d12] text-neutral-400">
                        {selectedDistrict ? 'Select Thana' : 'Select District First'}
                      </option>
                      {availableThanas.map((th) => (
                        <option key={th} value={th} className="bg-[#0c0d12] text-white">
                          {th}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.formState.errors.thana && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{form.formState.errors.thana.message as string}</p>
                  )}
                </div>
              </div>

              {/* Detailed Address */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                  Detailed Pickup Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-[#dfb248] transition-all">
                  <MapPin className="size-5 text-[#dfb248] mr-3 shrink-0" />
                  <input
                    {...form.register('address')}
                    placeholder="e.g. Holding 45/A, Road 3, Sector 4, Uttara"
                    className="w-full bg-transparent text-white placeholder:text-neutral-500 text-sm md:text-base outline-none font-medium"
                  />
                </div>
                {form.formState.errors.address && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{form.formState.errors.address.message as string}</p>
                )}
              </div>

              {/* Hub / Warehouse Name */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-[#dfb248] uppercase tracking-wider mb-1.5">
                  Warehouse / Hub Nickname <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative flex items-center bg-[#07080c] border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-[#dfb248] transition-all">
                  <Building2 className="size-5 text-[#dfb248] mr-3 shrink-0" />
                  <input
                    {...form.register('hubName')}
                    placeholder="e.g. Main Hub / Central Outlet"
                    className="w-full bg-transparent text-white placeholder:text-neutral-500 text-sm md:text-base outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Row: ALREADY REGISTERED? (Left) & Submit Button (Right) */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-5 border-t border-neutral-800/80">
              <div className="text-xs md:text-sm font-semibold tracking-wide text-neutral-400">
                ALREADY REGISTERED?{' '}
                <Link
                  href="/login?redirect=/reseller/register"
                  className="text-[#dfb248] hover:text-amber-200 font-bold underline-offset-4 hover:underline transition-colors uppercase ml-1"
                >
                  SIGN IN
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-10 py-3.5 rounded-full font-black text-xs md:text-sm uppercase tracking-widest text-black bg-gradient-to-r from-[#dfb248] via-[#fae69e] to-[#c29633] hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(223,178,72,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-black" />
                    SUBMITTING APPLICATION...
                  </>
                ) : (
                  <>
                    <span>SUBMIT APPLICATION</span>
                    <ArrowRight className="size-4 text-black" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>


      </div>
    </div>
  );
}
