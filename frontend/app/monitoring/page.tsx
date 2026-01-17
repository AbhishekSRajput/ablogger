'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { RunHistory } from '@/components/monitoring/RunHistory';
import { Play, RefreshCw, AlertCircle } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/Modal';

const ITEMS_PER_PAGE = 10;
const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

export default function MonitoringPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch monitoring runs
  const { data: allRuns = [], isLoading, error, refetch } = useQuery({
    queryKey: ['monitoring-runs'],
    queryFn: () => monitoringApi.getMonitoringRuns(),
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
  });

  // Check if there's a running job
  const hasRunningJob = allRuns.some(run => run.status === 'running');

  // Enable auto-refresh when there's a running job
  useEffect(() => {
    setAutoRefresh(hasRunningJob);
  }, [hasRunningJob]);

  // Trigger monitoring mutation
  const triggerMutation = useMutation({
    mutationFn: () => monitoringApi.triggerMonitoring(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-runs'] });
      setShowConfirmModal(false);
      setAutoRefresh(true);
    },
  });

  // Pagination
  const totalPages = Math.ceil(allRuns.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRuns = allRuns.slice(startIndex, endIndex);

  const handleTriggerClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmTrigger = () => {
    triggerMutation.mutate();
  };

  const handleRefresh = () => {
    refetch();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Monitoring</h1>
        <p className="text-gray-600 mt-1">View monitoring runs and URL checks</p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleTriggerClick}
            disabled={hasRunningJob || triggerMutation.isPending}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Trigger Monitoring Run
          </Button>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Current Run Status */}
        {hasRunningJob && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-900">
              Monitoring run in progress
            </span>
            {autoRefresh && (
              <span className="text-xs text-blue-700">
                (auto-refreshing)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-900">Error loading monitoring runs</h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      )}

      {/* Trigger Error */}
      {triggerMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-900">Failed to trigger monitoring run</h3>
            <p className="text-sm text-red-700 mt-1">
              {triggerMutation.error instanceof Error
                ? triggerMutation.error.message
                : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      )}

      {/* Run History */}
      <RunHistory runs={currentRuns} isLoading={isLoading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{startIndex + 1}</span>
                {' '}-{' '}
                <span className="font-medium">
                  {Math.min(endIndex, allRuns.length)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{allRuns.length}</span>
                {' '}runs
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Trigger Monitoring Run"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">
                  Start a new monitoring run?
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  This will check all active URLs with all active browser configurations.
                  The run may take several minutes depending on the number of URLs and browsers configured.
                </p>
              </div>
            </div>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button
            variant="ghost"
            onClick={() => setShowConfirmModal(false)}
            disabled={triggerMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmTrigger}
            isLoading={triggerMutation.isPending}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Start Run
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
