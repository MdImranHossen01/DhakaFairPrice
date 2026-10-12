'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { IResellerPackage, IResellerFeature } from '@/types/reseller-program';
import { AVAILABLE_ICONS, IconRenderer } from './IconRenderer';

interface EditPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: IResellerPackage | null;
  onSave: (savedPackage: IResellerPackage) => void;
}

export function EditPackageDialog({ open, onOpenChange, pkg, onSave }: EditPackageDialogProps) {
  const [formData, setFormData] = useState<IResellerPackage>({
    id: 'starter',
    name: 'Starter',
    icon: 'Sprout',
    iconColor: 'text-emerald-400',
    tagline: 'ছোট ব্যবসার জন্য আদর্শ শুরু',
    regularSetup: 2300,
    offerSetup: 1500,
    savingsPct: '৩৫%',
    monthlyFee: 370,
    yearlySavings: '৳১,১৭০ + ১ মাস ফ্রি',
    yearlyTotal: 5570,
    popular: false,
    btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    features: [],
  });

  useEffect(() => {
    if (pkg && open) {
      setFormData({
        ...pkg,
        features: pkg.features ? [...pkg.features] : [],
      });
    } else if (!pkg && open) {
      setFormData({
        id: `package-${Date.now()}`,
        name: 'নতুন প্যাকেজ',
        icon: 'Rocket',
        iconColor: 'text-purple-400',
        tagline: 'আপনার ব্যবসার জন্য উপযুক্ত',
        regularSetup: 3000,
        offerSetup: 2000,
        savingsPct: '৩৩%',
        monthlyFee: 500,
        yearlySavings: '৳১,৫০০ + ১ মাস ফ্রি',
        yearlyTotal: 7500,
        popular: false,
        btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
        features: [
          { text: '১,০০০ প্রোডাক্ট আপলোড লিমিট', highlight: false },
          { text: 'Store Admin Panel', highlight: false },
        ],
      });
    }
  }, [pkg, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const handleAddFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, { text: 'নতুন ফিচার', highlight: false }],
    });
  };

  const handleUpdateFeature = (index: number, key: keyof IResellerFeature, val: any) => {
    const updated = [...formData.features];
    updated[index] = { ...updated[index], [key]: val };
    setFormData({ ...formData, features: updated });
  };

  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const handleMoveFeature = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formData.features.length) return;

    const updated = [...formData.features];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFormData({ ...formData, features: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-900 text-white border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-300">
            <span>📦</span> {pkg ? `প্যাকেজ এডিট: ${formData.name}` : 'নতুন প্যাকেজ যোগ করুন'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-purple-200">প্যাকেজের নাম</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1 font-bold"
                placeholder="Starter / Business / Pro"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-purple-200">প্যাকেজ আইডি (Slug/URL)</Label>
              <Input
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="starter"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-purple-200">আইকন</Label>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={formData.icon || 'Rocket'}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-xs text-white"
                >
                  {AVAILABLE_ICONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
                <div className="p-2 bg-slate-800 rounded-md border border-slate-700">
                  <IconRenderer name={formData.icon} className="h-5 w-5 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs text-purple-200">ট্যাগলাইন / ছোট বিবরণ</Label>
            <Input
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="ছোট ব্যবসার জন্য আদর্শ শুরু"
            />
          </div>

          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
            <Label className="text-xs font-bold text-amber-300">💰 মূল্য ও সাশ্রয় সংক্রান্ত তথ্য</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-[11px] text-slate-300">নিয়মিত সেটআপ চার্জ (৳)</Label>
                <Input
                  type="number"
                  value={formData.regularSetup}
                  onChange={(e) =>
                    setFormData({ ...formData, regularSetup: Number(e.target.value) || 0 })
                  }
                  className="bg-slate-800 border-slate-700 text-white mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] text-emerald-400 font-bold">অফার সেটআপ চার্জ (৳)</Label>
                <Input
                  type="number"
                  value={formData.offerSetup}
                  onChange={(e) =>
                    setFormData({ ...formData, offerSetup: Number(e.target.value) || 0 })
                  }
                  className="bg-slate-800 border-emerald-500 text-white mt-1 text-xs font-bold"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">সাশ্রয়ের হার (যেমন ৩৫%)</Label>
                <Input
                  value={formData.savingsPct}
                  onChange={(e) => setFormData({ ...formData, savingsPct: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">মাসিক চার্জ (৳)</Label>
                <Input
                  type="number"
                  value={formData.monthlyFee}
                  onChange={(e) =>
                    setFormData({ ...formData, monthlyFee: Number(e.target.value) || 0 })
                  }
                  className="bg-slate-800 border-slate-700 text-white mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-[11px] text-slate-300">বাৎসরিক সাশ্রয় টেক্সট</Label>
                <Input
                  value={formData.yearlySavings}
                  onChange={(e) => setFormData({ ...formData, yearlySavings: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1 text-xs"
                  placeholder="৳১,১৭০ + ১ মাস ফ্রি"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">বাৎসরিক মোট চার্জ (৳)</Label>
                <Input
                  type="number"
                  value={formData.yearlyTotal}
                  onChange={(e) =>
                    setFormData({ ...formData, yearlyTotal: Number(e.target.value) || 0 })
                  }
                  className="bg-slate-800 border-slate-700 text-white mt-1 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={formData.popular || false}
                onCheckedChange={(checked) => setFormData({ ...formData, popular: checked })}
              />
              <span className="text-xs text-purple-200">
                সবচেয়ে জনপ্রিয় প্যাকেজ হিসেবে হাইলাইট করুন
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-purple-300">মূল সুবিধাসমূহ (Features List)</Label>
                <p className="text-[11px] text-slate-400">এই প্যাকেজে যেসব ফিচার অন্তর্ভুক্ত থাকবে</p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddFeature}
                className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md border border-purple-400/40"
              >
                <Plus className="h-4 w-4 mr-1 text-white" /> নতুন ফিচার যোগ করুন
              </Button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {formData.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-700/80 text-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveFeature(idx, 'up')}
                      className="text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === formData.features.length - 1}
                      onClick={() => handleMoveFeature(idx, 'down')}
                      className="text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>

                  <Input
                    value={feat.text}
                    onChange={(e) => handleUpdateFeature(idx, 'text', e.target.value)}
                    className="flex-1 bg-slate-800 border-slate-700 text-white text-xs h-8"
                    placeholder="ফিচারের নাম"
                  />

                  <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 px-2 py-1 rounded text-[11px] border border-slate-700">
                    <input
                      type="checkbox"
                      checked={feat.highlight || false}
                      onChange={(e) => handleUpdateFeature(idx, 'highlight', e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span className="text-emerald-400 font-bold">হাইলাইট</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 px-2 py-1 rounded text-[11px] border border-slate-700">
                    <input
                      type="checkbox"
                      checked={feat.excluded || false}
                      onChange={(e) => handleUpdateFeature(idx, 'excluded', e.target.checked)}
                      className="rounded accent-slate-400"
                    />
                    <span className="text-slate-300 font-medium">বাদ (—)</span>
                  </label>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveFeature(idx)}
                    className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
            >
              প্যাকেজ সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
