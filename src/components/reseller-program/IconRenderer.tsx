'use client';

import React from 'react';
import * as Icons from 'lucide-react';

interface IconRendererProps {
  name?: string;
  className?: string;
  fallback?: React.ReactNode;
}

export const AVAILABLE_ICONS = [
  'Sprout',
  'Rocket',
  'Crown',
  'Zap',
  'Puzzle',
  'ShieldCheck',
  'Activity',
  'PhoneCall',
  'Package',
  'FileText',
  'CreditCard',
  'Wrench',
  'Star',
  'Store',
  'Layers',
  'Sparkles',
  'CheckCircle2',
  'Clock',
  'Laptop',
  'Code2',
  'HelpCircle',
  'Gem',
  'Flame',
  'Gift',
  'Award',
  'ShoppingBag',
  'TrendingUp',
  'Truck',
  'Headphones',
  'DollarSign'
];

export function IconRenderer({ name, className = 'h-5 w-5', fallback }: IconRendererProps) {
  if (!name) {
    return <Icons.Sparkles className={className} />;
  }

  const Component = (Icons as any)[name];

  if (!Component) {
    return fallback ? <>{fallback}</> : <Icons.Sparkles className={className} />;
  }

  return <Component className={className} />;
}
