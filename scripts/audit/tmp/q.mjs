import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.trim().startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const { data: u } = await db.from('users').select('id').eq('email','learner@acess.demo').single();
const { data } = await db.from('enrollments').select('course_id, status, courses(title, certificate_enabled)').eq('user_id', u.id);
for (const e of data) console.log(e.course_id, '|', e.status, '| cert_enabled=' + e.courses.certificate_enabled, '|', e.courses.title);
