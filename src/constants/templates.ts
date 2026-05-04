import { type ReactNode } from 'react';
import { Palette, Layout, type LucideIcon, Type, Layers } from 'lucide-react';

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  variant: 'modern' | 'classic' | 'minimal' | 'bold' | 'executive';
  theme: {
    primary: string;
    secondary?: string;
    accent: string;
    fontFamily: string;
    borderRadius: string;
  };
}

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'executive_gold',
    name: 'Executive Gold',
    description: 'A premium, professional layout with navy bars, gold accents, and detailed column spacing.',
    icon: Palette,
    variant: 'executive',
    theme: {
      primary: '#002147', // Deep Navy
      secondary: '#B8860B', // Dark Goldenrod/Gold
      accent: '#F9F9F9',
      fontFamily: 'font-sans',
      borderRadius: 'radius-none',
    }
  },
  {
    id: 'modern',
    name: 'Modern Tech',
    description: 'Clean, high-contrast design with specialized spacing.',
    icon: Palette,
    variant: 'modern',
    theme: {
      primary: 'hsl(0 0% 20.5%)',
      accent: 'hsl(0 0% 70.8%)',
      fontFamily: 'font-sans',
      borderRadius: 'radius-2xl',
    }
  },
  {
    id: 'minimal',
    name: 'Artisan Minimal',
    description: 'Quiet elegance with plenty of whitespace and light borders.',
    icon: Layout,
    variant: 'minimal',
    theme: {
      primary: 'hsl(0 0% 40.5%)',
      accent: 'hsl(0 0% 92.2%)',
      fontFamily: 'font-sans',
      borderRadius: 'radius-none',
    }
  },
  {
    id: 'bold',
    name: 'Standard Bold',
    description: 'Strong headlines and a focused header for clear communication.',
    icon: Type,
    variant: 'bold',
    theme: {
      primary: 'hsl(0 0% 20.5%)',
      accent: 'hsl(0 0% 50%)',
      fontFamily: 'font-sans',
      borderRadius: 'radius-lg',
    }
  },
  {
    id: 'studio_light',
    name: 'Studio Shodwe (Light)',
    description: 'A professional marketing-style layout with purple accents and striped rows.',
    icon: Layers,
    variant: 'modern',
    theme: {
      primary: '#6D28D9',
      accent: '#EDE9FE',
      fontFamily: 'font-sans',
      borderRadius: 'radius-none',
    }
  },
  {
    id: 'liceria_purple',
    name: 'Liceria Minimal',
    description: 'Bold rounded cards on a soft purple background for a modern brand feel.',
    icon: Layout,
    variant: 'minimal',
    theme: {
      primary: '#A855F7',
      accent: '#F3E8FF',
      fontFamily: 'font-sans',
      borderRadius: 'radius-3xl',
    }
  },
  {
    id: 'studio_dark',
    name: 'Studio Shodwe (Dark)',
    description: 'High-contrast dark header with a sophisticated cream body and rounded cuts.',
    icon: Palette,
    variant: 'bold',
    theme: {
      primary: '#111827',
      accent: '#F5F5F4',
      fontFamily: 'font-serif',
      borderRadius: 'radius-3xl',
    }
  },
  {
    id: 'pro_dark',
    name: 'Professional Dark',
    description: 'A deep tech-focused design with overlapping white containers and modern typography.',
    icon: Type,
    variant: 'modern',
    theme: {
      primary: '#0F172A',
      accent: '#F8FAFC',
      fontFamily: 'font-sans',
      borderRadius: 'radius-2xl',
    }
  }
];
