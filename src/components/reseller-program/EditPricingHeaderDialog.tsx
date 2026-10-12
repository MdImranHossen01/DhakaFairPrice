'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { IResellerProgramData } from '@/types/reseller-program';

interface EditPricingHeaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricingHeaderData: IResellerProgramData['pricingHeader'];
  onSave: (updated: IResellerProgramData['pricingHeader']) => void;
}

export function EditPricingHeaderDialog({
  open,
  onOpenChange,
  pricingHeaderData,
  onSave,
}: EditPricingHeaderDialogProps) {
  const [formData, setFormData] = useState<IResellerProgramData['pricingHeader']>(pricingHeaderData);

  React.useEffect(() => {
    if (open) {
      setFormData(pricingHeaderData);
    }
  }, [open, pricingHeaderData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const handleBadgeChange = (index: number, val: string) => {
    const updated = [...formData.featureBadges];
    updated[index] = val;
    setFormData({ ...formData, featureBadges: updated });
  };

  const handleAddBadge = () => {
    setFormData({
      ...formData,
      featureBadges: [...formData.featureBadges, '✨ নতুন সুবিধা'],
    });
  };

  const handleRemoveBadge = (index: number) => {
    setFormData({
      ...formData,
      featureBadges: formData.featureBadges.filter((_, i) => i !== index),
    });
  };

  const handleValueCardChange = (
    index: number,
    field: 'emoji' | 'title' | 'desc',
    val: string
  ) => {
    const updated = [...formData.valueCards];
    updated[index] = { ...updated[index], [field]: val };
    setFormData({ ...formData, valueCards: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-300">
            <span>✏️</span> প্যাকেজ হেডার ও ভ্যালু ব্যাজ সেকশন এডিট করুন
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-purple-200">অফার টপ ব্যাজ</Label>
            <Input
              value={formData.offerBadge}
              onChange={(e) => setFormData({ ...formData, offerBadge: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="🔥 সীমিত সময়ের অফার চলছে"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-purple-200">হেডলাইন (অংশ ১)</Label>
              <Input
                value={formData.titlePart1}
                onChange={(e) => setFormData({ ...formData, titlePart1: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="আপনার ব্যবসার জন্য সেরা"
              />
            </div>
            <div>
              <Label className="text-xs text-purple-300">হাইলাইট টাইটেল (বেগুনি)</Label>
              <Input
                value={formData.titleHighlight}
                onChange={(e) => setFormData({ ...formData, titleHighlight: e.target.value })}
                className="bg-slate-800 border-purple-500 text-white mt-1"
                placeholder="Next.js ওয়েবসাইট প্যাকেজ"
              />
            </div>
            <div>
              <Label className="text-xs text-purple-200">হেডলাইন (অংশ ২)</Label>
              <Input
                value={formData.titlePart2}
                onChange={(e) => setFormData({ ...formData, titlePart2: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="বেছে নিন"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-purple-200">সাব-টাইটেল / বিবরণ</Label>
            <Textarea
              rows={2}
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="মাসিক অথবা বাৎসরিক — আপনার সুবিধামতো প্ল্যান বেছে নিন..."
            />
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-purple-300">ফিচার ব্যাজসমূহ (Pills)</Label>
              <Button
                type="button"
                size="sm"
                onClick={handleAddBadge}
                className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md border border-purple-400/40"
              >
                <Plus className="h-4 w-4 mr-1 text-white" /> ব্যাজ যোগ করুন
              </Button>
            </div>
            <div className="space-y-2">
              {formData.featureBadges.map((badge, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={badge}
                    onChange={(e) => handleBadgeChange(idx, e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white text-xs h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveBadge(idx)}
                    className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
            <Label className="text-xs font-bold text-purple-300">৩টি ভ্যালু কার্ড (SSL, Speed, Payment)</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {formData.valueCards.map((card, idx) => (
                <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={card.emoji}
                      onChange={(e) => handleValueCardChange(idx, 'emoji', e.target.value)}
                      className="w-12 text-center bg-slate-800 border-slate-700 text-base h-8"
                      placeholder="🔒"
                    />
                    <Input
                      value={card.title}
                      onChange={(e) => handleValueCardChange(idx, 'title', e.target.value)}
                      className="flex-1 bg-slate-800 border-slate-700 text-xs h-8 font-bold"
                      placeholder="শিরোনাম"
                    />
                  </div>
                  <Input
                    value={card.desc}
                    onChange={(e) => handleValueCardChange(idx, 'desc', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-xs h-8"
                    placeholder="বিবরণ"
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-semibold text-xs"
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md"
            >
              পরিবর্তন প্রয়োগ করুন
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
