import { supabase } from './supabase';

export interface SearchResult {
  id: string;
  type: 'course' | 'lesson' | 'user' | 'feature';
  title: string;
  subtitle: string;
  url: string;
}

const ADMIN_FEATURES = [
  { id: 'feat-users', title: 'User Management', url: '/admin/users' },
  { id: 'feat-courses', title: 'Course Management', url: '/admin/courses' },
  { id: 'feat-educators', title: 'Educators Applications', url: '/admin/instructor-applications' },
  { id: 'feat-feedback', title: 'Feedback (Contact Messages)', url: '/admin/contact-messages' },
  { id: 'feat-certificates', title: 'Certificates', url: '/admin/certificates' },
  { id: 'feat-analytics', title: 'Analytics', url: '/admin/analytics' },
  { id: 'feat-reports', title: 'Reports', url: '/admin/reports' },
];

export async function performUniversalSearch(
  query: string, 
  role: 'learner' | 'educator' | 'admin', 
  userId: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  if (!query || query.length < 2) return results;

  const searchQuery = `%${query}%`;

  // 1. Search Courses
  let courseQuery = supabase
    .from('courses')
    .select('id, title, status, created_by')
    .ilike('title', searchQuery)
    .limit(5);

  if (role === 'learner') {
    courseQuery = courseQuery.eq('status', 'published');
  } else if (role === 'educator') {
    courseQuery = courseQuery.eq('created_by', userId);
  }
  
  const { data: courses } = await courseQuery;
  courses?.forEach(c => {
    let url = `/learner/courses/${c.id}`;
    if (role === 'educator') url = `/educator/courses/${c.id}`;
    if (role === 'admin') url = `/admin/courses/${c.id}`;

    results.push({
      id: c.id,
      type: 'course',
      title: c.title,
      subtitle: `Course • ${c.status.charAt(0).toUpperCase() + c.status.slice(1)}`,
      url
    });
  });

  // 2. Search Lessons
  let lessonQuery = supabase
    .from('lessons')
    .select('id, title, course_id, status')
    .ilike('title', searchQuery)
    .limit(5);

  if (role === 'learner') {
    lessonQuery = lessonQuery.eq('status', 'published');
  }
  
  const { data: lessons } = await lessonQuery;
  
  // If educator, we filter lessons to only those in their courses
  let validLessons = lessons || [];
  if (role === 'educator' && lessons && lessons.length > 0) {
    const { data: educatorCourses } = await supabase
      .from('courses')
      .select('id')
      .eq('created_by', userId);
    
    const courseIds = new Set(educatorCourses?.map(c => c.id) || []);
    validLessons = lessons.filter(l => courseIds.has(l.course_id));
  }

  validLessons.forEach(l => {
    let url = `/learner/courses/${l.course_id}/learn?lesson=${l.id}`;
    if (role === 'educator') url = `/educator/courses/${l.course_id}?tab=lessons&lessonId=${l.id}`;
    if (role === 'admin') url = `/admin/courses/${l.course_id}`; // Admin doesn't have a direct lesson view yet

    results.push({
      id: l.id,
      type: 'lesson',
      title: l.title,
      subtitle: `Lesson • ${l.status.charAt(0).toUpperCase() + l.status.slice(1)}`,
      url
    });
  });

  // 3. Search Users (Admin & Educator only)
  if (role === 'admin' || role === 'educator') {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .or(`full_name.ilike.${searchQuery},email.ilike.${searchQuery}`)
      .limit(5);
     
    users?.forEach(u => {
      // Don't show self
      if (u.id === userId) return;

      results.push({
        id: u.id,
        type: 'user',
        title: u.full_name || 'Unknown User',
        subtitle: `User • ${u.email}`,
        url: role === 'admin' ? `/admin/users/${u.id}` : `/educator/students/${u.id}`
      });
    });
  }

  // 4. Search Admin Features
  if (role === 'admin') {
    const qLower = query.toLowerCase();
    ADMIN_FEATURES.forEach(feat => {
      if (feat.title.toLowerCase().includes(qLower)) {
        results.push({
          id: feat.id,
          type: 'feature',
          title: feat.title,
          subtitle: 'Admin Feature',
          url: feat.url
        });
      }
    });
  }

  return results;
}
