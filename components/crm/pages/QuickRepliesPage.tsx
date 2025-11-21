'use client';

import QuickRepliesView from '../functions/QuickRepliesView';
import { User } from '@/lib/types';

export default function QuickRepliesPage({ user }: { user: User | null }) {
  return <QuickRepliesView user={user} />;
}

