import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, userService } from '@/services/invoiceService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Save, 
  Loader2, 
  User as UserIcon, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  CreditCard, 
  Landmark,
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';

interface SettingsProps {
  user: User;
}

export default function SettingsPage({ user }: SettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    businessName: '',
    businessAddress: '',
    businessEmail: user.email || '',
    businessPhone: '',
    defaultCurrency: 'USD',
    defaultTemplateId: 'modern',
    bankName: '',
    accountName: '',
    accountNumber: '',
    logoUrl: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const data = await userService.getProfile(user.uid);
      if (data) {
        setProfile(data);
        if (data.logoUrl) setLogoPreview(data.logoUrl);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user.uid]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error('Logo must be less than 500KB to fit in profile');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setProfile({ ...profile, logoUrl: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setProfile({ ...profile, logoUrl: '' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userService.updateProfile(user.uid, profile);
      toast.success('Settings updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto py-10 px-4">
        <div className="h-10 w-48 bg-neutral-100 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 bg-neutral-100 rounded-3xl" />
          <div className="h-64 bg-neutral-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 md:py-10 px-4 font-sans space-y-8 md:space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight italic uppercase">Settings</h1>
          <p className="text-neutral-500 font-medium tracking-wide text-sm md:text-base">Configure your business identity and billing defaults.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="rounded-2xl bg-black hover:bg-neutral-800 h-14 px-8 text-lg font-bold shadow-2xl shadow-black/20 gap-3 w-full md:w-auto"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Identities */}
        <div className="lg:col-span-12">
          <Card className="rounded-[32px] md:rounded-[40px] border-neutral-200 overflow-hidden shadow-sm">
            <CardHeader className="bg-neutral-50 p-6 md:p-8 border-b border-neutral-100">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-xl md:text-2xl font-bold tracking-tight">Business Identity</CardTitle>
                  <CardDescription className="text-neutral-500 mt-1">This branding will be used throughout Lumina and on all generated documents.</CardDescription>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm shrink-0">
                  <Building className="w-6 h-6 text-black" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-8 md:space-y-10">
              <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                {/* Logo Section */}
                <div className="space-y-4 flex flex-col items-center md:items-start shrink-0">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Business Logo</Label>
                  <div className="relative group">
                    {logoPreview ? (
                      <div className="relative w-32 h-32 md:w-40 md:h-40 bg-white border-2 border-neutral-100 rounded-[32px] overflow-hidden flex items-center justify-center p-4">
                        <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        <button 
                          onClick={removeLogo}
                          className="absolute top-2 right-2 p-2 bg-black rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <Label htmlFor="logo-upload" className="cursor-pointer flex flex-col items-center justify-center w-32 h-32 md:w-40 md:h-40 border-2 border-dashed border-neutral-200 rounded-[32px] hover:border-black hover:bg-neutral-50 transition-all group">
                        <Upload className="w-6 h-6 md:w-8 md:h-8 text-neutral-300 group-hover:text-black mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-black">Upload</span>
                        <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </Label>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400 font-medium max-w-[160px] text-center md:text-left italic">Best on white/transparent.</p>
                </div>

                {/* Main Fields */}
                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-neutral-400">Company Name</Label>
                      <Input 
                        value={profile.businessName} 
                        onChange={e => setProfile({...profile, businessName: e.target.value})}
                        placeholder="Lumina Global"
                        className="rounded-xl border-neutral-200 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-neutral-400">Support Email</Label>
                      <Input 
                        value={profile.businessEmail} 
                        onChange={e => setProfile({...profile, businessEmail: e.target.value})}
                        placeholder="hello@lumina.com"
                        className="rounded-xl border-neutral-200 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-neutral-400">Phone</Label>
                      <Input 
                        value={profile.businessPhone} 
                        onChange={e => setProfile({...profile, businessPhone: e.target.value})}
                        placeholder="+1 (555) 000-0000"
                        className="rounded-xl border-neutral-200 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-neutral-400">Currency Preference</Label>
                      <select 
                        className="w-full flex h-12 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none font-bold"
                        value={profile.defaultCurrency}
                        onChange={e => setProfile({...profile, defaultCurrency: e.target.value})}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="NGN">NGN (₦)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-neutral-400">Default Template</Label>
                      <select 
                        className="w-full flex h-12 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none font-bold"
                        value={profile.defaultTemplateId || 'modern'}
                        onChange={e => setProfile({...profile, defaultTemplateId: e.target.value})}
                      >
                        <option value="modern">Modern Tech</option>
                        <option value="minimal">Artisan Minimal</option>
                        <option value="bold">Standard Bold</option>
                        <option value="studio_light">Studio Shodwe (Light)</option>
                        <option value="liceria_purple">Liceria Minimal</option>
                        <option value="studio_dark">Studio Shodwe (Dark)</option>
                        <option value="pro_dark">Professional Dark</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-neutral-400">Registered Office Address</Label>
                    <textarea 
                      rows={3}
                      value={profile.businessAddress}
                      onChange={e => setProfile({...profile, businessAddress: e.target.value})}
                      placeholder="Street, City, Postcode..."
                      className="w-full flex min-h-[100px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-neutral-100" />

              {/* Bank Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-100 rounded-xl">
                    <Landmark className="w-5 h-5 text-neutral-500" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">Payout Account</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-neutral-400">Financial Institution</Label>
                    <Input 
                      value={profile.bankName} 
                      onChange={e => setProfile({...profile, bankName: e.target.value})}
                      placeholder="Chase Bank"
                      className="rounded-xl border-neutral-200 h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-neutral-400">Legal Account Name</Label>
                    <Input 
                      value={profile.accountName} 
                      onChange={e => setProfile({...profile, accountName: e.target.value})}
                      placeholder="John Doe LLC"
                      className="rounded-xl border-neutral-200 h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-neutral-400">Account / IBAN</Label>
                    <Input 
                      value={profile.accountNumber} 
                      onChange={e => setProfile({...profile, accountNumber: e.target.value})}
                      placeholder="1234567890"
                      className="rounded-xl border-neutral-200 h-12 font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-center pb-10">
        <p className="text-xs text-neutral-400 font-medium italic">Lumina Enterprise • Your data is secured with AES-256 cloud encryption.</p>
      </div>
    </div>
  );
}
