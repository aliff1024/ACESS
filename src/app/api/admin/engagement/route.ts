import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const last7Days: { date: Date; endOfDay: Date; name: string; users: number; views: number; quizzes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      last7Days.push({
        date: d,
        endOfDay,
        name: days[d.getDay()],
        users: 0,
        views: 0,
        quizzes: 0
      });
    }

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const [lpRes, qaRes] = await Promise.all([
      supabase.from('lesson_progress')
        .select('enrollment_id, last_viewed_at')
        .gte('last_viewed_at', sevenDaysAgoStr),
      supabase.from('quiz_attempts')
        .select('enrollment_id, submitted_at')
        .gte('submitted_at', sevenDaysAgoStr)
    ]);

    for (let i = 0; i < last7Days.length; i++) {
      const activeEnrollments = new Set<string>();
      const dayStart = last7Days[i].date;
      const dayEnd = last7Days[i].endOfDay;

      if (lpRes.data) {
        for (const lp of lpRes.data) {
          if (!lp.last_viewed_at) continue;
          const viewDate = new Date(lp.last_viewed_at);
          if (viewDate >= dayStart && viewDate <= dayEnd) {
            activeEnrollments.add(lp.enrollment_id);
            last7Days[i].views++;
          }
        }
      }

      if (qaRes.data) {
        for (const qa of qaRes.data) {
          if (!qa.submitted_at) continue;
          const subDate = new Date(qa.submitted_at);
          if (subDate >= dayStart && subDate <= dayEnd) {
            activeEnrollments.add(qa.enrollment_id);
            last7Days[i].quizzes = (last7Days[i].quizzes || 0) + 1;
          }
        }
      }

      last7Days[i].users = activeEnrollments.size;
    }

    const result = last7Days.map(d => ({
      name: d.name,
      users: d.users,
      views: d.views,
      quizzes: d.quizzes
    }));

    return NextResponse.json({ engagementData: result });
  } catch (err: any) {
    console.error('Engagement fetch error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch engagement data' }, { status: 500 });
  }
}
