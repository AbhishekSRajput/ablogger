'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { clientsApi } from '@/lib/api';
import type { Client, CreateClientRequest, UpdateClientRequest } from '@/types';

export interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  mode: 'create' | 'edit';
}

interface FormData {
  clientName: string;
  companyName: string;
  email: string;
  contactPerson: string;
  notes: string;
}

interface FormErrors {
  clientName?: string;
  email?: string;
}

export const ClientForm: React.FC<ClientFormProps> = ({
  isOpen,
  onClose,
  client,
  mode,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({
    clientName: '',
    companyName: '',
    email: '',
    contactPerson: '',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (client && mode === 'edit') {
      setFormData({
        clientName: client.clientName,
        companyName: client.companyName || '',
        email: client.email || '',
        contactPerson: client.contactPerson || '',
        notes: client.notes || '',
      });
    } else {
      setFormData({
        clientName: '',
        companyName: '',
        email: '',
        contactPerson: '',
        notes: '',
      });
    }
    setErrors({});
  }, [client, mode, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: CreateClientRequest) => clientsApi.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      handleClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateClientRequest) =>
      clientsApi.updateClient(client!.clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', client!.clientId] });
      handleClose();
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: CreateClientRequest | UpdateClientRequest = {
      clientName: formData.clientName.trim(),
      companyName: formData.companyName.trim() || undefined,
      email: formData.email.trim() || undefined,
      contactPerson: formData.contactPerson.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };

    if (mode === 'create') {
      createMutation.mutate(submitData);
    } else {
      updateMutation.mutate(submitData);
    }
  };

  const handleClose = () => {
    setFormData({
      clientName: '',
      companyName: '',
      email: '',
      contactPerson: '',
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
      title={mode === 'create' ? 'Add New Client' : 'Edit Client'}
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
            label="Client Name"
            value={formData.clientName}
            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            error={errors.clientName}
            placeholder="Enter client name"
            required
            disabled={isLoading}
          />

          <Input
            label="Company Name"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="Enter company name (optional)"
            disabled={isLoading}
          />

          <Input
            label="Contact Person"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            placeholder="Enter contact person name (optional)"
            disabled={isLoading}
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            placeholder="contact@example.com (optional)"
            disabled={isLoading}
          />

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
            {mode === 'create' ? 'Create Client' : 'Update Client'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
