'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/admin-api';
import { Admin } from '@/lib/types';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner
} from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/AdminShell';

export default function AdminsPage() {
  const { admin } = useAdmin();
  const isSuper = admin?.role === 'SUPER_ADMIN';

  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // create form
  const [cUsername, setCUsername] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cRole, setCRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');

  // own password form
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api<{ admins: Admin[] }>('/api/admin/admins');
      setAdmins(res.admins);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load admins');
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify({ username: cUsername, password: cPassword, role: cRole })
      });
      setCUsername('');
      setCPassword('');
      setCRole('ADMIN');
      setNotice(`Created admin @${cUsername}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(a: Admin) {
    if (!window.confirm(`Delete admin @${a.username}?`)) return;
    setError(null);
    try {
      await api(`/api/admin/admins/${a.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  async function onRole(a: Admin, role: 'ADMIN' | 'SUPER_ADMIN') {
    setError(null);
    try {
      await api(`/api/admin/admins/${a.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Role change failed');
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/api/admin/admins/${admin?.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
      });
      setCurPass('');
      setNewPass('');
      setNotice('Password updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Password change failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Admins" subtitle="Manage who can access this console." />

      {error ? <Banner kind="error" className="mb-4">{error}</Banner> : null}
      {notice ? <Banner kind="success" className="mb-4">{notice}</Banner> : null}

      {!admins ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-muted" />
        </div>
      ) : admins.length === 0 ? (
        <EmptyState>No admins.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-faint">
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-canvas/60">
                  <td className="px-4 py-3 font-semibold text-ink">@{a.username}</td>
                  <td className="px-4 py-3">
                    <Badge tone={a.role === 'SUPER_ADMIN' ? 'brand' : 'neutral'}>
                      {a.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : 'never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {isSuper && a.id !== admin?.id ? (
                        <>
                          <Button
                            variant="secondary"
                            className="px-3 py-1.5 text-xs"
                            onClick={() => onRole(a, a.role === 'SUPER_ADMIN' ? 'ADMIN' : 'SUPER_ADMIN')}
                          >
                            {a.role === 'SUPER_ADMIN' ? 'Demote' : 'Promote'}
                          </Button>
                          <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => onDelete(a)}>
                            Delete
                          </Button>
                        </>
                      ) : a.id === admin?.id ? (
                        <span className="text-xs text-faint">you</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {isSuper ? (
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">Create admin</h2>
            <form onSubmit={onCreate} className="space-y-4">
              <Field label="Username">
                <Input value={cUsername} onChange={(e) => setCUsername(e.target.value)} required autoComplete="off" />
              </Field>
              <Field label="Password" hint="At least 10 characters.">
                <Input type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} required autoComplete="new-password" />
              </Field>
              <Field label="Role">
                <Select value={cRole} onChange={(e) => setCRole(e.target.value as 'ADMIN' | 'SUPER_ADMIN')}>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super admin</option>
                </Select>
              </Field>
              <Button type="submit" loading={busy}>Create admin</Button>
            </form>
          </Card>
        ) : null}

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">Change my password</h2>
          <form onSubmit={onChangePassword} className="space-y-4">
            <Field label="Current password">
              <Input type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} required autoComplete="current-password" />
            </Field>
            <Field label="New password" hint="At least 10 characters.">
              <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required autoComplete="new-password" />
            </Field>
            <Button type="submit" loading={busy}>Update password</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
