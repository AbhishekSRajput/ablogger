'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Loader2 } from 'lucide-react';
import { clientsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ClientCard } from '@/components/clients/ClientCard';
import { ClientForm } from '@/components/clients/ClientForm';
import type { ClientWithStats } from '@/types';

export default function ClientsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: clients = [],
    isLoading,
    error,
  } = useQuery<ClientWithStats[]>({
    queryKey: ['clients'],
    queryFn: clientsApi.getClients,
  });

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }

    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.clientName.toLowerCase().includes(query) ||
        client.companyName?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.contactPerson?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      totalClients: clients.length,
      activeClients: clients.filter((c) => c.isActive).length,
      totalUrls: clients.reduce((sum, c) => sum + c.urlCount, 0),
      clientsWithFailures: clients.filter((c) => c.recentFailureCount > 0).length,
    };
  }, [clients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">
            Manage your clients and their monitored URLs
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-600">Total Clients</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalClients}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-600">Active Clients</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeClients}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-600">Total URLs</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalUrls}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-600">Clients with Failures</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {stats.clientsWithFailures}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients by name, company, email, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">
            Error loading clients: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && clients.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No clients yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by adding your first client to begin monitoring their URLs.
            </p>
            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Client
            </Button>
          </div>
        </div>
      )}

      {/* No Search Results */}
      {!isLoading && !error && clients.length > 0 && filteredClients.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-gray-600">
            No clients found matching &quot;{searchQuery}&quot;
          </p>
        </div>
      )}

      {/* Clients Grid */}
      {!isLoading && !error && filteredClients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <ClientCard key={client.clientId} client={client} />
          ))}
        </div>
      )}

      {/* Client Form Modal */}
      <ClientForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        mode="create"
      />
    </div>
  );
}
