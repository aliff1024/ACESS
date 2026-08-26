'use client';

import {
  Award,
  BookMarked,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CalendarHeart,
  CalendarRange,
  CircleCheckBig,
  ClipboardCheck,
  Compass,
  Crosshair,
  Footprints,
  GraduationCap,
  Layers,
  Library,
  ListChecks,
  Medal,
  ScrollText,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

/**
 * The catalogue in lib/gamification.ts names its icon rather than importing
 * one, so the definitions stay a plain data structure that a script or a
 * future database table could hold. This is the one place those names are
 * resolved.
 */
const ICONS: Record<string, LucideIcon> = {
  Award,
  BookMarked,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CalendarHeart,
  CalendarRange,
  CircleCheckBig,
  ClipboardCheck,
  Compass,
  Crosshair,
  Footprints,
  GraduationCap,
  Layers,
  Library,
  ListChecks,
  Medal,
  ScrollText,
  Target,
  Trophy,
};

/**
 * Renders an achievement's icon by name.
 *
 * A component rather than a `const Icon = lookup(name)` at each call site:
 * assigning a component to a local inside render makes React treat it as a
 * fresh component type on every pass, which resets any state it holds and is
 * flagged by react-hooks/static-components. These icons are stateless, but the
 * pattern is the one that stays correct.
 */
export function AchievementIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Icon = ICONS[name] ?? Trophy;
  return <Icon className={className} aria-hidden="true" />;
}
