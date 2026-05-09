'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { fetchLearnerProfile } from '@/lib/learner-api';

export function WelcomeSection() {
  const [name, setName] = useState('Learner');
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    fetchLearnerProfile()
      .then((p) => setName(p.full_name || 'Learner'))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {greeting}, {name}
          </h2>
          <p className="text-lg text-gray-700">
            Continue your learning journey with personalized content tailored to your pace
          </p>
        </div>
      </div>
    </div>
  );
}
