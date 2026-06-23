'use client';

import { type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface ConfirmActionProps {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmClassName?: string;
  icon?: ReactNode;
  onConfirm: () => void;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  loading?: boolean;
  loadingText?: string;
}

export function ConfirmAction({
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmClassName = 'bg-red-600 hover:bg-red-700 text-white',
  icon,
  onConfirm,
  children,
  open,
  onOpenChange,
  loading = false,
  loadingText = 'Processing...',
}: ConfirmActionProps) {
  return (
    <AlertDialog open={open} onOpenChange={(newOpen) => { if (!loading || newOpen) onOpenChange?.(newOpen); }}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={confirmClassName} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? loadingText : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
