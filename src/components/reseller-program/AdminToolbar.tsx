'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Save,
  RotateCcw,
  Sparkles,
  Loader2,
  Plus,
  CheckCircle2,
} from 'lucide-react';

interface AdminToolbarProps {
  isEditMode: boolean;
  onToggleEditMode: (val: boolean) => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onReset: () => void;
  onRestoreDefaults: () => void;
  onAddPackage: () => void;
  onAddFaq: () => void;
  userRole?: string;
  userEmail?: string;
}

export function AdminToolbar({
  isEditMode,
  onToggleEditMode,
  isSaving,
  hasUnsavedChanges,
  onSave,
  onReset,
  onRestoreDefaults,
  onAddPackage,
  onAddFaq,
  userRole,
  userEmail,
}: AdminToolbarProps) {
  return (
    <div className="sticky top-0 z-50 w-full bg-slate-950/95 backdrop-blur-md border-b border-purple-500/40 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-white">
        
        {/* Left: Role Info & Edit Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-full bg-purple-600/30 text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white">রিসেলার পেজ এডিটর</span>
                <Badge className="bg-purple-600/80 text-white text-[10px] px-1.5 py-0">
                  {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                </Badge>
              </div>
              <p className="text-[10px] text-purple-300/70 hidden sm:block">
                {userEmail}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-white/20 mx-1" />

          {/* Edit Mode Switch */}
          <div className="flex items-center gap-2 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-500/30">
            <Switch
              checked={isEditMode}
              onCheckedChange={onToggleEditMode}
              className="data-[state=checked]:bg-pink-600"
            />
            <span className="text-xs font-bold text-purple-200">
              {isEditMode ? '✏️ এডিট মোড চালু' : '👁️ ভিউ মোড'}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isEditMode && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={onAddPackage}
                className="h-8 text-xs bg-purple-700 hover:bg-purple-600 text-white font-bold shadow-sm border border-purple-400/40"
              >
                <Plus className="h-4 w-4 mr-1 text-amber-300" /> প্যাকেজ যোগ
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={onAddFaq}
                className="h-8 text-xs bg-pink-700 hover:bg-pink-600 text-white font-bold shadow-sm border border-pink-400/40"
              >
                <Plus className="h-4 w-4 mr-1 text-pink-200" /> FAQ যোগ
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={onReset}
                disabled={!hasUnsavedChanges || isSaving}
                className="h-8 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> রিসেট
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={onRestoreDefaults}
                disabled={isSaving}
                className="h-8 text-xs bg-amber-700 hover:bg-amber-600 text-white border border-amber-500 font-semibold shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-200" /> ডিফল্ট
              </Button>
            </>
          )}

          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className={`h-8 font-bold text-xs shadow-md transition-all ${
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white animate-pulse'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> সংরক্ষণ হচ্ছে...
              </>
            ) : hasUnsavedChanges ? (
              <>
                <Save className="h-3.5 w-3.5 mr-1" /> সেভ করুন (পরিবর্তন আছে)
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> সংরক্ষিত আছে
              </>
            )}
          </Button>
        </div>

      </div>

      {isEditMode && (
        <div className="bg-gradient-to-r from-purple-900/90 via-pink-900/80 to-purple-900/90 px-4 py-1.5 text-center text-[11px] sm:text-xs text-purple-100 border-t border-purple-500/20">
          💡 <strong>টিপস:</strong> আপনি নিচে যেকোনো সেকশনের পাশে থাকা <strong>"✏️ এডিট"</strong> বাটনে ক্লিক করে টেক্সট ও মূল্য পরিবর্তন করতে পারেন। কাজ শেষে <strong>"সেভ করুন"</strong> বাটনে ক্লিক করুন।
        </div>
      )}
    </div>
  );
}
