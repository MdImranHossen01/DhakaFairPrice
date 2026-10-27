'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Copy,
  Eye,
  Monitor,
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

interface LandingPageItem {
  _id: string;
  title: string;
  slug: string;
  isActive: boolean;
  sections?: any[];
  orderCount?: number;
  liveUrl?: string;
  createdAt?: string;
}

export default function ResellerLandingPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reseller/landing-pages');
      if (!res.ok) throw new Error('Failed to load landing pages');
      const data = await res.json();
      setPages(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load landing pages');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const result = await Swal.fire({
      title: 'Delete Landing Page?',
      text: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/reseller/landing-pages/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Landing page deleted successfully');
          setPages(prev => prev.filter(p => p._id !== id));
        } else {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to delete');
        }
      } catch (error: any) {
        toast.error(error.message || 'Could not delete page');
      }
    }
  };

  const handleToggleActive = async (page: LandingPageItem) => {
    const newStatus = !page.isActive;
    try {
      const res = await fetch(`/api/reseller/landing-pages/${page._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });

      if (res.ok) {
        setPages(prev => prev.map(p => p._id === page._id ? { ...p, isActive: newStatus } : p));
        toast.success(newStatus ? 'Page is now live!' : 'Page unpublished');
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const handleCopyLink = (url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success('Landing page link copied to clipboard!');
  };

  const handleCreate = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Create Landing Page',
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="text-xs font-semibold text-gray-700 block mb-1">Page Title</label>
            <input id="swal-title" class="swal2-input !m-0 !w-full text-sm" placeholder="e.g. Exclusive Combo Offer">
          </div>
          <div class="mt-3">
            <label class="text-xs font-semibold text-gray-700 block mb-1">URL Slug</label>
            <input id="swal-slug" class="swal2-input !m-0 !w-full text-sm" placeholder="e.g. combo-offer">
            <p class="text-[11px] text-gray-400 mt-1">Your page will be live at: /lp/&lt;slug&gt;</p>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create & Open Builder',
      preConfirm: () => {
        const title = (document.getElementById('swal-title') as HTMLInputElement)?.value;
        const slug = (document.getElementById('swal-slug') as HTMLInputElement)?.value;
        if (!title || !slug) {
          Swal.showValidationMessage('Title and Slug are required');
          return false;
        }
        return { title, slug };
      }
    });

    if (formValues) {
      try {
        const res = await fetch('/api/reseller/landing-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues)
        });

        if (res.ok) {
          const newPage = await res.json();
          toast.success('Landing Page Created!');
          router.push(`/reseller/landing-pages/${newPage._id}/builder`);
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.message || 'Failed to create landing page');
        }
      } catch (error) {
        toast.error('Error creating landing page');
      }
    }
  };

  const filteredPages = pages.filter(p => {
    const searchTerm = (search || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    const slug = (p.slug || '').toLowerCase();
    return title.includes(searchTerm) || slug.includes(searchTerm);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Monitor className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Landing Pages</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Create high-converting, single-product landing pages with custom sections and direct ordering for your store.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2 rounded-xl px-5 font-bold shadow-md hover:shadow-lg transition-all">
          <Plus className="h-4 w-4" /> Create Landing Page
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by title or slug..." 
            className="pl-9 rounded-xl bg-card border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          Total Pages: <span className="font-bold text-foreground">{filteredPages.length}</span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="border rounded-2xl bg-card overflow-hidden shadow-sm hidden md:block">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Title & Live URL</TableHead>
              <TableHead className="font-bold text-center">Sections</TableHead>
              <TableHead className="font-bold text-center">Orders</TableHead>
              <TableHead className="font-bold text-center">Status</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Loading landing pages...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredPages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 rounded-full bg-muted">
                      <Layers className="h-8 w-8 opacity-40" />
                    </div>
                    <p className="font-semibold text-base text-foreground">No landing pages found</p>
                    <p className="text-xs max-w-sm">Build your first landing page to boost conversions for special products and ad campaigns.</p>
                    <Button onClick={handleCreate} size="sm" className="rounded-xl mt-2 gap-1.5">
                      <Plus className="h-4 w-4" /> Create First Page
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredPages.map((page) => (
              <TableRow key={page._id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <span className="font-bold text-sm text-foreground">{page.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        /lp/{page.slug}
                      </span>
                      {page.liveUrl && (
                        <button
                          onClick={() => handleCopyLink(page.liveUrl)}
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                          title="Copy full live link"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="rounded-md font-mono text-xs">
                    {page.sections?.length || 0} sections
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-bold text-emerald-600">
                  {page.orderCount || 0}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Switch
                      checked={page.isActive}
                      onCheckedChange={() => handleToggleActive(page)}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {page.isActive ? 'Live' : 'Draft'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="outline" size="sm" asChild className="h-8 rounded-lg text-xs gap-1.5 font-bold">
                      <Link href={`/reseller/landing-pages/${page._id}/builder`}>
                        <Edit3 className="h-3.5 w-3.5 text-primary" /> Builder
                      </Link>
                    </Button>
                    {page.liveUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => window.open(page.liveUrl, '_blank')}
                        title="View Live"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl w-44 shadow-xl">
                        <DropdownMenuLabel>Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {page.liveUrl && (
                          <DropdownMenuItem 
                            className="cursor-pointer gap-2"
                            onClick={() => handleCopyLink(page.liveUrl)}
                          >
                            <Copy className="h-4 w-4 text-blue-500" /> Copy Public Link
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="cursor-pointer gap-2"
                          onClick={() => handleToggleActive(page)}
                        >
                          {page.isActive ? (
                            <>
                              <XCircle className="h-4 w-4 text-amber-500" /> Unpublish
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Publish
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                          onClick={() => handleDelete(page._id, page.title)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete Page
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 bg-card border rounded-2xl text-muted-foreground text-sm">
            Loading pages...
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-2xl text-muted-foreground text-sm p-4 space-y-3">
            <p className="font-bold text-foreground">No landing pages found</p>
            <p className="text-xs">Create your first landing page to boost conversions.</p>
            <Button onClick={handleCreate} size="sm" className="rounded-xl">
              <Plus className="h-4 w-4 mr-1" /> Create First Page
            </Button>
          </div>
        ) : (
          filteredPages.map((page) => (
            <div key={page._id} className="p-4 rounded-2xl border bg-card shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm leading-tight text-foreground">{page.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <span>/lp/{page.slug}</span>
                    {page.liveUrl && (
                      <button
                        onClick={() => handleCopyLink(page.liveUrl)}
                        className="text-primary p-0.5"
                        title="Copy link"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <Badge variant={page.isActive ? "default" : "secondary"} className="rounded-full px-2.5 text-[11px] shrink-0">
                  {page.isActive ? "Live" : "Draft"}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-3">
                  <span>Sections: <strong className="text-foreground">{page.sections?.length || 0}</strong></span>
                  <span>Orders: <strong className="text-emerald-600 font-bold">{page.orderCount || 0}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" asChild className="h-8 rounded-lg text-xs gap-1 font-bold">
                    <Link href={`/reseller/landing-pages/${page._id}/builder`}>
                      <Edit3 className="h-3 w-3 text-primary" /> Builder
                    </Link>
                  </Button>
                  {page.liveUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground"
                      onClick={() => window.open(page.liveUrl, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg text-destructive"
                    onClick={() => handleDelete(page._id, page.title)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
