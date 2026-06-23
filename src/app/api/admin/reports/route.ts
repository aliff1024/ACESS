import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const body = await request.json()
    const { reportType, entity, fields } = body

    if (reportType) {
      switch (reportType) {
        case 'user_activity': {
          const { data: users } = await supabase.from('users').select('id, full_name, email, role, is_active, last_login_at, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(100)
          const userIds = (users || []).map(u => u.id)
          const userLastActive = new Map<string, string>()

          if (userIds.length > 0) {
            const { data: enrollments } = await supabase.from('enrollments').select('id, user_id').in('user_id', userIds)
            if (enrollments && enrollments.length > 0) {
              const enrollmentToUser = new Map<string, string>()
              for (const e of enrollments) {
                if (e.id && e.user_id) enrollmentToUser.set(e.id, e.user_id)
              }
              const enrollmentIds = enrollments.map(e => e.id)
              const { data: lp } = await supabase.from('lesson_progress').select('enrollment_id, last_viewed_at').in('enrollment_id', enrollmentIds)
              for (const p of lp || []) {
                 const uid = enrollmentToUser.get(p.enrollment_id)
                 if (uid && p.last_viewed_at) {
                    const current = userLastActive.get(uid)
                    if (!current || new Date(p.last_viewed_at) > new Date(current)) {
                       userLastActive.set(uid, p.last_viewed_at)
                    }
                 }
              }
            }
          }

          return NextResponse.json({
            title: 'User Activity Report',
            description: 'Detailed breakdown of user engagement and activity patterns',
            frequency: 'On-demand',
            data: (users || []).map((u) => {
              const lastActiveStr = u.last_login_at || userLastActive.get(u.id) || u.created_at;
              const activeDate = new Date(lastActiveStr);
              return {
                Name: u.full_name || 'Unknown',
                Email: u.email,
                Role: u.role,
                Active: u.is_active ? 'Yes' : 'No',
                'Last Active': isNaN(activeDate.getTime()) ? 'Unknown' : activeDate.toLocaleDateString(),
                'Joined': new Date(u.created_at).toLocaleDateString(),
              }
            }),
          })
        }

        case 'course_performance': {
          const { data: courses } = await supabase.from('courses').select('id, title, status, difficulty_level, created_at').is('deleted_at', null)
          const courseIds = (courses || []).map((c) => c.id)
          const enrollCounts = new Map<string, number>()

          if (courseIds.length > 0) {
            const { data: enrollments } = await supabase.from('enrollments').select('course_id').in('course_id', courseIds)
            for (const e of enrollments || []) {
              enrollCounts.set(e.course_id, (enrollCounts.get(e.course_id) || 0) + 1)
            }
          }

          return NextResponse.json({
            title: 'Course Performance Report',
            description: 'Comprehensive analysis of course completion and quiz scores',
            frequency: 'On-demand',
            data: (courses || []).map((c) => ({
              Title: c.title,
              Status: c.status,
              Difficulty: c.difficulty_level || 'N/A',
              Enrollments: enrollCounts.get(c.id) || 0,
              Created: new Date(c.created_at).toLocaleDateString(),
            })),
          })
        }

        case 'certificate_issuance': {
          const { data: certs } = await supabase.from('certificates').select(`reference_code, status, issued_at, revoked_at, enrollments!inner(users!enrollments_user_id_fkey(full_name), courses!enrollments_course_id_fkey(title))`).order('issued_at', { ascending: false }).limit(100)
          return NextResponse.json({
            title: 'Certificate Issuance Report',
            description: 'Summary of all certificates issued and revoked',
            frequency: 'On-demand',
            data: (certs || []).map((c: any) => {
              const e = c.enrollments
              return {
                Learner: e?.users?.full_name || 'Unknown',
                Course: e?.courses?.title || 'Unknown',
                Code: c.reference_code,
                Status: c.status,
                Issued: new Date(c.issued_at).toLocaleDateString(),
                Revoked: c.revoked_at ? new Date(c.revoked_at).toLocaleDateString() : 'N/A',
              }
            }),
          })
        }

        case 'platform_health': {
          const { count: users } = await supabase.from('users').select('id', { count: 'exact', head: true })
          const { count: courses } = await supabase.from('courses').select('id', { count: 'exact', head: true })
          const { count: enrollments } = await supabase.from('enrollments').select('id', { count: 'exact', head: true })
          const { count: lessons } = await supabase.from('lessons').select('id', { count: 'exact', head: true })

          return NextResponse.json({
            title: 'Platform Health Report',
            description: 'System performance, uptime, and technical metrics',
            frequency: 'On-demand',
            data: [
              { Metric: 'Total Registered Users', Value: users ?? 0 },
              { Metric: 'Total Published Courses', Value: courses ?? 0 },
              { Metric: 'Total Course Enrollments', Value: enrollments ?? 0 },
              { Metric: 'Total Lessons Created', Value: lessons ?? 0 },
            ],
          })
        }

        case 'accessibility_usage': {
          const { data: profiles } = await supabase.from('user_profiles').select('accessibility_prefs')
          let srUsers = 0, kbUsers = 0, hcUsers = 0, dUsers = 0, ttsUsers = 0
          for (const p of profiles || []) {
            const prefs = p.accessibility_prefs as any
            if (!prefs) continue
            if (prefs.screen_reader_optimized) srUsers++
            if (prefs.keyboard_navigation_enabled) kbUsers++
            if (prefs.preferred_theme === 'high_contrast' || prefs.high_contrast) hcUsers++
            if (prefs.dyslexia_friendly_font || prefs.preferred_font === 'dyslexia') dUsers++
            if (prefs.tts_enabled) ttsUsers++
          }

          return NextResponse.json({
            title: 'Accessibility Usage Report',
            description: 'Detailed breakdown of accessibility features utilized by learners',
            frequency: 'On-demand',
            data: [
              { 'Accessibility Feature': 'Screen Reader Optimized', 'Total Users Enabled': srUsers },
              { 'Accessibility Feature': 'Keyboard Navigation', 'Total Users Enabled': kbUsers },
              { 'Accessibility Feature': 'High Contrast Mode', 'Total Users Enabled': hcUsers },
              { 'Accessibility Feature': 'Dyslexia Friendly Font', 'Total Users Enabled': dUsers },
              { 'Accessibility Feature': 'Text-to-Speech (TTS)', 'Total Users Enabled': ttsUsers },
            ],
          })
        }

        case 'educator_impact': {
          const { data: educators } = await supabase.from('users').select('id, full_name, email').eq('role', 'educator')
          const resultData = []
          for (const ed of educators || []) {
            const { data: courses } = await supabase.from('courses').select('id').eq('created_by', ed.id)
            const courseIds = (courses || []).map(c => c.id)
            let totalEnrollments = 0
            if (courseIds.length > 0) {
              const { count } = await supabase.from('enrollments').select('id', { count: 'exact', head: true }).in('course_id', courseIds)
              totalEnrollments = count ?? 0
            }
            resultData.push({
              Educator: ed.full_name || 'Unknown',
              Email: ed.email,
              'Total Published Courses': courseIds.length,
              'Total Student Enrollments': totalEnrollments
            })
          }
          return NextResponse.json({
            title: 'Educator Impact Report',
            description: 'Activity and reach metrics per educator on the platform',
            frequency: 'On-demand',
            data: resultData.sort((a, b) => (b['Total Student Enrollments'] as number) - (a['Total Student Enrollments'] as number))
          })
        }

        case 'learner_demographics': {
          const { data: users } = await supabase.from('users').select('full_name, email, role, user_profiles(age_group, country, preferred_language)').eq('role', 'learner').is('deleted_at', null)
          return NextResponse.json({
            title: 'Learner Demographics',
            description: 'Geographic and age breakdown of the learner base',
            frequency: 'On-demand',
            data: (users || []).map((u: any) => ({
              'Learner Name': u.full_name || 'Unknown',
              'Email': u.email,
              'Age Group': u.user_profiles?.age_group || 'Not Specified',
              'Country': u.user_profiles?.country || 'Not Specified',
              'Language': u.user_profiles?.preferred_language === 'en' ? 'English' : (u.user_profiles?.preferred_language === 'ms' ? 'Malay' : 'Not Specified'),
            }))
          })
        }

        case 'quiz_analytics': {
          const { data: attempts } = await supabase.from('quiz_attempts').select('attempt_number, score_pct, result, started_at, quizzes(title), enrollments(users(full_name))').order('started_at', { ascending: false }).limit(200)
          return NextResponse.json({
            title: 'Quiz Analytics',
            description: 'Analysis of recent quiz attempts, pass rates, and scores',
            frequency: 'On-demand',
            data: (attempts || []).map((a: any) => ({
              'Quiz Title': a.quizzes?.title || 'Unknown Quiz',
              'Learner': a.enrollments?.users?.full_name || 'Unknown',
              'Attempt #': a.attempt_number,
              'Score %': a.score_pct,
              'Result': String(a.result || '').toUpperCase(),
              'Date Taken': new Date(a.started_at).toLocaleString(),
            }))
          })
        }

        case 'content_inventory': {
          const { data: courses } = await supabase.from('courses').select('title, category, difficulty_level, status, lessons(count), enrollments(count)').is('deleted_at', null).order('created_at', { ascending: false })
          return NextResponse.json({
            title: 'Content Inventory',
            description: 'Overview of all courses, lessons, and enrollment counts',
            frequency: 'On-demand',
            data: (courses || []).map((c: any) => ({
              'Course Title': c.title,
              'Category': c.category || 'Uncategorized',
              'Difficulty': c.difficulty_level || 'N/A',
              'Status': c.status,
              'Lessons Count': c.lessons?.[0]?.count || 0,
              'Total Enrollments': c.enrollments?.[0]?.count || 0,
            }))
          })
        }

        default:
          return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
      }
    } else if (entity && fields) {
      const resultData = [];
      if (entity === 'users') {
        const { data } = await supabase.from('users').select(fields.join(',')).is('deleted_at', null).order('created_at', { ascending: false });
        for (const row of (data as any[]) || []) {
          const mappedRow: Record<string, unknown> = {};
          if (fields.includes('id')) mappedRow['ID'] = row.id;
          if (fields.includes('full_name')) mappedRow['Full Name'] = row.full_name || 'Unknown';
          if (fields.includes('email')) mappedRow['Email'] = row.email;
          if (fields.includes('role')) mappedRow['Role'] = row.role;
          if (fields.includes('is_active')) mappedRow['Active'] = row.is_active ? 'Yes' : 'No';
          if (fields.includes('created_at')) mappedRow['Joined'] = new Date(row.created_at).toLocaleDateString();
          resultData.push(mappedRow);
        }
      } else if (entity === 'courses') {
        const { data } = await supabase.from('courses').select(fields.join(',')).is('deleted_at', null).order('created_at', { ascending: false });
        for (const row of (data as any[]) || []) {
          const mappedRow: Record<string, unknown> = {};
          if (fields.includes('id')) mappedRow['ID'] = row.id;
          if (fields.includes('title')) mappedRow['Title'] = row.title;
          if (fields.includes('status')) mappedRow['Status'] = row.status;
          if (fields.includes('difficulty_level')) mappedRow['Difficulty'] = row.difficulty_level || 'N/A';
          if (fields.includes('created_by')) mappedRow['Created By ID'] = row.created_by;
          if (fields.includes('created_at')) mappedRow['Created'] = new Date(row.created_at).toLocaleDateString();
          resultData.push(mappedRow);
        }
      }

      return NextResponse.json({
        title: `Custom ${entity.charAt(0).toUpperCase() + entity.slice(1)} Report`,
        description: `A custom generated report containing selected fields from the ${entity} table.`,
        frequency: 'On-demand',
        data: resultData.length > 0 ? resultData : [{ Message: 'No data found' }]
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error: any) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
