'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Globe, AlertCircle, Mail, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { ClientWithStats } from '@/types';

export interface ClientCardProps {
  client: ClientWithStats;
}

export const ClientCard: React.FC<ClientCardProps> = ({ client }) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/clients/${client.clientId}`);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>{client.clientName}</CardTitle>
              {client.companyName && (
                <p className="text-sm text-gray-500 mt-1">{client.companyName}</p>
              )}
            </div>
          </div>
          <Badge variant={client.isActive ? 'success' : 'secondary'}>
            {client.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Contact Info */}
          {(client.contactPerson || client.email) && (
            <div className="flex flex-col gap-2 pb-3 border-b border-gray-100">
              {client.contactPerson && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{client.contactPerson}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{client.email}</span>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">URLs</p>
                <p className="text-lg font-semibold text-gray-900">{client.urlCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                client.recentFailureCount > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}>
                <AlertCircle className={`w-4 h-4 ${
                  client.recentFailureCount > 0 ? 'text-red-600' : 'text-green-600'
                }`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Recent Failures</p>
                <p className={`text-lg font-semibold ${
                  client.recentFailureCount > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {client.recentFailureCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
