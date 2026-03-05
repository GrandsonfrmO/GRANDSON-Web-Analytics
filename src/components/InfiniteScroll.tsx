import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils';

interface InfiniteScrollProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemsPerPage?: number;
  className?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function InfiniteScroll({
  items,
  renderItem,
  itemsPerPage = 10,
  className,
  onLoadMore,
  hasMore = true,
  isLoading = false,
  emptyMessage = 'Aucun résultat'
}: InfiniteScrollProps) {
  const [displayedItems, setDisplayedItems] = useState(itemsPerPage);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading && displayedItems < items.length) {
          setDisplayedItems(prev => Math.min(prev + itemsPerPage, items.length));
          onLoadMore?.();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayedItems, items.length, itemsPerPage, hasMore, isLoading, onLoadMore]);

  const visibleItems = items.slice(0, displayedItems);

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-sm italic">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {visibleItems.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (index % itemsPerPage) * 0.05 }}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                className="w-2 h-2 rounded-full bg-amber-400"
              />
            ))}
          </div>
        </div>
      )}

      {/* Intersection observer target */}
      <div ref={observerTarget} className="h-4" />

      {/* End of list message */}
      {!hasMore && displayedItems >= items.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-slate-500 text-sm"
        >
          Fin de la liste
        </motion.div>
      )}
    </div>
  );
}
