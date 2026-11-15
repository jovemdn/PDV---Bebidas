import React, { useRef, useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { isSyntheticStaffEmail } from '../../services/firebaseDbService';
import {
  Store,
  Key,
  User,
  Unlock,
  ArrowRight,
  MapPin,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  Truck,
  Crown,
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const PortalLogin: React.FC = () => {
  const {
    loginAsEmployee,
    loginWithCloudUsername,
    loginAsQuickRole,
    settings,
    cashShift,
    motoboys,
    cloudUser,
    cloudRoleStatus,
    cloudSyncing,
    cloudSyncError,
    connectCloudGoogle,
    disconnectCloudGoogle,
  } = useBeverage();

  const ownerDefaultIs123 = (settings.ownerPassword || '123') === '123';
  const [username, setUsername] = useState('dono');
  const [password, setPassword] = useState(ownerDefaultIs123 ? '123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedMotoboyId, setSelectedMotoboyId] = useState(motoboys[0]?.id || 'moto-1');
  const [formError, setFormError] = useState<string | null>(null);
  const [needsEmailPassProvider, setNeedsEmailPassProvider] = useState(false);
  const [rolePrompt, setRolePrompt] = useState<string | null>(null);

  // Prompt de senha inline direto no cartão clicado (quando a senha foi alterada pelo Dono)
  const [inlineAuthRole, setInlineAuthRole] = useState<'DONO' | 'BALCAO' | 'MOTOBOY' | null>(null);
  const [inlinePassword, setInlinePassword] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const activeMotoboy = motoboys.find((m) => m.id === selectedMotoboyId) || motoboys[0];
  const effectiveMotoboyId = activeMotoboy?.id || 'moto-1';

  const isStaffSynthetic = isSyntheticStaffEmail(cloudUser?.email);
  const hasVerifiedCloudSession = Boolean(cloudUser && (cloudUser.emailVerified || isStaffSynthetic));

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setRolePrompt(null);
    setNeedsEmailPassProvider(false);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const isOwnerAlias =
      cleanUser === 'dono' ||
      cleanUser === 'admin' ||
      cleanUser.includes('gerente') ||
      cleanUser === 'proprietario';

    if (!isOwnerAlias && cleanPass.length >= 6) {
      const cloudRes = await loginWithCloudUsername(username, password);
      if (cloudRes.success) return;

      if (cloudRes.error === 'AUTH_EMAIL_PASSWORD_DISABLED') {
        setNeedsEmailPassProvider(true);
        setFormError(
          cloudRes.message ||
            'Ative o método E-mail/senha no Firebase Console para liberar login sem Google.'
        );
        return;
      }

      const isExplicitLocalFallback =
        cleanUser === 'balcao' ||
        cleanUser === 'motoboy' ||
        motoboys.some((m) => m.name.toLowerCase().includes(cleanUser));

      if (isExplicitLocalFallback) {
        const localRes = loginAsEmployee(username, password, effectiveMotoboyId);
        if (localRes.success) return;
      }

      setFormError(cloudRes.message || 'Usuário ou senha inválidos na nuvem.');
      return;
    }

    const res = loginAsEmployee(username, password, effectiveMotoboyId);
    if (!res.success) {
      setFormError(res.message || 'Credenciais inválidas.');
    }
  };

  const handleInlineRoleSubmit = (e: React.FormEvent, role: 'DONO' | 'BALCAO' | 'MOTOBOY') => {
    e.preventDefault();
    setInlineError(null);
    const targetUser =
      role === 'DONO' ? 'dono' : role === 'BALCAO' ? 'balcao' : activeMotoboy?.name || 'motoboy';
    const res = loginAsEmployee(targetUser, inlinePassword, effectiveMotoboyId);
    if (!res.success) {
      setInlineError(res.message || 'Senha incorreta.');
    }
  };

  const handleQuickRoleSelect = (role: 'DONO' | 'BALCAO' | 'MOTOBOY') => {
    setFormError(null);
    setRolePrompt(null);
    setInlineError(null);
    setNeedsEmailPassProvider(false);

    if (role === 'DONO') {
      const expected = (settings.ownerPassword || '123').trim();
      if (expected === '123') {
        loginAsQuickRole('DONO');
        return;
      }
      setUsername('dono');
      setPassword('');
      setInlineAuthRole('DONO');
      setInlinePassword('');
      setRolePrompt('Digite a senha do Dono para entrar.');
      return;
    }

    if (role === 'BALCAO') {
      const expected = (settings.balcaoPassword || '123').trim();
      if (expected === '123') {
        loginAsQuickRole('BALCAO');
        return;
      }
      setUsername('balcao');
      setPassword('');
      setInlineAuthRole('BALCAO');
      setInlinePassword('');
      setRolePrompt('Digite a senha do Balcão para entrar.');
      return;
    }

    const expectedMoto = (
      activeMotoboy?.accessPassword ||
      settings.motoboyDefaultPassword ||
      '123'
    ).trim();
    if (expectedMoto === '123') {
      loginAsQuickRole('MOTOBOY', effectiveMotoboyId);
      return;
    }
    setUsername(activeMotoboy?.name || 'motoboy');
    setPassword('');
    setInlineAuthRole('MOTOBOY');
    setInlinePassword('');
    setRolePrompt(`Digite a senha de ${activeMotoboy?.name || 'entregador'} para entrar.`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col justify-between text-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full my-auto space-y-6">
        {/* Header Operacional */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Login Exclusivo da Empresa</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
              {settings.storeName}
            </h1>
            <p className="text-sm text-slate-400">
              Acesso restrito para Dono, Operador de Balcão e Entregadores.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 text-xs">
            <span className="text-slate-300 font-semibold">
              Frente de Caixa &amp; Delivery Integrado
            </span>
            <span className="text-slate-400">
              Turno do Caixa:{' '}
              <strong className={cashShift.status === 'OPEN' ? 'text-emerald-400' : 'text-rose-400'}>
                {cashShift.status === 'OPEN' ? 'Aberto' : 'Fechado'}
              </strong>
            </span>
          </div>
        </div>

        {/* Banner de Sincronização na Nuvem (PC + Motoboy + Cliente) */}
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            hasVerifiedCloudSession && (cloudRoleStatus.isOwner || cloudRoleStatus.isAuthorizedStaff)
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : hasVerifiedCloudSession
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-slate-900 border-amber-500/30'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                hasVerifiedCloudSession && (cloudRoleStatus.isOwner || cloudRoleStatus.isAuthorizedStaff)
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : hasVerifiedCloudSession
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              {hasVerifiedCloudSession && (cloudRoleStatus.isOwner || cloudRoleStatus.isAuthorizedStaff) ? (
                <Cloud className="w-5 h-5" />
              ) : hasVerifiedCloudSession ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CloudOff className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-0.5">
              {hasVerifiedCloudSession && (cloudRoleStatus.isOwner || cloudRoleStatus.isAuthorizedStaff) ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Nuvem Sincronizada em Tempo Real
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-bold uppercase">
                      {cloudRoleStatus.isOwner ? 'Dono' : cloudRoleStatus.role || 'Equipe'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {isStaffSynthetic ? (
                      <>
                        Conectado com usuário{' '}
                        <strong className="text-white">@{cloudRoleStatus.staffUsername}</strong> (sem Google).
                        Pedidos, caixa, mesas e entregas sincronizam ao vivo.
                      </>
                    ) : (
                      <>
                        Conectado como <strong className="text-white">{cloudUser?.email}</strong>. Pedidos, caixa, mesas e entregas sincronizam automaticamente.
                      </>
                    )}
                  </p>
                </>
              ) : hasVerifiedCloudSession ? (
                <>
                  <span className="text-xs font-extrabold text-rose-300 block">
                    Conta Google sem autorização na equipe ({cloudUser?.email})
                  </span>
                  <p className="text-xs text-slate-300">
                    Se você é Balcão ou Motoboy, desconecte este Google e entre abaixo com o <strong className="text-white">Usuário e Senha</strong> criados pelo Dono.
                  </p>
                </>
              ) : (
                <>
                  <span className="text-xs font-extrabold text-amber-300 block">
                    Dono: Conectar Nuvem Google · Equipe (Balcão/Motoboy): Entre com Usuário e Senha abaixo
                  </span>
                  <p className="text-xs text-slate-400">
                    {cloudRoleStatus.storeClaimed
                      ? 'Funcionários e motoboys NÃO precisam de Google: basta digitar o Usuário e Senha criados pelo Dono no quadro abaixo.'
                      : 'Dono: conecte qualquer Google aqui pela primeira vez para ativar a loja na nuvem e criar usuários de Balcão e Motoboy em tempo real.'}
                  </p>
                </>
              )}
              {cloudSyncError && (
                <p className="text-[11px] text-rose-300 font-semibold pt-1">{cloudSyncError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasVerifiedCloudSession ? (
              <>
                {!isStaffSynthetic && (
                  <button
                    type="button"
                    disabled={cloudSyncing}
                    onClick={() => void connectCloudGoogle()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncing ? 'animate-spin' : ''}`} />
                    <span>Trocar Conta</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void disconnectCloudGoogle()}
                  className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-bold text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                >
                  Desconectar
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={cloudSyncing}
                onClick={() => void connectCloudGoogle()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black inline-flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                <span>{cloudSyncing ? 'Conectando...' : 'Dono: Conectar Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Grid 2 colunas: Login com Senha vs Acesso por Cargo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna 1: Formulário Autenticado */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-white">
                  Entrar com Usuário e Senha (Sem Google)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Balcão e Motoboys: digite o <strong className="text-slate-200">usuário e senha</strong> criados pelo Dono para sincronizar na nuvem na hora.
                </p>
              </div>

              <form onSubmit={(e) => void handleEmployeeSubmit(e)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Usuário da Equipe ou Cargo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ex: joao, caixa1, moto-lucas ou dono"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite a senha do usuário"
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      aria-label="Alternar visibilidade da senha"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {rolePrompt && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                    {rolePrompt}
                  </div>
                )}

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold space-y-2">
                    <p>{formError}</p>
                    {needsEmailPassProvider && (
                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0134490732/authentication/providers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold"
                      >
                        <span>Dono: Ativar E-mail/senha no Firebase Console</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={cloudSyncing}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{cloudSyncing ? 'Verificando na Nuvem...' : 'Acessar Painel'}</span>
                </button>
              </form>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Ambiente protegido da empresa</span>
              <span className="font-mono-tabular text-slate-400">PDV · Fluxo de Caixa · Estoque</span>
            </div>
          </div>

          {/* Coluna 2: Acessos por Cargo */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-lg font-display font-bold text-white">Acesso por Cargo</h2>
              <p className="text-xs text-slate-400 mt-1">
                Selecione o perfil operacional para entrar diretamente ou informar a senha.
              </p>
            </div>

            <div className="space-y-3">
              {/* Dono */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-colors overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleQuickRoleSelect('DONO')}
                  className="w-full p-3.5 hover:bg-slate-800/80 flex items-center justify-between text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors block">
                        Dono / Gerente Geral
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Controle total: estoque, custos, relatórios, senhas e equipe
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 shrink-0" />
                </button>

                {inlineAuthRole === 'DONO' && (
                  <form
                    onSubmit={(e) => handleInlineRoleSubmit(e, 'DONO')}
                    className="px-3.5 pb-3.5 pt-2 border-t border-slate-800/80 space-y-2 bg-slate-900/60"
                  >
                    <div className="flex gap-2">
                      <input
                        type="password"
                        autoFocus
                        value={inlinePassword}
                        onChange={(e) => setInlinePassword(e.target.value)}
                        placeholder="Senha do Dono"
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-amber-500/40 text-xs text-white focus:outline-none focus:border-amber-400"
                        required
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer shrink-0"
                      >
                        Entrar
                      </button>
                    </div>
                    {inlineError && <p className="text-[11px] text-rose-400 font-semibold">{inlineError}</p>}
                  </form>
                )}
              </div>

              {/* Balcão */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-colors overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleQuickRoleSelect('BALCAO')}
                  className="w-full p-3.5 hover:bg-slate-800/80 flex items-center justify-between text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors block">
                        Operador de Balcão
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Frente de caixa, calculadora de troco, KDS e fechamento
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                </button>

                {inlineAuthRole === 'BALCAO' && (
                  <form
                    onSubmit={(e) => handleInlineRoleSubmit(e, 'BALCAO')}
                    className="px-3.5 pb-3.5 pt-2 border-t border-slate-800/80 space-y-2 bg-slate-900/60"
                  >
                    <div className="flex gap-2">
                      <input
                        type="password"
                        autoFocus
                        value={inlinePassword}
                        onChange={(e) => setInlinePassword(e.target.value)}
                        placeholder="Senha do Balcão"
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-cyan-500/40 text-xs text-white focus:outline-none focus:border-cyan-400"
                        required
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold cursor-pointer shrink-0"
                      >
                        Entrar
                      </button>
                    </div>
                    {inlineError && <p className="text-[11px] text-rose-400 font-semibold">{inlineError}</p>}
                  </form>
                )}
              </div>

              {/* Motoboy / Entregador (Cartão inteiro clicável) */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-colors overflow-hidden">
                {motoboys.length > 0 && (
                  <div className="px-3.5 pt-3 pb-2 border-b border-slate-800/70 flex items-center justify-between gap-2">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Entregador
                    </label>
                    <select
                      value={effectiveMotoboyId}
                      onChange={(e) => {
                        setSelectedMotoboyId(e.target.value);
                        setInlineError(null);
                      }}
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
                    >
                      {motoboys.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.vehiclePlate})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleQuickRoleSelect('MOTOBOY')}
                  className="w-full p-3.5 hover:bg-slate-800/80 flex items-center justify-between text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors block">
                        Entregador / Motoboy
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Rotas no mapa, chat com cliente e acerto de entrega
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                </button>

                {inlineAuthRole === 'MOTOBOY' && (
                  <form
                    onSubmit={(e) => handleInlineRoleSubmit(e, 'MOTOBOY')}
                    className="px-3.5 pb-3.5 pt-2 border-t border-slate-800/80 space-y-2 bg-slate-900/60"
                  >
                    <div className="flex gap-2">
                      <input
                        type="password"
                        autoFocus
                        value={inlinePassword}
                        onChange={(e) => setInlinePassword(e.target.value)}
                        placeholder={`Senha de ${activeMotoboy?.name || 'entregador'}`}
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-emerald-500/40 text-xs text-white focus:outline-none focus:border-emerald-400"
                        required
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold cursor-pointer shrink-0"
                      >
                        Entrar
                      </button>
                    </div>
                    {inlineError && <p className="text-[11px] text-rose-400 font-semibold">{inlineError}</p>}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {settings.address}, {settings.city}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {settings.phone}
            </span>
          </div>
          <span className="font-mono-tabular">CNPJ: {settings.cnpj}</span>
        </div>
      </div>
    </div>
  );
};
