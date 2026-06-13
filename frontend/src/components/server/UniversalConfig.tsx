/**
 * UniversalConfig — display the universal mcpServers JSON config.
 *
 * Simplified: removed download buttons, copy button, and tested clients.
 * Just shows the config JSON.
 */

import React from 'react';
import { Card, CardContent } from '../ui/Card';
import type { Server } from '../../types';

interface UniversalConfigProps {
  server: Server;
  config?: string;
}

export const UniversalConfig: React.FC<UniversalConfigProps> = ({ server, config }) => {
  if ((server.our_signal ?? 0) < 0.7) return null;

  const displayConfig = config || JSON.stringify({
    mcpServers: {
      [server.name]: {
        command: 'your-command-here',
        args: [],
        env: {}
      }
    }
  }, null, 2);

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">
          Universal Config
        </h3>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-100">
            <code>{displayConfig}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};
