import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { DepotSettings } from '../../types';
import { normalizeStaffUsername, isSyntheticStaffEmail } from '../../services/firebaseDbService';
import {
  Store,
  Truck,
  ShieldAlert,
  Save,
  RotateCcw,
  Key,
  Eye,
  EyeOff,
  Cloud,
  CloudOff,
  UploadCloud,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Lock,
  Unlock,
  ExternalLink,
} from 'lucide-react';

export const ConfiguracoesPDV: React.FC = () => {
  const {
    settings,
    updateSettings,
    motoboys,
    updateMotoboy,
    soundEnabled,
    toggleSound,
    resetAllData,
    cloudUser,
    cloudRoleStatus,
    cloudSyncing,
    cloudSyncError,
    staffAccounts,
    connectCloudGoogle,
    disconnectCloudGoogle,
    releaseCloudStoreOwnership,
    syncAllLocalToCloudNow,
    createCloudStaffUser,
    toggleCloudStaffUserActive,
    deleteCloudStaffUser,
  } = useBeverage();

  const [formData, setFormData] = useState<DepotSettings>({
    ...settings,
    ownerPassword: settings.ownerPassword || '123',
    balcaoPassword: settings.balcaoPassword || '123',
    motoboyDefaultPassword: settings.motoboyDefaultPassword || '123',
    staffEmails: settings.staffEmails || [],
  });
  const [motoboyPasswords, setMotoboyPasswords] = useState<Record<string, string>>(() =>
    Object.fromEntries(motoboys.map((m) => [m.id, m.accessPassword || '']))
  );
  const [showPasswords, setShowPasswords] = useState(false);

  // Criação em tempo real de Usuários na Nuvem (Balcão & Motoboy sem Google)
  const [staffRole, setStaffRole] = useState<'BALCAO' | 'MOTOBOY'>('BALCAO');
  const [staffDisplayName, setStaffDisplayName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showNewStaffPass, setShowNewStaffPass] = useState(false);
  const [staffMotoboyId, setStaffMotoboyId] = useState('');
  const [staffCreateError, setStaffCreateError] = useState<string | null>(null);
  const [needsEmailPassProvider, setNeedsEmailPassProvider] = useState(false);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);

  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [staffEmailError, setStaffEmailError] = useState<string | null>(null);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [confirmReleaseOwnership, setConfirmReleaseOwnership] = useState(false);

  const normalizedNewUsername = normalizeStaffUsername(staffUsername);
  const isCloudConnected = Boolean(
    cloudUser && (cloudUser.emailVerified || isSyntheticStaffEmail(cloudUser.email))
  );

  const staffEmailsList = settings.staffEmails || [];
  const activeOwnerEmailLower = (
    (cloudRoleStatus.isOwner ? cloudUser?.email : '') ||
    settings.ownerEmail ||
    ''
  )
    .trim()
    .toLowerCase();

  const handleAddStaffEmail = () => {
    setStaffEmailError(null);
    const clean = newStaffEmail.trim().toLowerCase();
    if (!clean || !/^[^\s/]+@[^\s/]+\.[^\s/]+$/.test(clean)) {
      setStaffEmailError('Digite um e-mail Gmail/Google válido (ex: motoboy@gmail.com).');
      return;
    }
    if (activeOwnerEmailLower && clean === activeOwnerEmailLower) {
      setStaffEmailError(
        `O e-mail do Dono (${activeOwnerEmailLower}) já tem acesso total permanente.`
      );
      return;
    }
    if (staffEmailsList.includes(clean)) {
      setStaffEmailError('Este e-mail já está na lista da equipe.');
      return;
    }
    if (staffEmailsList.length >= 10) {
      setStaffEmailError('Limite máximo de 10 e-mails adicionais de equipe atingido.');
      return;
    }
    const nextList = [...staffEmailsList, clean];
    setFormData((prev) => ({ ...prev, staffEmails: nextList }));
    updateSettings({ staffEmails: nextList });
    setNewStaffEmail('');
  };

  const handleRemoveStaffEmail = (emailToRemove: string) => {
    const nextList = staffEmailsList.filter((e) => e !== emailToRemove);
    setFormData((prev) => ({ ...prev, staffEmails: nextList }));
    updateSettings({ staffEmails: nextList });
  };

  const handleCreateCloudStaff = async () => {
    setStaffCreateError(null);
    setNeedsEmailPassProvider(false);

    if (!cloudRoleStatus.isOwner) {
      setStaffCreateError('Conecte a conta Google do Dono acima para criar usuários da equipe.');
      return;
    }
    if (normalizedNewUsername.length < 3) {
      setStaffCreateError('Digite um usuário com pelo menos 3 letras ou números (ex: joao ou caixa1).');
      return;
    }
    if (staffPassword.trim().length < 6) {
      setStaffCreateError('A senha na nuvem precisa ter pelo menos 6 caracteres.');
      return;
    }

    const res = await createCloudStaffUser({
      username: normalizedNewUsername,
      displayName: staffDisplayName.trim() || normalizedNewUsername,
      password: staffPassword.trim(),
      role: staffRole,
      motoboyId: staffRole === 'MOTOBOY' && staffMotoboyId ? staffMotoboyId : undefined,
    });

    if (!res.success) {
      if (res.error === 'AUTH_EMAIL_PASSWORD_DISABLED') {
        setNeedsEmailPassProvider(true);
        setStaffCreateError(
          'Ative o provedor E-mail/senha no Firebase Console para criar usuários de Balcão e Motoboy sem Google.'
        );
      } else {
        setStaffCreateError(res.error || 'Erro ao criar usuário na nuvem.');
      }
      return;
    }

    if (staffRole === 'MOTOBOY' && staffMotoboyId) {
      updateMotoboy(staffMotoboyId, { cloudUsername: normalizedNewUsername });
    }

    setStaffDisplayName('');
    setStaffUsername('');
    setStaffPassword('');
    setStaffMotoboyId('');
  };

  const handleUploadAllToCloud = async () => {
    setUploadStatusMsg(null);
    const res = await syncAllLocalToCloudNow();
    if (res.success) {
      setUploadStatusMsg(`✅ Sincronização concluída! ${res.uploadedCount || 0} itens enviados para a nuvem.`);
    } else {
      setUploadStatusMsg(res.error || 'Erro ao enviar dados para a nuvem.');
    }
  };

  const handleChange = (field: keyof DepotSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...formData,
      staffEmails: settings.staffEmails || [],
      ownerPassword: (formData.ownerPassword || '123').trim() || '123',
      balcaoPassword: (formData.balcaoPassword || '123').trim() || '123',
      motoboyDefaultPassword: (formData.motoboyDefaultPassword || '123').trim() || '123',
      cancelPassword: (formData.cancelPassword || '123').trim() || '123',
    });
    motoboys.forEach((m) => {
      const nextPass = (motoboyPasswords[m.id] || '').trim();
      if ((m.accessPassword || '') !== nextPass) {
        updateMotoboy(m.id, { accessPassword: nextPass || undefined });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-5 rounded-3xl border border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Painel Administrativo
          </span>
          <h2 className="text-lg font-black text-white mt-0.5">
            Configurações Globais do PDV & Delivery
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personalize os dados cadastrais da loja, taxas de entrega, comissão de motoboys e regras de venda.
          </p>
        </div>

        <button
          onClick={resetAllData}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold border border-slate-700 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Padrões</span>
        </button>
      </div>

      {/* PAINEL DE SINCRONIZAÇÃO NA NUVEM (PC + MOTOBOY + APP CLIENTE) */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/35 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isCloudConnected && (cloudRoleStatus.isOwner || cloudRoleStatus.isAuthorizedStaff)
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isCloudConnected ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                Sincronização Completa na Nuvem (PC · Motoboy · Cliente)
              </h3>
              {isCloudConnected ? (
                <p className="text-xs text-slate-300 mt-1">
                  Conectado como{' '}
                  <strong className="text-white">
                    {isSyntheticStaffEmail(cloudUser?.email)
                      ? `@${cloudRoleStatus.staffUsername}`
                      : cloudUser?.email}
                  </strong>{' '}
                  {cloudRoleStatus.isOwner ? (
                    <span className="text-emerald-400 font-bold">(Dono Principal)</span>
                  ) : cloudRoleStatus.isAuthorizedStaff ? (
                    <span className="text-cyan-400 font-bold">(Equipe Autorizada)</span>
                  ) : (
                    <span className="text-rose-400 font-bold">(Sem Permissão na Loja)</span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  Conecte com <strong className="text-white">qualquer conta Google/Gmail do Dono</strong> neste PC para ativar a nuvem e criar usuários do Balcão e Motoboys.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isCloudConnected ? (
              <>
                {!isSyntheticStaffEmail(cloudUser?.email) && (
                  <button
                    type="button"
                    disabled={cloudSyncing}
                    onClick={() => void connectCloudGoogle()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 cursor-pointer"
                  >
                    Trocar Conta Google
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void disconnectCloudGoogle()}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-bold text-rose-300 border border-rose-500/30 cursor-pointer"
                >
                  Sair da Nuvem
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={cloudSyncing}
                onClick={() => void connectCloudGoogle()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                <span>{cloudSyncing ? 'Conectando...' : 'Conectar Google do Dono'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Opção para transferir/liberar titularidade da loja na nuvem para outro Google */}
        {cloudUser?.emailVerified && cloudRoleStatus.isOwner && (
          <div className="px-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400">
              Precisa passar o controle principal de Dono da loja para outro Gmail?
            </p>
            {!confirmReleaseOwnership ? (
              <button
                type="button"
                disabled={cloudSyncing}
                onClick={() => setConfirmReleaseOwnership(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-bold text-amber-300 border border-amber-500/30 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                Liberar Loja para Outro E-mail
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={cloudSyncing}
                  onClick={() => {
                    setConfirmReleaseOwnership(false);
                    void releaseCloudStoreOwnership();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-[11px] font-black text-slate-950 cursor-pointer"
                >
                  Confirmar Liberação
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReleaseOwnership(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* CRIAR USUÁRIOS DO BALCÃO E MOTOBOYS EM TEMPO REAL (SEM PRECISAR DE GOOGLE) */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                Usuários do Balcão e Motoboys em Tempo Real (Sem Google)
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Crie aqui usuário e senha para seus funcionários e entregadores entrarem direto de qualquer celular ou PC sem precisar de conta Google.
              </span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 self-start sm:self-auto">
              {staffAccounts.filter((a) => a.active).length}/20 ativos
            </span>
          </div>

          {!cloudRoleStatus.isOwner ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              Conecte sua conta Google de Dono no botão verde acima para criar, bloquear ou excluir usuários da equipe na nuvem.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Cargo / Tipo de Acesso
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as 'BALCAO' | 'MOTOBOY';
                      setStaffRole(nextRole);
                      if (nextRole === 'BALCAO') setStaffMotoboyId('');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                  >
                    <option value="BALCAO">Operador de Balcão / Caixa</option>
                    <option value="MOTOBOY">Entregador / Motoboy</option>
                  </select>
                </div>

                {staffRole === 'MOTOBOY' && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Vincular ao Motoboy (Opcional)
                    </label>
                    <select
                      value={staffMotoboyId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setStaffMotoboyId(selectedId);
                        const boy = motoboys.find((m) => m.id === selectedId);
                        if (boy && !staffDisplayName.trim()) {
                          setStaffDisplayName(boy.name);
                        }
                        if (boy && !staffUsername.trim()) {
                          setStaffUsername(normalizeStaffUsername(boy.name.split(' ')[0] || ''));
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                    >
                      <option value="">-- Geral / Sem vínculo fixo --</option>
                      {motoboys.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.vehiclePlate})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Nome do Funcionário
                  </label>
                  <input
                    type="text"
                    value={staffDisplayName}
                    onChange={(e) => setStaffDisplayName(e.target.value)}
                    placeholder="Ex: João Caixa ou Lucas Moto"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Usuário para Login *
                  </label>
                  <input
                    type="text"
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    placeholder="Ex: joao ou balcao2"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                  />
                  {normalizedNewUsername && (
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      Entrará digitando: @{normalizedNewUsername}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Senha (mín. 6 caracteres) *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewStaffPass ? 'text' : 'password'}
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Mínimo 6 dígitos"
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewStaffPass((prev) => !prev)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                      aria-label="Mostrar senha"
                    >
                      {showNewStaffPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={cloudSyncing}
                    onClick={() => void handleCreateCloudStaff()}
                    className="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{cloudSyncing ? 'Criando...' : 'Criar Usuário na Nuvem'}</span>
                  </button>
                </div>
              </div>

              {staffCreateError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-2">
                  <p className="font-semibold">{staffCreateError}</p>
                  {needsEmailPassProvider && (
                    <div className="text-[11px] text-amber-200 space-y-1.5 bg-slate-900/80 p-3 rounded-lg border border-amber-500/30">
                      <p className="font-bold text-amber-300">
                        Passo único de 15 segundos no Firebase Console:
                      </p>
                      <p>
                        1. Abra o link abaixo → clique em <strong>E-mail/senha</strong> → ative a chave <strong>Ativar</strong> → clique em <strong>Salvar</strong>.
                      </p>
                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0134490732/authentication/providers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-black hover:bg-amber-400"
                      >
                        <span>Abrir Firebase Authentication → Sign-in method</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Lista em tempo real dos usuários criados */}
              {staffAccounts.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic pt-1">
                  Nenhum usuário de Balcão ou Motoboy criado ainda. Crie o primeiro acima em segundos!
                </p>
              ) : (
                <div className="space-y-2 pt-2">
                  {staffAccounts.map((acc) => {
                    const linkedBoy = acc.motoboyId
                      ? motoboys.find((m) => m.id === acc.motoboyId)
                      : undefined;
                    return (
                      <div
                        key={acc.uid}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          acc.active
                            ? 'bg-slate-900 border-slate-800'
                            : 'bg-slate-900/40 border-rose-500/30 opacity-80'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-extrabold text-white">
                              {acc.displayName}
                            </span>
                            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              @{acc.username}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                acc.role === 'MOTOBOY'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {acc.role === 'MOTOBOY' ? 'Motoboy' : 'Balcão'}
                            </span>
                            {!acc.active && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                                Bloqueado
                              </span>
                            )}
                          </div>
                          {linkedBoy && (
                            <p className="text-[11px] text-slate-400">
                              Vinculado à moto: {linkedBoy.name} ({linkedBoy.vehiclePlate})
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => void toggleCloudStaffUserActive(acc.uid, !acc.active)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer border ${
                              acc.active
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {acc.active ? (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Bloquear</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Reativar</span>
                              </>
                            )}
                          </button>

                          {confirmDeleteUid === acc.uid ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteUid(null);
                                  void deleteCloudStaffUser(acc.uid);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-[11px] font-black cursor-pointer"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteUid(null)}
                                className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteUid(acc.uid)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 cursor-pointer"
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload completo do catálogo local para nuvem */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-white block">
              Enviar Catálogo, Fotos, Motoboys, Mesas e Caixa para a Nuvem
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Use este botão se acabou de editar produtos/fotos neste PC e quer garantir que todos os celulares recebam tudo na hora.
            </span>
            {uploadStatusMsg && (
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {uploadStatusMsg}
              </span>
            )}
            {cloudSyncError && (
              <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1 mt-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {cloudSyncError}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={cloudSyncing || !cloudRoleStatus.isOwner}
            onClick={() => void handleUploadAllToCloud()}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shrink-0 transition-colors ${
              cloudRoleStatus.isOwner
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <UploadCloud className={`w-4 h-4 ${cloudSyncing ? 'animate-bounce' : ''}`} />
            <span>{cloudSyncing ? 'Enviando...' : 'Enviar Tudo para a Nuvem Agora'}</span>
          </button>
        </div>

        {/* Opcional: Equipe autorizada via Gmail */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div>
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Opcional: Autorizar Equipe por E-mail Google (Gmail)
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Caso algum gerente ou entregador prefira entrar usando o próprio Gmail em vez de Usuário e Senha.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={newStaffEmail}
              onChange={(e) => setNewStaffEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddStaffEmail();
                }
              }}
              placeholder="Ex: motoboyjoao@gmail.com ou balcao@gmail.com"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={handleAddStaffEmail}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Autorizar E-mail</span>
            </button>
          </div>

          {staffEmailError && (
            <p className="text-[11px] text-rose-400 font-semibold">{staffEmailError}</p>
          )}

          {staffEmailsList.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic">
              Nenhum e-mail adicional cadastrado além do Dono conectado na nuvem
              {activeOwnerEmailLower ? ` (${activeOwnerEmailLower})` : ''}.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {staffEmailsList.map((email) => (
                <div
                  key={email}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-slate-200"
                >
                  <span className="font-semibold">{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStaffEmail(email)}
                    className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remover autorização"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. DADOS DA EMPRESA / DEPÓSITO */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Store className="w-4 h-4" /> 1. Informações do Estabelecimento & Cupom Fiscal
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Nome Comercial do Depósito
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                CNPJ (Exibido no Cupom)
              </label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => handleChange('cnpj', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                WhatsApp / Telefone de Contato
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Ex: Rua Principal, 100"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Bairro / Região de Entrega
              </label>
              <input
                type="text"
                value={formData.neighborhood}
                onChange={(e) => handleChange('neighborhood', e.target.value)}
                placeholder="Ex: Campo Grande, Centro, etc."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Cidade - UF
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Ex: Rio de Janeiro - RJ"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">
                WhatsApp do Dono (Receber Fechamento de Caixa)
              </label>
              <input
                type="text"
                value={formData.ownerWhatsApp || '5521979474405'}
                onChange={(e) => handleChange('ownerWhatsApp', e.target.value)}
                placeholder="Ex: 5521979474405"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">
                E-mail do Dono (Enviar Relatórios PDF)
              </label>
              <input
                type="email"
                value={formData.ownerEmail || ''}
                onChange={(e) => handleChange('ownerEmail', e.target.value)}
                placeholder="seuemail@gmail.com"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* 2. REGRAS DE DELIVERY & LOGÍSTICA */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Truck className="w-4 h-4" /> 2. Taxas & Prazos do Delivery Express
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Taxa Padrão de Entrega (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  required
                  value={formData.defaultDeliveryFee}
                  onChange={(e) => handleChange('defaultDeliveryFee', parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Comissão do Motoboy por Corrida (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  required
                  value={formData.motoboyCommission}
                  onChange={(e) => handleChange('motoboyCommission', parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Tempo Estimado de Entrega (Minutos)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  value={formData.minDeliveryMinutes}
                  onChange={(e) => handleChange('minDeliveryMinutes', parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white text-center font-bold"
                />
                <span className="text-slate-500 text-xs font-bold">a</span>
                <input
                  type="number"
                  min="10"
                  value={formData.maxDeliveryMinutes}
                  onChange={(e) => handleChange('maxDeliveryMinutes', parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white text-center font-bold"
                />
                <span className="text-slate-400 text-xs">min</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. REGRAS DE OPERAÇÃO DO PDV */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> 3. Políticas de Estoque & Automação
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-bold text-white block">
                  Permitir Venda com Estoque Negativo
                </span>
                <span className="text-[11px] text-slate-400">
                  Se ativado, permite lançar vendas no balcão mesmo se o sistema marcar saldo zero (para posterior acerto de estoque).
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.allowNegativeStock}
                onChange={(e) => handleChange('allowNegativeStock', e.target.checked)}
                className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-bold text-white block">
                  Alerta Sonoro de Pedidos (Web Audio)
                </span>
                <span className="text-[11px] text-slate-400">
                  Toca carrilhão polyphonic de novo pedido imediatamente ao chegar ordem no delivery.
                </span>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={toggleSound}
                className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-bold text-white block">
                  Exibir Modal de Impressão de Cupom
                </span>
                <span className="text-[11px] text-slate-400">
                  Abre automaticamente a prévia do ticket do cliente após finalizar a venda no balcão.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.autoPrintReceipt}
                onChange={(e) => handleChange('autoPrintReceipt', e.target.checked)}
                className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
              />
            </label>

            {/* 4. SENHAS DE ACESSO DA EQUIPE (DONO, BALCÃO, ENTREGADORES E CANCELAMENTO) */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/35 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Key className="w-4 h-4" />
                    Senhas de Acesso (Dono, Balcão e Entregadores)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Altere a sua senha de acesso, a senha dos operadores de balcão, entregadores e cancelamento.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Ocultar Senhas' : 'Mostrar Senhas'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-amber-300 block mb-1">
                    Senha do Dono (Seu Login)
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    value={formData.ownerPassword || ''}
                    onChange={(e) => handleChange('ownerPassword', e.target.value)}
                    placeholder="Senha do Dono"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-cyan-300 block mb-1">
                    Senha do Balcão (Atendentes / Caixa)
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    value={formData.balcaoPassword || ''}
                    onChange={(e) => handleChange('balcaoPassword', e.target.value)}
                    placeholder="Senha do Balcão"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-emerald-300 block mb-1">
                    Senha Padrão dos Entregadores
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    value={formData.motoboyDefaultPassword || ''}
                    onChange={(e) => handleChange('motoboyDefaultPassword', e.target.value)}
                    placeholder="Senha padrão motoboys"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-rose-300 block mb-1">
                    Senha para Cancelar Venda / Cupom
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    value={formData.cancelPassword || ''}
                    onChange={(e) => handleChange('cancelPassword', e.target.value)}
                    placeholder="Senha de cancelamento"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Senha Individual por Entregador */}
              {motoboys.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-300 block">
                    Senha Individual por Entregador (opcional — se vazio, usa a senha padrão acima):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {motoboys.map((m) => (
                      <div key={m.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-white block truncate">
                          {m.name}
                        </label>
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={motoboyPasswords[m.id] ?? ''}
                          onChange={(e) =>
                            setMotoboyPasswords((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          placeholder={`Padrão (${formData.motoboyDefaultPassword || '123'})`}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Save className="w-5 h-5" />
            <span>Salvar Todas as Configurações do Sistema</span>
          </button>
        </div>
      </form>
    </div>
  );
};
