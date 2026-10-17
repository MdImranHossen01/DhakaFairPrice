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
import { ImageUpload } from '@/components/ui/image-upload';
import { IResellerProgramData } from '@/types/reseller-program';

interface EditHeroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heroData: IResellerProgramData['hero'];
  onSave: (updated: IResellerProgramData['hero']) => void;
}

export function EditHeroDialog({ open, onOpenChange, heroData, onSave }: EditHeroDialogProps) {
  const [formData, setFormData] = useState<IResellerProgramData['hero']>(heroData);

  // Sync when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData(heroData);
    }
  }, [open, heroData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const handleAddBenefit = () => {
    setFormData((prev) => ({
      ...prev,
      benefits: [...(prev.benefits || []), 'নতুন সুবিধা / বেনিফিট লিখুন'],
    }));
  };

  const handleUpdateBenefit = (index: number, val: string) => {
    setFormData((prev) => {
      const updated = [...(prev.benefits || [])];
      updated[index] = val;
      return { ...prev, benefits: updated };
    });
  };

  const handleRemoveBenefit = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      benefits: (prev.benefits || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-300">
            <span>✏️</span> হিরো ব্যানার / রিসেলার সেকশন এডিট করুন
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-purple-200">টপ ব্যাজ টেক্সট</Label>
            <Input
              value={formData.badgeText}
              onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="e.g. Reseller Partnership Program"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-purple-200">শিরোনাম (অংশ ১)</Label>
              <Input
                value={formData.titlePart1}
                onChange={(e) => setFormData({ ...formData, titlePart1: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="Launch Your Own"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-300">হাইলাইট টেক্সট (হলুদ)</Label>
              <Input
                value={formData.titleHighlight}
                onChange={(e) => setFormData({ ...formData, titleHighlight: e.target.value })}
                className="bg-slate-800 border-amber-500/50 text-white mt-1"
                placeholder="E-Commerce Brand"
              />
            </div>
            <div>
              <Label className="text-xs text-purple-200">শিরোনাম (অংশ ২)</Label>
              <Input
                value={formData.titlePart2}
                onChange={(e) => setFormData({ ...formData, titlePart2: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="with Zero Risk"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-purple-200">সাব-হেডিং / বিবরণ</Label>
            <Textarea
              rows={3}
              value={formData.subheading}
              onChange={(e) => setFormData({ ...formData, subheading: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="Source thousands of products at wholesale rates..."
            />
          </div>

          {/* ── Benefits / Bullet points list ── */}
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-purple-200">
                  রিসেলার সুবিধার তালিকা (বুলেট পয়েন্ট)
                </Label>
                <p className="text-[11px] text-slate-400">
                  হোম পেজ ও রিসেলার পেজে দেখানো পয়েন্টগুলো এখান থেকে যোগ বা পরিবর্তন করুন।
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddBenefit}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-7 px-3 flex items-center gap-1 shadow-sm shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ সুবিধা যোগ করুন</span>
              </Button>
            </div>

            <div className="space-y-2">
              {(formData.benefits || []).map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs font-bold w-5 text-center shrink-0">
                    {idx + 1}.
                  </span>
                  <Input
                    value={b}
                    onChange={(e) => handleUpdateBenefit(idx, e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white text-xs h-9"
                    placeholder="e.g. No upfront inventory or warehouse costs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleRemoveBenefit(idx)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold h-9 w-9 p-0 shrink-0"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!formData.benefits || formData.benefits.length === 0) && (
                <p className="text-xs text-slate-400 italic py-1">
                  কোনো পয়েন্ট যুক্ত করা হয়নি। ওপরে "+ সুবিধা যোগ করুন" বাটনে ক্লিক করে পয়েন্ট যোগ করতে পারেন।
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-purple-200">মূল বাটন টেক্সট</Label>
              <Input
                value={formData.registerBtnText}
                onChange={(e) => setFormData({ ...formData, registerBtnText: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="Register Free as Reseller"
              />
            </div>
            <div>
              <Label className="text-xs text-purple-200">মূল বাটন লিংক</Label>
              <Input
                value={formData.registerBtnLink}
                onChange={(e) => setFormData({ ...formData, registerBtnLink: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="/reseller/register"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-purple-200">দ্বিতীয় বাটন টেক্সট</Label>
              <Input
                value={formData.viewPackagesBtnText}
                onChange={(e) => setFormData({ ...formData, viewPackagesBtnText: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="View Packages & Pricing"
              />
            </div>
            <div>
              <Label className="text-xs text-purple-200">দ্বিতীয় বাটন লিংক</Label>
              <Input
                value={formData.viewPackagesBtnLink || ''}
                onChange={(e) => setFormData({ ...formData, viewPackagesBtnLink: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="/reseller-program"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-purple-200">ব্যানার ইমেজ (URL বা আপলোড)</Label>
            <div className="space-y-2 mt-1">
              <Input
                value={formData.heroImage}
                onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="/assets/images/sectionbanner/reseller-section.webp"
              />
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                <ImageUpload
                  label="নতুন ব্যানার ইমেজ আপলোড করুন (1:1 Ratio Square)"
                  value={formData.heroImage}
                  onUpload={(url) => setFormData({ ...formData, heroImage: url })}
                  aspect="square"
                />
              </div>
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
