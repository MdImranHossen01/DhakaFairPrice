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
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { IResellerProgramData, IFaqItem } from '@/types/reseller-program';

interface EditFaqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: IResellerProgramData['faqs'];
  onSave: (updated: IResellerProgramData['faqs']) => void;
  activeFaqIndex?: number | null;
}

export function EditFaqDialog({
  open,
  onOpenChange,
  data,
  onSave,
  activeFaqIndex,
}: EditFaqDialogProps) {
  const [formData, setFormData] = useState<IResellerProgramData['faqs']>(data);

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

  const handleAddFaq = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          q: 'নতুন প্রশ্ন এখানে লিখুন?',
          a: 'প্রশ্নের উত্তর এখানে লিখুন।',
        },
      ],
    });
  };

  const handleUpdateItem = (index: number, key: keyof IFaqItem, val: string) => {
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

  const handleMoveFaq = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formData.items.length) return;

    const updated = [...formData.items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFormData({ ...formData, items: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 text-white border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-300">
            <span>❓</span> FAQ (সচরাচর জিজ্ঞাসা) এডিট করুন
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
                placeholder="সচরাচর জিজ্ঞাসা"
              />
            </div>
            <div>
              <Label className="text-xs text-purple-200">সাব-টাইটেল</Label>
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="প্যাকেজ সম্পর্কে সাধারণ প্রশ্নগুলোর উত্তর"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Label className="text-sm font-bold text-amber-300">FAQ প্রশ্নোত্তর তালিকা</Label>
            <Button
              type="button"
              size="sm"
              onClick={handleAddFaq}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md border border-purple-400/40"
            >
              <Plus className="h-4 w-4 mr-1 text-white" /> নতুন FAQ যোগ করুন
            </Button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {formData.items.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                  activeFaqIndex === idx
                    ? 'bg-purple-950/40 border-purple-400 ring-2 ring-purple-500/30'
                    : 'bg-slate-800/80 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-purple-700 text-white text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveFaq(idx, 'up')}
                        className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === formData.items.length - 1}
                        onClick={() => handleMoveFaq(idx, 'down')}
                        className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveItem(idx)}
                    className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div>
                  <Label className="text-[11px] text-purple-200">প্রশ্ন (Question)</Label>
                  <Input
                    value={item.q}
                    onChange={(e) => handleUpdateItem(idx, 'q', e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white text-xs mt-0.5 font-bold"
                    placeholder="প্রশ্ন লিখুন"
                  />
                </div>

                <div>
                  <Label className="text-[11px] text-slate-300">উত্তর (Answer)</Label>
                  <Textarea
                    rows={2}
                    value={item.a}
                    onChange={(e) => handleUpdateItem(idx, 'a', e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white text-xs mt-0.5 leading-relaxed"
                    placeholder="উত্তর লিখুন"
                  />
                </div>
              </div>
            ))}
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
