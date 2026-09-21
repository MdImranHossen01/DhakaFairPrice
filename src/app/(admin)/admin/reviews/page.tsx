'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  MessageSquare,
  Star,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function ReviewsModerationPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/admin/reviews');
      if (!res.ok) throw new Error('Failed to load reviews');
      const data = await res.json();
      setReviews(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success(`Review ${status}`);
        fetchReviews();
      } else {
        toast.error('Failed to update review status');
      }
    } catch (error) {
      toast.error('Error updating review status');
    }
  };

  const deleteReview = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This review will be permanently deleted!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D1B2',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-lg px-4 py-2 font-bold',
        cancelButton: 'rounded-lg px-4 py-2 font-bold'
      }
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/reviews/${id}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          toast.success('Review deleted');
          fetchReviews();
        } else {
          toast.error('Failed to delete review');
        }
      } catch (error) {
        toast.error('Error deleting review');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-none">Pending</Badge>;
      case 'approved': return <Badge variant="secondary" className="bg-green-100 text-green-800 border-none">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredReviews = reviews.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (r.product?.name && r.product.name.toLowerCase().includes(term)) ||
      (r.user?.name && r.user.name.toLowerCase().includes(term)) ||
      (r.user?.email && r.user.email.toLowerCase().includes(term)) ||
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.comment && r.comment.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE) || 1;
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex-1 space-y-4 px-0 py-2 md:p-8 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 md:px-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Review Moderation</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Manage and moderate customer product reviews.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 text-xs">
            {reviews.filter(r => r.status === 'pending').length} Pending Reviews
          </Badge>
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reviews..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs md:text-sm rounded-xl"
            />
          </div>
        </div>
      </div>
      
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[200px]">Product</TableHead>
                <TableHead className="w-[150px]">Customer</TableHead>
                <TableHead className="w-[100px]">Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="text-right w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {search ? 'No reviews match your search.' : 'No reviews found for moderation.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReviews.map((review) => (
                  <TableRow key={review._id} className={review.status === 'pending' ? 'bg-yellow-50/30' : ''}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm truncate max-w-[180px]">{review.product?.name}</span>
                        {review.product?.slug && (
                          <Link 
                            href={`/product/${review.product?.slug}`} 
                            target="_blank"
                            className="text-[10px] text-primary flex items-center gap-1 hover:underline"
                          >
                            View Product <ExternalLink className="h-2 w-2" />
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="font-semibold">{review.user?.name || review.name}</span>
                        <span className="text-muted-foreground truncate max-w-[140px]">{review.user?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="font-bold text-sm">{review.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-[300px]" title={review.comment}>
                        {review.comment}
                      </p>
                      <span className="text-[10px] text-muted-foreground italic block mt-1">
                        {review.createdAt && !isNaN(new Date(review.createdAt).getTime()) 
                          ? format(new Date(review.createdAt), 'MMM dd, yyyy')
                          : 'Date N/A'}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(review.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {review.status !== 'approved' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-green-600 hover:text-green-700 hover:bg-green-50" 
                            onClick={() => updateStatus(review._id, 'approved')}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {review.status !== 'rejected' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10" 
                            onClick={() => updateStatus(review._id, 'rejected')}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/5" 
                          onClick={() => deleteReview(review._id)}
                          title="Delete Forever"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden p-2 space-y-2.5">
          {paginatedReviews.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {search ? 'No reviews match your search.' : 'No reviews found for moderation.'}
            </div>
          ) : (
            paginatedReviews.map((review) => (
              <div key={review._id} className={`p-3 bg-card border rounded-lg shadow-sm space-y-2 ${review.status === 'pending' ? 'border-yellow-300' : ''}`}>
                <div className="flex items-start justify-between gap-2 border-b pb-2">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground line-clamp-1">{review.product?.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{review.user?.name || review.name} • {review.user?.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(review.status)}
                    <div className="flex items-center gap-0.5 text-yellow-500 text-xs font-bold">
                      <Star className="h-3 w-3 fill-current" />
                      <span>{review.rating}/5</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">{review.comment}</p>

                <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                  <span>
                    {review.createdAt && !isNaN(new Date(review.createdAt).getTime()) 
                      ? format(new Date(review.createdAt), 'MMM dd, yyyy')
                      : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    {review.status !== 'approved' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs px-2 text-green-600 border-green-200" 
                        onClick={() => updateStatus(review._id, 'approved')}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                    )}
                    {review.status !== 'rejected' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs px-2 text-destructive border-destructive/20" 
                        onClick={() => updateStatus(review._id, 'rejected')}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs px-2 text-muted-foreground" 
                      onClick={() => deleteReview(review._id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredReviews.length)} of{' '}
              {filteredReviews.length} reviews
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

