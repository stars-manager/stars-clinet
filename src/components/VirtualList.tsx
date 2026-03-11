import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height?: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  width?: string | number;
  overscanCount?: number;
}

export function VirtualList<T>({
  items,
  height = 600,
  itemHeight,
  renderItem,
  width = '100%',
  overscanCount = 5,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算可见区域
  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscanCount);
  const visibleEnd = Math.min(
    items.length,
    Math.ceil((scrollTop + height) / itemHeight) + overscanCount
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 当 items 变化时重置滚动位置
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length]);

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width,
        overflow: 'auto',
        position: 'relative',
        border: '1px solid var(--td-component-border, #e7e7e7)',
        borderRadius: '3px',
        backgroundColor: 'var(--td-bg-color-container, #ffffff)',
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={visibleStart + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleStart + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
