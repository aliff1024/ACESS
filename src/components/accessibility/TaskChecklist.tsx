'use client';

import { useState } from 'react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { CheckCircle2, Circle, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  type: 'lesson' | 'quiz' | 'assignment';
}

export function TaskChecklist({ tasks: initialTasks }: { tasks?: Task[] }) {
  const { settings } = useAccessibility();
  
  // Dummy tasks if none provided, for demonstration
  const [tasks, setTasks] = useState<Task[]>(initialTasks || [
    { id: '1', title: 'Read Chapter 1', completed: true, type: 'lesson' },
    { id: '2', title: 'Complete Knowledge Check', completed: false, type: 'quiz' },
    { id: '3', title: 'Review Summary', completed: false, type: 'assignment' },
  ]);

  if (!settings.task_checklist_enabled) return null;

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = Math.round((completedCount / tasks.length) * 100) || 0;

  return (
    <div className="bg-white border-2 border-blue-100 rounded-xl p-4 shadow-sm my-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-blue-100 p-1.5 rounded-lg">
          <ListTodo className="w-5 h-5 text-blue-700" />
        </div>
        <h3 className="font-bold text-gray-900">Today's Tasks</h3>
        <span className="ml-auto text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
          {progress}% Done
        </span>
      </div>
      
      <div className="w-full bg-gray-100 h-1.5 rounded-full mb-4 overflow-hidden">
        <div className="bg-blue-500 h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors ${
              task.completed ? 'bg-gray-50 opacity-75' : 'hover:bg-blue-50'
            }`}
          >
            {task.completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
            )}
            <span className={`text-sm ${task.completed ? 'text-gray-500 line-through' : 'text-gray-700 font-medium'}`}>
              {task.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
