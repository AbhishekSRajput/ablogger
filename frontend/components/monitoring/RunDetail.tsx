'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, WifiOff, Globe, Monitor } from 'lucide-react';
import type { UrlCheckWithDetails } from '@/types';

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
      case 'unreachable':
        return <WifiOff className="w-4 h-4 text-orange-600" />;
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
      case 'unreachable':
        return <Badge variant="warning" size="sm">Unreachable</Badge>;
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

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  };

  // Group checks by status for summary
  const getStatusSummary = (checks: UrlCheckWithDetails[]) => {
    const summary = {
      success: 0,
      timeout: 0,
      unreachable: 0,
      error: 0,
    };
    checks.forEach(check => {
      if (check.checkStatus in summary) {
        summary[check.checkStatus as keyof typeof summary]++;
      }
    });
    return summary;
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

  const statusSummary = getStatusSummary(checks);

  return (
    <div className="space-y-4">
      {/* Header with Summary */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          Check Details ({checks.length} checks)
        </h4>
        <div className="flex items-center gap-3 text-xs">
          {statusSummary.success > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-3 h-3" />
              {statusSummary.success} success
            </span>
          )}
          {statusSummary.unreachable > 0 && (
            <span className="flex items-center gap-1 text-orange-600">
              <WifiOff className="w-3 h-3" />
              {statusSummary.unreachable} unreachable
            </span>
          )}
          {statusSummary.timeout > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Clock className="w-3 h-3" />
              {statusSummary.timeout} timeout
            </span>
          )}
          {statusSummary.error > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-3 h-3" />
              {statusSummary.error} error
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Browser
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {checks.map((check) => (
              <tr
                key={check.checkId}
                className={`hover:bg-gray-50 ${
                  check.checkStatus === 'unreachable' ? 'bg-orange-50' :
                  check.checkStatus === 'error' ? 'bg-red-50' :
                  check.checkStatus === 'timeout' ? 'bg-yellow-50' : ''
                }`}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getCheckStatusIcon(check.checkStatus)}
                    {getCheckStatusBadge(check.checkStatus)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 font-medium truncate" title={check.url}>
                        {check.urlLabel || truncateUrl(check.url)}
                      </p>
                      {check.urlLabel && (
                        <p className="text-xs text-gray-500 truncate" title={check.url}>
                          {truncateUrl(check.url)}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-900">{check.browserName}</p>
                      <p className="text-xs text-gray-500 capitalize">{check.deviceType}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{check.clientName}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700">
                    {formatDate(check.checkedAt)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {check.checkStatus === 'unreachable' ? (
                      <span className="text-orange-600">N/A</span>
                    ) : check.pageLoadTimeMs !== null ? (
                      `${check.pageLoadTimeMs}ms`
                    ) : (
                      '-'
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {check.checkStatus === 'unreachable' ? (
                    <Badge variant="default" size="sm">N/A</Badge>
                  ) : check.cookieFound ? (
                    <Badge variant="success" size="sm">Yes</Badge>
                  ) : (
                    <Badge variant="default" size="sm">No</Badge>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {check.checkStatus === 'unreachable' ? (
                    <Badge variant="default" size="sm">N/A</Badge>
                  ) : check.errorDetected ? (
                    <Badge variant="danger" size="sm">Yes</Badge>
                  ) : (
                    <Badge variant="success" size="sm">No</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unreachable Sites Section */}
      {checks.some(check => check.checkStatus === 'unreachable') && (
        <div className="mt-4 space-y-2">
          <h5 className="text-xs font-semibold text-orange-700 uppercase flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            Unreachable Sites ({checks.filter(c => c.checkStatus === 'unreachable').length})
          </h5>
          {checks
            .filter(check => check.checkStatus === 'unreachable')
            .map(check => (
              <div key={check.checkId} className="bg-orange-50 border border-orange-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <WifiOff className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-orange-900">
                        {check.urlLabel || check.url}
                      </p>
                      <Badge variant="warning" size="sm">{check.browserName}</Badge>
                      <Badge variant="default" size="sm" className="capitalize">{check.deviceType}</Badge>
                    </div>
                    {check.urlLabel && (
                      <p className="text-xs text-orange-700 mb-1">{check.url}</p>
                    )}
                    <p className="text-sm text-orange-700">{check.errorMessage}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Error Messages Section */}
      {checks.some(check => check.errorMessage && check.checkStatus !== 'unreachable') && (
        <div className="mt-4 space-y-2">
          <h5 className="text-xs font-semibold text-red-700 uppercase flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Error Messages
          </h5>
          {checks
            .filter(check => check.errorMessage && check.checkStatus !== 'unreachable')
            .map(check => (
              <div key={check.checkId} className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-red-900">
                        {check.urlLabel || truncateUrl(check.url, 60)}
                      </p>
                      <Badge variant="danger" size="sm">{check.browserName}</Badge>
                      <Badge variant="default" size="sm" className="capitalize">{check.deviceType}</Badge>
                    </div>
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
