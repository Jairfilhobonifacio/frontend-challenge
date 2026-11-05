import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { errorMessage } from '@/lib/errors';
import type { CollectorUser } from '@/contracts/kronos.types';

export interface FormField {
  name: string; label: string; value?: string; type?: string; required?: boolean; minLength?: number; pattern?: string;
  autoComplete?: string; options?: string[]; checked?: boolean;
}
export function ApiForm({ id, fields, endpoint, method = 'post', submit, onSuccess, children }: {
  id: string; fields: FormField[]; endpoint: string; method?: 'post' | 'patch'; submit: string;
  onSuccess: (user: CollectorUser | null) => void; children?: React.ReactNode;
}) {
  const [avatar, setAvatar] = useState<string>();
  const [fileError, setFileError] = useState('');
  const mutation = useMutation({ mutationFn: async (body: Record<string, unknown>) => (await apiClient.request<{ user: CollectorUser | null }>({ url: endpoint, method, data: body })).data.user });
  const errors = (mutation.error as { response?: { data?: { fields?: Record<string, string> } } })?.response?.data?.fields || {};
  return <form aria-label={submit} onSubmit={async event => {
    event.preventDefault(); if (mutation.isPending || fileError) return;
    const form = event.currentTarget;
    const body: Record<string, unknown> = Object.fromEntries(new FormData(form));
    for (const f of fields) if (f.type === 'checkbox') body[f.name] = (form.elements.namedItem(f.name) as HTMLInputElement | null)?.checked === true;
    if (avatar !== undefined) body.avatarUrl = avatar;
    try { const user = await mutation.mutateAsync(body); onSuccess(user); if (endpoint.includes('password') || method === 'post' && endpoint === '/wallets') form.reset(); } catch { /* inline API errors */ }
  }}>
    {fields.map(f => {
      const inputId = `${id}-${f.name}`, errId = `${inputId}-error`;
      return <div className="field-group" key={f.name}>
        <label htmlFor={inputId}>{f.label}</label>
        {f.options ? <select className="field-input" id={inputId} name={f.name} defaultValue={f.value} aria-invalid={!!errors[f.name]} aria-describedby={errors[f.name] ? errId : undefined}>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select> : <input className={f.type === 'checkbox' ? '' : 'field-input'} id={inputId} name={f.name} type={f.type || 'text'} defaultValue={f.value} defaultChecked={f.checked} required={f.required} minLength={f.minLength} pattern={f.pattern} autoComplete={f.autoComplete || 'off'} aria-invalid={!!errors[f.name]} aria-describedby={errors[f.name] ? errId : undefined} />}
        {errors[f.name] && <p className="field-error" id={errId}>{errors[f.name]}</p>}
      </div>;
    })}
    {endpoint === '/profile' && <div className="field-group"><label htmlFor={`${id}-avatar`}>Avatar · PNG, JPEG ou WebP · até 500 KB</label><input id={`${id}-avatar`} type="file" accept="image/png,image/jpeg,image/webp" aria-describedby={`${id}-avatar-error`} onChange={async e => {
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size > 500000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setFileError('Selecione PNG, JPEG ou WebP de até 500 KB.'); return; }
      setFileError('');
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      setAvatar(data);
    }} /><p className="field-error" id={`${id}-avatar-error`}>{fileError || errors.avatarUrl}</p><button className="btn" type="button" onClick={() => { setAvatar(''); setFileError(''); }}>Remover avatar</button></div>}
    {children}
    {mutation.isError && <p className="field-error" role="alert">{errorMessage(mutation.error)}</p>}
    <button className="btn primary" type="submit" disabled={mutation.isPending || !!fileError}>{mutation.isPending ? 'Salvando…' : submit}</button>
  </form>;
}
