import { Bell } from 'lucide-react';

export function NotificationsDropdown() {
  return (
    <button
      data-testid="notifications-btn"
      className="relative flex h-11 w-11 items-center justify-center rounded-xl text-ink-secondary hover:text-ink-primary hover:bg-recessed transition-colors min-h-[44px] min-w-[44px]"
      aria-label="Notificações"
    >
      <Bell size={20} />
    </button>
  );
}
