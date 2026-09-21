'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Eye, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Pagination } from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 10;

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/admin/activity-logs', window.location.origin);
      if (search) url.searchParams.set('userEmail', search);
      if (actionFilter) url.searchParams.set('action', actionFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      toast.error('অ্যাক্টিভিটি লগ লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter]);

  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE) || 1;
  const paginatedLogs = logs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex-1 space-y-4 px-0 py-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">অডিট এবং সিকিউরিটি লগ</h1>
        <p className="text-sm text-muted-foreground">প্ল্যাটফর্মের সকল অ্যাডমিন এবং ইউজার অ্যাকশন এখানে অডিট করুন</p>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ইউজার ইমেইল দিয়ে খুঁজুন..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs md:text-sm"
            />
          </div>
          <Input
            placeholder="অ্যাকশন (যেমন: CREATE, UPDATE)"
            value={actionFilter}
            onChange={e => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-48 h-9 text-xs md:text-sm"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <ShieldAlert className="h-16 w-16 mx-auto mb-4" />
              <p>কোনো অ্যাক্টিভিটি লগ পাওয়া যায়নি</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ ও সময়</TableHead>
                  <TableHead>ইউজার ইমেইল</TableHead>
                  <TableHead>রোল</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                  <TableHead>রিসোর্স</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>আইপি এড্রেস</TableHead>
                  <TableHead className="text-right">বিস্তারিত</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map(log => (
                  <TableRow key={log._id}>
                    <TableCell>{format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm:ss a')}</TableCell>
                    <TableCell className="font-medium">{log.userEmail || 'System/Guest'}</TableCell>
                    <TableCell className="capitalize">{log.role || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell>{log.resource}</TableCell>
                    <TableCell>
                      {log.success ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20">সফল</Badge>
                      ) : (
                        <Badge variant="destructive">ব্যর্থ</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.ip || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-xs text-muted-foreground">
              দেখাচ্ছে {(currentPage - 1) * ITEMS_PER_PAGE + 1} থেকে{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, logs.length)} (মোট {logs.length})
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={selectedLog !== null} onOpenChange={open => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>লগ ডিটেইলস</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 border-b pb-3">
                <div>
                  <span className="text-xs text-muted-foreground">ইউজার</span>
                  <p className="font-semibold">{selectedLog.userEmail || 'System/Guest'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">তারিখ ও সময়</span>
                  <p className="font-semibold">{format(new Date(selectedLog.createdAt), 'dd MMM yyyy, hh:mm:ss a')}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b pb-3">
                <div>
                  <span className="text-xs text-muted-foreground">অ্যাকশন</span>
                  <p className="font-bold">{selectedLog.action}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">রিসোর্স</span>
                  <p className="font-semibold">{selectedLog.resource}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">আইডি</span>
                  <p className="font-mono text-xs">{selectedLog.resourceId || '—'}</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground">User Agent</span>
                <p className="font-mono text-xs bg-muted p-2 rounded">{selectedLog.userAgent || '—'}</p>
              </div>

              {selectedLog.details && (
                <div>
                  <span className="text-xs text-muted-foreground">অতিরিক্ত তথ্য (JSON)</span>
                  <pre className="text-xs bg-muted p-3 rounded font-mono overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.errorMessage && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                  <p className="font-bold">Error Message:</p>
                  <p className="font-mono text-xs">{selectedLog.errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
