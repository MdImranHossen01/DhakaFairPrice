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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { IResellerProgramData, IWhyChooseUsItem } from '@/types/reseller-program';
import { AVAILABLE_ICONS, IconRenderer } from './IconRenderer';

interface EditWhyChooseUsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: IResellerProgramData['whyChooseUs'];
  onSave: (updated: IResellerProgramData['whyChooseUs']) => void;
}

export function EditWhyChooseUsDialog({
  open,
  onOpenChange,
  data,
  onSave,
}: EditWhyChooseUsDialogProps) {
  const [formData, setFormData] = useState<IResellerProgramData['whyChooseUs']>(data);

  useEffect(() => {
    if (open) {
      setFormData(data);
    }
  }, [open, data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          icon: 'Sparkles',
          iconColor: 'text-amber-400',
          title: 'নতুন সুবিধা',
          desc: 'সুবিধার সংক্ষিপ্ত বিবরণ এখানে লিখুন',
        },
      ],
    });
  };

  const handleUpdateItem = (index: number, key: keyof IWhyChooseUsItem, val: string) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [key]: val };
    setFormData({ ...formData, items: updated });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-300">
            <span>🌟</span> কেন আমাদের বেছে নেবেন সেকশন এডিট করুন
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-purple-200">সেকশন শিরোনাম</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="কেন আমাদের বেছে নেবেন?"
              />
            </div>
            <div>
              <Label className="text-xs text-purple-200">সাব-টাইটেল</Label>
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="আমরা শুধু ওয়েবসাইট বানাই না..."
              />
            </div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-purple-300">সুবিধাসমূহের কার্ড তালিকা</Label>
              <Button
                type="button"
                size="sm"
                onClick={handleAddItem}
                className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md border border-purple-400/40"
              >
                <Plus className="h-4 w-4 mr-1 text-white" /> নতুন কার্ড যোগ করুন
              </Button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {formData.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={item.icon || 'Sparkles'}
                        onChange={(e) => handleUpdateItem(idx, 'icon', e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white"
                      >
                        {AVAILABLE_ICONS.map((ic) => (
                          <option key={ic} value={ic}>
                            {ic}
                          </option>
                        ))}
                      </select>
                      <div className="p-1 bg-slate-800 rounded border border-slate-700">
                        <IconRenderer name={item.icon} className="h-4 w-4 text-amber-400" />
                      </div>
                      <Input
                        value={item.title}
                        onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white text-xs h-8 font-bold flex-1"
                        placeholder="কার্ড শিরোনাম"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveItem(idx)}
                      className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    value={item.desc}
                    onChange={(e) => handleUpdateItem(idx, 'desc', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white text-xs"
                    placeholder="কার্ডের বিস্তারিত বিবরণ"
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
