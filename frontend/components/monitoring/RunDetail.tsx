'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export interface RunDetailProps {
  runId: number;
}

export const RunDetail: React.FC<RunDetailProps> = ({ runId }) => {
  const { data: checks, isLoading, error } = useQuery({
    queryKey: ['run-checks', runId],
    queryFn: () => monitoringApi.getRunChecks(runId),
  });

  const getCheckStatusIcon = (checkStatus: string) => {
    switch (checkStatus) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'timeout':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCheckStatusBadge = (checkStatus: string) => {
    switch (checkStatus) {
      case 'success':
        return <Badge variant="success" size="sm">Success</Badge>;
      case 'timeout':
        return <Badge variant="warning" size="sm">Timeout</Badge>;
      case 'error':
        return <Badge variant="danger" size="sm">Error</Badge>;
      default:
        return <Badge variant="default" size="sm">{checkStatus}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="py-6 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600 mt-2">Loading check details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">
            Failed to load check details: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  if (!checks || checks.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-gray-600">No checks found for this run</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          Check Details ({checks.length} checks)
        </h4>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Browser Config
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Checked At
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Load Time
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cookie Found
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Error Detected
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {checks.map((check) => (
              <tr key={check.checkId} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getCheckStatusIcon(check.checkStatus)}
                    <span className="text-sm text-gray-900">#{check.checkId}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900">#{check.urlId}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900">#{check.configId}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700">
                    {formatDate(check.checkedAt)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {check.pageLoadTimeMs !== null ? `${check.pageLoadTimeMs}ms` : '-'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {check.cookieFound ? (
                    <Badge variant="success" size="sm">Yes</Badge>
                  ) : (
                    <Badge variant="default" size="sm">No</Badge>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {check.errorDetected ? (
                    <Badge variant="danger" size="sm">Yes</Badge>
                  ) : (
                    <Badge variant="success" size="sm">No</Badge>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getCheckStatusBadge(check.checkStatus)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {checks.some(check => check.errorMessage) && (
        <div className="mt-4 space-y-2">
          <h5 className="text-xs font-semibold text-gray-700 uppercase">Error Messages</h5>
          {checks
            .filter(check => check.errorMessage)
            .map(check => (
              <div key={check.checkId} className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">
                      Check #{check.checkId} (URL #{check.urlId}, Config #{check.configId})
                    </p>
                    <p className="text-sm text-red-700">{check.errorMessage}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
