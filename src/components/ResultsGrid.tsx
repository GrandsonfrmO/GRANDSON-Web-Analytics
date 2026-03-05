import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Pagination } from './Pagination';
import { cn } from '../utils';

interface ResultsGridProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemsPerPage?: number;
  className?: string;
  title?: string;
  emptyMessage?: string;
}

export function ResultsGrid({
  items,
  renderItem,
  itemsPerPage = 6,
  className,
  title,
  emptyMessage = 'Aucun résultat'
}: ResultsGridProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  // Reset to page 1 when items change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-sm italic">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {title && (
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      )}

      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {currentItems.map((item, index) => (
          <motion.div
            key={`${startIndex + index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
          >
            {renderItem(item, startIndex + index)}
          </motion.div>
        ))}
      </motion.div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-6 border-t border-slate-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
