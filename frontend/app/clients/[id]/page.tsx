'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Mail,
  User,
  Edit,
  Trash2,
  Plus,
  Loader2,
  Globe,
  CheckCircle,
  XCircle,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { clientsApi, urlsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ClientForm } from '@/components/clients/ClientForm';
import { UrlForm } from '@/components/urls/UrlForm';
import type { Client, MonitoredUrl } from '@/types';

interface ClientDetailPageProps {
  params: {
    id: string;
  };
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clientId = parseInt(params.id);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUrlFormOpen, setIsUrlFormOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState<MonitoredUrl | null>(null);
  const [deletingUrlId, setDeletingUrlId] = useState<number | null>(null);

  // Fetch client data
  const {
    data: client,
    isLoading: isLoadingClient,
    error: clientError,
  } = useQuery<Client>({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.getClient(clientId),
  });

  // Fetch URLs for this client
  const {
    data: urls = [],
    isLoading: isLoadingUrls,
    error: urlsError,
  } = useQuery<MonitoredUrl[]>({
    queryKey: ['urls', clientId],
    queryFn: () => urlsApi.getUrls(clientId),
  });

  // Toggle client active status
  const toggleStatusMutation = useMutation({
    mutationFn: () => clientsApi.toggleClientStatus(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  // Delete client
  const deleteClientMutation = useMutation({
    mutationFn: () => clientsApi.deleteClient(clientId),
    onSuccess: () => {
      router.push('/clients');
    },
  });

  // Delete URL
  const deleteUrlMutation = useMutation({
    mutationFn: (urlId: number) => urlsApi.deleteUrl(urlId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urls', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      setDeletingUrlId(null);
    },
  });

  // Toggle URL active status
  const toggleUrlActiveMutation = useMutation({
    mutationFn: (urlId: number) => urlsApi.toggleUrlActive(urlId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urls', clientId] });
    },
  });

  // Toggle URL has test status
  const toggleUrlHasTestMutation = useMutation({
    mutationFn: (urlId: number) => urlsApi.toggleUrlHasTest(urlId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urls', clientId] });
    },
  });

  const handleDeleteClient = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${client?.clientName}"? This will also delete all associated URLs and data. This action cannot be undone.`
      )
    ) {
      deleteClientMutation.mutate();
    }
  };

  const handleDeleteUrl = (url: MonitoredUrl) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${url.urlLabel || url.url}"? This action cannot be undone.`
      )
    ) {
      deleteUrlMutation.mutate(url.urlId);
    }
  };

  const handleEditUrl = (url: MonitoredUrl) => {
    setEditingUrl(url);
    setIsUrlFormOpen(true);
  };

  const handleCloseUrlForm = () => {
    setIsUrlFormOpen(false);
    setEditingUrl(null);
  };

  if (isLoadingClient) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (clientError || !client) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/clients')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">
            Error loading client: {clientError instanceof Error ? clientError.message : 'Not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/clients')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Button>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">{client.clientName}</CardTitle>
                  <Badge variant={client.isActive ? 'success' : 'secondary'}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {client.companyName && (
                  <p className="text-gray-600 mt-1">{client.companyName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={client.isActive ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => toggleStatusMutation.mutate()}
                isLoading={toggleStatusMutation.isPending}
              >
                {client.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteClient}
                isLoading={deleteClientMutation.isPending}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.contactPerson && (
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Contact Person</p>
                  <p className="text-sm font-medium text-gray-900">{client.contactPerson}</p>
                </div>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{client.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(client.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
          {client.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{client.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* URLs Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monitored URLs ({urls.length})</CardTitle>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingUrl(null);
                setIsUrlFormOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add URL
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUrls && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          )}

          {urlsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">
                Error loading URLs: {urlsError instanceof Error ? urlsError.message : 'Unknown error'}
              </p>
            </div>
          )}

          {!isLoadingUrls && !urlsError && urls.length === 0 && (
            <div className="text-center py-8">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No URLs added yet</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsUrlFormOpen(true)}
              >
                Add Your First URL
              </Button>
            </div>
          )}

          {!isLoadingUrls && !urlsError && urls.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      URL
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Active
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Has Test
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Last Checked
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {urls.map((url) => (
                    <tr key={url.urlId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          {url.urlLabel && (
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {url.urlLabel}
                            </p>
                          )}
                          <a
                            href={url.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {url.url}
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={url.isActive}
                            onChange={() => toggleUrlActiveMutation.mutate(url.urlId)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </td>
                      <td className="py-3 px-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={url.hasActiveTest}
                            onChange={() => toggleUrlHasTestMutation.mutate(url.urlId)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600">
                          {url.lastCheckedAt
                            ? format(new Date(url.lastCheckedAt), 'MMM d, yyyy HH:mm')
                            : 'Never'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUrl(url)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUrl(url)}
                            className="flex items-center gap-1 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
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
        </CardContent>
      </Card>

      {/* Client Form Modal */}
      <ClientForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        client={client}
        mode="edit"
      />

      {/* URL Form Modal */}
      <UrlForm
        isOpen={isUrlFormOpen}
        onClose={handleCloseUrlForm}
        clientId={clientId}
        url={editingUrl}
        mode={editingUrl ? 'edit' : 'create'}
      />
    </div>
  );
}
