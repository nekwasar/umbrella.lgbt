'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, toApiError } from '@/lib/api';
import { useUser } from '@/components/public/UserProvider';
import { mdToText } from '@/lib/sanitize';

export const QUOTE_EVENT = 'forum-quote';

export function quoteDetail(author: string, bodyMd: string) {
  const excerpt = mdToText(bodyMd, 200);
  return { author, quoted: excerpt.split('\n').map((l) => `> ${l}`).join('\n') };
}

export function PostActions({
  topicId,
  postId,
  author,
  bodyMd
}: {
  topicId: string;
  postId: string;
  author: string;
  bodyMd: string;
}) {
  const { user } = useUser();
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);

  function jump(prefill: string) {
    window.dispatchEvent(new CustomEvent(QUOTE_EVENT, { detail: { prefill } }));
    document.getElementById('quick-reply')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function report() {
    if (busy || reported) return;
    setBusy(true);
    try {
      await api('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'FORUM_POST',
          targetId: postId,
          reason: `Reported from forum thread ${topicId} by ${user?.username ?? 'user'}`
        })
      });
      setReported(true);
    } catch {
      setBusy(false);
    }
  }

  return (
    <>
      {user ? (
        <button className="linklike" onClick={() => jump(`@${author} `)}>
          Reply
        </button>
      ) : (
        <Link href="/login">Reply</Link>
      )}
      <span aria-hidden="true"> · </span>
      {user ? (
        <button
          className="linklike"
          onClick={() => jump(`${quoteDetail(author, bodyMd).quoted}\n\n@${author} `)}
        >
          Quote
        </button>
      ) : (
        <Link href="/login">Quote</Link>
      )}
      <span aria-hidden="true"> · </span>
      {user ? (
        reported ? (
          <span className="meta">Reported — thanks</span>
        ) : (
          <button className="linklike" onClick={report} disabled={busy}>
            {busy ? 'Reporting…' : 'Report Topic'}
          </button>
        )
      ) : (
        <Link href="/login">Report Topic</Link>
      )}
    </>
  );
}
