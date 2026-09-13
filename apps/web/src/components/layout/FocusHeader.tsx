import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFocusRouteTitle } from './focus-routes';
import { useFocusHeaderState } from './useFocusHeader';

export default function FocusHeader(): React.JSX.Element {
  const header = useFocusHeaderState();
  const location = useLocation();
  const navigate = useNavigate();
  const title = header.title ?? getFocusRouteTitle(location.pathname);

  const goBack = () => {
    if (header.backTo) {
      navigate(header.backTo);
      return;
    }
    navigate(-1);
  };

  return (
    <header
      data-testid="focus-header"
      className="sticky top-0 z-30 border-b border-border bg-canvas/95 backdrop-blur-md"
    >
      <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center gap-x-3 px-4 sm:flex-nowrap sm:px-6">
        <button
          type="button"
          onClick={goBack}
          aria-label="Voltar"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-recessed hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink-primary sm:max-w-52 sm:flex-none">{title}</h1>
        {header.progress && (
          <div className="order-last w-full overflow-x-auto border-t border-border py-1 sm:order-none sm:flex sm:min-w-0 sm:flex-1 sm:justify-center sm:border-t-0 sm:py-0">
            {header.progress}
          </div>
        )}
        {header.actions && <div className="flex shrink-0 items-center gap-2">{header.actions}</div>}
      </div>
    </header>
  );
}
