'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { failuresApi } from '@/lib/api';
import { FailureFilters } from '@/components/failures/FailureFilters';
import { FailureCard } from '@/components/failures/FailureCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square
} from 'lucide-react';
import type { FailureFilters as FailureFiltersType } from '@/types';

const ITEMS_PER_PAGE = 50;

export default function FailuresPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Parse URL params to get initial filters
  const initialFilters = useMemo(() => {
    const filters: FailureFiltersType = {};

    if (searchParams.get('clientId')) {
      filters.clientId = Number(searchParams.get('clientId'));
    }
    if (searchParams.get('testId')) {
      filters.testId = searchParams.get('testId') || undefined;
    }
    if (searchParams.get('errorType')) {
      filters.errorType = searchParams.get('errorType') || undefined;
    }
    if (searchParams.get('resolutionStatus')) {
      filters.resolutionStatus = searchParams.get('resolutionStatus') || undefined;
    }
    if (searchParams.get('browser')) {
      filters.browser = searchParams.get('browser') || undefined;
    }
    if (searchParams.get('dateFrom')) {
      filters.dateFrom = searchParams.get('dateFrom') || undefined;
    }
    if (searchParams.get('dateTo')) {
      filters.dateTo = searchParams.get('dateTo') || undefined;
    }
    if (searchParams.get('page')) {
      filters.page = Number(searchParams.get('page'));
    }

    return filters;
  }, [searchParams]);

  const [filters, setFilters] = useState<FailureFiltersType>(initialFilters);
  const [currentPage, setCurrentPage] = useState(initialFilters.page || 1);
  const [selectedFailures, setSelectedFailures] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('');

  // Fetch failures with filters
  const { data: failures = [], isLoading, error } = useQuery({
    queryKey: ['failures', filters],
    queryFn: () => failuresApi.getFailures({
      ...filters,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    }),
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });

    if (currentPage > 1) {
      params.set('page', String(currentPage));
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.push(`/failures${newUrl}`, { scroll: false });
  }, [filters, currentPage, router]);

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { failureIds: number[]; resolutionStatus: string }) =>
      failuresApi.bulkUpdateFailures({
        failureIds: data.failureIds,
        resolutionStatus: data.resolutionStatus as any,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failures'] });
      setSelectedFailures(new Set());
      setBulkStatus('');
    },
  });

  const handleFiltersChange = (newFilters: FailureFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handleSelectFailure = (failureId: number, selected: boolean) => {
    const newSelected = new Set(selectedFailures);
    if (selected) {
      newSelected.add(failureId);
    } else {
      newSelected.delete(failureId);
    }
    setSelectedFailures(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFailures.size === failures.length) {
      setSelectedFailures(new Set());
    } else {
      setSelectedFailures(new Set(failures.map((f) => f.failureId)));
    }
  };

  const handleBulkStatusChange = () => {
    if (selectedFailures.size > 0 && bulkStatus) {
      bulkUpdateMutation.mutate({
        failureIds: Array.from(selectedFailures),
        resolutionStatus: bulkStatus,
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(failures.length / ITEMS_PER_PAGE);
  const allSelected = failures.length > 0 && selectedFailures.size === failures.length;
  const someSelected = selectedFailures.size > 0 && selectedFailures.size < failures.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading failures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-900 font-semibold">Failed to load failures</p>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Failures</h1>
        <p className="text-gray-600 mt-1">
          Manage and track detected A/B test failures
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <FailureFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Failures List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Bulk Actions Bar */}
          {selectedFailures.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedFailures.size} selected
                  </span>
                  <Select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    options={[
                      { value: '', label: 'Change status to...' },
                      { value: 'acknowledged', label: 'Acknowledged' },
                      { value: 'investigating', label: 'Investigating' },
                      { value: 'resolved', label: 'Resolved' },
                      { value: 'ignored', label: 'Ignored' },
                    ]}
                    className="w-48"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleBulkStatusChange}
                    disabled={!bulkStatus || bulkUpdateMutation.isPending}
                    isLoading={bulkUpdateMutation.isPending}
                  >
                    Update Status
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFailures(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Select All */}
          {failures.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {allSelected ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : someSelected ? (
                  <Square className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                <span>
                  {allSelected ? 'Deselect All' : 'Select All'} ({failures.length} failures)
                </span>
              </button>
            </div>
          )}

          {/* Failures Grid */}
          {failures.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No failures found
              </h3>
              <p className="text-gray-600">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {failures.map((failure) => (
                <FailureCard
                  key={failure.failureId}
                  failure={failure}
                  isSelected={selectedFailures.has(failure.failureId)}
                  onSelect={handleSelectFailure}
                  showCheckbox
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
