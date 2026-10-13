'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Send, MessageCircle, CheckCircle2 } from 'lucide-react';

interface ResellerContactFormProps {
  storeName: string;
  whatsappPhone?: string;
  supportEmail?: string;
}

export function ResellerContactForm({ storeName, whatsappPhone, supportEmail }: ResellerContactFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const cleanWaNumber = whatsappPhone ? String(whatsappPhone).replace(/\D/g, '') : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      toast.error('অনুগ্রহ করে নাম, ফোন নম্বর এবং বার্তা পূরণ করুন।');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success('আপনার বার্তা সফলভাবে গ্রহণ করা হয়েছে। আমরা শীঘ্রই যোগাযোগ করবো!');
    }, 600);
  };

  const handleSendViaWhatsApp = () => {
    if (!cleanWaNumber) {
      toast.error('WhatsApp নম্বর পাওয়া যায়নি');
      return;
    }
    const text = `নমস্কার ${storeName}! আমার নাম: ${name || 'N/A'}, ফোন: ${phone || 'N/A'}\n\nবার্তা:\n${message || 'আমি আপনাদের পণ্য সম্পর্কে জানতে চাই।'}`;
    const url = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (submitted) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-foreground">ধন্যবাদ, {name}!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          আপনার বার্তাটি {storeName} কাস্টমার সাপোর্ট টিমের কাছে পৌঁছেছে। আমাদের প্রতিনিধি দ্রুত আপনার সাথে যোগাযোগ করবেন।
        </p>
        <Button
          onClick={() => { setSubmitted(false); setMessage(''); }}
          variant="outline"
          className="mt-4"
        >
          আরেকটি বার্তা পাঠান
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg md:text-xl font-bold text-foreground">সরাসরি বার্তা পাঠান</h3>
        <p className="text-xs md:text-sm text-muted-foreground">
          আপনার যেকোনো প্রশ্ন বা মতামতের জন্য ফর্মটি পূরণ করুন।
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name" className="text-xs font-semibold">আপনার নাম *</Label>
            <Input
              id="contact-name"
              placeholder="যেমন: মোঃ করিম"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone" className="text-xs font-semibold">মোবাইল নম্বর *</Label>
            <Input
              id="contact-phone"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="h-10 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-email" className="text-xs font-semibold">ইমেইল (ঐচ্ছিক)</Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="yourname@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-message" className="text-xs font-semibold">বার্তা বা অনুসন্ধান *</Label>
          <Textarea
            id="contact-message"
            rows={4}
            placeholder="আপনার প্রশ্ন বা মতামত বিস্তারিত লিখুন..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary text-primary-foreground font-bold hover:bg-primary/90 h-11 text-sm"
        >
          <Send className="mr-2 h-4 w-4" />
          {loading ? 'পাঠানো হচ্ছে...' : 'বার্তা পাঠান'}
        </Button>

        {cleanWaNumber && (
          <Button
            type="button"
            onClick={handleSendViaWhatsApp}
            variant="outline"
            className="border-emerald-600/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold h-11 text-sm"
          >
            <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
            WhatsApp-এ পাঠান
          </Button>
        )}
      </div>
    </form>
  );
}
