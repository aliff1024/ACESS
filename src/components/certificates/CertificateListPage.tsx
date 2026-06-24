'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Award, Calendar, Hash, Eye, Download, Search, Loader2, Trophy, Footprints, GraduationCap, Zap, Star, Shield, User, FileText, Lock, BookOpen, Flame } from 'lucide-react';
import { fetchCertificates, fetchLearnerBadges, fetchLearnerStats, type Certificate, type LearnerBadge, type LearnerStats } from '@/lib/learner-api';
import { LearningLevelTab } from './LearningLevelTab';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useTranslation } from '@/lib/useTranslation';

interface AchievementsDashboardProps {
  onViewCertificate: (certificateId: string) => void;
  onBrowseCourses: () => void;
  onDownload: (certificateId: string) => void;
}

export function CertificateListPage({
  onViewCertificate,
  onBrowseCourses,
  onDownload,
}: AchievementsDashboardProps) {
  const { t } = useTranslation();
  const { settings } = useAccessibility();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [badges, setBadges] = useState<LearnerBadge[]>([]);
  const [stats, setStats] = useState<LearnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'level' | 'badges' | 'system_certs' | 'custom_certs'>('level');

  useEffect(() => {
    Promise.all([fetchCertificates(), fetchLearnerBadges(), fetchLearnerStats()])
      .then(([certsData, badgesData, statsData]) => {
        setCertificates(certsData);
        setBadges(badgesData);
        setStats(statsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium animate-pulse">{t('certificates.loading')}</p>
      </div>
    );
  }

  const systemCerts = certificates.filter(c => c.is_system_course && !c.is_custom_upload);
  const customCerts = certificates.filter(c => c.is_custom_upload || !c.is_system_course);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Footprints': return <Footprints className="w-8 h-8 text-white" />;
      case 'GraduationCap': return <GraduationCap className="w-8 h-8 text-white" />;
      case 'Zap': return <Zap className="w-8 h-8 text-white" />;
      case 'Star': return <Star className="w-8 h-8 text-white" />;
      case 'Award': return <Award className="w-8 h-8 text-white" />;
      case 'BookOpen': return <BookOpen className="w-8 h-8 text-white" />;
      case 'Shield': return <Shield className="w-8 h-8 text-white" />;
      case 'Flame': return <Flame className="w-8 h-8 text-white" />;
      default: return <Trophy className="w-8 h-8 text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 readable-content">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-blue-800 text-white pt-16 pb-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl shrink-0 simplifiable">
            <Trophy className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">{t('certificates.myAchievements')}</h1>
            <p className="text-blue-100 text-lg max-w-2xl">
              {t('certificates.heroDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-2 flex flex-col sm:flex-row gap-2 mb-8">
          <button
            onClick={() => setActiveTab('level')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'level'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Star className="w-5 h-5" /> {t('certificates.tabLevel')}
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'badges'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Trophy className="w-5 h-5" /> {t('certificates.tabBadges')}
          </button>
          <button
            onClick={() => setActiveTab('system_certs')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'system_certs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Shield className="w-5 h-5" /> {t('certificates.tabSystemCerts')}
            {systemCerts.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'system_certs' ? 'bg-white/20' : 'bg-gray-200'}`}>
                {systemCerts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('custom_certs')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'custom_certs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Award className="w-5 h-5" /> {t('certificates.tabCustomCerts')}
            {customCerts.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'custom_certs' ? 'bg-white/20' : 'bg-gray-200'}`}>
                {customCerts.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content: Learning Level */}
        {activeTab === 'level' && stats && (
          <LearningLevelTab stats={stats} />
        )}

        {/* Tab Content: Badges */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {badges.map((badge) => (
              <Card
                key={badge.id}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                  badge.unlocked
                    ? 'border-yellow-200 bg-white hover:border-yellow-400 hover:shadow-xl hover:-translate-y-1'
                    : 'border-gray-100 bg-gray-50/50 opacity-70 grayscale'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                    badge.unlocked ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gray-300'
                  }`}>
                    {badge.unlocked ? getIcon(badge.icon) : <Lock className="w-6 h-6 text-gray-500" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{badge.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 leading-snug">{badge.description}</p>
                    {badge.unlocked ? (
                      <Badge className="bg-yellow-100 text-yellow-800 border-0">{t('certificates.unlocked')}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 bg-white">{t('certificates.locked')}</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Tab Content: System Certificates */}
        {activeTab === 'system_certs' && (
          systemCerts.length === 0 ? (
            <Card className="max-w-2xl mx-auto p-12 rounded-3xl border-dashed border-2 border-gray-200 text-center bg-transparent">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 simplifiable">
                <Shield className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('certificates.noSystem')}</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {t('certificates.noSystemDesc')}
              </p>
              <Button onClick={onBrowseCourses} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8">
                <Search className="w-5 h-5 mr-2" />
                {t('certificates.browseSystem')}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemCerts.map((cert) => (
                <Card key={cert.id} className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 hover:ring-blue-300 hover:shadow-xl transition-all flex flex-col h-full bg-white">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-1.5">{t('certificates.officialACESS')}</Badge>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">{cert.course_title}</h3>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{cert.completion_date}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <span className="font-mono">{cert.certificate_code}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto">
                    <Button onClick={() => onViewCertificate(cert.id)} className="flex-1 bg-gray-900 hover:bg-blue-600 text-white rounded-xl">
                      <Eye className="w-4 h-4 mr-2" /> {t('certificates.view')}
                    </Button>
                    <Button onClick={() => onDownload(cert.id)} variant="outline" className="flex-1 rounded-xl hover:bg-gray-50">
                      <Download className="w-4 h-4 mr-2" /> {t('certificates.download')}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Tab Content: Educator Certificates */}
        {activeTab === 'custom_certs' && (
          customCerts.length === 0 ? (
            <Card className="max-w-2xl mx-auto p-12 rounded-3xl border-dashed border-2 border-gray-200 text-center bg-transparent">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 simplifiable">
                <User className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('certificates.noCustom')}</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {t('certificates.noCustomDesc')}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customCerts.map((cert) => (
                <Card key={cert.id} className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 hover:ring-emerald-300 hover:shadow-xl transition-all flex flex-col h-full bg-white">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                      <Award className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 mb-1.5">{t('certificates.educatorIssued')}</Badge>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">{cert.course_title}</h3>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{cert.completion_date}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>{t('certificates.customPDF')}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto">
                    {cert.pdf_url ? (
                      <Button onClick={() => window.open(cert.pdf_url, '_blank')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                        <Eye className="w-4 h-4 mr-2" /> {t('certificates.viewCertificate')}
                      </Button>
                    ) : (
                      <Button onClick={() => onViewCertificate(cert.id)} className="w-full bg-gray-900 hover:bg-blue-600 text-white rounded-xl">
                        <Eye className="w-4 h-4 mr-2" /> {t('certificates.viewDetails')}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
