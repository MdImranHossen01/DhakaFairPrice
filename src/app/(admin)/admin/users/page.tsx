'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination';
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
  MoreHorizontal, 
  Loader2, 
  User as UserIcon, 
  Eye, 
  ShieldAlert, 
  Calendar,
  Phone,
  MapPin,
  ShoppingBag,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  UserCog,
  Trash2,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import Image from 'next/image';
import Swal from 'sweetalert2';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MobileDataCard, MobileDataRow } from '@/components/common/MobileDataCard';

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  phone?: string;
  addresses?: any[];
  createdAt: string;
  lastActive?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
}

function UsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') || 'all';
  const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(searchParams.get('page') || '1')));

  const [users, setUsers] = useState<UserData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      router.push(`/admin/users?${params.toString()}`);
    }
  }, [debouncedSearchTerm, roleParam]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAssignAdminOpen, setIsAssignAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminImage, setAdminImage] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === 'super_admin';

  const fetchUsers = async (page = currentPage) => {
    setLoading(true);
    try {
      const searchEncoded = encodeURIComponent(debouncedSearchTerm || '');
      const roleEncoded = encodeURIComponent(roleParam || '');
      const response = await fetch(`/api/admin/users?page=${page}&limit=20&search=${searchEncoded}&role=${roleEncoded}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, debouncedSearchTerm, roleParam]);

  useEffect(() => {
    const pageFromParams = Math.max(1, parseInt(searchParams.get('page') || '1'));
    if (pageFromParams !== currentPage) {
      setCurrentPage(pageFromParams);
    }
  }, [searchParams]);

  const openUserDetails = (user: UserData) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const result = await Swal.fire({
      title: 'Change User Role?',
      text: `Are you sure you want to change this user's role to ${newRole}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, change it!',
      customClass: {
        popup: 'rounded-3xl',
        confirmButton: 'rounded-xl font-bold px-6 py-3',
        cancelButton: 'rounded-xl font-bold px-6 py-3'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (response.ok) {
        toast.success(`User role updated to ${newRole}`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update role');
      }
    } catch (error) {
      toast.error('Error updating user role');
    }
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim()) return;

    setIsAssigning(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: adminEmail.trim(),
          name: adminName.trim() || undefined,
          password: adminPassword.trim() || undefined,
          image: adminImage || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Admin access granted successfully');
        setAdminEmail('');
        setAdminName('');
        setAdminPassword('');
        setAdminImage('');
        setIsAssignAdminOpen(false);
        fetchUsers();
      } else {
        toast.error(data.message || 'Failed to assign admin');
      }
    } catch (error) {
      toast.error('Error assigning admin');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const result = await Swal.fire({
      title: 'Delete User?',
      text: `Are you sure you want to permanently delete user "${userName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete permanently!',
      customClass: {
        popup: 'rounded-3xl',
        confirmButton: 'rounded-xl font-bold px-6 py-3',
        cancelButton: 'rounded-xl font-bold px-6 py-3'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success(`User "${userName}" deleted successfully`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Error deleting user');
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 px-0 py-2 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900 capitalize">
            {roleParam === 'all' ? 'All Users' : roleParam === 'user' ? 'Customers' : `${roleParam}s`} Management
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-0.5">
            {roleParam === 'all' 
              ? 'Manage and view all registered customers and staff.' 
              : `Directory of all registered ${roleParam === 'user' ? 'customers' : roleParam + 's'}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {(isSuperAdmin || (session?.user as any)?.role === 'admin') && (
            <Button 
              onClick={() => setIsAssignAdminOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-4 h-9 text-xs shadow-md shadow-blue-200 border-none"
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Assign Admin
            </Button>
          )}
          <div className="bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
            <span className="text-primary font-bold text-xs">
              {totalCount} {roleParam === 'all' ? 'Users' : roleParam === 'user' ? 'Customers' : `${roleParam}s`}
            </span>
          </div>
        </div>
      </div>
      
      {/* Search Filter Input */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search name, email or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-9 rounded-xl border bg-white text-xs shadow-xs"
        />
      </div>

      <div className="rounded-2xl border shadow-xs overflow-hidden bg-white">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[60px]">Avatar</TableHead>
                <TableHead className="font-bold">Name</TableHead>
                <TableHead className="font-bold">Email</TableHead>
                <TableHead className="font-bold">Orders</TableHead>
                <TableHead className="font-bold">Role</TableHead>
                <TableHead className="font-bold">Joined</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-muted-foreground font-medium text-xs">Loading user data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-xs text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      {user.image && user.image !== '' ? (
                        <div className="relative h-9 w-9 rounded-full overflow-hidden border">
                          <Image 
                            src={user.image} 
                            alt={user.name} 
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => openUserDetails(user)}
                        className="font-semibold text-slate-900 hover:text-primary transition-colors text-left"
                      >
                        {user.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-xs">{user.totalOrders} Orders</span>
                        <span className="text-[10px] text-muted-foreground font-medium">৳{user.totalSpent.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === 'admin' || user.role === 'manager' ? 'default' : 'outline'}
                        className={`
                          capitalize px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider
                          ${user.role === 'admin' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                          ${user.role === 'manager' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                        `}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5">User Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openUserDetails(user)} className="cursor-pointer text-xs">
                              <Eye className="mr-2 h-3.5 w-3.5" /> View Details
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5">Management</DropdownMenuLabel>
                            
                            {user.role !== 'admin' && (
                              <DropdownMenuItem 
                                onClick={() => handleUpdateRole(user._id, 'admin')}
                                className="cursor-pointer text-blue-600 font-bold text-xs"
                              >
                                <ShieldCheck className="mr-2 h-3.5 w-3.5" /> Make Admin
                              </DropdownMenuItem>
                            )}

                            {user.role !== 'manager' && (
                              <DropdownMenuItem 
                                onClick={() => handleUpdateRole(user._id, 'manager')}
                                className="cursor-pointer text-primary font-bold text-xs"
                              >
                                <UserCog className="mr-2 h-3.5 w-3.5" /> Make Manager
                              </DropdownMenuItem>
                            )}

                            {user.role !== 'user' && (
                              <DropdownMenuItem 
                                onClick={() => handleUpdateRole(user._id, 'user')}
                                className="cursor-pointer text-slate-600 font-bold text-xs"
                              >
                                <UserCog className="mr-2 h-3.5 w-3.5" /> Make User
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user._id, user.name)}
                              className="text-destructive cursor-pointer font-bold bg-red-50 hover:bg-red-100 mt-1 text-xs"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete User
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List View */}
        <div className="block md:hidden p-2 space-y-2.5">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              <span>Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-xs">
              No users found.
            </div>
          ) : (
            users.map((user) => (
              <MobileDataCard
                key={user._id}
                title={
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                      <UserIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-bold text-xs">{user.name}</span>
                  </div>
                }
                badge={
                  <Badge 
                    variant={user.role === 'admin' || user.role === 'manager' ? 'default' : 'outline'}
                    className={`text-[10px] px-2 py-0 font-bold ${user.role === 'admin' ? 'bg-blue-600' : user.role === 'manager' ? 'bg-emerald-600' : ''}`}
                  >
                    {user.role}
                  </Badge>
                }
                footer={
                  <div className="flex items-center justify-between w-full pt-1">
                    <Button variant="outline" size="sm" onClick={() => openUserDetails(user)} className="h-7 text-xs px-2">
                      <Eye className="h-3 w-3 mr-1" /> Profile
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.role !== 'admin' && (
                          <DropdownMenuItem onClick={() => handleUpdateRole(user._id, 'admin')} className="text-blue-600 font-bold text-xs">
                            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Make Admin
                          </DropdownMenuItem>
                        )}
                        {user.role !== 'manager' && (
                          <DropdownMenuItem onClick={() => handleUpdateRole(user._id, 'manager')} className="text-primary font-bold text-xs">
                            <UserCog className="mr-1.5 h-3.5 w-3.5" /> Make Manager
                          </DropdownMenuItem>
                        )}
                        {user.role !== 'user' && (
                          <DropdownMenuItem onClick={() => handleUpdateRole(user._id, 'user')} className="text-slate-600 font-bold text-xs">
                            <UserCog className="mr-1.5 h-3.5 w-3.5" /> Make User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDeleteUser(user._id, user.name)} className="text-destructive font-bold text-xs">
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                }
              >
                <MobileDataRow label="Email" value={<span className="text-muted-foreground text-xs">{user.email}</span>} />
                <MobileDataRow label="Orders" value={`${user.totalOrders} (৳${user.totalSpent.toLocaleString()})`} />
                <MobileDataRow label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
              </MobileDataCard>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="py-3 border-t bg-white px-3">
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={(page) => {
                setCurrentPage(page);
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', page.toString());
                router.push(`?${params.toString()}`);
              }}
            />
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tighter flex items-center gap-2">
              User Profile
              <Badge className="bg-primary/10 text-primary border-none text-xs">{selectedUser?.role}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="flex flex-col gap-4 pt-2 text-xs">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-md shrink-0 bg-primary/10 flex items-center justify-center">
                  {selectedUser.image ? (
                    <Image 
                      src={selectedUser.image} 
                      alt={selectedUser.name} 
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="text-center sm:text-left space-y-0.5">
                  <h2 className="font-black text-lg tracking-tight text-slate-900">{selectedUser.name}</h2>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-1">
                    <Badge className="bg-primary/10 text-primary border-none font-bold text-[10px]">{selectedUser.role}</Badge>
                    <Badge variant="outline" className="font-bold text-[10px]">ID: {selectedUser._id.slice(-6).toUpperCase()}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</h3>
                  <div className="p-3 rounded-xl border bg-white space-y-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                      <p className="font-bold text-slate-700">{selectedUser.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                      <p className="font-bold text-slate-700 leading-snug">
                        {selectedUser.addresses && selectedUser.addresses.length > 0 
                          ? `${selectedUser.addresses[0].street || ''}, ${selectedUser.addresses[0].city || ''}`
                          : 'No address saved'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Orders</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 text-center">
                      <span className="text-xl font-black text-orange-600 block">{selectedUser.totalOrders}</span>
                      <span className="text-[9px] font-bold uppercase text-orange-400">Orders</span>
                    </div>
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-center">
                      <span className="text-base font-black text-primary block">৳{selectedUser.totalSpent.toLocaleString()}</span>
                      <span className="text-[9px] font-bold uppercase text-primary/60">Spent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Admin Modal */}
      <Dialog open={isAssignAdminOpen} onOpenChange={setIsAssignAdminOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl flex flex-col max-h-[90vh]">
          <div className="bg-blue-600 p-5 text-white relative overflow-hidden shrink-0">
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-xl font-black tracking-tight text-white">Assign Admin Access</DialogTitle>
              <p className="text-blue-100 text-xs mt-0.5">Grant admin access using email or phone number.</p>
            </DialogHeader>
          </div>

          <form onSubmit={handleAssignAdmin} className="p-4 space-y-3 bg-white overflow-y-auto flex-1 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Full Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-100 bg-slate-50 focus:bg-white text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">
                Email or Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="email@example.com or 017xxxxxxxx"
                required
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-100 bg-slate-50 focus:bg-white text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="•••••••• (Optional for initial access)"
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-100 bg-slate-50 focus:bg-white text-xs outline-none"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setIsAssignAdminOpen(false)}
                className="flex-1 h-9 text-xs font-bold"
              >
                CANCEL
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={isAssigning}
                className="flex-1 h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isAssigning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                CONFIRM
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <UsersContent />
    </Suspense>
  );
}
