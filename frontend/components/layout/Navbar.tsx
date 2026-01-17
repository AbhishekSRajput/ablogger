'use client';

import { useState, useEffect } from 'react';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { logout, getToken } from '@/lib/auth';

export function Navbar() {
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    // Decode JWT to get username
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsername(payload.username || 'Admin');
      } catch (error) {
        setUsername('Admin');
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-800">
            A/B Test Failure Monitoring
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <User className="w-5 h-5" />
            <span className="font-medium">{username}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
