'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '@/providers/AuthProvider';
import { AccessibilityProvider } from '@/providers/AccessibilityProvider';
import { LanguageProvider } from '@/providers/LanguageProvider';
import { SessionTimeout } from '@/components/auth/SessionTimeout';
import { AccessibilityEnhancements } from '@/components/accessibility/AccessibilityEnhancements';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <AccessibilityEnhancements />
        <LanguageProvider>
          <SessionTimeout>{children}</SessionTimeout>
        </LanguageProvider>
      </AccessibilityProvider>
    </AuthProvider>
  );
}
