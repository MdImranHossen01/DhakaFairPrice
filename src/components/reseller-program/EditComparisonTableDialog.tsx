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
import { Plus, Trash2, Check, X } from 'lucide-react';
import {
  IResellerProgramData,
  IComparisonTableCategory,
  IComparisonTableRow,
} from '@/types/reseller-program';

interface EditComparisonTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: IResellerProgramData['comparisonTable'];
  onSave: (updated: IResellerProgramData['comparisonTable']) => void;
}

export function EditComparisonTableDialog({
  open,
  onOpenChange,
  data,
  onSave,
}: EditComparisonTableDialogProps) {
  const [formData, setFormData] = useState<IResellerProgramData['comparisonTable']>(data);

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

  const handleAddCategory = () => {
    setFormData({
      ...formData,
      categories: [
        ...formData.categories,
        {
          name: '📁 নতুন ক্যাটাগরি',
          rows: [
            {
              feature: 'নতুন ফিচার',
              starter: true,
              business: true,
              professional: true,
            },
          ],
        },
      ],
    });
  };

  const handleRemoveCategory = (catIdx: number) => {
    setFormData({
      ...formData,
      categories: formData.categories.filter((_, i) => i !== catIdx),
    });
  };

  const handleUpdateCategoryName = (catIdx: number, name: string) => {
    const updated = [...formData.categories];
    updated[catIdx] = { ...updated[catIdx], name };
    setFormData({ ...formData, categories: updated });
  };

  const handleAddRow = (catIdx: number) => {
    const updated = [...formData.categories];
    updated[catIdx] = {
      ...updated[catIdx],
      rows: [
        ...updated[catIdx].rows,
        {
          feature: 'নতুন ফিচার নাম',
          starter: true,
          business: true,
          professional: true,
        },
      ],
    };
    setFormData({ ...formData, categories: updated });
  };

  const handleRemoveRow = (catIdx: number, rowIdx: number) => {
    const updated = [...formData.categories];
    updated[catIdx] = {
      ...updated[catIdx],
      rows: updated[catIdx].rows.filter((_, i) => i !== rowIdx),
    };
    setFormData({ ...formData, categories: updated });
  };

  const handleUpdateRow = (
    catIdx: number,
    rowIdx: number,
    field: keyof IComparisonTableRow,
    val: any
  ) => {
    const updated = [...formData.categories];
    const targetRow = { ...updated[catIdx].rows[rowIdx], [field]: val };
    updated[catIdx].rows[rowIdx] = targetRow;
    setFormData({ ...formData, categories: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-900 text-white border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-300">
            <span>📊</span> প্যাকেজ তুলনা টেবিল এডিট করুন
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-purple-200">টেবিলের শিরোনাম</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="তিনটি প্যাকেজের তুলনা"
              />
            </div>
            <div>
              <Label className="text-xs text-purple-200">সাব-টাইটেল</Label>
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="উপরে মাসিক/বাৎসরিক টগল পরিবর্তন করলে..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Label className="text-sm font-bold text-amber-300">ক্যাটাগরি ও রো (Rows) ব্যবস্থাপনা</Label>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCategory}
              className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md border border-amber-400/40"
            >
              <Plus className="h-4 w-4 mr-1 text-white" /> নতুন ক্যাটাগরি যোগ করুন
            </Button>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {formData.categories.map((cat, catIdx) => (
              <div
                key={catIdx}
                className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-3"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                  <Input
                    value={cat.name}
                    onChange={(e) => handleUpdateCategoryName(catIdx, e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-bold text-sm h-8 flex-1"
                    placeholder="ক্যাটাগরি নাম (e.g. 💰 প্রাইসিং)"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddRow(catIdx)}
                      className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-sm border border-purple-400/40"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1 text-white" /> রো যোগ করুন
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveCategory(catIdx)}
                      className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Rows Table */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-400 px-2">
                    <div className="col-span-5">ফিচার নাম</div>
                    <div className="col-span-2 text-center">Starter</div>
                    <div className="col-span-2 text-center">Business</div>
                    <div className="col-span-2 text-center">Professional</div>
                    <div className="col-span-1 text-center">অ্যাকশন</div>
                  </div>

                  {cat.rows.map((row, rowIdx) => (
                    <div
                      key={rowIdx}
                      className="grid grid-cols-12 gap-2 items-center p-1.5 bg-slate-900/90 rounded border border-slate-700/60 text-xs"
                    >
                      <div className="col-span-5">
                        <Input
                          value={row.feature}
                          onChange={(e) =>
                            handleUpdateRow(catIdx, rowIdx, 'feature', e.target.value)
                          }
                          className="bg-slate-800 border-slate-700 text-white text-xs h-7"
                          placeholder="ফিচারের বিবরণ"
                        />
                      </div>

                      {/* Starter Value */}
                      <div className="col-span-2 flex items-center gap-1">
                        <Input
                          value={
                            typeof row.starter === 'boolean'
                              ? row.starter
                                ? '✔'
                                : '—'
                              : row.starter
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '✔' || v === 'true' || v === 'check') {
                              handleUpdateRow(catIdx, rowIdx, 'starter', true);
                            } else if (v === '—' || v === 'false' || v === 'cross') {
                              handleUpdateRow(catIdx, rowIdx, 'starter', false);
                            } else {
                              handleUpdateRow(catIdx, rowIdx, 'starter', v);
                            }
                          }}
                          className="bg-slate-800 border-slate-700 text-white text-xs h-7 text-center"
                          placeholder="✔ / মান"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateRow(catIdx, rowIdx, 'starter', !row.starter)
                          }
                          title="Toggle Check/Cross"
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          {row.starter === true ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <X className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      </div>

                      {/* Business Value */}
                      <div className="col-span-2 flex items-center gap-1">
                        <Input
                          value={
                            typeof row.business === 'boolean'
                              ? row.business
                                ? '✔'
                                : '—'
                              : row.business
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '✔' || v === 'true') {
                              handleUpdateRow(catIdx, rowIdx, 'business', true);
                            } else if (v === '—' || v === 'false') {
                              handleUpdateRow(catIdx, rowIdx, 'business', false);
                            } else {
                              handleUpdateRow(catIdx, rowIdx, 'business', v);
                            }
                          }}
                          className="bg-slate-800 border-slate-700 text-white text-xs h-7 text-center"
                          placeholder="✔ / মান"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateRow(catIdx, rowIdx, 'business', !row.business)
                          }
                          title="Toggle Check/Cross"
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          {row.business === true ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <X className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      </div>

                      {/* Professional Value */}
                      <div className="col-span-2 flex items-center gap-1">
                        <Input
                          value={
                            typeof row.professional === 'boolean'
                              ? row.professional
                                ? '✔'
                                : '—'
                              : row.professional
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '✔' || v === 'true') {
                              handleUpdateRow(catIdx, rowIdx, 'professional', true);
                            } else if (v === '—' || v === 'false') {
                              handleUpdateRow(catIdx, rowIdx, 'professional', false);
                            } else {
                              handleUpdateRow(catIdx, rowIdx, 'professional', v);
                            }
                          }}
                          className="bg-slate-800 border-slate-700 text-white text-xs h-7 text-center"
                          placeholder="✔ / মান"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateRow(catIdx, rowIdx, 'professional', !row.professional)
                          }
                          title="Toggle Check/Cross"
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          {row.professional === true ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <X className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      </div>

                      {/* Action */}
                      <div className="col-span-1 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveRow(catIdx, rowIdx)}
                          className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
