import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Server, Github, Heart, Star, Users, Shield, Code2, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

const About = React.memo(() => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>About MCP Hub</title>
        <meta name="description" content="MCP Hub is the central hub for discovering and sharing MCP servers for AI applications." />
      </Helmet>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-violet-600 to-accent-600 py-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          <div className="hero-orb w-96 h-96 bg-white top-0 -left-20 opacity-10 float-slow"></div>
          <div className="hero-orb w-96 h-96 bg-white bottom-0 -right-20 opacity-10 float" style={{ animationDelay: '-2s' }}></div>
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">About MCP Hub</h1>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            The comprehensive marketplace for discovering and sharing MCP (Model Context Protocol) servers
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              MCP Hub aims to be the central hub for the MCP ecosystem, making it easy for developers and AI enthusiasts to discover, evaluate, and integrate high-quality MCP servers into their projects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { icon: Server, title: '4,400+ Servers', desc: 'Comprehensive collection of MCP servers from around the world' },
              { icon: Star, title: 'Quality Scores', desc: 'Multi-dimensional quality scoring to help you find the best servers' },
              { icon: Users, title: 'Community Driven', desc: 'Open source and community-contributed server submissions' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i} hoverable className="text-center">
                  <CardContent className="p-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Icon size={32} className="text-primary-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Key Features</h2>
          <div className="space-y-8">
            {[
              { icon: Shield, title: 'Smart Quality Scoring', desc: 'Every server is evaluated across four dimensions: functionality, documentation, maintenance activity, and community support. Scores range from D to S level.' },
              { icon: Code2, title: 'Auto-Generated Configs', desc: 'Get ready-to-use MCP configuration snippets for Claude Desktop, Cursor, and other AI clients. No manual configuration needed.' },
              { icon: Heart, title: 'Community Features', desc: 'Save your favorite servers, rate and review them, and contribute new server submissions to help grow the ecosystem.' },
              { icon: Github, title: 'Open Source', desc: 'MCP Hub itself is open source. The server index is automatically synced and updated, ensuring fresh and accurate data.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start space-x-4 p-6 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={24} className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Technology Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'React 18', role: 'Frontend Framework' },
              { name: 'TypeScript', role: 'Type Safety' },
              { name: 'Tailwind CSS', role: 'Styling' },
              { name: 'Vite', role: 'Build Tool' },
              { name: 'FastAPI', role: 'Backend API' },
              { name: 'Python', role: 'Data Processing' },
              { name: 'Docker', role: 'Containerization' },
              { name: 'GitHub Actions', role: 'CI/CD' },
            ].map((tech, i) => (
              <Card key={i} hoverable>
                <CardContent className="p-6 text-center">
                  <h3 className="font-bold text-gray-900 mb-1">{tech.name}</h3>
                  <p className="text-sm text-gray-500">{tech.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to explore?</h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Join the MCP ecosystem and discover powerful AI integrations
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="secondary" onClick={() => window.location.href = '/servers'} className="shadow-xl">
              <Server className="w-5 h-5 mr-2" />
              Browse Servers
            </Button>
            <a href="https://github.com/modelcontextprotocol" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="text-white border-white/30 hover:bg-white/20">
                <Github className="w-5 h-5 mr-2" />
                MCP on GitHub
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
});

export default About;