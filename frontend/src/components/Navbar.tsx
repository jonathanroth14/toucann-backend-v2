'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    auth.clearToken();
    router.push('/login');
  };

  const isAuthenticated = auth.isAuthenticated();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Toucann
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  href="/admin/challenges"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Admin
                </Link>
                <Link
                  href="/student"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Student
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
