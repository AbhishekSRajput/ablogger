'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  AlertTriangle,
  Calendar,
  Chrome,
  Globe,
  User,
  FileText,
  ChevronRight
} from 'lucide-react';
import type { FailureWithDetails } from '@/types';

interface FailureCardProps {
  failure: FailureWithDetails;
  isSelected?: boolean;
  onSelect?: (failureId: number, selected: boolean) => void;
  showCheckbox?: boolean;
}

const getStatusVariant = (status: string): 'default' | 'success' | 'danger' | 'warning' | 'info' | 'secondary' => {
  const statusMap: Record<string, 'default' | 'success' | 'danger' | 'warning' | 'info' | 'secondary'> = {
    new: 'danger',
    acknowledged: 'warning',
    investigating: 'info',
    resolved: 'success',
    ignored: 'default',
  };
  return statusMap[status] || 'default';
};

const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const FailureCard: React.FC<FailureCardProps> = ({
  failure,
  isSelected = false,
  onSelect,
  showCheckbox = false,
}) => {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelect) {
      onSelect(failure.failureId, e.target.checked);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1">
            {showCheckbox && (
              <div className="pt-1">
                <Checkbox
                  checked={isSelected}
                  onChange={handleCheckboxChange}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant={getStatusVariant(failure.resolutionStatus)} size="sm">
                  {failure.resolutionStatus}
                </Badge>
                <Badge variant="info" size="sm">
                  {failure.errorType}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {failure.testId} - {failure.variant}
              </h3>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {/* Client */}
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="font-medium mr-1">Client:</span>
            <span className="truncate">{failure.clientName}</span>
          </div>

          {/* URL */}
          <div className="flex items-center text-sm text-gray-600">
            <Globe className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="font-medium mr-1">URL:</span>
            <span className="truncate" title={failure.url}>
              {truncateText(failure.url, 50)}
            </span>
          </div>

          {/* Browser */}
          <div className="flex items-center text-sm text-gray-600">
            <Chrome className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="font-medium mr-1">Browser:</span>
            <span>{failure.browserName} ({failure.deviceType})</span>
          </div>

          {/* Error Message */}
          <div className="flex items-start text-sm text-gray-600">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-medium mr-1">Error:</span>
              <span className="text-gray-700" title={failure.errorMessage}>
                {truncateText(failure.errorMessage, 150)}
              </span>
            </div>
          </div>

          {/* Detected Date */}
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="font-medium mr-1">Detected:</span>
            <span>{format(new Date(failure.detectedAt), 'MMM dd, yyyy HH:mm')}</span>
          </div>

          {/* Resolution Notes Preview */}
          {failure.resolutionNotes && (
            <div className="flex items-start text-sm text-gray-600">
              <FileText className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-medium mr-1">Notes:</span>
                <span className="text-gray-700" title={failure.resolutionNotes}>
                  {truncateText(failure.resolutionNotes, 100)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {failure.screenshotPath && (
              <Badge variant="secondary" size="sm">
                Has Screenshot
              </Badge>
            )}
          </div>
          <Link
            href={`/failures/${failure.failureId}`}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};
