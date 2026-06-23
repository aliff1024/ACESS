'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, User, BookOpen, Award, Activity, Calendar, Mail, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AdminUserProfileProps {
  userId: string;
}

export function AdminUserProfile({ userId }: AdminUserProfileProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Learner data
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  
  // Educator data
  const [createdCourses, setCreatedCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch basic user profile and user_profiles details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*, user_profiles(*)')
          .eq('id', userId)
          .single();

        if (userError) throw userError;

        const profileData = Array.isArray(userData.user_profiles) 
          ? userData.user_profiles[0] 
          : userData.user_profiles || {};

        setUser({
          ...userData,
          age_group: profileData?.age_group || 'Unknown',
          display_name: profileData?.display_name || userData.full_name,
        });

        // Fetch role specific data using admin API route
        const res = await fetch(`/api/admin/users/${userId}/details`);
        if (res.ok) {
          const details = await res.json();
          if (userData.role === 'learner') {
            if (details.enrollments) setEnrollments(details.enrollments);
            if (details.certificates) setCertificates(details.certificates);
          } else if (userData.role === 'educator') {
            if (details.createdCourses) setCreatedCourses(details.createdCourses);
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
        <button onClick={() => router.push('/admin/users')} className="mt-4 text-blue-600 hover:underline">
          Back to Users
        </button>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'educator': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'learner': return 'bg-green-100 text-green-700 border-green-200';
      case 'disabled': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => router.push('/admin/users')} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {user.full_name || 'Unknown User'}
            <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
          </h1>
          <p className="text-gray-500">Manage user profile and platform engagement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="p-6 col-span-1 border-0 shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-md">
              {(user.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
            <p className="text-gray-500 flex items-center gap-1 justify-center mt-1">
              <Mail className="w-4 h-4" /> {user.email}
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Joined</span>
              <span className="font-medium text-gray-900">{formatDate(user.created_at)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><User className="w-4 h-4" /> Age Group</span>
              <span className="font-medium text-gray-900">{user.age_group}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><Activity className="w-4 h-4" /> Status</span>
              <span className={`font-medium ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {user.is_active ? 'Active' : 'Inactive/Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><Shield className="w-4 h-4" /> Account ID</span>
              <span className="font-medium text-gray-900 font-mono text-xs">{user.id.slice(0, 8)}...</span>
            </div>
          </div>
        </Card>

        {/* Dynamic System Data based on Role */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          
          {user.role === 'learner' && (
            <>
              {/* Enrollments Section */}
              <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    Enrolled Courses ({enrollments.length})
                  </h3>
                </div>
                
                {enrollments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No active enrollments found for this learner.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900">{enrollment.courses?.title || 'Unknown Course'}</h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="capitalize">Status: {enrollment.status}</span>
                            <span>•</span>
                            <span>Enrolled: {formatDate(enrollment.enrolled_at)}</span>
                          </div>
                        </div>
                        <div className="w-full md:w-32 flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-700">Progress</span>
                            <span className="text-blue-600">{enrollment.progress_percent || 0}%</span>
                          </div>
                          <Progress value={enrollment.progress_percent || 0} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Certificates Section */}
              <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    Certificates Earned ({certificates.length})
                  </h3>
                </div>
                
                {certificates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No certificates earned yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="p-4 bg-purple-50/50 rounded-lg border border-purple-100 flex items-start gap-3">
                        <Award className="w-8 h-8 text-purple-600 shrink-0" />
                        <div>
                          <h4 className="font-medium text-gray-900 line-clamp-1">
                            {cert.enrollments?.courses?.title || 'Course Completion'}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">Issued: {formatDate(cert.issued_at)}</p>
                          <Badge variant="outline" className="mt-2 bg-white text-xs border-purple-200 text-purple-700">
                            ID: {cert.reference_code}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}

          {user.role === 'educator' && (
            <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Created Courses ({createdCourses.length})
                </h3>
              </div>
              
              {createdCourses.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  This educator hasn't created any courses yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {createdCourses.map((course) => (
                    <div key={course.id} className="p-4 hover:bg-gray-50 transition-colors rounded-lg border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{course.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="capitalize">{course.difficulty_level}</span>
                          {course.category && (
                            <>
                              <span>•</span>
                              <span>{course.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <Badge variant="outline" className={
                          course.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' :
                          course.status === 'draft' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }>
                          {course.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {user.role === 'admin' && (
            <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-200 bg-gray-50">
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">System Administrator</h3>
                <p className="text-gray-500 mt-1">This user has full administrative privileges.</p>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
