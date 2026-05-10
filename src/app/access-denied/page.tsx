'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft, LogOut, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { getDashboardForRole } from '@/lib/auth-types';
import type { Role } from '@/lib/auth-types';

export default function AccessDeniedPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setRole((data.user.user_metadata?.role as Role) || null);
      }
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const homeHref = role ? getDashboardForRole(role) : '/';

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-12 h-12 text-red-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Access Denied</h1>
        <p className="text-gray-600 mb-8">
          You do not have permission to access this page. Please contact your administrator if you
          believe this is a mistake.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline" className="flex items-center gap-2">
            <a href={homeHref}>
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
          </Button>
          {role ? (
            <Button onClick={handleSignOut} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          ) : (
            <Button asChild className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <a href="/login">
                <LogIn className="w-4 h-4" />
                Sign In
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
