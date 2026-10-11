'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  MoreVertical,
  Edit,
  Trash2,
  Settings,
  PlusCircle,
  TrendingUp,
  Store,
  Loader2,
  CheckCircle2,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { cn } from '@/lib/utils';

export interface ProductActionMenuProps {
  product: {
    _id?: string;
    name: string;
    slug: string;
    price?: number;
    salePrice?: number;
    resellerPrice?: number;
    purchasePrice?: number;
    images?: string[];
    uploadedBy?: any;
    [key: string]: any;
  };
  className?: string;
}

export function ProductActionMenu({ product, className }: ProductActionMenuProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const role = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id;
  const resellerId = (session?.user as any)?.resellerId;

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isReseller = role === 'reseller';

  // Modal State for Reseller Sourcing
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourcing, setSourcing] = useState(false);

  // Compute wholesale cost & initial retail price
  const wholesaleCost = Math.round(
    Number(product.resellerPrice ?? product.purchasePrice ?? product.price ?? 0)
  );
  const initialRetail = Math.round(
    Number(product.salePrice ?? product.price ?? wholesaleCost)
  );
  const [retailPrice, setRetailPrice] = useState<number>(initialRetail);

  // Check product ownership for Resellers
  const uploadedById =
    typeof product.uploadedBy === 'object' && product.uploadedBy !== null
      ? (product.uploadedBy._id?.toString() || product.uploadedBy.toString())
      : product.uploadedBy?.toString();

  const isOwnProduct = Boolean(
    uploadedById && (uploadedById === resellerId || uploadedById === currentUserId)
  );

  const isResellerProduct = Boolean(uploadedById);

  const initialStoreName =
    (typeof product.uploadedBy === 'object' && product.uploadedBy !== null
      ? (product.uploadedBy.storeName || product.uploadedBy.name)
      : null) ||
    product.uploadedByStoreName ||
    null;

  const [resellerStoreName, setResellerStoreName] = useState<string | null>(initialStoreName);

  useEffect(() => {
    if (initialStoreName) {
      setResellerStoreName(initialStoreName);
    } else if (uploadedById && !isOwnProduct) {
      fetch(`/api/reseller/store-lookup?id=${uploadedById}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.storeName) {
            setResellerStoreName(data.storeName);
          }
        })
        .catch(() => {});
    }
  }, [uploadedById, initialStoreName, isOwnProduct]);

  // If user is neither Admin nor Reseller, render nothing
  if (!isAdmin && !isReseller) {
    return null;
  }

  // Delete Handler with SweetAlert2 confirmation
  const handleDeleteProduct = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `"${product.name}" will be permanently deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--destructive, #ef4444)',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/products/${product.slug}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete product');
      }
      toast.success('Product deleted successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Failed to delete product'}`);
    }
  };

  // Reseller Quick Sourcing to Store Handler
  const handleAddToStore = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product._id) {
      toast.error('Product ID not found');
      return;
    }

    if (!retailPrice || retailPrice <= 0) {
      toast.error('Please enter a valid retail price');
      return;
    }

    if (wholesaleCost > 0 && retailPrice < wholesaleCost) {
      toast.warning('Selling price cannot be less than wholesale cost!');
      return;
    }

    setSourcing(true);
    try {
      const res = await fetch('/api/reseller/products/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id,
          retailPrice: Number(retailPrice),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`✓ "${product.name}" added to your store successfully!`);
        setShowSourceModal(false);
      } else {
        toast.error(data.error || 'Failed to add product to store');
      }
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setSourcing(false);
    }
  };

  const estimatedProfit = (Number(retailPrice) || 0) - wholesaleCost;

  return (
    <>
      <div
        className={cn('absolute bottom-3 right-3 z-20', className)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full bg-transparent text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] group-hover:bg-white group-hover:text-black group-hover:shadow-md group-hover:drop-shadow-none hover:!bg-white hover:!text-black hover:!shadow-md hover:!drop-shadow-none data-[state=open]:!bg-white data-[state=open]:!text-black data-[state=open]:!shadow-md data-[state=open]:!drop-shadow-none transition-all duration-200 border-0 focus-visible:ring-0 focus-visible:outline-none"
              aria-label="Product Actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-border/80 p-1">
            {/* 1. ADMIN & SUPER_ADMIN VIEW */}
            {isAdmin && (
              <>
                {!isResellerProduct ? (
                  <>
                    <div className="px-2.5 py-1.5 text-xs bg-blue-500/10 rounded-lg mb-1">
                      <p className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-blue-600" />
                        Main Store Product
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Swapnobaz Official Catalog
                      </p>
                    </div>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/products/${product.slug}/edit`);
                      }}
                      className="cursor-pointer font-medium"
                    >
                      <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Product
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={handleDeleteProduct}
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 font-medium"
                    >
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/admin/products');
                      }}
                      className="cursor-pointer font-medium"
                    >
                      <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Manage Products
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <div className="px-2.5 py-1.5 text-xs bg-purple-500/10 rounded-lg mb-1">
                      <p className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-purple-600" />
                        Reseller Product
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Store: <span className="font-bold text-foreground">{resellerStoreName || 'Reseller'}</span>
                      </p>
                    </div>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/admin/products');
                      }}
                      className="cursor-pointer font-medium"
                    >
                      <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Manage Products
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/admin/resellers');
                      }}
                      className="cursor-pointer font-medium"
                    >
                      <Store className="mr-2 h-4 w-4 text-primary" /> Reseller Directory
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}

            {/* 2. RESELLER VIEW */}
            {isReseller && (
              <>
                {/* 2A: Reseller's own uploaded product */}
                {isOwnProduct ? (
                  <>
                    <div className="px-2.5 py-1.5 text-xs bg-green-500/10 rounded-lg mb-1">
                      <p className="font-bold text-green-700 dark:text-green-300 flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-green-600" />
                        আমার নিজস্ব প্রোডাক্ট
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Uploaded by your store
                      </p>
                    </div>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/reseller/products/${product._id || product.slug}/edit`);
                      }}
                      className="cursor-pointer font-medium"
                    >
                      <Edit className="mr-2 h-4 w-4 text-primary" /> Edit My Product
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={handleDeleteProduct}
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 font-medium"
                    >
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/reseller/products');
                      }}
                      className="cursor-pointer font-medium"
                    >
                      <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Manage My Products
                    </DropdownMenuItem>
                  </>
                ) : (
                  /* 2B: Main store or shared product (Quick Add to Store) */
                  <>
                    {/* Origin attribution Header for Reseller */}
                    <div className={`px-2.5 py-1.5 text-xs rounded-lg mb-1 ${isResellerProduct ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}>
                      <p className={`font-bold flex items-center gap-1.5 ${isResellerProduct ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'}`}>
                        {isResellerProduct ? (
                          <>
                            <Users className="h-3.5 w-3.5 text-purple-600" />
                            অন্য Reseller-এর প্রোডাক্ট
                          </>
                        ) : (
                          <>
                            <Store className="h-3.5 w-3.5 text-blue-600" />
                            Main Store প্রোডাক্ট
                          </>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {isResellerProduct ? (
                          <>Store: <span className="font-bold text-foreground">{resellerStoreName || 'Reseller'}</span></>
                        ) : (
                          <>উৎস: <span className="font-bold text-foreground">Swapnobaz Official</span></>
                        )}
                      </p>
                    </div>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSourceModal(true);
                      }}
                      className="cursor-pointer font-bold text-primary focus:text-primary focus:bg-primary/10"
                    >
                      <PlusCircle className="mr-2 h-4 w-4 text-primary" /> Add to Your Store
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/reseller/products/source');
                      }}
                      className="cursor-pointer font-medium"
                    >
                      <ShoppingBag className="mr-2 h-4 w-4 text-muted-foreground" /> Source B2B Catalog
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/reseller/dashboard');
                      }}
                      className="cursor-pointer font-medium"
                    >
                      <Store className="mr-2 h-4 w-4 text-muted-foreground" /> Reseller Dashboard
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick Source Modal for Resellers */}
      {isReseller && (
        <Dialog open={showSourceModal} onOpenChange={setShowSourceModal}>
          <DialogContent
            className="sm:max-w-[480px] p-6 rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader className="space-y-1 text-left">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Store className="h-4 w-4" /> Reseller Store Sourcing
              </div>
              <DialogTitle className="text-lg font-black tracking-tight leading-snug">
                Add Product to Your Store
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set your desired retail selling price based on the wholesale cost to start selling.
              </DialogDescription>
            </DialogHeader>

            {/* Product Summary Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 mt-1">
              <div className="relative h-14 w-14 rounded-lg overflow-hidden shrink-0 border bg-muted">
                <Image
                  src={product.images?.[0] || '/placeholder.png'}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
                  {product.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] py-0 px-1.5 font-semibold ${
                      isResellerProduct
                        ? 'border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/10'
                        : 'border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10'
                    }`}
                  >
                    {isResellerProduct
                      ? `Reseller: ${resellerStoreName || 'Reseller'}`
                      : 'Main Store (Swapnobaz)'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Main Store Price: <span className="font-semibold text-foreground">Tk {Math.round(product.price || 0)}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleAddToStore} className="space-y-4 pt-2">
              {/* Cost vs Selling Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Wholesale Cost:</span>
                  <span className="text-base font-black text-foreground">Tk {wholesaleCost}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Estimated Net Profit:</span>
                  <span
                    className={cn(
                      'text-base font-black flex items-center gap-1',
                      estimatedProfit >= 0 ? 'text-emerald-600' : 'text-destructive'
                    )}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Tk {estimatedProfit}
                  </span>
                </div>
              </div>

              {/* Retail Price Input */}
              <div className="space-y-1.5">
                <Label htmlFor="selling-price" className="text-xs font-bold">
                  Your Retail Selling Price <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                    Tk
                  </span>
                  <Input
                    id="selling-price"
                    type="number"
                    min={wholesaleCost || 1}
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(Number(e.target.value))}
                    className="pl-9 text-base font-black h-11"
                    placeholder="e.g. 500"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Customers on your storefront (<Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">subdomain.swapnobaz.com</Badge>) will buy at this price.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSourceModal(false)}
                  disabled={sourcing}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sourcing} className="font-bold">
                  {sourcing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding to Store...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Add to Store
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
