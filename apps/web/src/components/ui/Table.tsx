import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: ReactNode;
  accessor: keyof T | ((item: T) => ReactNode);
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
}

function Table<T extends { id?: string | number }>({
  columns,
  data,
  emptyMessage = 'Nenhum dado encontrado.',
  className,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className={cn('w-full overflow-auto rounded-xl border border-border bg-surface', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-raised/50">
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  'px-4 py-3 text-left font-semibold text-text-secondary first:pl-6 last:pr-6',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {data.length > 0 ? (
            data.map((item, rowIndex) => (
              <tr
                key={item.id ?? rowIndex}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'transition-colors hover:bg-white/5',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={cn(
                      'px-4 py-3 text-text-primary first:pl-6 last:pr-6',
                      column.className
                    )}
                  >
                    {typeof column.accessor === 'function'
                      ? column.accessor(item)
                      : (item[column.accessor] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export { Table };
