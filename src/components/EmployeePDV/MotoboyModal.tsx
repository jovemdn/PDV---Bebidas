import React, { useState, useEffect } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Motoboy } from '../../types';
import { normalizeStaffUsername } from '../../services/firebaseDbService';
import {
  X,
  Truck,
  Save,
  Phone,
  AlertCircle,
  Key,
  Mail,
  UserPlus,
  ExternalLink,
} from 'lucide-react';

interface MotoboyModalProps {
  isOpen: boolean;
  onClose: () => void;
  motoboyToEdit?: Motoboy | null;
}

const POPULAR_VEHICLE_PRESETS = [
  'Honda CG 160 Fan (Preta)',
  'Honda CG 160 Titan (Vermelha)',
  'Yamaha Fazer 250 (Azul)',
  'Honda Biz 125 (Branca com Baú Térmico)',
  'Honda CG 150 Titan (Prata)',
  'Mottu Sport 110i (Preta)',
];

export const MotoboyModal: React.FC<MotoboyModalProps> = ({
  isOpen,
  onClose,
  motoboyToEdit,
}) => {
  const { addMotoboy, updateMotoboy, cloudRoleStatus, createCloudStaffUser, cloudSyncing } =
    useBeverage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState(POPULAR_VEHICLE_PRESETS[0]);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [cloudUsername, setCloudUsername] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [createdBoyIdForRetry, setCreatedBoyIdForRetry] = useState<string | null>(null);
  const [needsEmailPassProvider, setNeedsEmailPassProvider] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (motoboyToEdit) {
      setName(motoboyToEdit.name);
      setPhone(motoboyToEdit.phone);
      setVehicleModel(motoboyToEdit.vehicleModel);
      setVehiclePlate(motoboyToEdit.vehiclePlate);
      setAccessPassword(motoboyToEdit.accessPassword || '');
      setGoogleEmail(motoboyToEdit.googleEmail || '');
      setCloudUsername(motoboyToEdit.cloudUsername || '');
      setCloudPassword('');
      setIsOnline(motoboyToEdit.isOnline);
    } else {
      setName('');
      setPhone('(21) 9');
      setVehicleModel(POPULAR_VEHICLE_PRESETS[0]);
      setVehiclePlate('');
      setAccessPassword('');
      setGoogleEmail('');
      setCloudUsername('');
      setCloudPassword('');
      setIsOnline(true);
    }
    setCreatedBoyIdForRetry(null);
    setNeedsEmailPassProvider(false);
    setErrorMessage(null);
  }, [motoboyToEdit, isOpen]);

  if (!isOpen) return null;

  const normalizedCloudUserPreview = normalizeStaffUsername(cloudUsername);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNeedsEmailPassProvider(false);

    if (!name.trim()) {
      setErrorMessage('Por favor, informe o nome ou apelido do motoboy.');
      return;
    }

    if (!vehiclePlate.trim()) {
      setErrorMessage('A placa da moto/veículo é obrigatória para o despacho.');
      return;
    }

    const wantsCloudAccount =
      !motoboyToEdit && cloudRoleStatus.isOwner && (cloudUsername.trim() || cloudPassword.trim());

    if (wantsCloudAccount) {
      if (normalizedCloudUserPreview.length < 3) {
        setErrorMessage('O usuário na nuvem precisa ter pelo menos 3 letras ou números.');
        return;
      }
      if (cloudPassword.trim().length < 6) {
        setErrorMessage('A senha de login na nuvem precisa ter pelo menos 6 caracteres.');
        return;
      }
    }

    if (motoboyToEdit) {
      updateMotoboy(motoboyToEdit.id, {
        name: name.trim(),
        phone: phone.trim(),
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        accessPassword: accessPassword.trim() || undefined,
        googleEmail: googleEmail.trim().toLowerCase() || undefined,
        isOnline,
      });
      onClose();
      return;
    }

    let boyId = createdBoyIdForRetry;
    if (!boyId) {
      const created = addMotoboy({
        name: name.trim(),
        phone: phone.trim(),
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        accessPassword: accessPassword.trim() || undefined,
        googleEmail: googleEmail.trim().toLowerCase() || undefined,
        isOnline,
      });
      boyId = created.id;
      setCreatedBoyIdForRetry(boyId);
    } else {
      updateMotoboy(boyId, {
        name: name.trim(),
        phone: phone.trim(),
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        accessPassword: accessPassword.trim() || undefined,
        googleEmail: googleEmail.trim().toLowerCase() || undefined,
        isOnline,
      });
    }

    if (wantsCloudAccount && boyId) {
      const res = await createCloudStaffUser({
        username: normalizedCloudUserPreview,
        displayName: name.trim(),
        password: cloudPassword.trim(),
        role: 'MOTOBOY',
        motoboyId: boyId,
      });
      if (!res.success) {
        if (res.error === 'AUTH_EMAIL_PASSWORD_DISABLED') {
          setNeedsEmailPassProvider(true);
          setErrorMessage(
            'Motoboy salvo na frota, mas falta ativar E-mail/senha no Firebase Console para criar o usuário na nuvem.'
          );
        } else {
          setErrorMessage(
            `Motoboy salvo na frota, mas houve erro ao criar o login na nuvem: ${res.error || 'Tente outro nome de usuário.'}`
          );
        }
        return;
      }
      updateMotoboy(boyId, { cloudUsername: normalizedCloudUserPreview });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto text-white shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {motoboyToEdit ? 'Editar Entregador / Motoboy' : 'Cadastrar Novo Motoboy na Frota'}
              </h3>
              <p className="text-xs text-slate-400">
                Controle de entregadores para despacho e acerto de contas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
              {needsEmailPassProvider && (
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0134490732/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold"
                >
                  <span>Ativar E-mail/senha no Firebase Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Nome Completo ou Apelido *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Danilo 'da Fan 160' ou Lucas Santos"
              className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                WhatsApp / Telefone *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Placa da Moto (Mercosul ou Cinza) *
              </label>
              <input
                type="text"
                required
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="Ex: BRA-2E19 ou ABC-1234"
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-mono font-bold uppercase"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Modelo do Veículo / Cor
            </label>
            <input
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="Ex: Honda CG 160 Fan (Preta com Baú 80L)"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
            />

            {/* Presets Rápidos */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {POPULAR_VEHICLE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setVehicleModel(preset)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                >
                  {preset.split(' ')[0]} {preset.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>

          {!motoboyToEdit && cloudRoleStatus.isOwner && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-300">
                <UserPlus className="w-4 h-4" />
                <span>Criar Usuário e Senha na Nuvem Agora (Sem Google)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Opcional: crie já o login para este entregador entrar pelo celular sem conta Google.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase text-emerald-300 block mb-1">
                    Usuário (ex: danilo)
                  </label>
                  <input
                    type="text"
                    value={cloudUsername}
                    onChange={(e) => setCloudUsername(e.target.value)}
                    placeholder="Ex: danilo"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-emerald-500/30 text-white focus:outline-none focus:border-emerald-400"
                  />
                  {normalizedCloudUserPreview && (
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      Login: @{normalizedCloudUserPreview}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-emerald-300 block mb-1">
                    Senha (mín. 6 dígitos)
                  </label>
                  <input
                    type="text"
                    value={cloudPassword}
                    onChange={(e) => setCloudPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-emerald-500/30 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>
          )}

          {motoboyToEdit?.cloudUsername && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
              Usuário na nuvem vinculado: <strong className="text-white">@{motoboyToEdit.cloudUsername}</strong>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Senha Rápida Local (Opcional)
            </label>
            <div className="relative">
              <Key className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="Se vazio, usa a senha padrão dos entregadores"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">
              E-mail Google do Motoboy na Nuvem (Opcional)
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-3" />
              <input
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="Ex: entregador@gmail.com (opcional se usar Usuário/Senha)"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-cyan-500/30 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-bold text-white block">
                  Disponível em Plantão Agora
                </span>
                <span className="text-[11px] text-slate-400">
                  Se ativado, este entregador aparecerá na lista para despacho imediato no KDS de pedidos.
                </span>
              </div>
              <input
                type="checkbox"
                checked={isOnline}
                onChange={(e) => setIsOnline(e.target.checked)}
                className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cloudSyncing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 disabled:opacity-60 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>
                {cloudSyncing
                  ? 'Salvando...'
                  : motoboyToEdit
                  ? 'Salvar Alterações'
                  : 'Cadastrar Motoboy'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
