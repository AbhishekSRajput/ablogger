'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browsersApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BrowserForm } from '@/components/browsers/BrowserForm';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Plus, Monitor, Smartphone, Tablet, Edit2, Trash2, AlertCircle, Star } from 'lucide-react';
import type { BrowserConfiguration } from '@/types';

export default function BrowsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserConfiguration | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<number | null>(null);

  // Fetch browsers
  const { data: browsers = [], isLoading, error } = useQuery({
    queryKey: ['browsers'],
    queryFn: () => browsersApi.getBrowsers(),
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) => browsersApi.toggleBrowserActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browsers'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => browsersApi.deleteBrowser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browsers'] });
      setDeleteConfirmation(null);
    },
  });

  const handleAddNew = () => {
    setFormMode('create');
    setSelectedBrowser(null);
    setShowForm(true);
  };

  const handleEdit = (browser: BrowserConfiguration) => {
    setFormMode('edit');
    setSelectedBrowser(browser);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmation(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmation) {
      deleteMutation.mutate(deleteConfirmation);
    }
  };

  const handleToggleActive = (id: number) => {
    toggleActiveMutation.mutate(id);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getDeviceBadge = (deviceType: string) => {
    const variants: Record<string, 'info' | 'success' | 'secondary'> = {
      desktop: 'info',
      mobile: 'success',
      tablet: 'secondary',
    };

    return (
      <Badge variant={variants[deviceType] || 'default'} size="sm" className="gap-1">
        {getDeviceIcon(deviceType)}
        {deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}
      </Badge>
    );
  };

  const isDefaultBrowser = (browser: BrowserConfiguration) => {
    // Consider it default if it has basic Chrome desktop config
    return (
      browser.browserName === 'Chrome' &&
      browser.deviceType === 'desktop' &&
      !browser.browserVersion
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browser Configurations</h1>
          <p className="text-gray-600 mt-1">Manage browser and device configurations</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-900">Error loading browsers</h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browser Configurations</h1>
          <p className="text-gray-600 mt-1">Manage browser and device configurations for monitoring</p>
        </div>
        <Button variant="primary" onClick={handleAddNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add New Browser Config
        </Button>
      </div>

      {/* Delete Error */}
      {deleteMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-900">Failed to delete browser configuration</h3>
            <p className="text-sm text-red-700 mt-1">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      )}

      {/* Browsers Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading browser configurations...</p>
          </div>
        ) : browsers.length === 0 ? (
          <div className="p-8 text-center">
            <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No browser configurations found</p>
            <p className="text-sm text-gray-500 mt-1">
              Add a browser configuration to start monitoring
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Browser
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operating System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Viewport
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {browsers.map((browser) => (
                  <tr key={browser.configId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {browser.browserName}
                        </span>
                        {isDefaultBrowser(browser) && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {browser.browserVersion || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getDeviceBadge(browser.deviceType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {browser.operatingSystem || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {browser.viewportWidth && browser.viewportHeight
                          ? `${browser.viewportWidth} × ${browser.viewportHeight}`
                          : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(browser.configId)}
                        disabled={toggleActiveMutation.isPending}
                        className="focus:outline-none"
                      >
                        {browser.isActive ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="default" size="sm">Inactive</Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(browser)}
                          className="gap-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(browser.configId)}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Browser Form Modal */}
      <BrowserForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        browser={selectedBrowser}
        mode={formMode}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmation !== null}
        onClose={() => setDeleteConfirmation(null)}
        title="Delete Browser Configuration"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900">
                  Are you sure you want to delete this browser configuration?
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  This action cannot be undone. Any historical data associated with this configuration will remain, but it will no longer be used for monitoring.
                </p>
              </div>
            </div>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button
            variant="ghost"
            onClick={() => setDeleteConfirmation(null)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            isLoading={deleteMutation.isPending}
          >
            Delete Configuration
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
