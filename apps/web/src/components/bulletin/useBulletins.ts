import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { BulletinListResponse } from '@/lib/types';

export function useBulletins(pageSize = 3) {
  const [items, setItems] = useState<BulletinListResponse['items']>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api<BulletinListResponse>(`/api/bulletins?pageSize=${pageSize}`);
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading };
}
