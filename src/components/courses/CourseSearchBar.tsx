import { Search, X } from 'lucide-react';

interface CourseSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function CourseSearchBar({
  searchQuery,
  onSearchChange,
}: CourseSearchBarProps) {
  return (
    <div className="relative w-full">
      <div className="relative flex items-center bg-white border border-slate-200/80 rounded-2xl shadow-xs transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:shadow-sm">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full h-11 pl-10 pr-9 bg-transparent rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Effacer la recherche"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
