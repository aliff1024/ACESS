import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const THUMBNAILS = [
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=225&fit=crop',
]

const { data: courses } = await supabase
  .from('courses')
  .select('id, title')
  .is('thumbnail_url', null)
  .is('deleted_at', null)

console.log(`Found ${courses?.length || 0} courses without thumbnails`)

if (courses && courses.length > 0) {
  for (let i = 0; i < courses.length; i++) {
    const url = THUMBNAILS[i % THUMBNAILS.length]
    await supabase
      .from('courses')
      .update({ thumbnail_url: url, updated_at: new Date().toISOString() })
      .eq('id', courses[i].id)
    console.log(`  ✓ ${courses[i].title}`)
  }
  console.log(`\nUpdated ${courses.length} courses`)
} else {
  console.log('All courses already have thumbnails')
}
