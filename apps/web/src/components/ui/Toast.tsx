import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cn } from '@/lib/utils';

export type ToastVariant = 'default' | 'success' | 'error' | 'info' | 'warning';

export interface ToastProps extends ToastPrimitive.ToastProps {
  variant?: ToastVariant;
  title?: string;
  description?: string;
  action?: React.ReactElement<typeof ToastPrimitive.Action>;
}

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-105',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ className, variant = 'default', title, description, action, ...props }, ref) => {
  const variants: Record<ToastVariant, string> = {
    default: 'bg-surface border-border text-text-primary',
    success: 'bg-surface border-success/50 text-success',
    error: 'bg-surface border-error/50 text-error',
    info: 'bg-surface border-blue-500/50 text-blue-500',
    warning: 'bg-surface border-amber/50 text-amber',
  };

  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x) data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
        variants[variant],
        className
      )}
      {...props}
    >
      <div className="grid gap-1">
        {title && <ToastPrimitive.Title className="text-sm font-semibold">{title}</ToastPrimitive.Title>}
        {description && (
          <ToastPrimitive.Description className="text-sm opacity-90">
            {description}
          </ToastPrimitive.Description>
        )}
      </div>
      {action}
      <ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 text-text-muted opacity-0 transition-opacity hover:text-text-primary focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
});
Toast.displayName = ToastPrimitive.Root.displayName;

export type ToastActionElement = React.ReactElement<typeof ToastPrimitive.Action>;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-amber disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitive.Action.displayName;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastAction,
};
