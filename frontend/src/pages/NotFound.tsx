import React from 'react';
import { Helmet } from 'react-helmet-async';
import { IconHome, IconSearch, IconArrowLeft } from '@tabler/icons-react';
import { Button } from '../components/ui/Button';

const NotFound = React.memo(() => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-20">
      <Helmet>
        <title>404 - Page Not Found | MCP Hub</title>
        <meta name="description" content="The page you're looking for doesn't exist." />
      </Helmet>
      <div className="text-center max-w-lg mx-auto px-4">
        <div className="text-8xl sm:text-9xl font-bold text-foreground mb-4">
          404
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">Page Not Found</h1>
        <p className="text-muted-foreground text-lg mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button onClick={() => window.location.href = '/'}>
            <IconHome className="w-5 h-5 mr-2" />
            Go Home
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/servers'}>
            <IconSearch className="w-5 h-5 mr-2" />
            Browse Servers
          </Button>
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconArrowLeft size={18} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default NotFound;