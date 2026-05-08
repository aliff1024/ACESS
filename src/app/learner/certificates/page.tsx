import CertificatesClientPage from './CertificatesClientPage';

export default async function LearnerCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <CertificatesClientPage certificateId={id} />;
}
