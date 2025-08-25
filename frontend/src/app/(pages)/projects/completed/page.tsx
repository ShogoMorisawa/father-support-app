'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RedirectCompleted() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/projects?tab=completed');
  }, [router]);
  return null;
}
