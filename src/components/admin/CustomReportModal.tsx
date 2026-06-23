'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface CustomReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (entity: string, fields: string[]) => void;
  isGenerating: boolean;
}

const FIELD_OPTIONS: Record<string, { id: string; label: string }[]> = {
  users: [
    { id: 'id', label: 'User ID' },
    { id: 'full_name', label: 'Full Name' },
    { id: 'email', label: 'Email Address' },
    { id: 'role', label: 'Role' },
    { id: 'is_active', label: 'Active Status' },
    { id: 'created_at', label: 'Joined Date' },
  ],
  courses: [
    { id: 'id', label: 'Course ID' },
    { id: 'title', label: 'Course Title' },
    { id: 'status', label: 'Status' },
    { id: 'difficulty_level', label: 'Difficulty Level' },
    { id: 'created_by', label: 'Created By (Educator ID)' },
    { id: 'created_at', label: 'Creation Date' },
  ]
};

export function CustomReportModal({ open, onOpenChange, onGenerate, isGenerating }: CustomReportModalProps) {
  const [entity, setEntity] = useState<string>('users');
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    full_name: true,
    email: true,
    role: true,
  });

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    setSelectedFields(prev => ({ ...prev, [fieldId]: checked }));
  };

  const handleEntityChange = (val: string) => {
    setEntity(val);
    if (val === 'users') {
      setSelectedFields({ full_name: true, email: true, role: true });
    } else {
      setSelectedFields({ title: true, status: true, difficulty_level: true });
    }
  };

  const handleGenerateClick = () => {
    const fieldsToInclude = Object.entries(selectedFields)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    onGenerate(entity, fieldsToInclude);
  };

  const currentOptions = FIELD_OPTIONS[entity] || [];
  const isValid = Object.values(selectedFields).some(v => v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Custom Report Builder</DialogTitle>
          <DialogDescription>
            Select a data source and the specific columns you want to include in your report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Data Source</Label>
            <Select value={entity} onValueChange={handleEntityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="courses">Courses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Columns to Include</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
              {currentOptions.map((opt) => (
                <div key={opt.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`field-${opt.id}`} 
                    checked={!!selectedFields[opt.id]} 
                    onCheckedChange={(checked) => handleFieldToggle(opt.id, checked === true)} 
                  />
                  <label 
                    htmlFor={`field-${opt.id}`} 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerateClick} disabled={!isValid || isGenerating} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
