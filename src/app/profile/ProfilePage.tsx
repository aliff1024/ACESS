'use client';

import { useState } from 'react';
import { ProfileDialog } from '@/components/profile/ProfileDialog';

export function ProfilePage() {
  const [open, setOpen] = useState(true);

  return (
    <ProfileDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) window.history.back();
      }}
    />
  );
}
