'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

export default function ResellerBannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/reseller/cms/banners');
      if (!res.ok) { toast.error('Failed to fetch banners'); return; }
      const data = await res.json();
      setBanners(data.banners || []);
    } catch { toast.error('Failed to fetch banners'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleDelete = async (id: string, title: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete banner "${title}"? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!',
      customClass: { popup: 'rounded-xl' },
    });
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/reseller/cms/banners?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Banner deleted'); fetchBanners(); }
    else toast.error('Failed to delete');
  };

  const toggleStatus = async (id: string, current: boolean) => {
    const res = await fetch('/api/reseller/cms/banners', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !current }),
    });
    if (res.ok) { toast.success(`Banner ${!current ? 'activated' : 'deactivated'}`); fetchBanners(); }
    else toast.error('Failed to update status');
  };

  return (
    <div className="flex flex-col gap-6 py-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Store Banners</h1>
          <p className="text-muted-foreground text-sm">Manage hero slider banners for your store homepage</p>
        </div>
        <Link href="/reseller/cms/banners/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Add Banner</Button>
        </Link>
      </div>

      <div className="rounded-md border bg-background overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[180px]">Preview</TableHead>
              <TableHead>Destination Link</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading banners...</p>
                </div>
              </TableCell></TableRow>
            ) : banners.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-lg font-medium">No banners found</p>
                  <p className="text-sm text-muted-foreground">Add your first banner to get started.</p>
                  <Link href="/reseller/cms/banners/new" className="mt-2">
                    <Button variant="outline" size="sm">Add Banner</Button>
                  </Link>
                </div>
              </TableCell></TableRow>
            ) : (
              banners.map((banner) => (
                <TableRow key={banner._id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="aspect-[21/9] w-[180px] overflow-hidden rounded-md border bg-muted relative">
                      <Image src={banner.image} alt={banner.title || 'Banner'} width={180} height={77}
                        className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground break-all max-w-[250px] inline-block">
                      {banner.link || banner.primaryBtnLink || 'No link (Image only)'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{banner.order}</Badge>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(banner._id, banner.isActive)} className="transition-opacity hover:opacity-80">
                      <Badge variant={banner.isActive ? 'default' : 'secondary'} className="cursor-pointer">
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/reseller/cms/banners/${banner._id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(banner._id, banner.title || 'Banner')}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
