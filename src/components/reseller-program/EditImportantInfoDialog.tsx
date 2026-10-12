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
import { IResellerProgramData } from '@/types/reseller-program';

interface EditImportantInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: IResellerProgramData['importantInfo'];
  onSave: (updated: IResellerProgramData['importantInfo']) => void;
}

export function EditImportantInfoDialog({
  open,
  onOpenChange,
  data,
  onSave,
}: EditImportantInfoDialogProps) {
  const [formData, setFormData] = useState<IResellerProgramData['importantInfo']>(data);

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

  const handleAddPoint = () => {
    setFormData({
      ...formData,
      items: [...formData.items, 'নতুন গুরুত্বপূর্ণ পয়েন্ট এখানে লিখুন...'],
    });
  };

  const handleUpdatePoint = (index: number, val: string) => {
    const updated = [...formData.items];
    updated[index] = val;
    setFormData({ ...formData, items: updated });
  };

  const handleRemovePoint = (index: number) => {
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
            <span>📌</span> গুরুত্বপূর্ণ তথ্য বক্স এডিট করুন
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-purple-200">শিরোনাম</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="গুরুত্বপূর্ণ তথ্য"
            />
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-purple-300">তথ্য পয়েন্টসমূহ (Bullet Points)</Label>
              <Button
                type="button"
                size="sm"
                onClick={handleAddPoint}
                className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md border border-purple-400/40"
              >
                <Plus className="h-4 w-4 mr-1 text-white" /> নতুন পয়েন্ট যোগ করুন
              </Button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {formData.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-slate-900 rounded-lg border border-slate-700">
                  <span className="text-rose-500 font-bold mt-1">•</span>
                  <Textarea
                    rows={2}
                    value={item}
                    onChange={(e) => handleUpdatePoint(idx, e.target.value)}
                    className="flex-1 bg-slate-800 border-slate-700 text-white text-xs leading-relaxed"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemovePoint(idx)}
                    className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-950/40 shrink-0"
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
