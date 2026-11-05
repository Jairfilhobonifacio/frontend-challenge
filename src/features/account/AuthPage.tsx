import React from 'react';
import type { CollectorUser } from '@/contracts/kronos.types';
import { ApiForm, type FormField } from './AccountForms';

export function AuthPage({ mode, onSuccess, onModeChange, onToast }: {
  mode: 'login' | 'register'; onSuccess: (user: CollectorUser | null) => Promise<void>;
  onModeChange: (mode: 'login' | 'register') => void; onToast: (message: string) => void;
}) {
  const register = mode === 'register';
  const fields: FormField[] = [
    ...(register ? [{ name: 'name', label: 'Nome', required: true, minLength: 2, autoComplete: 'name' }, { name: 'handle', label: 'Handle (@seu.nome)', required: true, pattern: '@[a-zA-Z0-9_.]{3,30}', autoComplete: 'username' }] : []),
    { name: 'email', label: 'E-mail', type: 'email', required: true, autoComplete: 'email' },
    { name: 'password', label: 'Senha', type: 'password', required: true, minLength: register ? 8 : 1, autoComplete: register ? 'new-password' : 'current-password' },
    ...(register ? [{ name: 'confirmPassword', label: 'Confirmar senha', type: 'password', required: true, minLength: 8, autoComplete: 'new-password' }] : [])
  ];
  return <section className="auth-layout"><div><span className="eyebrow">// IDENTIDADE DO COLECIONADOR</span><h1>{register ? 'Seu lugar no arquivo.' : 'Bem-vindo de volta.'}</h1><p className="muted">{register ? 'Crie sua conta para preservar favoritos, gerenciar carteiras e acompanhar suas aquisições.' : 'Entre para retomar sua seleção e consultar seus recibos.'}</p><div className="provenance-box"><strong>AMBIENTE DE DEMONSTRAÇÃO</strong><p>Use apenas dados fictícios.</p><p>Maya: maya@kronos.archive<br />Theo: theo@kronos.archive<br />Senha inicial: Kronos123!</p></div></div><div className="form-panel cut"><h2>{register ? 'Criar conta' : 'Entrar na conta'}</h2><ApiForm id={mode} fields={fields} endpoint={`/auth/${mode}`} submit={register ? 'Criar minha conta' : 'Entrar e continuar'} onSuccess={user => { onToast(register ? 'Conta criada. Sua seleção foi preservada.' : 'Sessão iniciada. Sua seleção foi preservada.'); void onSuccess(user); }} /><button className="btn auth-alternative" onClick={() => onModeChange(register ? 'login' : 'register')}>{register ? 'Já tenho conta' : 'Criar uma conta'}</button></div></section>;
}
