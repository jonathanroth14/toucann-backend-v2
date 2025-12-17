'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { auth } from '@/lib/auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const user = await authApi.getMe();
      if (!user.is_admin) {
        router.push('/student');
        return;
      }
      setIsAdmin(true);
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.clearToken();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-gray-900">Toucann Admin</h1>
              <div className="flex gap-1">
                <button
                  onClick={() => router.push('/admin/challenges')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    pathname?.startsWith('/admin/challenges')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Challenges
                </button>
                <button
                  onClick={() => router.push('/admin/goals')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    pathname?.startsWith('/admin/goals')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Goals
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/student')}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                View as Student
              </button>
              <button
                onClick={handleLogout}
                className="text-sm bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
