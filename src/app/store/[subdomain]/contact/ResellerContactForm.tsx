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
      toast.error('Please fill in your name, mobile number, and message.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success('Your message has been sent successfully. We will get back to you shortly!');
    }, 600);
  };

  const handleSendViaWhatsApp = () => {
    if (!cleanWaNumber) {
      toast.error('WhatsApp number is not configured.');
      return;
    }
    const text = `Hello ${storeName}! My name is ${name || 'N/A'}, Phone: ${phone || 'N/A'}\n\nMessage:\n${message || 'I would like to inquire about your products.'}`;
    const url = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (submitted) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Thank You, {name}!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your message has been received by our {storeName} customer support team. We will get in touch with you shortly.
        </p>
        <Button
          onClick={() => { setSubmitted(false); setMessage(''); }}
          variant="outline"
          className="mt-4 font-semibold rounded-xl"
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg md:text-xl font-bold text-foreground">Send Us a Direct Message</h3>
        <p className="text-xs md:text-sm text-muted-foreground">
          Have questions about our products or an order? Fill out the form below.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name" className="text-xs font-semibold">Your Name *</Label>
            <Input
              id="contact-name"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 text-sm rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone" className="text-xs font-semibold">Mobile Number *</Label>
            <Input
              id="contact-phone"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="h-10 text-sm rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-email" className="text-xs font-semibold">Email Address (Optional)</Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="yourname@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 text-sm rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-message" className="text-xs font-semibold">Message or Inquiry *</Label>
          <Textarea
            id="contact-message"
            rows={4}
            placeholder="Describe your question or inquiry in detail..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="text-sm rounded-xl"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary text-primary-foreground font-bold hover:bg-primary/90 h-11 text-sm rounded-xl"
        >
          <Send className="mr-2 h-4 w-4" />
          {loading ? 'Sending...' : 'Send Message'}
        </Button>

        {cleanWaNumber && (
          <Button
            type="button"
            onClick={handleSendViaWhatsApp}
            variant="outline"
            className="border-emerald-600/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold h-11 text-sm rounded-xl"
          >
            <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
            Chat on WhatsApp
          </Button>
        )}
      </div>
    </form>
  );
}
