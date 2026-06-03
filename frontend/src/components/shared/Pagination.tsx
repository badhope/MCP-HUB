import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = React.memo<PaginationProps>(({
  currentPage,
  totalPages,
  onPageChange
}) => {
  const getPages = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center mt-8 -mx-2 px-2 overflow-x-auto scrollbar-hide"
    >
      <div className="inline-flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 flex-shrink-0"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {getPages().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            aria-current={page === currentPage ? 'page' : undefined}
            className={`
              min-w-[2.5rem] px-3 py-2 rounded-lg font-medium transition-all flex-shrink-0
              ${page === '...'
                ? 'text-gray-400 cursor-default border border-transparent'
                : page === currentPage
                  ? 'bg-gradient-to-r from-primary-600 to-accent-500 text-white shadow-md'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 flex-shrink-0"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
});
