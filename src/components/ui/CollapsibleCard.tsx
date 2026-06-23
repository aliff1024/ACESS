'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Badge } from './badge';

interface CollapsibleCardProps {
  icon: React.ReactNode;
  title: string;
  defaultOpen: boolean;
  badge?: string;
  action?: React.ReactNode;
  keepMounted?: boolean;
  children: React.ReactNode;
}

export function CollapsibleCard({ icon, title, defaultOpen, badge, action, keepMounted, children }: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 flex-1 text-left hover:bg-gray-50 transition-colors rounded-lg py-1 -ml-1 px-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <span className="shrink-0">{icon}</span>
          <span className="flex-1 font-semibold text-sm text-gray-900">{title}</span>
          {badge && <Badge variant="secondary" className="shrink-0 text-xs">{badge}</Badge>}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        {action && <span className="shrink-0">{action}</span>}
      </div>
      
      {keepMounted ? (
        <motion.div
          initial={defaultOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
          style={{ pointerEvents: open ? 'auto' : 'none' }}
        >
          <div className="px-5 pb-5 border-t border-gray-100 pt-4">
            {children}
          </div>
        </motion.div>
      ) : (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
