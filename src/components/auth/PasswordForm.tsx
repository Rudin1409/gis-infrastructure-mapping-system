'use client';

import { FormEvent, useState } from 'react';

export default function PasswordForm() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (values.get('newPassword') !== values.get('confirmation')) {
      setMessage('Konfirmasi password belum sama.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: values.get('currentPassword'),
          newPassword: values.get('newPassword'),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Password belum berhasil diubah.');
      form.reset();
      setMessage(
        'Password berhasil diubah. Sesi perangkat lain berakhir; draf survei tetap tersimpan.'
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Koneksi terputus. Coba lagi saat online.'
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer font-semibold">Ubah password</summary>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <p className="text-sm text-slate-600">
          Gunakan frasa sandi minimal 15 karakter. Perubahan memerlukan koneksi internet.
        </p>
        {(['currentPassword', 'newPassword', 'confirmation'] as const).map((name, index) => (
          <label key={name} className="block text-sm">
            {['Password saat ini', 'Password baru', 'Ulangi password baru'][index]}
            <input
              className="mt-1 block w-full rounded-lg border p-2"
              name={name}
              type="password"
              required
              minLength={index ? 15 : 1}
              maxLength={index ? 128 : 256}
              autoComplete={index ? 'new-password' : 'current-password'}
            />
          </label>
        ))}
        <button
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Menyimpan…' : 'Simpan password'}
        </button>
        <p role="status" className="text-sm">
          {message}
        </p>
      </form>
    </details>
  );
}
