export const STOCK_COURSE_THUMBNAILS = [
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=450&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=450&fit=crop',
] as const;

export const COURSE_CATEGORIES = [
  'Accessibility',
  'Reading & Literacy',
  'Mathematics',
  'Study Skills',
  'Technology',
] as const;

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
