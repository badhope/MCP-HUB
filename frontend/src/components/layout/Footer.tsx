import React from 'react';
import { Link } from 'react-router-dom';
import { IconServer, IconHeart, IconSparkles } from '@tabler/icons-react';
import { Github } from '../icons/Github';

export const Footer = React.memo(() => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card text-muted-foreground">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <IconServer className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">MCP Hub</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              The comprehensive marketplace for discovering and sharing MCP servers. 
              Empowering developers to build better AI integrations.
            </p>
            <div className="flex space-x-3">
              <a
                href="https://github.com/modelcontextprotocol"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                title="MCP on GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                title="MCP Official Site"
              >
                <IconSparkles className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Explore</h3>
            <ul className="space-y-2.5">
              <li><Link to="/servers" className="text-sm hover:text-foreground transition-colors">All Servers</Link></li>
              <li><Link to="/categories" className="text-sm hover:text-foreground transition-colors">Categories</Link></li>
              <li><Link to="/curated" className="text-sm hover:text-foreground transition-colors">Curated Picks</Link></li>
              <li><Link to="/companies" className="text-sm hover:text-foreground transition-colors">Companies</Link></li>
              <li><Link to="/submit" className="text-sm hover:text-foreground transition-colors">Submit IconServer</Link></li>
            </ul>
          </div>

          {/* User */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Community</h3>
            <ul className="space-y-2.5">
              <li><Link to="/favorites" className="text-sm hover:text-foreground transition-colors flex items-center space-x-1.5">
                <IconHeart size={14} /> <span>My Favorites</span>
              </Link></li>
              <li><Link to="/about" className="text-sm hover:text-foreground transition-colors">About</Link></li>
              <li><a href="https://github.com/modelcontextprotocol/servers" target="_blank" rel="noopener noreferrer" 
                     className="text-sm hover:text-foreground transition-colors">Official Servers</a></li>
            </ul>
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Project</h3>
            <ul className="space-y-2.5">
              <li className="text-sm">Version 3.0.0</li>
              <li className="text-sm">Open Source</li>
              <li className="text-sm">MIT License</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 sm:mt-12 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} MCP Hub. Built with <IconHeart size={10} className="inline text-red-500 fill-current" /> for the MCP community.
            </p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <span>&middot;</span>
              <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" 
                 className="hover:text-foreground transition-colors">MCP Protocol</a>
              <span>&middot;</span>
              <a href="https://github.com/modelcontextprotocol" target="_blank" rel="noopener noreferrer"
                 className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});
