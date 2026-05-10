'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Clock, Loader2 } from 'lucide-react';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 30 * 1000; // 30 seconds warning

export function SessionTimeout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timerRef.current = null;
    warningTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const handleTimeout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    await supabase.auth.signOut();
    router.push('/login?expired=true');
  }, [clearAllTimers, router]);

  const startTimers = useCallback(() => {
    clearAllTimers();

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(30);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

    timerRef.current = setTimeout(() => {
      handleTimeout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearAllTimers, handleTimeout]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    startTimers();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'];

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) {
        lastActivityRef.current = now;
        resetTimer();
      }
    };

    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearAllTimers();
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [isAuthenticated, startTimers, resetTimer, clearAllTimers]);

  const handleStayLoggedIn = () => {
    resetTimer();
  };

  return (
    <>
      {children}

      {/* ── Warning Modal ── */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-200 p-8 max-w-md w-full mx-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Session Expiring</h3>
                <p className="text-sm text-gray-600">You will be logged out due to inactivity</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Auto-logout in</span>
                <span className="text-2xl font-bold text-amber-600">{countdown}s</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 30) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStayLoggedIn}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg"
              >
                Stay Logged In
              </button>
              <button
                onClick={handleTimeout}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
