import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 20,
  totalItems,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
      <div className="text-sm text-gray-600">
        {totalItems !== undefined && (
          <span>
            Hiển thị <span className="font-bold text-gray-900">{startItem}</span> -{' '}
            <span className="font-bold text-gray-900">{endItem}</span> trong tổng số{' '}
            <span className="font-bold text-gray-900">{totalItems}</span> mục
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-2 rounded-lg border-2 transition-all duration-300 flex items-center gap-1 ${
            currentPage === 1
              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-slate-500'
          }`}
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">Trước</span>
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-2 rounded-lg border-2 transition-all duration-300 font-bold min-w-[40px] ${
                  currentPage === pageNum
                    ? 'bg-slate-600 text-white border-transparent shadow-lg'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-slate-500'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-2 rounded-lg border-2 transition-all duration-300 flex items-center gap-1 ${
            currentPage === totalPages
              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-slate-500'
          }`}
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

