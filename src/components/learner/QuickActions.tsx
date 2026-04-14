import { Button } from '../ui/button';
import { Search, Award } from 'lucide-react';

interface QuickActionsProps {
  onBrowseCourses: () => void;
}

export function QuickActions({ onBrowseCourses }: QuickActionsProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={onBrowseCourses}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white h-auto py-4 justify-start"
        >
          <Search className="w-5 h-5 mr-3" />
          <div className="text-left">
            <div className="font-semibold">Browse Courses</div>
            <div className="text-sm opacity-90">Explore new learning paths</div>
          </div>
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 h-auto py-4 justify-start"
        >
          <Award className="w-5 h-5 mr-3" />
          <div className="text-left">
            <div className="font-semibold">View Certificates</div>
            <div className="text-sm opacity-90">See your achievements</div>
          </div>
        </Button>
      </div>
    </div>
  );
}
