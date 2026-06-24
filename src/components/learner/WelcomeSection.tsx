'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Search, Award } from 'lucide-react';
import { fetchLearnerProfile } from '@/lib/learner-api';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/useTranslation';

export function WelcomeSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState('Learner');
  const [loadingName, setLoadingName] = useState(true);
  const currentHour = new Date().getHours();
  
  let greetingKey = 'welcome.greetingEvening';
  if (currentHour < 12) greetingKey = 'welcome.greetingMorning';
  else if (currentHour < 18) greetingKey = 'welcome.greetingAfternoon';
  const greeting = t(greetingKey);

  useEffect(() => {
    fetchLearnerProfile()
      .then((p) => setName(p.full_name || 'Learner'))
      .catch(() => {})
      .finally(() => setLoadingName(false));
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white shadow-xl">
      {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-white opacity-10 blur-3xl pointer-events-none simplifiable" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400 opacity-20 blur-3xl pointer-events-none simplifiable" />
      
      <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-medium tracking-wide">{t('welcome.badge')}</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white drop-shadow-sm">
            {greeting}, {loadingName ? <span className="text-blue-200"><div className="animate-pulse bg-gray-200 rounded-lg h-8 w-48 inline-block align-middle" /></span> : <span className="text-blue-200">{name}</span>}!
          </h1>
          <p className="text-lg md:text-xl text-blue-100 opacity-90 leading-relaxed max-w-md">
            {t('welcome.subtitle')}
          </p>
        </div>

        {/* Quick Actions integrated directly into Hero */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
          <Button 
            onClick={() => router.push('/learner/courses')}
            className="h-14 px-6 bg-white text-indigo-700 hover:bg-blue-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full justify-start text-base font-semibold border-0"
          >
            <Search className="w-5 h-5 mr-3 text-indigo-500" />
            {t('welcome.browseCourses')}
          </Button>
          
          <Button 
            onClick={() => router.push('/learner/certificates')}
            variant="outline"
            className="h-14 px-6 bg-white/10 hover:bg-white/20 border border-white/30 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all w-full justify-start text-base font-medium backdrop-blur-md"
          >
            <Award className="w-5 h-5 mr-3 text-yellow-300" />
            {t('welcome.viewCertificates')}
          </Button>
        </div>
      </div>
    </div>
  );
}
