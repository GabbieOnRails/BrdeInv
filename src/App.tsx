import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { 
  Plus, 
  FileText, 
  Settings, 
  LogOut, 
  Search, 
  Filter, 
  Download, 
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import SettingsPage from './components/SettingsPage';
import InvoiceView from './components/InvoiceView';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'settings' | 'view'>('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-black border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neutral-50 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full p-8 bg-white border border-neutral-200 rounded-3xl shadow-xl space-y-8 text-center"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-black rounded-2xl">
              <FileText className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 font-sans">Lumina Invoice</h1>
            <p className="text-neutral-500 font-sans">Professional billing for modern teams.</p>
          </div>
          <Button onClick={login} className="w-full h-14 text-lg font-medium rounded-2xl bg-black hover:bg-neutral-800 transition-all">
            Sign in with Google
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      <Toaster position="top-center" />
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-neutral-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTab('dashboard'); setSelectedInvoiceId(null); }}>
          <div className="p-2 bg-black rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Lumina</span>
        </div>

        <div className="hidden md:flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-lg px-4 ${activeTab === 'dashboard' ? 'bg-white shadow-sm' : ''}`}
          >
            Dashboard
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTab('settings')}
            className={`rounded-lg px-4 ${activeTab === 'settings' ? 'bg-white shadow-sm' : ''}`}
          >
            Settings
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setActiveTab('create')} size="sm" className="hidden sm:flex gap-2 rounded-xl bg-black hover:bg-neutral-800">
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
          <div className="h-8 w-[1px] bg-neutral-200 mx-1 hidden sm:block" />
          <Button variant="ghost" size="icon" onClick={logout} className="rounded-xl">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Dashboard 
                user={user} 
                onEdit={(id) => { setSelectedInvoiceId(id); setActiveTab('create'); }}
                onView={(id) => { setSelectedInvoiceId(id); setActiveTab('view'); }}
              />
            </motion.div>
          )}

          {activeTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <InvoiceForm 
                user={user} 
                invoiceId={selectedInvoiceId} 
                onClose={() => { setActiveTab('dashboard'); setSelectedInvoiceId(null); }} 
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SettingsPage user={user} />
            </motion.div>
          )}

          {activeTab === 'view' && selectedInvoiceId && (
            <motion.div
              key="view"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
            >
              <InvoiceView 
                user={user} 
                invoiceId={selectedInvoiceId} 
                onClose={() => { setActiveTab('dashboard'); setSelectedInvoiceId(null); }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
