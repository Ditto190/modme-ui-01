/**
 * Permission Dialog Component
 *
 * Integrates patterns from OpenWork for granular permission controls
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

export interface PermissionRequest {
  tool_name: string;
  level: string;
  description: string;
  context: Record<string, any>;
}

export interface PermissionDialogProps {
  baseUrl?: string;
  onApprove?: (request: PermissionRequest) => void;
  onDeny?: (request: PermissionRequest) => void;
}

export function PermissionDialog({
  baseUrl = 'http://localhost:8000',
  onApprove,
  onDeny
}: PermissionDialogProps) {
  const [pendingRequests, setPendingRequests] = useState<PermissionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Poll for pending permissions
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${baseUrl}/api/permissions/pending`);
        if (response.ok) {
          const data = await response.json();
          setPendingRequests(data.pending_requests || []);
        }
      } catch (error) {
        console.error('Error fetching pending permissions:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [baseUrl]);

  const handleApprove = async (request: PermissionRequest) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/permissions/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_name: request.tool_name }),
      });

      if (response.ok) {
        setPendingRequests(prev => prev.filter(r => r.tool_name !== request.tool_name));
        onApprove?.(request);
      }
    } catch (error) {
      console.error('Error approving permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeny = async (request: PermissionRequest) => {
    setIsLoading(true);
    try {
      setPendingRequests(prev => prev.filter(r => r.tool_name !== request.tool_name));
      onDeny?.(request);
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Permission Required
          </h3>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {pendingRequests.map((request, index) => (
          <div key={index} className="p-4">
            <div className="mb-3">
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                {request.description}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tool: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{request.tool_name}</code>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Level: <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">{request.level}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(request)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => handleDeny(request)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
                Deny
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
