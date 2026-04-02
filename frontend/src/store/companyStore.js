import { create } from 'zustand';

const useCompanyStore = create((set) => ({
  company: null,
  isLoading: false,

  setCompany: (company) => {
    set({ company });
    // Apply company branding to CSS custom properties
    if (company) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', company.primaryColor || '#1a3c6e');
      root.style.setProperty('--color-gold', company.secondaryColor || '#d4a017');
      root.style.setProperty('--color-maroon', company.accentColor || '#800020');
      root.style.setProperty('--color-cream', company.bgColor || '#f5f0e8');
      root.style.setProperty('--font-heading', `'${company.fontHeading || 'Cormorant Garamond'}', serif`);
      root.style.setProperty('--font-body', `'${company.fontBody || 'Rajdhani'}', sans-serif`);
    }
  },

  clearCompany: () => {
    // Reset to platform defaults
    const root = document.documentElement;
    root.style.removeProperty('--color-primary');
    root.style.removeProperty('--color-gold');
    root.style.removeProperty('--color-maroon');
    root.style.removeProperty('--color-cream');
    root.style.removeProperty('--font-heading');
    root.style.removeProperty('--font-body');
    set({ company: null });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

export default useCompanyStore;
