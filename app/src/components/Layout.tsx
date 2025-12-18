import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Scroll, Settings } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function Layout({ children, showNav = true }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/game', icon: BookOpen, label: 'Game' },
    { path: '/encounter', icon: Scroll, label: 'Encounter' },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-void">
      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Bottom navigation (optional) */}
      {showNav && (
        <nav className="border-t border-obsidian/50 bg-abyss/80 backdrop-blur-sm">
          <div className="flex justify-around items-center py-2">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`touch-target flex flex-col items-center justify-center px-4 py-2 transition-colors ${
                    isActive
                      ? 'text-eldritch-light'
                      : 'text-parchment-dark hover:text-parchment'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="font-accent text-[10px]">{label.toUpperCase()}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}


