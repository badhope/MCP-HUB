import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

const NotFound = React.memo(() => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-20">
      <Helmet>
        <title>404 - Page Not Found | MCP Hub</title>
        <meta name="description" content="The page you're looking for doesn't exist." />
      </Helmet>
      <div className="text-center max-w-lg mx-auto px-4">
        <div className="text-8xl sm:text-9xl font-bold bg-gradient-to-r from-primary-500 via-violet-500 to-accent-500 bg-clip-text text-transparent mb-4">
          404
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-600 text-lg mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button onClick={() => window.location.href = '/'}>
            <Home className="w-5 h-5 mr-2" />
            Go Home
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/servers'}>
            <Search className="w-5 h-5 mr-2" />
            Browse Servers
          </Button>
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default NotFound;