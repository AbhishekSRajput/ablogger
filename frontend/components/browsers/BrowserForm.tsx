'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { browsersApi } from '@/lib/api';
import type { BrowserConfiguration, CreateBrowserConfigRequest, UpdateBrowserConfigRequest } from '@/types';

export interface BrowserFormProps {
  isOpen: boolean;
  onClose: () => void;
  browser?: BrowserConfiguration | null;
  mode: 'create' | 'edit';
}

interface FormData {
  browserName: string;
  browserVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  operatingSystem: string;
  viewportWidth: string;
  viewportHeight: string;
  userAgent: string;
  isActive: boolean;
}

interface FormErrors {
  browserName?: string;
  deviceType?: string;
  viewportWidth?: string;
  viewportHeight?: string;
}

const BROWSER_OPTIONS = [
  { value: '', label: 'Select browser' },
  { value: 'Chrome', label: 'Chrome' },
  { value: 'Firefox', label: 'Firefox' },
  { value: 'Safari', label: 'Safari' },
  { value: 'Edge', label: 'Edge' },
];

const DEVICE_TYPE_OPTIONS = [
  { value: '', label: 'Select device type' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
];

export const BrowserForm: React.FC<BrowserFormProps> = ({
  isOpen,
  onClose,
  browser,
  mode,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({
    browserName: '',
    browserVersion: '',
    deviceType: 'desktop',
    operatingSystem: '',
    viewportWidth: '',
    viewportHeight: '',
    userAgent: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (browser && mode === 'edit') {
      setFormData({
        browserName: browser.browserName,
        browserVersion: browser.browserVersion || '',
        deviceType: browser.deviceType,
        operatingSystem: browser.operatingSystem || '',
        viewportWidth: browser.viewportWidth?.toString() || '',
        viewportHeight: browser.viewportHeight?.toString() || '',
        userAgent: browser.userAgent || '',
        isActive: browser.isActive,
      });
    } else {
      setFormData({
        browserName: '',
        browserVersion: '',
        deviceType: 'desktop',
        operatingSystem: '',
        viewportWidth: '',
        viewportHeight: '',
        userAgent: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [browser, mode, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: CreateBrowserConfigRequest) => browsersApi.createBrowser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browsers'] });
      handleClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBrowserConfigRequest) =>
      browsersApi.updateBrowser(browser!.configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browsers'] });
      queryClient.invalidateQueries({ queryKey: ['browser', browser!.configId] });
      handleClose();
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.browserName.trim()) {
      newErrors.browserName = 'Browser name is required';
    }

    if (!formData.deviceType) {
      newErrors.deviceType = 'Device type is required';
    }

    if (formData.viewportWidth) {
      const width = parseInt(formData.viewportWidth, 10);
      if (isNaN(width) || width <= 0) {
        newErrors.viewportWidth = 'Viewport width must be a positive integer';
      }
    }

    if (formData.viewportHeight) {
      const height = parseInt(formData.viewportHeight, 10);
      if (isNaN(height) || height <= 0) {
        newErrors.viewportHeight = 'Viewport height must be a positive integer';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: CreateBrowserConfigRequest | UpdateBrowserConfigRequest = {
      browserName: formData.browserName.trim(),
      browserVersion: formData.browserVersion.trim() || undefined,
      deviceType: formData.deviceType,
      operatingSystem: formData.operatingSystem.trim() || undefined,
      viewportWidth: formData.viewportWidth ? parseInt(formData.viewportWidth, 10) : undefined,
      viewportHeight: formData.viewportHeight ? parseInt(formData.viewportHeight, 10) : undefined,
      userAgent: formData.userAgent.trim() || undefined,
      isActive: formData.isActive,
    };

    if (mode === 'create') {
      createMutation.mutate(submitData as CreateBrowserConfigRequest);
    } else {
      updateMutation.mutate(submitData as UpdateBrowserConfigRequest);
    }
  };

  const handleClose = () => {
    setFormData({
      browserName: '',
      browserVersion: '',
      deviceType: 'desktop',
      operatingSystem: '',
      viewportWidth: '',
      viewportHeight: '',
      userAgent: '',
      isActive: true,
    });
    setErrors({});
    onClose();
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'create' ? 'Add New Browser Configuration' : 'Edit Browser Configuration'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Browser Name"
              value={formData.browserName}
              onChange={(e) => setFormData({ ...formData, browserName: e.target.value })}
              options={BROWSER_OPTIONS}
              error={errors.browserName}
              required
              disabled={isLoading}
            />

            <Input
              label="Browser Version"
              value={formData.browserVersion}
              onChange={(e) => setFormData({ ...formData, browserVersion: e.target.value })}
              placeholder="e.g., 120.0 (optional)"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Device Type"
              value={formData.deviceType}
              onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as 'desktop' | 'mobile' | 'tablet' })}
              options={DEVICE_TYPE_OPTIONS}
              error={errors.deviceType}
              required
              disabled={isLoading}
            />

            <Input
              label="Operating System"
              value={formData.operatingSystem}
              onChange={(e) => setFormData({ ...formData, operatingSystem: e.target.value })}
              placeholder="e.g., Windows 11 (optional)"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Viewport Width"
              type="number"
              value={formData.viewportWidth}
              onChange={(e) => setFormData({ ...formData, viewportWidth: e.target.value })}
              placeholder="e.g., 1920"
              error={errors.viewportWidth}
              disabled={isLoading}
              min="1"
            />

            <Input
              label="Viewport Height"
              type="number"
              value={formData.viewportHeight}
              onChange={(e) => setFormData({ ...formData, viewportHeight: e.target.value })}
              placeholder="e.g., 1080"
              error={errors.viewportHeight}
              disabled={isLoading}
              min="1"
            />
          </div>

          <Textarea
            label="User Agent"
            value={formData.userAgent}
            onChange={(e) => setFormData({ ...formData, userAgent: e.target.value })}
            placeholder="Enter custom user agent string (optional)"
            rows={3}
            disabled={isLoading}
          />

          <Checkbox
            label="Active"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            disabled={isLoading}
            helperText="Active configurations will be used in monitoring runs"
          />
        </div>

        <ModalFooter className="mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            {mode === 'create' ? 'Create Configuration' : 'Update Configuration'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
