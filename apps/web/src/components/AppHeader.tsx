'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18 18 6M6 6l12 12"
      />
    </svg>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: '/search', label: 'Search', primary: true },
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin', primary: false as const }] : []),
    { href: '/saved', label: 'Saved', primary: false as const },
  ];

  const closeUserDropdown = useCallback(() => setUserDropdownOpen(false), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    if (!userDropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        closeUserDropdown();
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeUserDropdown();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userDropdownOpen, closeUserDropdown]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMobileMenu();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen, closeMobileMenu]);

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 shrink items-center">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-lg transition-opacity hover:opacity-90 focus:outline-none"
            aria-label="Toth – Home"
          >
            <img
              src="/toth-logo-original.png"
              alt=""
              width={120}
              height={40}
              className="h-9 w-auto object-contain sm:h-10"
            />
            <span className="text-xl font-semibold tracking-tight text-stone-800">
              Toth
            </span>
          </Link>
        </div>

        <nav
          className="hidden shrink-0 items-center gap-2 md:flex"
          aria-label="Main"
        >
          {navLinks.map(({ href, label, primary }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            if (primary) {
              return (
                <Link
                  key={href}
                  href={href}
                  className={`btn-primary rounded-xl px-4 py-2.5 text-sm font-medium shadow-card transition-all focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
                    isActive
                      ? 'hover:shadow-card-hover'
                      : 'hover:shadow-card-hover'
                  }`}
                >
                  {label}
                </Link>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
                    isActive
                      ? 'bg-stone-100 text-stone-900'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
                }`}
              >
                {label}
              </Link>
            );
          })}

          {!loading &&
            (user ? (
              <div className="relative ml-2" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((open) => !open)}
                  onMouseEnter={() => setUserDropdownOpen(true)}
                  className="flex cursor-pointer items-center justify-center rounded-xl border border-stone-200/80 p-2 text-stone-600 shadow-card transition-all hover:border-stone-300 hover:text-stone-800 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
                  aria-haspopup="true"
                  aria-expanded={userDropdownOpen}
                  aria-label="Account menu"
                >
                  <UserIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <div
                  className={`absolute right-0 top-full z-20 pt-1 transition-opacity duration-150 ${
                    userDropdownOpen ? 'animate-fade-in opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                >
                  <div className="min-w-[200px] rounded-2xl border border-stone-200/80 bg-white p-3 shadow-card">
                    <p
                      className="truncate text-sm font-medium text-stone-600"
                      title={user.email}
                    >
                      {user.email}
                    </p>
                    <div className="mt-2 border-t border-stone-100 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          closeUserDropdown();
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-inset"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="ml-2 flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white shadow-card transition-all hover:bg-brand-800 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
                >
                  Sign up
                </Link>
              </div>
            ))}
        </nav>

        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex items-center justify-center rounded-xl border border-stone-200/80 p-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <CloseIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="animate-fade-in border-t border-stone-200 bg-white shadow-card md:hidden"
          role="dialog"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto max-w-5xl space-y-1 px-4 py-4">
            {navLinks.map(({ href, label, primary }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMobileMenu}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-inset ${
                    primary
                      ? 'btn-primary'
                      : isActive
                        ? 'bg-stone-100 text-stone-900'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            {!loading && !user && (
              <div className="flex gap-2 pt-2">
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-800"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobileMenu}
                  className="flex-1 rounded-xl bg-brand-700 px-4 py-3 text-center text-sm font-medium text-white hover:bg-brand-800"
                >
                  Sign up
                </Link>
              </div>
            )}
            {!loading && user && (
              <div className="border-t border-stone-100 pt-3">
                <p className="truncate px-4 text-sm text-stone-600" title={user.email}>
                  {user.email}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="mt-2 w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-stone-700 hover:bg-stone-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
