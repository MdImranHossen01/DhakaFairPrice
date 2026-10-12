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
import { IResellerProgramData, IWorkflowStep } from '@/types/reseller-program';
import { AVAILABLE_ICONS, IconRenderer } from './IconRenderer';

interface EditWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: IResellerProgramData['workflow'];
  onSave: (updated: IResellerProgramData['workflow']) => void;
}

export function EditWorkflowDialog({ open, onOpenChange, data, onSave }: EditWorkflowDialogProps) {
  const [formData, setFormData] = useState<IResellerProgramData['workflow']>(data);

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

  const handleAddStep = () => {
    const nextStepNum = formData.steps.length + 1;
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          step: nextStepNum,
          icon: 'Rocket',
          title: `স্টেপ ${nextStepNum}`,
          desc: 'স্টেপের বিবরণ লিখুন',
          time: '১ দিন',
        },
      ],
    });
  };

  const handleUpdateStep = (index: number, key: keyof IWorkflowStep, val: any) => {
    const updated = [...formData.steps];
    updated[index] = { ...updated[index], [key]: val };
    setFormData({ ...formData, steps: updated });
  };

  const handleRemoveStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-300">
            <span>⏱️</span> কাজের ধাপসমূহ (Workflow Timeline) এডিট করুন
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-purple-300">ধাপসমূহের তালিকা</Label>
            <Button
              type="button"
              size="sm"
              onClick={handleAddStep}
              className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md border border-purple-400/40"
            >
              <Plus className="h-4 w-4 mr-1 text-white" /> নতুন ধাপ যোগ করুন
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {formData.steps.map((st, idx) => (
              <div key={idx} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="h-6 w-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <select
                      value={st.icon || 'Rocket'}
                      onChange={(e) => handleUpdateStep(idx, 'icon', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                      {AVAILABLE_ICONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>
                    <div className="p-1 bg-slate-900 rounded border border-slate-700">
                      <IconRenderer name={st.icon} className="h-4 w-4 text-purple-300" />
                    </div>
                    <Input
                      value={st.title}
                      onChange={(e) => handleUpdateStep(idx, 'title', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white text-xs h-8 font-bold flex-1"
                      placeholder="ধাপের শিরোনাম"
                    />
                    <Input
                      value={st.time}
                      onChange={(e) => handleUpdateStep(idx, 'time', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white text-xs h-8 w-24"
                      placeholder="সময় (e.g. ১ মিনিট)"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveStep(idx)}
                    className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  value={st.desc}
                  onChange={(e) => handleUpdateStep(idx, 'desc', e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                  placeholder="ধাপের বিবরণ"
                />
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
