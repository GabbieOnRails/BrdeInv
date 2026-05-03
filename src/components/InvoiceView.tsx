import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Invoice, invoiceService, UserProfile, userService } from '@/services/invoiceService';
import { getCurrencySymbol, toDate } from '@/lib/utils';
import { INVOICE_TEMPLATES } from '@/constants/templates';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { 
  Download, 
  Share2, 
  ArrowLeft, 
  Printer, 
  Mail,
  Loader2,
  FileText,
  Layers,
  Palette,
  Layout,
  Type,
  Plus,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  History,
  DollarSign,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Payment } from '@/services/invoiceService';

interface InvoiceViewProps {
  user: User;
  invoiceId?: string;
  invoiceObject?: Invoice; // For real-time previews
  onClose?: () => void;
  isPreview?: boolean;
}

export default function InvoiceView({ user, invoiceId, invoiceObject, onClose, isPreview = false }: InvoiceViewProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(invoiceObject || null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(!invoiceObject);
  const [exporting, setExporting] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card' | 'other'>('transfer');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (invoiceObject) {
        setInvoice(invoiceObject);
      }
      
      if (!invoiceId && !invoiceObject) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const [inv, prof] = await Promise.all([
        invoiceId ? invoiceService.getInvoice(user.uid, invoiceId) : Promise.resolve(invoiceObject),
        userService.getProfile(user.uid)
      ]);
      
      if (inv) {
        setInvoice(inv as Invoice);
        // Fetch payments if it's an existing invoice
        if (invoiceId) {
          const invPayments = await invoiceService.getPayments(user.uid, invoiceId);
          if (invPayments) setPayments(invPayments);
        }
      }
      if (prof) setProfile(prof);
      setLoading(false);
    };
    fetchInvoiceData();
  }, [user.uid, invoiceId, invoiceObject]);

  // Sync invoice if prop changes (for real-time preview)
  useEffect(() => {
    if (invoiceObject) {
      setInvoice(invoiceObject);
    }
  }, [invoiceObject]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!templateRef.current || !invoice) return;
    
    setExporting(true);
    const loadingToast = toast.loading('Generating high-quality PDF...');
    
    try {
      const element = templateRef.current;
      
      // Wait for images to load and captured element to be ready
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 3, // Increased for crispness
        backgroundColor: '#ffffff',
        skipFonts: false,
        cacheBust: true,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [element.offsetWidth, element.offsetHeight]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
      pdf.save(`Invoice_${invoice.invoiceNumber || 'draft'}.pdf`);
      
      toast.success('Invoice exported successfully', { id: loadingToast });
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Export failed. Please use "Print" as fallback.', { id: loadingToast });
    } finally {
      setExporting(false);
    }
  };

  const handleSendEmail = () => {
    if (!invoice) return;
    
    const subject = encodeURIComponent(`Invoice #${invoice.invoiceNumber} from ${profile?.businessName || 'Us'}`);
    const body = encodeURIComponent(`Hello ${invoice.customerName},\n\nPlease find your invoice #${invoice.invoiceNumber} for ${currencySymbol}${invoice.totalAmount.toLocaleString()} attached below.\n\nThank you for your business!\n\nBest regards,\n${profile?.businessName || 'Your Name'}`);
    
    window.location.href = `mailto:${invoice.customerEmail}?subject=${subject}&body=${body}`;
    toast.success('Opening your email client...');
  };

  const handleRecordPayment = async (fullAmount?: boolean) => {
    const remainingBalance = invoice!.totalAmount - (invoice!.paidAmount || 0);
    const amountToRecord = fullAmount ? remainingBalance : parseFloat(paymentAmount);
    
    if (!invoice?.id || amountToRecord <= 0) return;
    
    setIsSubmittingPayment(true);
    try {
      await invoiceService.addPayment(user.uid, invoice.id, {
        invoiceId: invoice.id,
        amount: amountToRecord,
        method: fullAmount ? 'transfer' : paymentMethod,
        notes: fullAmount ? 'Settled in full' : paymentNotes,
        date: new Date(),
      });
      
      // Refresh invoice data
      const updatedInvoice = await invoiceService.getInvoice(user.uid, invoice.id);
      const updatedPayments = await invoiceService.getPayments(user.uid, invoice.id);
      
      if (updatedInvoice) setInvoice(updatedInvoice);
      if (updatedPayments) setPayments(updatedPayments);
      
      toast.success(fullAmount ? 'Invoice marked as paid' : 'Payment recorded successfully');
      setShowPaymentDialog(false);
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (err) {
      toast.error('Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-10 h-10 animate-spin text-neutral-300" />
      </div>
    );
  }

  if (!invoice) return <div className="p-20 text-center text-neutral-500 font-sans">Invoice not found.</div>;

  const currentTemplateId = invoice.templateId || profile?.defaultTemplateId || 'modern';
  const currentTemplate = INVOICE_TEMPLATES.find(t => t.id === currentTemplateId) || INVOICE_TEMPLATES[0];
  const currencySymbol = getCurrencySymbol(profile?.defaultCurrency || '$');

  // Layout Rendering Logic
  const renderTemplate = () => {
    switch (currentTemplate.id) {
      case 'liceria_purple':
        return <LiceriaPurpleTemplate invoice={invoice} profile={profile} currencySymbol={currencySymbol} />;
      case 'studio_light':
        return <StudioLightTemplate invoice={invoice} profile={profile} currencySymbol={currencySymbol} />;
      case 'studio_dark':
        return <StudioDarkTemplate invoice={invoice} profile={profile} currencySymbol={currencySymbol} />;
      case 'pro_dark':
        return <ProDarkTemplate invoice={invoice} profile={profile} currencySymbol={currencySymbol} />;
      default:
        switch (currentTemplate.variant) {
          case 'minimal':
            return <MinimalTemplate invoice={invoice} profile={profile} currencySymbol={currencySymbol} />;
          case 'bold':
            return <BoldTemplate invoice={invoice} profile={profile} currencySymbol={currencySymbol} />;
          default:
            return <ModernTemplate invoice={invoice} profile={profile} currencySymbol={currencySymbol} />;
        }
    }
  };

  return (
    <div className={`${isPreview ? '' : 'max-w-5xl mx-auto pb-20 px-4'}`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 print:hidden font-sans ${isPreview ? 'px-4' : ''}`}>
        <div className="flex items-center gap-4">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${isPreview ? 'text-lg' : ''}`}>
              {invoice.type === 'receipt' ? 'Receipt' : 'Invoice'} #{invoice.invoiceNumber}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-neutral-500 text-sm">Created on {format(toDate(invoice.createdAt), 'MMMM dd, yyyy')}</p>
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                invoice.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                invoice.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                'bg-neutral-100 text-neutral-500'
              }`}>
                {invoice.status}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {!isPreview && invoice.id && invoice.status !== 'paid' && (
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
              <DialogTrigger
                render={
                  <Button variant="outline" className="rounded-xl gap-2 border-neutral-200 text-neutral-600 h-10 md:h-12 px-4 md:px-6">
                    <CreditCard className="w-4 h-4" /> <span className="hidden sm:inline">Record Payment</span><span className="sm:hidden">Pay</span>
                  </Button>
                }
              />
              <DialogContent className="rounded-3xl w-[95vw] max-w-lg p-4 md:p-6">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Add a payment for this invoice to track balance.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Amount ({currencySymbol})</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="rounded-xl h-12"
                    />
                    <p className="text-[10px] text-neutral-500 font-medium">Remaining balance: {currencySymbol}{(invoice.totalAmount - (invoice.paidAmount || 0)).toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <select 
                      className="w-full flex h-12 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as any)}
                    >
                      <option value="transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input 
                      placeholder="Payment reference" 
                      value={paymentNotes}
                      onChange={e => setPaymentNotes(e.target.value)}
                      className="rounded-xl h-12"
                    />
                  </div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleRecordPayment(true)} 
                    disabled={isSubmittingPayment}
                    className="w-full sm:flex-1 rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 h-12"
                  >
                    {isSubmittingPayment ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CheckCircle2 className="w-3 h-3 mr-2" />}
                    Settled in Full
                  </Button>
                  <Button onClick={() => handleRecordPayment()} disabled={isSubmittingPayment || !paymentAmount} className="w-full sm:flex-1 rounded-xl bg-black h-12">
                    {isSubmittingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button 
            variant="outline" 
            size={isPreview ? "icon" : "default"}
            className="rounded-xl gap-2 border-neutral-200 h-10 md:h-12 px-4 md:px-6" 
            onClick={handleDownloadPDF}
            disabled={exporting}
            title="Export PDF"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {!isPreview && (exporting ? 'Exporting...' : <><span className="hidden sm:inline">Export PDF</span><span className="sm:hidden">PDF</span></>)}
          </Button>
          {!isPreview && (
            <>
              <Button variant="ghost" className="rounded-xl gap-2 text-neutral-500 h-10 md:h-12 px-4 md:px-6 hidden sm:flex" onClick={handlePrint}>
                <Printer className="w-4 h-4" /> Print
              </Button>
              <Button 
                onClick={handleSendEmail}
                className="rounded-xl bg-black hover:bg-neutral-800 shadow-lg shadow-black/10 gap-2 h-10 md:h-12 px-4 md:px-6"
              >
                <Mail className="w-4 h-4" /> <span className="hidden sm:inline">Send Email</span><span className="sm:hidden">Send</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <motion.div 
        initial={isPreview ? {} : { opacity: 0, y: 30 }}
        animate={isPreview ? {} : { opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {!isPreview && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            <Card className="rounded-3xl border-none bg-neutral-900 text-white p-6 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white/10 rounded-xl">
                  <FileText className="w-4 h-4 text-neutral-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Total Amount</span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black italic tracking-tighter tabular-nums">
                  <span className="text-sm not-italic align-top mr-1 opacity-60">{currencySymbol}</span>
                  {invoice.totalAmount.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Document Total</p>
              </div>
            </Card>

            <Card className="rounded-3xl border-none bg-emerald-50 text-emerald-900 p-6 shadow-sm border border-emerald-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-60 italic">Amount Paid</span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black italic tracking-tighter tabular-nums">
                  <span className="text-sm not-italic align-top mr-1 opacity-60">{currencySymbol}</span>
                  {invoice.paidAmount.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 bg-emerald-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600" 
                      style={{ width: `${Math.min(100, (invoice.paidAmount / invoice.totalAmount) * 100)}%` }} 
                    />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600">
                    {Math.round((invoice.paidAmount / invoice.totalAmount) * 100)}%
                  </span>
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl border-none bg-white p-6 shadow-sm border border-neutral-100">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 italic">Remaining Balance</span>
              </div>
              <div className="space-y-1">
                <p className={`text-3xl font-black italic tracking-tighter tabular-nums ${invoice.status === 'paid' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                  <span className="text-sm not-italic align-top mr-1 opacity-60">{currencySymbol}</span>
                  {(invoice.totalAmount - invoice.paidAmount).toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">To be settled</p>
              </div>
            </Card>
          </div>
        )}

        <div className={`bg-white border border-neutral-200 overflow-hidden print:border-none print:shadow-none ${isPreview ? 'rounded-2xl shadow-lg scale-[0.6] origin-top' : 'rounded-[32px] shadow-2xl'}`}>
          <div className="overflow-x-auto">
            <div className="min-w-[800px] md:min-w-0" ref={templateRef}>
              {renderTemplate()}
            </div>
          </div>
        </div>

        {/* Payment History Section */}
        {!isPreview && payments.length > 0 && (
          <div className="mt-12 space-y-6 font-sans">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 rounded-xl">
                  <History className="w-5 h-5 text-neutral-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Payment History</h3>
                  <p className="text-xs text-neutral-500">History of all transactions for this document</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-[32px] overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-neutral-50/50">
                  <TableRow>
                    <TableHead className="pl-8 py-4 text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                    <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest">Method</TableHead>
                    <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest">Notes</TableHead>
                    <TableHead className="pr-8 py-4 text-right text-[10px] font-black uppercase tracking-widest">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-neutral-50 transition-colors">
                      <TableCell className="pl-8 py-4">
                        <p className="font-bold text-neutral-900">{format(toDate(payment.date), 'MMM dd, yyyy')}</p>
                        <p className="text-[10px] text-neutral-400 tabular-nums">Ref: {payment.id.slice(0, 8).toUpperCase()}</p>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${
                             payment.method === 'transfer' ? 'bg-blue-500' :
                             payment.method === 'cash' ? 'bg-emerald-500' :
                             payment.method === 'card' ? 'bg-violet-500' :
                             'bg-neutral-400'
                           }`} />
                           <span className="capitalize text-sm font-medium">{payment.method}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="text-sm text-neutral-500 italic max-w-xs truncate">{payment.notes || '—'}</p>
                      </TableCell>
                      <TableCell className="pr-8 py-4 text-right">
                        <span className="text-lg font-black italic tracking-tighter tabular-nums">
                          {currencySymbol}{payment.amount.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// --- Specific Template Components ---

function ModernTemplate({ invoice, profile, currencySymbol }: { invoice: Invoice, profile: UserProfile | null, currencySymbol: string }) {
  return (
    <div className="p-6 md:p-16 space-y-12 md:space-y-16 font-sans overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between gap-12">
        <div className="space-y-6">
          <LogoArea profile={profile} />
          <div className="space-y-1">
            <p className="font-bold text-lg text-neutral-900">{profile?.businessName || 'Lumina Global'}</p>
            <div className="text-neutral-500 text-sm leading-relaxed whitespace-pre-line break-words">
              {profile?.businessAddress || '123 Business Street\nCity, State, 12345'}
            </div>
            <p className="text-neutral-500 text-sm break-all">{profile?.businessEmail || 'hello@lumina.com'}</p>
            <p className="text-neutral-500 text-sm">{profile?.businessPhone}</p>
          </div>
        </div>

        <div className="text-left md:text-right space-y-4">
          <h1 className="hidden md:block text-6xl font-black uppercase italic tracking-tighter text-neutral-100 absolute right-12 top-12 -z-10 select-none">{invoice.type}</h1>
          <div className="pt-0 md:pt-8 space-y-1">
            <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Bill To</p>
            <p className="font-bold text-lg text-neutral-900 break-words">{invoice.customerName || 'Customer Name'}</p>
            <p className="text-neutral-500 text-sm break-all">{invoice.customerEmail}</p>
            <div className="text-neutral-500 text-sm leading-relaxed whitespace-pre-line break-words">
              {invoice.customerAddress}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-neutral-100">
        <div className="space-y-1">
          <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Invoice Number</p>
          <p className="font-bold text-neutral-900">#{invoice.invoiceNumber || '---'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Date Issued</p>
          <p className="font-bold text-neutral-900">{format(toDate(invoice.date), 'MMM dd, yyyy')}</p>
        </div>
        <div className="space-y-1">
          <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Due Date</p>
          <p className="font-bold text-neutral-900">{format(toDate(invoice.dueDate), 'MMM dd, yyyy')}</p>
        </div>
        <div className="space-y-1 md:text-right">
          <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Status</p>
          <p className="font-bold uppercase text-xs tracking-wider">{invoice.status}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-12 px-2 pb-2 border-b border-neutral-100">
          <div className="col-span-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Description</div>
          <div className="col-span-2 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">Qty</div>
          <div className="col-span-2 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">Price</div>
          <div className="col-span-2 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-400">Total</div>
        </div>
        {invoice.items.map((item, i) => (
          <div key={i} className="grid grid-cols-12 px-2 py-4 items-center">
            <div className="col-span-6 font-medium text-neutral-900 break-words line-clamp-3">{item.description}</div>
            <div className="col-span-2 text-center text-neutral-600">{item.quantity}</div>
            <div className="col-span-2 text-center text-neutral-600">{currencySymbol}{item.unitPrice.toLocaleString()}</div>
            <div className="col-span-2 text-right font-bold text-neutral-900">{currencySymbol}{item.total.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-12 pt-12 border-t border-neutral-100">
        <div className="flex-1 space-y-6 max-w-md text-sm">
          <div className="space-y-1">
            <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Notes & Terms</p>
            <p className="text-neutral-500 italic leading-relaxed">
              {invoice.notes || 'Please remit payment by the due date. Thank you.'}
            </p>
          </div>
          {profile?.bankName && (
            <div className="space-y-1 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-1">Payment</p>
              <p className="text-xs font-mono">{profile.bankName} • {profile.accountName} • {profile.accountNumber}</p>
            </div>
          )}
        </div>

          <div className="w-full md:w-64 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400 font-medium">Subtotal</span>
              <span className="font-bold">{currencySymbol}{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400 font-medium">Tax ({invoice.taxRate}%)</span>
              <span className="font-bold">{currencySymbol}{invoice.taxAmount.toLocaleString()}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="font-medium">Amount Paid</span>
                <span className="font-bold">-{currencySymbol}{invoice.paidAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="h-px bg-neutral-100" />
            <div className="flex justify-between items-baseline pt-2">
              <span className="text-neutral-400 font-black uppercase tracking-widest text-[10px]">
                {invoice.status === 'paid' ? 'Total Paid' : 'Total Due'}
              </span>
              <span className="text-4xl font-black tracking-tighter text-neutral-900 italic">
                <span className="text-sm not-italic align-top mr-1">{currencySymbol}</span>
                {(invoice.totalAmount - (invoice.paidAmount || 0)).toLocaleString()}
              </span>
            </div>
          </div>
      </div>
      <div className="h-4 bg-black w-full translate-y-12" />
    </div>
  );
}

function MinimalTemplate({ invoice, profile, currencySymbol }: { invoice: Invoice, profile: UserProfile | null, currencySymbol: string }) {
  return (
    <div className="p-6 md:p-16 space-y-12 md:space-y-16 font-sans overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        <LogoArea profile={profile} minimal />
        <div className="text-left md:text-right space-y-4 md:space-y-8">
          <p className="text-4xl md:text-5xl font-light text-neutral-200 tracking-tight capitalize">{invoice.type}</p>
          <div className="space-y-1">
            <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">From</p>
            <p className="font-medium text-neutral-900 break-words">{profile?.businessName || 'Lumina Enterprise'}</p>
            <p className="text-neutral-500 text-xs break-all">{profile?.businessEmail || 'hello@lumina.com'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 border-y border-neutral-100 py-8 md:py-12">
        <div className="space-y-4">
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">Client Info</p>
          <div className="space-y-1">
            <p className="font-medium text-lg leading-tight break-words">{invoice.customerName || 'Customer Name'}</p>
            <p className="text-neutral-500 text-sm break-all">{invoice.customerEmail}</p>
            <p className="text-neutral-500 text-sm whitespace-pre-line break-words">{invoice.customerAddress}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row md:justify-end gap-8 sm:gap-12 text-left md:text-right">
          <div className="space-y-4">
            <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">Reference</p>
            <div className="space-y-1">
              <p className="text-neutral-900 font-medium break-all">#{invoice.invoiceNumber || '---'}</p>
              <p className="text-neutral-500 text-xs">{format(toDate(invoice.date), 'MMM dd, yyyy')}</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">Status</p>
            <div className="space-y-1">
              <p className="text-neutral-900 font-medium uppercase tracking-wider text-xs">{invoice.status}</p>
              <p className="text-neutral-500 text-xs font-mono">Due {format(toDate(invoice.dueDate), 'MMM dd, yyyy')}</p>
            </div>
          </div>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-neutral-100">
          <tr>
            <th className="text-left py-4 font-medium text-neutral-400 uppercase tracking-widest text-[10px]">Description</th>
            <th className="text-center py-4 font-medium text-neutral-400 uppercase tracking-widest text-[10px]">Qty</th>
            <th className="text-right py-4 font-medium text-neutral-400 uppercase tracking-widest text-[10px]">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {invoice.items.map((item, i) => (
            <tr key={i}>
              <td className="py-6 font-medium text-neutral-800 break-words max-w-[300px]">{item.description}</td>
              <td className="py-6 text-center text-neutral-500 tabular-nums">{item.quantity}</td>
              <td className="py-6 text-right font-medium text-neutral-800 tabular-nums">{currencySymbol}{item.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end pt-8">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-neutral-500">
            <span>Subtotal</span>
            <span className="font-medium tabular-nums">{currencySymbol}{invoice.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Tax ({invoice.taxRate}%)</span>
            <span className="font-medium tabular-nums">{currencySymbol}{invoice.taxAmount.toLocaleString()}</span>
          </div>
          <div className="h-px bg-neutral-100 my-4" />
          <div className="flex justify-between items-center text-lg">
            <span className="font-medium text-neutral-400">Total</span>
            <span className="font-bold text-neutral-900 tabular-nums">{currencySymbol}{invoice.totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="text-center pt-24 text-[10px] text-neutral-300 uppercase tracking-[0.2em]">
        Lumina Invoice • Minimal Edition
      </div>
    </div>
  );
}

function BoldTemplate({ invoice, profile, currencySymbol }: { invoice: Invoice, profile: UserProfile | null, currencySymbol: string }) {
  return (
    <div className="font-sans">
      <div className="bg-black p-12 md:p-16 text-white flex flex-col md:flex-row justify-between gap-12 items-center">
        <div className="space-y-4 text-center md:text-left">
          <LogoArea profile={profile} />
          <h1 className="text-5xl font-black italic tracking-tighter uppercase">{invoice.type}</h1>
          <p className="text-neutral-400 font-bold tracking-widest uppercase text-xs">#{invoice.invoiceNumber || '---'}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 text-center space-y-2 min-w-[200px]">
          <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Amount Due</p>
          <p className="text-5xl font-black tracking-tighter italic tabular-nums">{currencySymbol}{invoice.totalAmount.toLocaleString()}</p>
          <div className="px-3 py-1 bg-white text-black rounded-full inline-block text-[10px] font-bold uppercase tracking-wider shadow-xl">
            Due {format(toDate(invoice.dueDate), 'MMM dd')}
          </div>
        </div>
      </div>
      
      <div className="p-12 md:p-16 space-y-16">
        <div className="grid grid-cols-2 gap-12 pb-16 border-b-2 border-black">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Billed From</p>
              <p className="text-2xl font-black italic leading-tight uppercase">{profile?.businessName}</p>
              <p className="text-neutral-500 font-medium">{profile?.businessEmail}</p>
              <p className="text-neutral-500 text-sm whitespace-pre-line">{profile?.businessAddress}</p>
            </div>
          </div>
          <div className="space-y-6 text-right">
            <div className="space-y-1">
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Billed To</p>
              <p className="text-2xl font-black italic leading-tight uppercase">{invoice.customerName || 'Customer Name'}</p>
              <p className="text-neutral-500 font-medium">{invoice.customerEmail}</p>
              <p className="text-neutral-500 text-sm whitespace-pre-line text-right">{invoice.customerAddress}</p>
            </div>
          </div>
        </div>

        <div className="space-y-0">
          <div className="grid grid-cols-12 bg-neutral-100 p-4 border-2 border-black mb-2">
            <div className="col-span-8 font-black uppercase text-xs tracking-widest italic">Description</div>
            <div className="col-span-1 text-center font-black uppercase text-xs tracking-widest italic">Qty</div>
            <div className="col-span-3 text-right font-black uppercase text-xs tracking-widest italic">Amount</div>
          </div>
          {invoice.items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 px-4 py-8 border-b border-neutral-200 hover:bg-neutral-50 transition-colors items-center">
              <div className="col-span-8 font-bold text-lg text-neutral-900 break-words">{item.description}</div>
              <div className="col-span-1 text-center text-neutral-500 font-bold tabular-nums">{item.quantity}</div>
              <div className="col-span-3 text-right font-black text-lg text-neutral-900 tabular-nums">{currencySymbol}{item.total.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-12 pt-12 items-end">
          <div className="space-y-4">
            <div className="p-8 bg-neutral-50 rounded-3xl border-2 border-black inline-block min-w-[300px]">
              <p className="text-xs font-black uppercase tracking-widest italic mb-6 border-b-2 border-black pb-2">Summary</p>
              <div className="space-y-3 font-mono">
                <div className="flex justify-between font-bold text-sm">
                  <span className="text-neutral-400">Subtotal</span>
                  <span className="text-neutral-900">{currencySymbol}{invoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-sm">
                  <span className="text-neutral-400">VAT ({invoice.taxRate}%)</span>
                  <span className="text-neutral-900">{currencySymbol}{invoice.taxAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right space-y-6">
             <div className="space-y-2">
                <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Notes</p>
                <p className="text-neutral-600 font-medium italic text-right">{invoice.notes || 'N/A'}</p>
             </div>
             <p className="text-6xl font-black italic tracking-tighter uppercase opacity-5">Verified</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioLightTemplate({ invoice, profile, currencySymbol }: { invoice: Invoice, profile: UserProfile | null, currencySymbol: string }) {
  return (
    <div className="p-6 md:p-16 space-y-12 font-sans bg-white relative overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="space-y-4">
          <LogoArea profile={profile} />
          <div className="text-xs space-y-1 text-neutral-600 break-words">
            <p>{profile?.businessPhone}</p>
            <p className="break-all">{profile?.businessEmail || 'hello@lumina.com'}</p>
            <p className="whitespace-pre-line">{profile?.businessAddress || '123 Studio Way'}</p>
          </div>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Professional Services</p>
          <p className="font-bold text-neutral-900 break-all capitalize">{invoice.type} {invoice.invoiceNumber}</p>
        </div>
      </div>

      <div className="absolute top-32 -right-8 w-16 h-16 bg-green-200/50 rounded-lg -rotate-12 hidden md:block" />
      <div className="absolute top-40 -right-4 w-16 h-16 bg-green-300/30 rounded-lg hidden md:block" />

      <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-neutral-900">INVOICE</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 py-8 border-t border-neutral-100">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-violet-600 mb-2">Client</p>
          <p className="text-xl font-black uppercase break-words">{invoice.customerName}</p>
          <p className="text-sm text-neutral-500 italic break-words">{invoice.customerEmail} • {invoice.customerAddress}</p>
        </div>
        <div className="text-left md:text-right self-end">
           <p className="text-xs font-black uppercase tracking-widest text-violet-600 mb-2">Invoice Details</p>
        </div>
      </div>

      <div className="overflow-hidden border border-neutral-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-neutral-800 text-white uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="px-6 py-4 text-left">Description</th>
              <th className="px-6 py-4 text-center">Quantity</th>
              <th className="px-6 py-4 text-center">Unit Price</th>
              <th className="px-6 py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {invoice.items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-violet-50/50' : 'bg-green-50/30'}>
                <td className="px-6 py-4 font-bold text-neutral-900 break-words max-w-[400px]">{item.description}</td>
                <td className="px-6 py-4 text-center tabular-nums">{item.quantity}</td>
                <td className="px-6 py-4 text-center tabular-nums">{currencySymbol}{item.unitPrice.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-black tabular-nums">{currencySymbol}{item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-4">
          <div className="w-80 space-y-3">
            <div className="flex justify-between text-sm py-2 border-b border-violet-100">
              <span className="font-black uppercase tracking-widest text-[10px] text-neutral-400">Subtotal</span>
              <span className="font-bold tabular-nums">{currencySymbol}{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-violet-100">
              <span className="font-black uppercase tracking-widest text-[10px] text-neutral-400">Tax {invoice.taxRate}%</span>
              <span className="font-bold tabular-nums">{currencySymbol}{invoice.taxAmount.toLocaleString()}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between text-sm py-2 border-b border-violet-100 text-green-600">
                <span className="font-black uppercase tracking-widest text-[10px]">Paid</span>
                <span className="font-bold tabular-nums">-{currencySymbol}{invoice.paidAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-4">
              <span className="font-black uppercase tracking-widest text-sm italic">
                {invoice.status === 'paid' ? 'Total Paid' : 'Total Due'}
              </span>
              <span className="text-3xl font-black italic tabular-nums">
                {currencySymbol}{(invoice.totalAmount - (invoice.paidAmount || 0)).toLocaleString()}
              </span>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-2 gap-12 pt-12 border-t-2 border-neutral-100">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-600 italic">Terms and Conditions</h4>
          <ul className="text-xs text-neutral-600 space-y-2 list-disc pl-4 italic">
            <li>Late payments may be subject to a 5% late fee.</li>
            <li>Please use the provided invoice number when making payments.</li>
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-600 italic">Payment Information</h4>
          <div className="text-xs italic space-y-1">
            <p><span className="text-neutral-400 not-italic">Account Name:</span> {profile?.accountName || profile?.businessName}</p>
            <p><span className="text-neutral-400 not-italic">Account Number:</span> {profile?.accountNumber}</p>
            {profile?.bankName && <p><span className="text-neutral-400 not-italic">Bank:</span> {profile.bankName}</p>}
          </div>
        </div>
      </div>

      <div className="pt-12 text-center border-t border-neutral-100">
        <p className="text-xs font-black italic text-violet-600 uppercase tracking-widest mb-1">Thank you for choosing {profile?.businessName || 'Lumina'}!</p>
        <p className="text-[10px] text-neutral-400">For inquiries, contact us at {profile?.businessEmail}</p>
      </div>
    </div>
  );
}

function LiceriaPurpleTemplate({ invoice, profile, currencySymbol }: { invoice: Invoice, profile: UserProfile | null, currencySymbol: string }) {
  return (
    <div className="p-4 md:p-8 bg-violet-200 space-y-6 font-sans overflow-hidden">
      <div className="bg-white p-6 md:p-12 rounded-[32px] md:rounded-[50px] shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-1">
            <p className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none break-words">
              {(profile?.businessName || 'Lumina Studio')?.split(' ').map((word: string, i: number) => (
                <span key={i} className="block">{word}</span>
              ))} TAX {invoice.type.toUpperCase()}
            </p>
          </div>
          <div className="text-right">
             {profile?.logoUrl && <img src={profile.logoUrl} className="h-12 md:h-16 w-auto ml-auto mb-4 object-contain" />}
          </div>
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-neutral-400 gap-4">
          <div>
            <p>Tax Number</p>
            <p className="text-neutral-900 mt-1 break-all">{profile?.accountNumber || '---'}</p>
          </div>
          <div className="text-right">
            <p>Tax Invoice #</p>
            <p className="text-neutral-900 mt-1 break-all">{invoice.invoiceNumber}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-12 rounded-[32px] md:rounded-[50px] shadow-sm space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Issued To</p>
            <p className="font-bold text-neutral-900 break-words">{invoice.customerName}</p>
            <p className="text-xs text-neutral-500 italic max-w-xs break-words">{invoice.customerAddress}</p>
          </div>
          <div className="text-left md:text-right space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Date</p>
            <p className="font-bold text-neutral-900 tabular-nums">{format(toDate(invoice.date), 'MM/dd/yyyy')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b-2 border-dotted border-neutral-200 pb-2">
            <span>Description</span>
            <span>Total</span>
          </div>
          {invoice.items.map((item, i) => (
            <div key={i} className="flex justify-between items-baseline gap-4 py-1">
              <span className="text-sm font-medium text-neutral-800 break-words flex-1 pr-4">{item.description}</span>
              <div className="flex-1 border-b border-dotted border-neutral-100" />
              <div className="flex gap-4 min-w-[100px] justify-between tabular-nums text-sm font-black">
                <span className="text-neutral-300">{currencySymbol}</span>
                <span>{item.total.toLocaleString()}</span>
              </div>
            </div>
          ))}
          <div className="border-b-2 border-dotted border-neutral-200 pt-2" />
        </div>

        <div className="flex justify-end">
          <div className="w-56 space-y-3">
            <div className="flex justify-between text-xs font-bold text-neutral-600">
              <span>Sub total</span>
              <div className="flex gap-4 tabular-nums">
                <span className="text-neutral-300">{currencySymbol}</span>
                <span>{invoice.subtotal.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs font-bold text-neutral-600">
              <span>TAX</span>
              <div className="flex gap-4 tabular-nums">
                <span className="text-neutral-300">{currencySymbol}</span>
                <span>{invoice.taxAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs font-black text-neutral-900">
              <span>Total</span>
              <div className="flex gap-4 tabular-nums">
                <span className="text-neutral-300">{currencySymbol}</span>
                <span>{invoice.totalAmount.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="bg-violet-100 p-4 rounded-3xl flex flex-col gap-2 text-violet-900">
              {invoice.paidAmount > 0 && (
                <div className="flex justify-between items-center text-green-700 opacity-80">
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Amount Paid</span>
                  <div className="flex gap-4 tabular-nums font-bold italic">
                    <span>{currencySymbol}</span>
                    <span>{invoice.paidAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest italic">
                  {invoice.status === 'paid' ? 'Total Paid' : 'Balance Due'}
                </span>
                <div className="flex gap-4 tabular-nums font-black italic">
                  <span>{currencySymbol}</span>
                  <span>{(invoice.totalAmount - (invoice.paidAmount || 0)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[50px] shadow-sm grid grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Payment within 30 days</p>
            <p className="text-xs font-medium text-neutral-800">Acc Name: {profile?.accountName}</p>
            <p className="text-xs font-medium text-neutral-800">Bank: {profile?.bankName}</p>
            <p className="text-xs font-medium text-neutral-800">Account: {profile?.accountNumber}</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Contact</p>
            <p className="text-xs font-medium text-neutral-800">{profile?.businessPhone}</p>
            <p className="text-xs font-medium text-neutral-800 italic">{profile?.businessEmail}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Postal Address</p>
            <p className="text-xs font-medium text-neutral-800 italic max-w-[150px]">{profile?.businessAddress}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioDarkTemplate({ invoice, profile, currencySymbol }: { invoice: Invoice, profile: UserProfile | null, currencySymbol: string }) {
  return (
    <div className="bg-[#aca494] p-2 md:p-4 min-h-[1000px] font-sans overflow-hidden">
      <div className="bg-[#111827] text-white p-6 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8 rounded-t-[32px] md:rounded-t-[50px]">
        <div className="flex items-center gap-4">
           {profile?.logoUrl ? (
             <img src={profile.logoUrl} className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 p-2" />
           ) : (
             <div className="bg-white/10 p-2 md:p-3 rounded-full"><Palette className="w-5 h-5 md:w-6 md:h-6" /></div>
           )}
           <span className="text-xl md:text-2xl font-bold tracking-tight break-words">{profile?.businessName || 'Lumina Creative'}</span>
        </div>
        <div className="text-center md:text-right">
          <p className="text-2xl md:text-3xl font-bold tracking-tighter truncate max-w-[200px] md:max-w-none capitalize">{invoice.type} Partner</p>
          <p className="text-[10px] md:text-xs text-neutral-400 break-words">{profile?.businessAddress?.split('\n')[0]}</p>
          <p className="text-[10px] md:text-xs text-neutral-400">{profile?.businessPhone}</p>
        </div>
      </div>

      <div className="bg-[#eee8dd] p-6 md:p-12 -mt-4 rounded-[40px] md:rounded-[60px] rounded-tr-none min-h-[800px] shadow-2xl space-y-12 md:space-y-16">
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-neutral-900 border-b-4 md:border-b-8 border-neutral-900 inline-block pr-6 md:pr-12 pb-2 md:pb-4 uppercase">{invoice.type}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
          <div className="space-y-4">
            <p className="text-lg md:text-xl font-black uppercase tracking-tight text-neutral-900 italic">Payable To</p>
            <div className="text-neutral-700 space-y-1 font-medium break-words">
              <p>{invoice.customerName}</p>
              <p className="italic text-sm">{invoice.customerAddress}</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-lg md:text-xl font-black uppercase tracking-tight text-neutral-900 italic">Bank Details</p>
            <div className="text-neutral-700 space-y-1 font-medium italic break-words">
              <p>{profile?.bankName}</p>
              <p className="tabular-nums break-all">{profile?.accountNumber}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-white uppercase text-[10px] font-black tracking-[0.2em] italic">
              <tr>
                <th className="px-8 py-5 text-left border-r border-white/10">Item Description</th>
                <th className="px-8 py-5 text-center border-r border-white/10">Qty</th>
                <th className="px-8 py-5 text-center border-r border-white/10">Price</th>
                <th className="px-8 py-5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="bg-neutral-50/50">
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-neutral-200 italic">
                  <td className="px-8 py-6 font-bold text-neutral-700 break-words max-w-[300px]">{item.description}</td>
                  <td className="px-8 py-6 text-center tabular-nums text-neutral-600">{item.quantity}</td>
                  <td className="px-8 py-6 text-center tabular-nums text-neutral-600">{currencySymbol}{item.unitPrice.toLocaleString()}</td>
                  <td className="px-8 py-6 text-right font-black tabular-nums">{currencySymbol}{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-8">
          <div className="w-80 space-y-4 italic">
            <div className="flex justify-between items-baseline font-black uppercase tracking-tight">
              <span className="text-neutral-500">Sub Total</span>
              <span className="text-xl text-neutral-900">{currencySymbol}{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline font-black uppercase tracking-tight">
              <span className="text-neutral-500">Tax ({invoice.taxRate}%)</span>
              <span className="text-xl text-neutral-900">{currencySymbol}{invoice.taxAmount.toLocaleString()}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between items-baseline font-black uppercase tracking-tight text-green-700">
                <span className="opacity-60">Paid</span>
                <span className="text-xl">-{currencySymbol}{invoice.paidAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline font-black uppercase tracking-tight border-t-4 border-neutral-900 pt-4">
              <span className="text-neutral-500">
                {invoice.status === 'paid' ? 'Total Paid' : 'Grand Total'}
              </span>
              <span className="text-3xl text-neutral-900">
                {currencySymbol}{(invoice.totalAmount - (invoice.paidAmount || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-12 pt-12">
          <div className="space-y-4">
             <p className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Notes:</p>
             <p className="text-neutral-600 text-sm leading-relaxed font-medium">
               {invoice.notes || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."}
             </p>
          </div>

          <div className="flex justify-between items-end pt-12">
            <div className="space-y-4">
              <p className="text-lg font-black uppercase tracking-tight text-neutral-900 italic">Term and Conditions:</p>
              <p className="text-neutral-500 text-[10px] leading-relaxed max-w-xs italic">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.
              </p>
            </div>
            <div className="text-right space-y-1">
               <p className="text-3xl font-serif italic text-neutral-900">{profile?.accountName || 'Samira Hadid'}</p>
               <div className="h-px bg-neutral-900 w-full mb-2" />
               <p className="text-xl font-black uppercase tracking-tight text-neutral-900">{profile?.accountName || 'Samira Hadid'}</p>
               <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Manager</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProDarkTemplate({ invoice, profile, currencySymbol }: { invoice: Invoice, profile: UserProfile | null, currencySymbol: string }) {
  return (
    <div className="bg-[#1e1e24] p-6 md:p-12 space-y-12 font-sans relative overflow-hidden text-neutral-100 min-h-[1000px]">
      <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-neutral-900/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[200px] md:w-[300px] h-[200px] md:h-[300px] border border-white/5 rounded-full pointer-events-none" />

      <div className="flex flex-col md:flex-row justify-between items-center relative z-10 gap-8">
        <h1 className="text-6xl md:text-9xl font-black tracking-tighter uppercase opacity-80 select-none">{invoice.type}</h1>
        <div className="text-center md:text-right space-y-1 opacity-60 font-mono text-xs md:text-sm">
          <p>Date: {format(new Date(), 'dd / MM / yyyy')}</p>
          <p className="break-all">Invoice ID: {invoice.invoiceNumber}</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 -mt-0 md:-mt-8 flex flex-col md:flex-row justify-between md:items-center text-neutral-900 shadow-2xl relative z-20 gap-8">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-neutral-400">Billed To</p>
          <p className="font-bold text-lg md:text-xl break-words">{invoice.customerName}</p>
          <p className="text-xs text-neutral-500 italic break-words">{invoice.customerAddress}</p>
        </div>
        <div className="text-left md:text-right space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-neutral-400">Payment Method</p>
          <p className="font-bold text-neutral-600">Bank Number:</p>
          <p className="font-mono text-sm break-all">{profile?.accountNumber}</p>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl rounded-[40px] p-12 text-neutral-900 shadow-2xl relative z-10 space-y-12">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[.3em] text-neutral-400 border-b border-neutral-100 italic">
              <th className="pb-6 text-left w-16">No</th>
              <th className="pb-6 text-left">Item Name</th>
              <th className="pb-6 text-center">Qty</th>
              <th className="pb-6 text-center">Unit Price</th>
              <th className="pb-6 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {invoice.items.map((item, i) => (
              <tr key={i} className="text-sm font-medium text-neutral-800">
                <td className="py-8 font-mono text-neutral-300">{i + 1}</td>
                <td className="py-8 text-lg font-bold break-words max-w-[400px]">{item.description}</td>
                <td className="py-8 text-center tabular-nums">{item.quantity}</td>
                <td className="py-8 text-center tabular-nums">{currencySymbol}{item.unitPrice.toLocaleString()}</td>
                <td className="py-8 text-right font-black tabular-nums">{currencySymbol}{item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="h-px bg-neutral-100" />

        <div className="flex justify-between gap-12">
          <div className="max-w-md space-y-4">
            <p className="text-sm font-black uppercase tracking-widest text-neutral-900 italic">Terms and Condition</p>
            <p className="text-xs text-neutral-500 font-medium leading-relaxed italic">
              All invoices must be paid within 30 days from the date of the invoice unless otherwise agreed upon in writing. Late payments may incur additional charges.
            </p>
          </div>
          <div className="w-80 space-y-4">
            <div className="flex justify-between items-baseline font-black tracking-tighter">
              <span className="text-neutral-400 uppercase tracking-widest text-[10px]">Sub Total</span>
              <span className="text-2xl tabular-nums italic">{currencySymbol}{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline font-black tracking-tighter">
              <span className="text-neutral-400 uppercase tracking-widest text-[10px]">Tax ({invoice.taxRate}%)</span>
              <span className="text-2xl tabular-nums italic">{currencySymbol}{invoice.taxAmount.toLocaleString()}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between items-baseline font-black tracking-tighter text-green-600">
                <span className="text-[10px] uppercase tracking-widest">Amount Paid</span>
                <span className="text-2xl tabular-nums italic">-{currencySymbol}{invoice.paidAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline font-black tracking-tighter pt-4 border-t-2 border-neutral-900">
              <span className="text-neutral-400 uppercase tracking-widest text-sm">
                {invoice.status === 'paid' ? 'Total Paid' : 'Total Due'}
              </span>
              <span className="text-4xl tabular-nums italic">
                {currencySymbol}{(invoice.totalAmount - (invoice.paidAmount || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end relative z-10 pt-12 border-t border-white/10">
        <div className="space-y-4">
          <p className="text-sm font-black tracking-widest italic uppercase">Contact Us:</p>
          <div className="text-xs space-y-1 opacity-60 italic">
            <p>{profile?.businessPhone}</p>
            <p>{profile?.businessEmail}</p>
            <p>{profile?.businessAddress}</p>
          </div>
        </div>
        <div className="text-right space-y-4">
           {profile?.accountName && <p className="text-4xl font-serif italic mb-4">{profile.accountName}</p>}
           <div className="h-px bg-white/30 w-full" />
           <p className="text-lg font-black tracking-wider uppercase italic">{profile?.accountName || 'Rosa Maria Aguado'}</p>
        </div>
      </div>

      <div className="absolute -bottom-16 -right-16 w-64 h-64 border border-white/5 rounded-full pointer-events-none rotate-45" />
    </div>
  );
}

// --- Helper UI Components ---

function LogoArea({ profile, minimal = false }: { profile: UserProfile | null, minimal?: boolean }) {
  if (profile?.logoUrl) {
    return (
      <div className={`relative ${minimal ? 'w-16 h-16' : 'w-24 h-24'}`}>
        <img 
          src={profile.logoUrl} 
          alt="Business Logo" 
          className="w-full h-full object-contain rounded-xl"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`bg-black rounded-lg ${minimal ? 'p-1' : 'p-2'}`}>
        <FileText className={`${minimal ? 'w-5 h-5' : 'w-8 h-8'} text-white`} />
      </div>
      <span className={`${minimal ? 'text-lg' : 'text-2xl'} font-black uppercase tracking-tighter italic text-black`}>Lumina</span>
    </div>
  );
}
