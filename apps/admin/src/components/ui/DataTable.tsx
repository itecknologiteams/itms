import { ReactNode } from 'react';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { cn } from '@/lib/cn';

export interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found.',
  isLoading,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <GlassPanel className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/10">
              {columns.map((col) => (
                <th key={col.header} className="px-4 py-3 font-medium opacity-60">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  {columns.map((col) => (
                    <td key={col.header} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                    </td>
                  ))}
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center opacity-50">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-black/5 last:border-0 dark:border-white/5',
                    onRowClick && 'cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.header} className={cn('px-4 py-3', col.className)}>
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
