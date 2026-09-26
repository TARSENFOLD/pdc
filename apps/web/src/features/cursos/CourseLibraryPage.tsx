import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui';
import { MeusCursosPage } from '@/features/estudante/MeusCursosPage';
import { MentorCursosPage } from '@/features/mentor/MentorCursosPage';
import { canCreateCourses, COURSE_CATALOG_PATH } from './course-routes';

export function CourseLibraryPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const creator = canCreateCourses(user?.role);
  const defaultView = creator && location.pathname !== '/app/meus-cursos' ? 'created' : 'learning';
  const view = params.get('view') ?? defaultView;
  const showCreated = creator && view === 'created';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Meus cursos</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {creator ? 'Acompanha a tua aprendizagem e gere os cursos que criaste.' : 'Retoma a aprendizagem e acompanha o teu progresso.'}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link to={COURSE_CATALOG_PATH}>Catálogo de cursos</Link>
        </Button>
      </header>
      {creator && (
        <nav aria-label="As minhas atividades em cursos" className="flex flex-wrap gap-2 border-b border-[var(--card-border)] pb-3">
          {[
            { value: 'learning', label: 'A frequentar' },
            { value: 'created', label: 'Criados por mim' },
          ].map(({ value, label }) => {
            const active = value === (showCreated ? 'created' : 'learning');
            return (
              <Link
                key={value}
                to={{ pathname: location.pathname, search: `?view=${value}` }}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium ${active ? 'bg-accent/10 text-accent' : 'text-ink-secondary hover:bg-elevated'}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
      {showCreated ? <MentorCursosPage embedded /> : <MeusCursosPage embedded />}
    </div>
  );
}
