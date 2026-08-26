import { AchievementsCertificatesPage } from '@/components/achievements/AchievementsCertificatesPage';

/**
 * Achievements & Certificates — the single destination for both.
 *
 * `?tab=` selects the section so the view is linkable and survives a reload.
 * `/learner/certificates` redirects here (see that route), preserving the
 * `?id=` deep link that opens a single certificate.
 */
export default async function LearnerAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab =
    tab === 'achievements' || tab === 'certificates' ? tab : 'overview';
  return <AchievementsCertificatesPage initialTab={initialTab} />;
}
