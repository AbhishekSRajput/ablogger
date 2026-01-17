'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card, CardContent } from '@/components/ui/Card';
import { Globe, Monitor, Clock, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

const POLL_INTERVAL = 2000; // Poll every 2 seconds

export const LiveProgress: React.FC = () => {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['monitoring-progress'],
    queryFn: () => monitoringApi.getProgress(),
    refetchInterval: POLL_INTERVAL,
  });

  // Calculate estimated time remaining
  useEffect(() => {
    if (data?.running && data?.progress) {
      const { totalChecked, totalExpected, startedAt } = data.progress;
      if (totalChecked > 0 && totalExpected > totalChecked) {
        const elapsedMs = Date.now() - new Date(startedAt).getTime();
        const avgTimePerCheck = elapsedMs / totalChecked;
        const remainingChecks = totalExpected - totalChecked;
        const estimatedRemainingMs = avgTimePerCheck * remainingChecks;

        const remainingSeconds = Math.floor(estimatedRemainingMs / 1000);
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;

        if (mins > 0) {
          setEstimatedTimeRemaining(`~${mins}m ${secs}s remaining`);
        } else {
          setEstimatedTimeRemaining(`~${secs}s remaining`);
        }
      } else {
        setEstimatedTimeRemaining(null);
      }
    }
  }, [data]);

  if (isLoading || !data?.running || !data?.progress) {
    return null;
  }

  const { progress } = data;
  const elapsedTime = progress.startedAt
    ? Math.floor((Date.now() - new Date(progress.startedAt).getTime()) / 1000)
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  };

  // Calculate checks per minute rate
  const checksPerMinute = elapsedTime > 0
    ? Math.round((progress.totalChecked / elapsedTime) * 60)
    : 0;

  // Determine progress bar variant based on error rate
  const errorRate = progress.totalChecked > 0
    ? (progress.errorsFound / progress.totalChecked) * 100
    : 0;
  const progressVariant = errorRate > 10 ? 'warning' : 'default';

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="py-5">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-900">
                Monitoring in Progress
              </h3>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Elapsed: {formatTime(elapsedTime)}</span>
              </div>
              {estimatedTimeRemaining && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Activity className="w-4 h-4" />
                  <span>{estimatedTimeRemaining}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar with Percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {progress.totalChecked} of {progress.totalExpected} checks completed
              </span>
              <span className="font-semibold text-blue-600">
                {progress.percentage}%
              </span>
            </div>
            <ProgressBar
              value={progress.percentage}
              size="lg"
              variant={progressVariant}
              animated
              showLabel={false}
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2 border-t border-blue-100">
            {/* URLs Checked */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                <CheckCircle className="w-3 h-3" />
                <span>Completed</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">{progress.totalChecked}</p>
            </div>

            {/* Remaining */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                <Activity className="w-3 h-3" />
                <span>Remaining</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {progress.totalExpected - progress.totalChecked}
              </p>
            </div>

            {/* Errors Found */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Errors</span>
              </div>
              <p className={`text-lg font-semibold ${progress.errorsFound > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {progress.errorsFound}
              </p>
            </div>

            {/* Rate */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                <Clock className="w-3 h-3" />
                <span>Rate</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {checksPerMinute}/min
              </p>
            </div>
          </div>

          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-blue-100">
            {/* Current URL */}
            {progress.currentUrl && (
              <div className="flex items-start gap-2 text-sm">
                <Globe className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-gray-500 block text-xs uppercase tracking-wide">Currently checking</span>
                  <span className="text-gray-900 font-medium break-all">
                    {truncateUrl(progress.currentUrl)}
                  </span>
                </div>
              </div>
            )}

            {/* Current Browser */}
            {progress.currentBrowser && (
              <div className="flex items-start gap-2 text-sm">
                <Monitor className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-gray-500 block text-xs uppercase tracking-wide">Browser</span>
                  <span className="text-gray-900 font-medium">
                    {progress.currentBrowser}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Errors Warning */}
          {progress.errorsFound > 0 && (
            <div className="flex items-center gap-2 pt-2 text-sm bg-amber-50 border border-amber-200 rounded-md p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-amber-700 font-medium">
                {progress.errorsFound} error{progress.errorsFound !== 1 ? 's' : ''} detected so far
                {errorRate > 0 && (
                  <span className="text-amber-600 font-normal ml-1">
                    ({errorRate.toFixed(1)}% error rate)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
