import {
  Toast,
  ToastProvider,
  ToastViewport,
} from './Toast';
import { useToast } from '@/hooks/useToast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast 
          key={id} 
          {...props} 
          title={title} 
          description={description} 
          action={action} 
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
