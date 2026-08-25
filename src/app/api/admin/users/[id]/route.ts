import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-guard';
import { createServerSupabase } from '@/lib/supabase-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const { role, is_active, full_name, username, bio, phone_number, country } = body;

    const userUpdates: Record<string, any> = {};
    const metaUpdates: Record<string, any> = {};

    if (role !== undefined) {
      if (!['learner', 'educator', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      userUpdates.role = role;
      metaUpdates.role = role;
    }

    if (is_active !== undefined) {
      userUpdates.is_active = Boolean(is_active);
      metaUpdates.is_active = Boolean(is_active);
    }

    if (full_name !== undefined) {
      userUpdates.full_name = full_name.trim();
      metaUpdates.full_name = full_name.trim();
    }

    // 1. Update users table
    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update(userUpdates)
        .eq('id', id);

      if (userError) throw userError;
    }

    // 2. Synchronize Supabase Auth metadata
    if (Object.keys(metaUpdates).length > 0) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(id, {
          user_metadata: metaUpdates,
        });
      } catch (authErr) {
        console.warn('Could not sync auth metadata for user:', id, authErr);
      }
    }

    // 3. Update user_profiles if profile fields are provided
    const profileUpdates: Record<string, any> = {};
    if (username !== undefined) profileUpdates.username = username;
    if (bio !== undefined) profileUpdates.bio = bio;
    if (phone_number !== undefined) profileUpdates.phone_number = phone_number;
    if (country !== undefined) profileUpdates.country = country;

    if (Object.keys(profileUpdates).length > 0) {
      await supabaseAdmin
        .from('user_profiles')
        .upsert({ user_id: id, ...profileUpdates }, { onConflict: 'user_id' });
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Admin update user error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;

    // Soft delete user
    const { error } = await supabaseAdmin
      .from('users')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);

    if (error) throw error;

    try {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: { is_active: false, is_deleted: true },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
