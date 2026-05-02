import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Invoice, invoiceService, userService, UserProfile } from '@/services/invoiceService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getCurrencySymbol } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  FileText, 
  Eye, 
  Edit3, 
  MoreVertical,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layout,
  Type,
  Palette,
  Download
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { INVOICE_TEMPLATES } from '@/constants/templates';

interface DashboardProps {
  user: User;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

export default function Dashboard({ user, onEdit, onView }: DashboardProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [data, prof] = await Promise.all([
        invoiceService.getInvoices(user.uid),
        userService.getProfile(user.uid)
      ]);
      if (data) setInvoices(data);
      if (prof) setProfile(prof);
      setLoading(false);
    };
    fetchData();
  }, [user.uid]);

  const currencySymbol = getCurrencySymbol(profile?.defaultCurrency);

  const filteredInvoices = invoices.filter(inv => 
    inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: invoices.reduce((acc, inv) => acc + inv.totalAmount, 0),
    paid: invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0),
    pending: invoices.reduce((acc, inv) => acc + (inv.totalAmount - (inv.paidAmount || 0)), 0),
    overdue: invoices.filter(i => i.status === 'overdue').reduce((acc, inv) => acc + (inv.totalAmount - (inv.paidAmount || 0)), 0),
  };

  const toDate = (dt: Date | Timestamp | undefined) => {
    if (!dt) return new Date();
    if (dt instanceof Timestamp) return dt.toDate();
    return dt;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Paid</Badge>;
      case 'partial': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Partial</Badge>;
      case 'pending': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Pending</Badge>;
      case 'overdue': return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">Overdue</Badge>;
      default: return <Badge variant="outline" className="text-neutral-500">Draft</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-neutral-200 rounded-3xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-neutral-200 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Welcome, {user.displayName?.split(' ')[0]}</h1>
          <p className="text-neutral-500">Here's an overview of your business.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input 
              placeholder="Search invoices..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full sm:w-64 rounded-xl border-neutral-200 bg-white h-11" 
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-neutral-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="p-6 pb-2">
            <CardDescription className="flex items-center gap-2 font-medium">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Total Revenue
            </CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight">{currencySymbol}{stats.total.toLocaleString()}</CardTitle>
          </CardHeader>
          <div className="h-1 bg-emerald-500/20 w-full mt-4" />
        </Card>
        
        <Card className="rounded-3xl border-neutral-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="p-6 pb-2">
            <CardDescription className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Paid
            </CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight">{currencySymbol}{stats.paid.toLocaleString()}</CardTitle>
          </CardHeader>
          <div className="h-1 bg-emerald-500 w-full mt-4" />
        </Card>
        
        <Card className="rounded-3xl border-neutral-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="p-6 pb-2">
            <CardDescription className="flex items-center gap-2 font-medium">
              <Clock className="w-4 h-4 text-amber-500" /> Pending
            </CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight">{currencySymbol}{stats.pending.toLocaleString()}</CardTitle>
          </CardHeader>
          <div className="h-1 bg-amber-500 w-full mt-4" />
        </Card>
        
        <Card className="rounded-3xl border-neutral-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="p-6 pb-2">
            <CardDescription className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500" /> Overdue
            </CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-rose-600">{currencySymbol}{stats.overdue.toLocaleString()}</CardTitle>
          </CardHeader>
          <div className="h-1 bg-rose-500 w-full mt-4" />
        </Card>
      </div>

      {/* Invoice Table */}
      <Card className="rounded-3xl border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-neutral-100">
          <CardTitle className="text-lg">Recent Invoices</CardTitle>
          <Button variant="outline" size="sm" className="rounded-xl text-neutral-600">View All</Button>
        </div>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-100">
                <FileText className="w-8 h-8 text-neutral-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-neutral-900">No invoices found</p>
                <p className="text-neutral-500">Create your first invoice to get started.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                  <TableHead className="py-4 px-6 font-semibold text-neutral-900">Invoice</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-neutral-900">Template</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-neutral-900">Customer</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-neutral-900">Date</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-neutral-900">Amount</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-neutral-900">Status</TableHead>
                  <TableHead className="py-4 px-6 text-right font-semibold text-neutral-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-neutral-50 transition-colors group">
                    <TableCell className="py-4 px-6 font-medium">#{inv.invoiceNumber}</TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {(() => {
                           const tmpl = INVOICE_TEMPLATES.find(t => t.id === inv.templateId) || INVOICE_TEMPLATES[0];
                           const Icon = tmpl.icon;
                           return <Icon className="w-3.5 h-3.5 text-neutral-400" />;
                        })()}
                        <span className="text-xs font-medium text-neutral-600">
                          {INVOICE_TEMPLATES.find(t => t.id === inv.templateId)?.name || 'Modern'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-medium">{inv.customerName}</span>
                        <span className="text-xs text-neutral-500">{inv.customerEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-neutral-600">
                      {format(toDate(inv.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="py-4 px-6 font-bold text-neutral-900">
                      {currencySymbol}{inv.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-4 px-6">{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onView(inv.id!)}
                          className="rounded-lg hover:bg-black hover:text-white transition-all"
                          title="View & Export PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onView(inv.id!)}
                          className="rounded-lg hover:bg-black hover:text-white transition-all flex md:hidden"
                          title="Quick View"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEdit(inv.id!)}
                          className="rounded-lg hover:bg-black hover:text-white transition-all"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
