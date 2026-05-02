import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Invoice, invoiceService, UserProfile, userService } from '@/services/invoiceService';
import { getCurrencySymbol } from '@/lib/utils';
import { INVOICE_TEMPLATES } from '@/constants/templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Trash2, 
  Save, 
  ArrowLeft,
  Loader2,
  Eye,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import InvoiceView from './InvoiceView';

interface InvoiceFormProps {
  user: User;
  invoiceId: string | null;
  onClose: () => void;
}

export default function InvoiceForm({ user, invoiceId, onClose }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [formData, setFormData] = useState<Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>>({
    userId: user.uid,
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    type: 'invoice',
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
    taxRate: 0,
    taxAmount: 0,
    subtotal: 0,
    totalAmount: 0,
    paidAmount: 0,
    status: 'draft',
    templateId: 'modern',
    notes: ''
  });

  // Handle type change and update prefix if it's a new invoice
  useEffect(() => {
    if (!invoiceId) {
      const prefix = formData.type === 'receipt' ? 'REC' : 'INV';
      const status = formData.type === 'receipt' ? 'paid' : formData.status;
      const currentNumber = formData.invoiceNumber;
      if (currentNumber.startsWith('INV-') || currentNumber.startsWith('REC-')) {
        const suffix = currentNumber.split('-')[1];
        setFormData(prev => ({ 
          ...prev, 
          invoiceNumber: `${prefix}-${suffix}`,
          status: status as any
        }));
      }
    }
  }, [formData.type, invoiceId]);

  useEffect(() => {
    const init = async () => {
      const p = await userService.getProfile(user.uid);
      if (p) {
        setProfile(p);
        if (!invoiceId) {
          setFormData(prev => ({ 
            ...prev, 
            templateId: p.defaultTemplateId || 'modern'
          }));
        }
      }

      if (invoiceId) {
        setLoading(true);
        const inv = await invoiceService.getInvoice(user.uid, invoiceId);
        if (inv) {
          // Sync with form state
          const date = inv.date instanceof Date ? inv.date : (inv.date as any).toDate ? (inv.date as any).toDate() : new Date(inv.date as any);
          const dueDate = inv.dueDate instanceof Date ? inv.dueDate : (inv.dueDate as any).toDate ? (inv.dueDate as any).toDate() : new Date(inv.dueDate as any);
          
          setFormData({
             ...inv,
             date,
             dueDate
          });
        }
        setLoading(false);
      }
    };
    init();
  }, [user.uid, invoiceId]);

  const currencySymbol = getCurrencySymbol(profile?.defaultCurrency || '$');

  const calculateTotals = (items: typeof formData.items, taxRate: number) => {
    const subtotal = items.reduce((acc, item) => acc + (item.total || item.quantity * item.unitPrice), 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };
    item.total = item.quantity * item.unitPrice;
    newItems[index] = item;
    
    const totals = calculateTotals(newItems, formData.taxRate);
    setFormData({ ...formData, items: newItems, ...totals });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    const totals = calculateTotals(newItems, formData.taxRate);
    setFormData({ ...formData, items: newItems, ...totals });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (invoiceId) {
        await invoiceService.updateInvoice(user.uid, invoiceId, formData);
        toast.success('Invoice updated');
      } else {
        await invoiceService.createInvoice(user.uid, formData);
        toast.success('Invoice created');
      }
      onClose();
    } catch (err) {
      toast.error('Failed to save invoice');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            {invoiceId ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className="rounded-xl h-12 px-6 gap-2 border-neutral-300 hover:border-black transition-all"
          >
            <Eye className="w-4 h-4" />
            {isPreviewOpen ? 'Hide Preview' : 'Show Preview'}
          </Button>

          <Button onClick={handleSubmit} disabled={loading} className="rounded-xl bg-black hover:bg-neutral-800 h-12 px-6 gap-2 shadow-lg shadow-black/10">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Forms */}
        <div className={`space-y-8 ${isPreviewOpen ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
          {/* Template Selection */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold">1. Choose Template</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {INVOICE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setFormData({...formData, templateId: tmpl.id})}
                  className={`relative p-4 rounded-3xl border-2 transition-all text-left flex items-start gap-4 ${formData.templateId === tmpl.id ? 'border-black bg-neutral-50' : 'border-neutral-100 bg-white hover:border-neutral-200'}`}
                >
                  <div className={`p-2 rounded-xl ${formData.templateId === tmpl.id ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                    <tmpl.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm">{tmpl.name}</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">{tmpl.variant}</p>
                  </div>
                  {formData.templateId === tmpl.id && (
                    <div className="absolute top-2 right-2 p-1 bg-black rounded-full shadow-lg">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Invoice Details */}
            <Card className="rounded-3xl border-neutral-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">2. Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invoice #</Label>
                    <Input 
                      value={formData.invoiceNumber} 
                      onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                      className="rounded-xl border-neutral-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select 
                      className="w-full flex h-10 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                    >
                      <option value="invoice">Invoice</option>
                      <option value="receipt">Receipt</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select 
                      className="w-full flex h-10 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : ''}
                      onChange={e => setFormData({...formData, date: new Date(e.target.value)})}
                      className="rounded-xl border-neutral-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input 
                      type="date" 
                      value={formData.dueDate instanceof Date ? formData.dueDate.toISOString().split('T')[0] : ''}
                      onChange={e => setFormData({...formData, dueDate: new Date(e.target.value)})}
                      className="rounded-xl border-neutral-200" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card className="rounded-3xl border-neutral-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">3. Customer Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input 
                    placeholder="ACME Corp" 
                    value={formData.customerName}
                    onChange={e => setFormData({...formData, customerName: e.target.value})}
                    className="rounded-xl border-neutral-200" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    placeholder="billing@acme.com" 
                    value={formData.customerEmail}
                    onChange={e => setFormData({...formData, customerEmail: e.target.value})}
                    className="rounded-xl border-neutral-200" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input 
                    placeholder="123 Business St, City" 
                    value={formData.customerAddress}
                    onChange={e => setFormData({...formData, customerAddress: e.target.value})}
                    className="rounded-xl border-neutral-200" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card className="rounded-3xl border-neutral-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-neutral-50 border-b border-neutral-100 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base">4. Line Items</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={addItem} className="gap-2 text-neutral-600 rounded-lg">
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%] pl-6">Description</TableHead>
                    <TableHead className="w-[15%]">Qty</TableHead>
                    <TableHead className="w-[15%] text-right font-mono pr-6">Amount</TableHead>
                    <TableHead className="w-[10%] text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="py-4 pl-6">
                        <Input 
                          placeholder="Project consultation" 
                          value={item.description}
                          onChange={e => handleItemChange(index, 'description', e.target.value)}
                          className="rounded-xl border-none shadow-none focus-visible:ring-0 bg-transparent px-0 h-8 font-medium"
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <Input 
                          type="number" 
                          value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="rounded-xl border-none shadow-none focus-visible:ring-0 bg-transparent px-0 h-8 tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6 tabular-nums font-mono font-bold">
                        {currencySymbol}{(item.total || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="py-2 text-right pr-4">
                         <div className="flex flex-col gap-1 items-end">
                            <span className="text-[10px] text-neutral-400 tabular-nums">Price:</span>
                            <Input 
                              type="number" 
                              value={item.unitPrice}
                              onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="rounded-xl border-neutral-100 bg-neutral-50 h-6 w-20 text-[10px] text-right"
                            />
                         </div>
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeItem(index)}
                          className="rounded-lg text-neutral-300 hover:text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Totals & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-3xl border-neutral-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">5. Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea 
                  rows={4}
                  placeholder="Terms, conditions, or thank you note..."
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full flex min-h-[80px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                />
              </CardContent>
            </Card>

            <div className="p-8 bg-neutral-900 rounded-[32px] text-white flex flex-col justify-center space-y-4 shadow-2xl">
              <div className="flex justify-between items-center text-sm opacity-60">
                <span>Subtotal</span>
                <span className="tabular-nums font-mono">{currencySymbol}{formData.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-60 flex items-center gap-2">
                  Tax Rate (%) 
                  <Input 
                    type="number" 
                    value={formData.taxRate}
                    onChange={e => {
                      const rate = parseFloat(e.target.value) || 0;
                      const totals = calculateTotals(formData.items, rate);
                      setFormData({...formData, taxRate: rate, ...totals});
                    }}
                    className="w-16 h-8 text-[10px] rounded-lg bg-white/10 border-white/10 text-white tabular-nums" 
                  />
                </span>
                <span className="tabular-nums font-mono opacity-60">{currencySymbol}{formData.taxAmount.toLocaleString()}</span>
              </div>
              <div className="h-[1px] bg-white/10 my-2" />
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Total Amount</span>
                <span className="text-4xl font-black tracking-tighter tabular-nums italic">
                  <span className="text-sm not-italic align-top mr-1 font-sans">{currencySymbol}</span>
                  {formData.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Preview */}
        <AnimatePresence>
          {isPreviewOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-6 hidden lg:block sticky top-24 h-[calc(100vh-140px)]"
            >
              <div className="bg-neutral-100 rounded-[42px] p-6 h-full border border-neutral-200 shadow-inner overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between mb-4 px-4 font-sans">
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 italic">Live Preview</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-neutral-300" />
                    <div className="w-2 h-2 rounded-full bg-neutral-300" />
                    <div className="w-2 h-2 rounded-full bg-neutral-300" />
                  </div>
                </div>
                <InvoiceView 
                  user={user} 
                  invoiceObject={formData as Invoice} 
                  isPreview 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
