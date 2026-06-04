import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Send, Github, ChevronRight, CheckCircle, AlertCircle, Loader2, Info, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { apiClient, isStaticDemo } from '../lib/api';

const SubmitServer = React.memo(() => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    source: '',
    description: '',
    categories: '',
    npmPackage: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Server name is required';
        if (!/^[a-z0-9][a-z0-9._-]*$/.test(value.trim())) {
          return 'Name must start with lowercase letter/number and contain only a-z, 0-9, hyphens, underscores, dots';
        }
        return undefined;

      case 'source':
        if (!value.trim()) return 'Source URL is required';
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          return 'URL must start with http:// or https://';
        }
        if (!value.includes('github.com')) {
          return 'Currently only GitHub repositories are supported';
        }
        return undefined;

      case 'description':
        if (!value.trim()) return 'Description is required';
        if (value.trim().length < 20) return 'Description must be at least 20 characters';
        if (value.trim().length > 500) return 'Description must be less than 500 characters';
        return undefined;

      case 'categories':
        if (value.trim()) {
          const parts = value.split(',').map((c) => c.trim()).filter(Boolean);
          if (parts.some((c) => c.length > 30)) {
            return 'Each category name must be less than 30 characters';
          }
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const getFieldError = (field: string): string | undefined => {
    if (!touched[field]) return undefined;
    return validateField(field, formData[field as keyof typeof formData]);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setError('');
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateForm = (): string | null => {
    const fields = ['name', 'source', 'description'] as const;
    for (const field of fields) {
      const err = validateField(field, formData[field]);
      if (err) return err;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({ name: true, source: true, description: true, categories: true });
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const categories = formData.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await apiClient.submitServer({
        userId: 'default-user',
        name: formData.name.trim(),
        source: formData.source.trim(),
        description: formData.description.trim(),
        categories,
        npmPackage: formData.npmPackage.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => navigate('/servers'), 2000);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Failed to submit server. Please try again.');
      }
    }
    setSubmitting(false);
  };

  if (success) {
    // Pre-fill a GitHub issue template body with the same data so the
    // visitor can one-click open a real submission ticket for review.
    const issueBody = [
      `**Server name:** \`${formData.name.trim()}\``,
      `**Source:** ${formData.source.trim()}`,
      formData.categories.trim() ? `**Categories:** ${formData.categories.trim()}` : null,
      formData.npmPackage.trim() ? `**NPM package:** \`${formData.npmPackage.trim()}\`` : null,
      '',
      '**Description:**',
      formData.description.trim(),
    ]
      .filter(Boolean)
      .join('\n');
    const issueUrl =
      `https://github.com/badhope/MCP-HUB/issues/new` +
      `?template=server_submission.md` +
      `&title=${encodeURIComponent(`Server submission: ${formData.name.trim()}`)}` +
      `&body=${encodeURIComponent(issueBody)}`;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-16">
        <Helmet>
          <title>Submit a Server | MCP Hub</title>
          <meta name="description" content="Share an MCP server with the community. Submit your MCP server for review." />
        </Helmet>
        <div className="container mx-auto px-4">
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="p-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Submission Received!</h2>
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                Thank you for contributing to MCP Hub!
              </p>
              {isStaticDemo && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-left text-sm text-amber-800 dark:text-amber-200 mb-6">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Saved locally on this device</p>
                      <p className="text-amber-700 dark:text-amber-300">
                        This demo runs without a live backend, so your submission is stored only in this browser.
                        To make it visible to the community, open a GitHub issue with the same details and
                        a maintainer will review and merge it.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  <Github size={16} />
                  Open GitHub issue
                  <ExternalLink size={12} />
                </a>
                <Button onClick={() => navigate('/servers')}>
                  Browse Servers
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12">
      <Helmet>
        <title>Submit a Server | MCP Hub</title>
        <meta name="description" content="Share an MCP server with the community. Submit your MCP server for review." />
      </Helmet>
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-white mb-4 transition-colors"
          >
            <ChevronRight size={20} className="rotate-180 mr-1" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Submit a Server</h1>
          <p className="text-gray-600 dark:text-slate-300">
            Share an MCP server with the community. Our team will review your submission.
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            {isStaticDemo && (
              <div className="flex items-start space-x-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-lg mb-6 text-sm">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Demo mode — submissions are stored locally on this device</p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                    A maintainer will only see your server if you also open a GitHub issue using the link on the next screen.
                  </p>
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Server Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="e.g., my-awesome-mcp-server"
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                    getFieldError('name') ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : 'border-gray-200 dark:border-slate-700'
                  }`}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400 dark:text-slate-500">Use kebab-case (lowercase with hyphens)</p>
                  {getFieldError('name') && (
                    <p className="text-xs text-red-500">{getFieldError('name')}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Source URL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Github size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                  <input
                    type="url"
                    value={formData.source}
                    onChange={(e) => handleChange('source', e.target.value)}
                    onBlur={() => handleBlur('source')}
                    placeholder="https://github.com/username/repo"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                      getFieldError('source') ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : 'border-gray-200 dark:border-slate-700'
                    }`}
                  />
                </div>
                {getFieldError('source') && (
                  <p className="text-xs text-red-500 mt-1">{getFieldError('source')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  onBlur={() => handleBlur('description')}
                  placeholder="Describe what this MCP server does, its main features, and how it integrates with AI assistants..."
                  rows={4}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-colors ${
                    getFieldError('description') ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : 'border-gray-200 dark:border-slate-700'
                  }`}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs ${formData.description.length < 20 ? 'text-gray-400 dark:text-slate-500' : 'text-green-500'}`}>
                    {formData.description.length} / 500 characters (minimum 20)
                  </p>
                  {getFieldError('description') && (
                    <p className="text-xs text-red-500">{getFieldError('description')}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Categories
                </label>
                <input
                  type="text"
                  value={formData.categories}
                  onChange={(e) => handleChange('categories', e.target.value)}
                  onBlur={() => handleBlur('categories')}
                  placeholder="e.g., ai, database, productivity"
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                    getFieldError('categories') ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : 'border-gray-200 dark:border-slate-700'
                  }`}
                />
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Comma-separated list of categories
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  NPM Package <span className="text-gray-400 dark:text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.npmPackage}
                  onChange={(e) => handleChange('npmPackage', e.target.value)}
                  placeholder="e.g., @modelcontextprotocol/server-github"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t">
                <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-slate-500 min-w-0">
                  <Info size={14} className="flex-shrink-0" />
                  <span>By submitting, you confirm this server follows the MCP protocol standards.</span>
                </div>
                <Button type="submit" disabled={submitting} className="flex items-center space-x-2 flex-shrink-0">
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Submit for Review</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default SubmitServer;