import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../store/authStore';
import useCompanyStore from '../../store/companyStore';
import { companyApi } from '../../services/api';
import toast from 'react-hot-toast';

const DEFAULT_BRANDING = {
  primaryColor: '#1a3c6e',
  secondaryColor: '#d4a017',
  accentColor: '#800020',
  bgColor: '#f5f0e8',
};

export default function AdminSettings() {
  const { user } = useAuthStore();
  const { setCompany } = useCompanyStore();
  const companyId = user?.companyId;

  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [infoForm, setInfoForm] = useState({
    name: '',
    slug: '',
    tagline: '',
    description: '',
  });

  const [branding, setBranding] = useState({ ...DEFAULT_BRANDING });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!companyId) return;
    fetchCompany();
  }, [companyId]);

  const fetchCompany = async () => {
    setLoading(true);
    try {
      const res = await companyApi.getById(companyId);
      const data = res.data?.data || res.data || {};
      setInfoForm({
        name: data.name || '',
        slug: data.slug || '',
        tagline: data.tagline || '',
        description: data.description || '',
      });
      setBranding({
        primaryColor: data.primaryColor || DEFAULT_BRANDING.primaryColor,
        secondaryColor: data.secondaryColor || DEFAULT_BRANDING.secondaryColor,
        accentColor: data.accentColor || DEFAULT_BRANDING.accentColor,
        bgColor: data.bgColor || DEFAULT_BRANDING.bgColor,
      });
      if (data.logoUrl) setLogoPreview(data.logoUrl);
    } catch {
      toast.error('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!infoForm.name.trim()) { toast.error('Company name is required'); return; }
    setSavingInfo(true);
    try {
      const { slug, ...payload } = infoForm;
      await companyApi.update(companyId, payload);
      toast.success('Company info saved');
    } catch {
      toast.error('Failed to save company info');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const res = await companyApi.updateBranding(companyId, branding);
      const updated = res.data?.data || res.data;
      if (updated) setCompany(updated);
      toast.success('Branding saved and applied');
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleLogoFile(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      const res = await companyApi.uploadLogo(companyId, formData);
      const updated = res.data?.data || res.data;
      if (updated?.logoUrl) setLogoPreview(updated.logoUrl);
      if (updated) setCompany(updated);
      setLogoFile(null);
      toast.success('Logo uploaded successfully');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-40" />
        <div className="bg-white rounded-xl p-6 space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a3c6e] font-serif">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your company profile and branding</p>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#f5f0e8]">
          <h2 className="font-semibold text-[#1a3c6e]">Company Information</h2>
          <p className="text-xs text-gray-500 mt-0.5">Basic details about your company</p>
        </div>
        <form onSubmit={handleSaveInfo} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={infoForm.name}
                onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]"
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (readonly)</label>
              <input
                type="text"
                value={infoForm.slug}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input
                type="text"
                value={infoForm.tagline}
                onChange={(e) => setInfoForm({ ...infoForm, tagline: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e]"
                placeholder="A short, catchy tagline"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={infoForm.description}
                onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3c6e] resize-none"
                placeholder="Describe your company..."
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingInfo}
              className="bg-[#1a3c6e] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#15325c] disabled:opacity-60 transition-colors"
            >
              {savingInfo ? 'Saving...' : 'Save Company Info'}
            </button>
          </div>
        </form>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#f5f0e8]">
          <h2 className="font-semibold text-[#1a3c6e]">Branding</h2>
          <p className="text-xs text-gray-500 mt-0.5">Customize your platform colors and logo</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Color Pickers */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Brand Colors</h3>
              {[
                { key: 'primaryColor', label: 'Primary Color (Navy)', hint: 'Main navigation, buttons' },
                { key: 'secondaryColor', label: 'Secondary Color (Gold)', hint: 'Accents, highlights' },
                { key: 'accentColor', label: 'Accent Color (Maroon)', hint: 'Alerts, CTAs' },
                { key: 'bgColor', label: 'Background Color (Cream)', hint: 'Page backgrounds' },
              ].map(({ key, label, hint }) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="color"
                      value={branding[key]}
                      onChange={(e) => setBranding({ ...branding, [key]: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{hint}</p>
                  </div>
                  <code className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200">{branding[key]}</code>
                </div>
              ))}
            </div>

            {/* Live Preview */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Live Preview</h3>
              <div
                className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                style={{ backgroundColor: branding.bgColor }}
              >
                {/* Preview Nav */}
                <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: branding.primaryColor }}>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-6 h-6 object-contain rounded-full" />
                    ) : (
                      <span className="text-xs text-white font-bold">{infoForm.name?.charAt(0) || 'A'}</span>
                    )}
                  </div>
                  <span className="text-white text-sm font-semibold">{infoForm.name || 'Company Name'}</span>
                </div>
                {/* Preview Content */}
                <div className="p-4">
                  <h4 className="font-bold text-lg mb-1" style={{ color: branding.primaryColor }}>
                    {infoForm.name || 'Company Name'}
                  </h4>
                  {infoForm.tagline && (
                    <p className="text-sm mb-3" style={{ color: branding.accentColor }}>{infoForm.tagline}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-1.5 rounded-lg text-sm text-white font-medium"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      Primary
                    </button>
                    <button
                      className="px-4 py-1.5 rounded-lg text-sm text-white font-medium"
                      style={{ backgroundColor: branding.secondaryColor }}
                    >
                      Secondary
                    </button>
                    <button
                      className="px-4 py-1.5 rounded-lg text-sm text-white font-medium"
                      style={{ backgroundColor: branding.accentColor }}
                    >
                      Accent
                    </button>
                  </div>
                  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: branding.primaryColor + '15', border: `1px solid ${branding.primaryColor}30` }}>
                    <p className="text-xs" style={{ color: branding.primaryColor }}>Preview card with your brand colors</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveBranding}
              disabled={savingBranding}
              className="bg-[#d4a017] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#b8880f] disabled:opacity-60 transition-colors"
            >
              {savingBranding ? 'Applying...' : 'Save & Apply Branding'}
            </button>
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#f5f0e8]">
          <h2 className="font-semibold text-[#1a3c6e]">Company Logo</h2>
          <p className="text-xs text-gray-500 mt-0.5">Upload a PNG, JPG, or SVG (recommended: 200×200px)</p>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-6">
            {/* Current Logo */}
            <div className="shrink-0">
              <div
                className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-[#f5f0e8] overflow-hidden"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
            </div>

            {/* Drop Zone */}
            <div className="flex-1">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleLogoDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-[#1a3c6e] bg-blue-50' : 'border-gray-200 hover:border-[#1a3c6e] hover:bg-[#f5f0e8]'
                }`}
              >
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-500">Drag & drop or <span className="text-[#1a3c6e] font-medium">click to browse</span></p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG up to 5MB</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoFile(e.target.files[0])} />
              </div>
              {logoFile && (
                <div className="mt-3 flex items-center justify-between p-3 bg-[#f5f0e8] rounded-lg">
                  <span className="text-sm text-gray-700 truncate">{logoFile.name}</span>
                  <button
                    onClick={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="shrink-0 ml-3 bg-[#1a3c6e] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#15325c] disabled:opacity-60 transition-colors"
                  >
                    {uploadingLogo ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
