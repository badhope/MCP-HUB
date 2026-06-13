/**
 * Navbar — top nav, simplified to the 3-layer product model.
 *
 * 4 primary links (replacing the previous 6 + 2 user menu):
 *   - /              IconHome          🏠
 *   - /browse        Browse        📂
 *   - /our-tools     Our tools     🛠   (Layer 2)
 *   - /more          More          ➕   (Layer 3 — data status, contribute)
 *
 * IconPlus 2 secondary "user" entries (favorites is kept; submit was
 * absorbed into /more in Phase 7) and the GitHub external link.
 *
 * The "Submit" link and the StaticDemoBanner are gone: the
 * submission flow now lives at /more, and "demo" is no longer a
 * concept once the data is the production data.
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  IconMenu2, IconX, IconHome, IconTag, IconTool, IconPlus, IconHeart, IconBolt,
} from '@tabler/icons-react';
import { Github } from '../icons/Github';
import { ThemeToggle } from '../shared/ThemeToggle';

const navLinks = [
  { path: '/', label: 'IconHome', icon: IconHome },
  { path: '/browse', label: 'Browse', icon: IconTag },
  { path: '/our-tools', label: 'Our tools', icon: IconTool },
  { path: '/more', label: 'More', icon: IconPlus },
];

const userLinks = [
  { path: '/favorites', label: 'Favorites', icon: IconHeart },
];

export const Navbar = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return (
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-card/90 backdrop-blur-sm shadow-sm'
        : 'bg-card'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group flex-shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center transition-shadow">
              <IconBolt className="w-5 h-5 text-primary-foreground fill-current" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">MCP Hub</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop User Actions */}
          <div className="hidden lg:flex items-center space-x-2">
            {userLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            <ThemeToggle />

            <a
              href="https://github.com/modelcontextprotocol"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
              title="MCP on GitHub"
            >
              <Github size={20} />
            </a>
          </div>

          {/* Mobile IconMenu2 Button */}
          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile IconMenu2 */}
      <div
        className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen
            ? 'max-h-[calc(100vh-4rem)] opacity-100'
            : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 border-t border-border bg-card">
          <div className="py-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1">Navigation</p>
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="py-2 border-t border-border space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1">User</p>
            {userLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Social */}
          <div className="pt-2 border-t border-border">
            <a
              href="https://github.com/modelcontextprotocol"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Github size={18} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
});
