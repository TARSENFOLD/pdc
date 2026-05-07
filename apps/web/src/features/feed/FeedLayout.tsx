import type React from 'react';

interface FeedLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function FeedLayout({ children, sidebar }: FeedLayoutProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
      {/* Main Feed - Center */}
      <div className="lg:col-span-8 space-y-6">
        {children}
      </div>
      
      {/* Right Sidebar - Activity */}
      {sidebar && (
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          {sidebar}
        </div>
      )}
    </div>
  );
}
