'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { failuresApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Chrome,
  Globe,
  User,
  FileText,
  Image as ImageIcon,
  Save,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import type { FailureWithDetails } from '@/types';

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

export default function FailureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const failureId = Number(params.id);

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Fetch failure details
  const { data: failure, isLoading, error } = useQuery({
    queryKey: ['failures', failureId],
    queryFn: () => failuresApi.getFailure(failureId),
    enabled: !!failureId,
  });

  // Fetch related failures (same testId + variant)
  const { data: relatedFailures = [] } = useQuery({
    queryKey: ['failures', 'related', failure?.testId, failure?.variant],
    queryFn: () => failuresApi.getFailures({
      testId: failure?.testId,
    }),
    enabled: !!failure?.testId,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      failuresApi.updateFailureStatus(failureId, {
        resolutionStatus: status as any,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failures', failureId] });
      queryClient.invalidateQueries({ queryKey: ['failures'] });
      setSelectedStatus('');
    },
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: (newNotes: string) =>
      failuresApi.updateFailureNotes(failureId, newNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failures', failureId] });
      queryClient.invalidateQueries({ queryKey: ['failures'] });
    },
  });

  // Initialize states when failure loads
  React.useEffect(() => {
    if (failure) {
      setSelectedStatus(failure.resolutionStatus);
      setNotes(failure.resolutionNotes || '');
    }
  }, [failure]);

  const handleStatusUpdate = () => {
    if (selectedStatus && selectedStatus !== failure?.resolutionStatus) {
      updateStatusMutation.mutate(selectedStatus);
    }
  };

  const handleNotesUpdate = () => {
    if (notes !== failure?.resolutionNotes) {
      updateNotesMutation.mutate(notes);
    }
  };

  const screenshotUrl = failure?.screenshotPath
    ? failuresApi.getScreenshotUrl(failureId)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading failure details...</p>
        </div>
      </div>
    );
  }

  if (error || !failure) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-900 font-semibold">Failed to load failure</p>
          <p className="text-gray-600">The failure may not exist or there was an error</p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push('/failures')}
          >
            Back to Failures
          </Button>
        </div>
      </div>
    );
  }

  // Filter related failures to exclude current failure and same variant
  const filteredRelatedFailures = relatedFailures.filter(
    (f: FailureWithDetails) => f.failureId !== failureId && f.variant === failure.variant
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/failures')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Failures
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Failure Details</h1>
            <p className="text-gray-600 mt-1">ID: {failure.failureId}</p>
          </div>
        </div>
        <Badge variant={getStatusVariant(failure.resolutionStatus)} size="md">
          {failure.resolutionStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Failure Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client
                  </label>
                  <div className="flex items-center text-gray-900">
                    <User className="w-4 h-4 mr-2 text-gray-500" />
                    {failure.clientName}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Browser
                  </label>
                  <div className="flex items-center text-gray-900">
                    <Chrome className="w-4 h-4 mr-2 text-gray-500" />
                    {failure.browserName} ({failure.deviceType})
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <div className="flex items-center text-gray-900 break-all">
                    <Globe className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                    <a
                      href={failure.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {failure.url}
                      <ExternalLink className="w-3 h-3 inline ml-1" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test ID
                  </label>
                  <div className="text-gray-900 font-mono text-sm">
                    {failure.testId}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variant
                  </label>
                  <div className="text-gray-900 font-mono text-sm">
                    {failure.variant}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Error Type
                  </label>
                  <Badge variant="info">{failure.errorType}</Badge>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detected At
                  </label>
                  <div className="flex items-center text-gray-900">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    {format(new Date(failure.detectedAt), 'MMM dd, yyyy HH:mm:ss')}
                  </div>
                </div>

                {failure.resolvedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resolved At
                    </label>
                    <div className="flex items-center text-gray-900">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      {format(new Date(failure.resolvedAt), 'MMM dd, yyyy HH:mm:ss')}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Error Message
                </label>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-900 text-sm break-words">
                      {failure.errorMessage}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Screenshot */}
          {screenshotUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Screenshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="relative cursor-pointer group"
                  onClick={() => setIsImageModalOpen(true)}
                >
                  <img
                    src={screenshotUrl}
                    alt="Failure screenshot"
                    className="w-full rounded-lg border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
                    <div className="bg-white bg-opacity-90 px-4 py-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm font-medium text-gray-900">
                        Click to enlarge
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Failures */}
          {filteredRelatedFailures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Failures</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Other failures with the same test ID and variant
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredRelatedFailures.slice(0, 5).map((related: FailureWithDetails) => (
                    <Link
                      key={related.failureId}
                      href={`/failures/${related.failureId}`}
                      className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant={getStatusVariant(related.resolutionStatus)} size="sm">
                              {related.resolutionStatus}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {format(new Date(related.detectedAt), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 truncate">
                            {related.clientName} - {related.browserName}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                  {filteredRelatedFailures.length > 5 && (
                    <p className="text-sm text-gray-600 text-center pt-2">
                      and {filteredRelatedFailures.length - 5} more...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Resolution Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: 'new', label: 'New' },
                  { value: 'acknowledged', label: 'Acknowledged' },
                  { value: 'investigating', label: 'Investigating' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'ignored', label: 'Ignored' },
                ]}
              />
              <Button
                variant="primary"
                onClick={handleStatusUpdate}
                disabled={
                  !selectedStatus ||
                  selectedStatus === failure.resolutionStatus ||
                  updateStatusMutation.isPending
                }
                isLoading={updateStatusMutation.isPending}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Status
              </Button>
            </CardContent>
          </Card>

          {/* Resolution Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Resolution Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this failure..."
                rows={6}
              />
              <Button
                variant="primary"
                onClick={handleNotesUpdate}
                disabled={
                  notes === (failure.resolutionNotes || '') ||
                  updateNotesMutation.isPending
                }
                isLoading={updateNotesMutation.isPending}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Screenshot Modal */}
      {screenshotUrl && (
        <Modal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          title="Screenshot"
        >
          <div className="max-w-full overflow-auto">
            <img
              src={screenshotUrl}
              alt="Failure screenshot"
              className="w-full h-auto"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
