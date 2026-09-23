import { NavLink, Outlet } from 'react-router';
import { APP_NAME } from '../config.ts';
import { useProfiles } from '../state/ProfileContext.tsx';

const NAV = [
  { to: '/', label: 'Home', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { to: '/plan', label: 'Plan', icon: 'M4 5h16v15H4zM4 9h16M9 3v4M15 3v4' },
  { to: '/modules', label: 'Modules', icon: 'M4 4h7v16H4zM13 4h7v16h-7' },
  { to: '/cards', label: 'Cards', icon: 'M6 3h12v18H6zM9 8h6M9 12h6' },
  { to: '/quiz', label: 'Quiz', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 17v.01M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.1' },
  { to: '/mistakes', label: 'Mistakes', icon: 'M12 4l9 16H3zM12 10v4M12 17v.01' },
  { to: '/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .2-1.3-1.3.2-2-3-1-1 2h-1.8l-1-2-3 1 .2 2L5.2 7.2 3 8l-1 3 2 1v1.8l-2 1 1 3 2-.2 1.3 1.3-.2 2 3 1 1-2h1.8l1 2 3-1-.2-2 1.3-1.3 2 .2 1-3-2-1z' },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 font-semibold transition ${isActive ? 'bg-chestnut-soft text-chestnut' : 'text-muted hover:bg-surface-2 hover:text-ink'}`;

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.7rem] font-semibold ${isActive ? 'text-chestnut' : 'text-muted'}`;

export function Layout() {
  const { profile } = useProfiles();
  return (
    <div className="min-h-dvh md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">
        Skip to content
      </a>
      <nav aria-label="Main" className="no-print sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-surface p-3 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2 pt-1">
          <img src="./favicon.svg" alt="" className="h-8 w-8" />
          <div>
            <div className="font-serif text-lg font-bold leading-none">{APP_NAME}</div>
            <div className="text-[0.7rem] text-muted">Unofficial CEH v13 study</div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkClass}>
              <Icon d={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </div>
        {profile && <div className="mt-auto truncate px-3 text-sm text-muted">Profile: {profile.name}</div>}
      </nav>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <img src="./favicon.svg" alt="" className="h-7 w-7" />
            <span className="font-serif text-lg font-bold">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-1">
            {NAV.slice(5).map((n) => (
              <NavLink key={n.to} to={n.to} aria-label={n.label} className={({ isActive }) => `rounded-lg p-2 ${isActive ? 'text-chestnut' : 'text-muted'}`}>
                <Icon d={n.icon} />
              </NavLink>
            ))}
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-4xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.slice(0, 5).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={tabClass}>
            <Icon d={n.icon} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
