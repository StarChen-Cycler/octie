/**
 * App Header - Main navigation header
 * Design: Terminal Noir - Dark cyberpunk aesthetic
 */

import { useProjectStore } from '../store/projectStore';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { currentProjectPath, projects } = useProjectStore();
  const { theme, toggleTheme } = useTheme();

  const currentProject = projects.find((p) => p.path === currentProjectPath);

  return (
    <header
      className="flex items-center justify-between px-4 h-14 flex-shrink-0"
      style={{
        background: 'var(--surface-abyss)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      {/* Left section: Menu + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Menu toggle */}
        <button
          onClick={onMenuClick}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors focus-ring"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
          title="Toggle sidebar ([)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <a
            href="/"
            className="hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            octie
          </a>
          {currentProject && (
            <>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
                    color: 'white',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {currentProject.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ color: 'var(--text-primary)' }}>{currentProject.name}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors focus-ring"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
          title="Toggle theme (T)"
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Help */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors focus-ring"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
          title="Keyboard shortcuts"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      </div>
    </header>
  );
}
