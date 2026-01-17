'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { urlsApi } from '@/lib/api';
import type { MonitoredUrl, CreateUrlRequest, UpdateUrlRequest } from '@/types';

export interface UrlFormProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  url?: MonitoredUrl | null;
  mode: 'create' | 'edit';
}

interface FormData {
  url: string;
  urlLabel: string;
  isActive: boolean;
  hasActiveTest: boolean;
  notes: string;
}

interface FormErrors {
  url?: string;
}

export const UrlForm: React.FC<UrlFormProps> = ({
  isOpen,
  onClose,
  clientId,
  url,
  mode,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({
    url: '',
    urlLabel: '',
    isActive: true,
    hasActiveTest: false,
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (url && mode === 'edit') {
      setFormData({
        url: url.url,
        urlLabel: url.urlLabel || '',
        isActive: url.isActive,
        hasActiveTest: url.hasActiveTest,
        notes: url.notes || '',
      });
    } else {
      setFormData({
        url: '',
        urlLabel: '',
        isActive: true,
        hasActiveTest: false,
        notes: '',
      });
    }
    setErrors({});
  }, [url, mode, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: CreateUrlRequest) => urlsApi.createUrl(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urls', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      handleClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUrlRequest) => urlsApi.updateUrl(url!.urlId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urls', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['url', url!.urlId] });
      handleClose();
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else if (!isValidUrl(formData.url)) {
      newErrors.url = 'Please enter a valid URL (e.g., https://example.com)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (mode === 'create') {
      const submitData: CreateUrlRequest = {
        clientId,
        url: formData.url.trim(),
        urlLabel: formData.urlLabel.trim() || undefined,
        isActive: formData.isActive,
        hasActiveTest: formData.hasActiveTest,
        notes: formData.notes.trim() || undefined,
      };
      createMutation.mutate(submitData);
    } else {
      const submitData: UpdateUrlRequest = {
        url: formData.url.trim(),
        urlLabel: formData.urlLabel.trim() || undefined,
        isActive: formData.isActive,
        hasActiveTest: formData.hasActiveTest,
        notes: formData.notes.trim() || undefined,
      };
      updateMutation.mutate(submitData);
    }
  };

  const handleClose = () => {
    setFormData({
      url: '',
      urlLabel: '',
      isActive: true,
      hasActiveTest: false,
      notes: '',
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
      title={mode === 'create' ? 'Add New URL' : 'Edit URL'}
      size="md"
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

          <Input
            label="URL"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            error={errors.url}
            placeholder="https://example.com"
            required
            disabled={isLoading}
          />

          <Input
            label="URL Label"
            value={formData.urlLabel}
            onChange={(e) => setFormData({ ...formData, urlLabel: e.target.value })}
            placeholder="Friendly name for this URL (optional)"
            disabled={isLoading}
          />

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasActiveTest}
                onChange={(e) => setFormData({ ...formData, hasActiveTest: e.target.checked })}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Has Active Test</span>
            </label>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes (optional)"
              rows={3}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
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
            {mode === 'create' ? 'Add URL' : 'Update URL'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
