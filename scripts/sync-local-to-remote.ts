import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envLocal = dotenv.parse(fs.readFileSync(path.resolve(process.cwd(), '.env.local')));
const envRemote = dotenv.parse(fs.readFileSync(path.resolve(process.cwd(), '.env.remote.backup')));

const localClient = createClient(envLocal.NEXT_PUBLIC_SUPABASE_URL, envLocal.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const remoteClient = createClient(envRemote.NEXT_PUBLIC_SUPABASE_URL, envRemote.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function listAllFiles(client: any, bucket: string, prefix = ''): Promise<string[]> {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 100 });
  if (error || !data) return [];

  let files: string[] = [];
  for (const item of data) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null || !item.metadata) {
      // It's a folder
      const subFiles = await listAllFiles(client, bucket, itemPath);
      files = files.concat(subFiles);
    } else {
      files.push(itemPath);
    }
  }
  return files;
}

async function syncStorage() {
  console.log('--- 1. Syncing Storage Buckets ---');
  const buckets = ['course-assets', 'avatars', 'certificates'];

  for (const bucket of buckets) {
    console.log(`Checking bucket: ${bucket}`);
    // Ensure remote bucket exists
    const { data: remoteBuckets } = await remoteClient.storage.listBuckets();
    const exists = remoteBuckets?.some((b: any) => b.name === bucket);
    if (!exists) {
      console.log(`Creating remote bucket: ${bucket}`);
      await remoteClient.storage.createBucket(bucket, { public: true });
    }

    const localFiles = await listAllFiles(localClient, bucket);
    console.log(`Local files in ${bucket}: ${localFiles.length}`);

    for (const filePath of localFiles) {
      console.log(`  Downloading local: ${filePath}`);
      const { data: fileData, error: dlErr } = await localClient.storage.from(bucket).download(filePath);
      if (dlErr || !fileData) {
        console.error(`  Download error for ${filePath}:`, dlErr);
        continue;
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const contentType = filePath.endsWith('.png')
        ? 'image/png'
        : filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')
        ? 'image/jpeg'
        : filePath.endsWith('.webp')
        ? 'image/webp'
        : filePath.endsWith('.pdf')
        ? 'application/pdf'
        : 'application/octet-stream';

      console.log(`  Uploading to remote: ${filePath}`);
      const { error: upErr } = await remoteClient.storage.from(bucket).upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

      if (upErr) {
        console.error(`  Upload error for ${filePath}:`, upErr);
      } else {
        console.log(`  ✓ Synced ${filePath}`);
      }
    }
  }
}

async function syncLessonsAndQuestions() {
  console.log('\n--- 2. Syncing Lessons & Content ---');
  const localUrl = envLocal.NEXT_PUBLIC_SUPABASE_URL;
  const remoteUrl = envRemote.NEXT_PUBLIC_SUPABASE_URL;

  const { data: localLessons } = await localClient.from('lessons').select('*');
  const { data: remoteLessons } = await remoteClient.from('lessons').select('*');

  if (!localLessons || !remoteLessons) {
    console.error('Failed to load lessons');
    return;
  }

  for (const localLesson of localLessons) {
    // Find matching remote lesson by title (or ID)
    const remoteLesson = remoteLessons.find(
      (rl: any) => rl.id === localLesson.id || rl.title.trim().toLowerCase() === localLesson.title.trim().toLowerCase()
    );

    if (!remoteLesson) {
      console.log(`Remote lesson not found for: ${localLesson.title}`);
      continue;
    }

    // Rewrite any local storage URLs in content_html to remote storage URLs
    let updatedHtml = localLesson.content_html || '';
    if (updatedHtml && localUrl && remoteUrl) {
      updatedHtml = updatedHtml.replaceAll(
        `${localUrl}/storage/v1/object/public/`,
        `${remoteUrl}/storage/v1/object/public/`
      );
    }

    console.log(`Updating remote lesson: "${remoteLesson.title}" (ID: ${remoteLesson.id})`);
    const { error: updateErr } = await remoteClient
      .from('lessons')
      .update({
        content_html: updatedHtml,
        transcript: localLesson.transcript,
        video_url: localLesson.video_url,
        simplified_summary: localLesson.simplified_summary,
        learning_objectives: localLesson.learning_objectives,
        accessibility_notes: localLesson.accessibility_notes,
        estimated_duration: localLesson.estimated_duration,
        lesson_layout: localLesson.lesson_layout,
        has_video: localLesson.has_video,
        has_transcript: localLesson.has_transcript,
        status: localLesson.status,
      })
      .eq('id', remoteLesson.id);

    if (updateErr) {
      console.error(`  Error updating lesson ${remoteLesson.title}:`, updateErr);
    } else {
      console.log(`  ✓ Updated lesson ${remoteLesson.title}`);
    }

    // Sync video questions
    const { data: localVqs } = await localClient
      .from('video_questions')
      .select('*')
      .eq('lesson_id', localLesson.id);

    if (localVqs && localVqs.length > 0) {
      console.log(`  Syncing ${localVqs.length} video question(s) for "${remoteLesson.title}"...`);
      // Remove old remote video questions for this lesson
      await remoteClient.from('video_questions').delete().eq('lesson_id', remoteLesson.id);

      // Insert new video questions mapped to remote lesson_id
      for (const vq of localVqs) {
        const { error: vqErr } = await remoteClient.from('video_questions').insert({
          lesson_id: remoteLesson.id,
          title: vq.title,
          timestamp_seconds: vq.timestamp_seconds,
          question_text: vq.question_text,
          options: vq.options,
          correct_option_index: vq.correct_option_index,
          sequence_order: vq.sequence_order,
        });

        if (vqErr) {
          console.error(`    Error inserting video question "${vq.title}":`, vqErr);
        } else {
          console.log(`    ✓ Inserted video question "${vq.title}" at ${vq.timestamp_seconds}s`);
        }
      }
    }
  }
}

async function main() {
  await syncStorage();
  await syncLessonsAndQuestions();

  console.log('\n--- 3. Verifying Remote Data ---');
  const { data: checkLessons } = await remoteClient
    .from('lessons')
    .select('id, title, content_html')
    .ilike('title', '%Attention Is a Resource%')
    .limit(1);

  if (checkLessons && checkLessons[0]) {
    console.log('Remote lesson verified:');
    console.log('Title:', checkLessons[0].title);
    console.log('Has Images:', checkLessons[0].content_html?.includes('<img'));
    console.log('Images in remote HTML:');
    const matches = checkLessons[0].content_html?.match(/<img[^>]*>/g);
    console.log(matches);
  }

  console.log('\n--- Sync Complete! ---');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
