'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to challenges page by default
    router.push('/admin/challenges');
  }, [router]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to admin panel...</p>
      </div>
    </div>
  );
}
