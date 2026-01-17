'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Users,
  Globe,
  AlertTriangle,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays } from 'date-fns';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [activeDateRange, setActiveDateRange] = useState(dateRange);

  // Fetch analytics data
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.getOverview,
  });

  const { data: trends = [], isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics', 'trends', 30],
    queryFn: () => analyticsApi.getTrends(30),
  });

  const { data: browserData = [], isLoading: browserLoading } = useQuery({
    queryKey: ['analytics', 'by-browser'],
    queryFn: analyticsApi.getByBrowser,
  });

  const { data: clientData = [], isLoading: clientLoading } = useQuery({
    queryKey: ['analytics', 'by-client'],
    queryFn: analyticsApi.getByClient,
  });

  const { data: errorTypeData = [], isLoading: errorTypeLoading } = useQuery({
    queryKey: ['analytics', 'by-error-type'],
    queryFn: analyticsApi.getByErrorType,
  });

  const { data: topErrors = [], isLoading: topErrorsLoading } = useQuery({
    queryKey: ['analytics', 'top-errors', 10],
    queryFn: () => analyticsApi.getTopErrors(10),
  });

  const handleApplyDateRange = () => {
    setActiveDateRange(dateRange);
    // In a real implementation, this would refetch data with the new date range
  };

  const isLoading =
    overviewLoading ||
    trendsLoading ||
    browserLoading ||
    clientLoading ||
    errorTypeLoading ||
    topErrorsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Format data for charts
  const trendChartData = trends.map((item) => ({
    date: format(new Date(item.date), 'MMM dd'),
    failures: item.count,
  }));

  const browserChartData = browserData.map((item) => ({
    name: item.label,
    count: item.count,
  }));

  const clientChartData = clientData.slice(0, 10).map((item) => ({
    name: item.label.length > 20 ? item.label.substring(0, 20) + '...' : item.label,
    count: item.count,
  }));

  const errorTypePieData = errorTypeData.map((item) => ({
    name: item.label,
    value: item.count,
  }));

  const statsCards = [
    {
      title: 'Total Clients',
      value: overview?.totalClients || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total URLs',
      value: overview?.totalUrls || 0,
      icon: Globe,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Failures (7 days)',
      value: overview?.failuresLast7Days || 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Failures (30 days)',
      value: overview?.failuresLast30Days || 0,
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights and failure trends
          </p>
        </div>

        {/* Date Range Selector */}
        <Card className="w-auto">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                className="w-36"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                className="w-36"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyDateRange}
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Failure Trends Line Chart */}
      {trendChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failure Trends (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="failures"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Failures"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Browser Breakdown Bar Chart */}
        {browserChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Failures by Browser</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={browserChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" name="Failures" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Breakdown Bar Chart */}
        {clientChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Clients by Failures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" name="Failures" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Error Type Pie Chart */}
      {errorTypePieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failures by Error Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={errorTypePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {errorTypePieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Error Messages Table */}
        {topErrors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Error Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Error Message
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topErrors.map((error, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          <div className="max-w-md truncate" title={error.label}>
                            {error.label}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                          {error.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Most Problematic Clients Table */}
        {clientData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Most Problematic Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Client
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Failures
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientData.slice(0, 10).map((client, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          <div className="max-w-md truncate" title={client.label}>
                            {client.label}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                          {client.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Failures by Status */}
      {overview?.failuresByStatus && overview.failuresByStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failures by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.failuresByStatus.map((item) => {
                const total = overview.failuresByStatus.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? (item.count / total) * 100 : 0;

                const statusColors: Record<string, string> = {
                  new: 'bg-red-500',
                  acknowledged: 'bg-yellow-500',
                  investigating: 'bg-blue-500',
                  resolved: 'bg-green-500',
                  ignored: 'bg-gray-500',
                };

                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {item.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {item.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${statusColors[item.status] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
