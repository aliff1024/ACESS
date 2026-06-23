'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, Users, PlaySquare, Loader2, Command, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { performUniversalSearch, SearchResult } from '@/lib/search-api';

interface UniversalSearchProps {
  role: 'learner' | 'educator' | 'admin';
}

export function UniversalSearch({ role }: UniversalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const searchData = await performUniversalSearch(query, role, user.user.id);
          setResults(searchData);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, role]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const getIcon = (type: string) => {
    if (type === 'course') return <BookOpen className="w-4 h-4 text-blue-500" />;
    if (type === 'lesson') return <PlaySquare className="w-4 h-4 text-purple-500" />;
    if (type === 'user') return <Users className="w-4 h-4 text-green-500" />;
    if (type === 'feature') return <Settings className="w-4 h-4 text-orange-500" />;
    return <Search className="w-4 h-4" />;
  };

  return (
    <div className="relative w-full max-w-md hidden md:block" ref={wrapperRef}>
      <div 
        className={`relative flex items-center w-full h-10 rounded-lg border transition-colors ${
          isOpen ? 'bg-white border-blue-500 ring-4 ring-blue-50' : 'bg-gray-100 border-transparent hover:bg-gray-200'
        }`}
      >
        <Search className={`w-4 h-4 ml-3 flex-shrink-0 ${isOpen ? 'text-blue-500' : 'text-gray-500'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search courses, lessons, users..."
          className="w-full bg-transparent border-none focus:ring-0 text-sm px-3 py-2 text-gray-900 placeholder:text-gray-500 outline-none"
        />
        {!isOpen && !query && (
          <div className="hidden lg:flex items-center gap-1 mr-3 px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-400 text-[10px] font-medium tracking-widest">
            <Command className="w-3 h-3" />K
          </div>
        )}
        {isLoading && (
          <div className="mr-3">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {results.length === 0 && !isLoading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              {['course', 'lesson', 'user', 'feature'].map((type) => {
                if (!groupedResults[type]) return null;
                return (
                  <div key={type} className="mb-2 last:mb-0">
                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {type}s
                    </div>
                    {groupedResults[type].map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result.url)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-start gap-3 transition-colors"
                      >
                        <div className="mt-0.5 shrink-0 bg-gray-100 p-1.5 rounded-md">
                          {getIcon(result.type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{result.title}</div>
                          <div className="text-xs text-gray-500">{result.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
