'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientsApi, failuresApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { X, Filter } from 'lucide-react';
import type { FailureFilters as FailureFiltersType } from '@/types';

interface FailureFiltersProps {
  filters: FailureFiltersType;
  onFiltersChange: (filters: FailureFiltersType) => void;
  onClearFilters: () => void;
}

export const FailureFilters: React.FC<FailureFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<FailureFiltersType>(filters);
  const [selectedErrorTypes, setSelectedErrorTypes] = useState<string[]>(
    filters.errorType ? filters.errorType.split(',') : []
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    filters.resolutionStatus ? filters.resolutionStatus.split(',') : []
  );

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getClients,
  });

  const { data: errorTypes = [] } = useQuery({
    queryKey: ['failures', 'error-types'],
    queryFn: failuresApi.getErrorTypes,
  });

  const { data: browsers = [] } = useQuery({
    queryKey: ['failures', 'browsers'],
    queryFn: failuresApi.getBrowserFilters,
  });

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'ignored', label: 'Ignored' },
  ];

  const handleErrorTypeToggle = (errorType: string) => {
    const newSelected = selectedErrorTypes.includes(errorType)
      ? selectedErrorTypes.filter((et) => et !== errorType)
      : [...selectedErrorTypes, errorType];

    setSelectedErrorTypes(newSelected);
    setLocalFilters({
      ...localFilters,
      errorType: newSelected.length > 0 ? newSelected.join(',') : undefined,
    });
  };

  const handleStatusToggle = (status: string) => {
    const newSelected = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];

    setSelectedStatuses(newSelected);
    setLocalFilters({
      ...localFilters,
      resolutionStatus: newSelected.length > 0 ? newSelected.join(',') : undefined,
    });
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    setSelectedErrorTypes([]);
    setSelectedStatuses([]);
    onClearFilters();
  };

  const hasActiveFilters = Object.keys(localFilters).some(
    (key) => key !== 'page' && key !== 'limit' && localFilters[key as keyof FailureFiltersType]
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Client Dropdown */}
        <Select
          label="Client"
          value={localFilters.clientId || ''}
          onChange={(e) =>
            setLocalFilters({
              ...localFilters,
              clientId: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          options={[
            { value: '', label: 'All Clients' },
            ...clients.map((client) => ({
              value: client.clientId,
              label: client.clientName,
            })),
          ]}
        />

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <div className="space-y-2">
            <Input
              type="date"
              placeholder="From"
              value={localFilters.dateFrom || ''}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  dateFrom: e.target.value || undefined,
                })
              }
            />
            <Input
              type="date"
              placeholder="To"
              value={localFilters.dateTo || ''}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  dateTo: e.target.value || undefined,
                })
              }
            />
          </div>
        </div>

        {/* Error Type Multi-select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Error Types
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
            {errorTypes.map((errorType) => (
              <Checkbox
                key={errorType}
                label={errorType}
                checked={selectedErrorTypes.includes(errorType)}
                onChange={() => handleErrorTypeToggle(errorType)}
              />
            ))}
          </div>
        </div>

        {/* Test ID Search */}
        <Input
          label="Test ID"
          placeholder="Search by test ID..."
          value={localFilters.testId || ''}
          onChange={(e) =>
            setLocalFilters({
              ...localFilters,
              testId: e.target.value || undefined,
            })
          }
        />

        {/* Status Multi-select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="space-y-2">
            {statusOptions.map((status) => (
              <Checkbox
                key={status.value}
                label={status.label}
                checked={selectedStatuses.includes(status.value)}
                onChange={() => handleStatusToggle(status.value)}
              />
            ))}
          </div>
        </div>

        {/* Browser Dropdown */}
        <Select
          label="Browser"
          value={localFilters.browser || ''}
          onChange={(e) =>
            setLocalFilters({
              ...localFilters,
              browser: e.target.value || undefined,
            })
          }
          options={[
            { value: '', label: 'All Browsers' },
            ...browsers.map((browser) => ({
              value: browser,
              label: browser,
            })),
          ]}
        />

        {/* Apply Filters Button */}
        <Button
          variant="primary"
          onClick={handleApplyFilters}
          className="w-full"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
};
