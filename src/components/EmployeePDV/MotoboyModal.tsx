import React, { useState, useEffect } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Motoboy } from '../../types';
import {
  X,
  Truck,
  Save,
  Phone,
  AlertCircle,
  CheckCircle2,
  Sparkles,
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
  const { addMotoboy, updateMotoboy } = useBeverage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState(POPULAR_VEHICLE_PRESETS[0]);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (motoboyToEdit) {
      setName(motoboyToEdit.name);
      setPhone(motoboyToEdit.phone);
      setVehicleModel(motoboyToEdit.vehicleModel);
      setVehiclePlate(motoboyToEdit.vehiclePlate);
      setIsOnline(motoboyToEdit.isOnline);
    } else {
      setName('');
      setPhone('(11) 9');
      setVehicleModel(POPULAR_VEHICLE_PRESETS[0]);
      setVehiclePlate('');
      setIsOnline(true);
    }
    setErrorMessage(null);
  }, [motoboyToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Por favor, informe o nome ou apelido do motoboy.');
      return;
    }

    if (!vehiclePlate.trim()) {
      setErrorMessage('A placa da moto/veículo é obrigatória para o despacho.');
      return;
    }

    if (motoboyToEdit) {
      updateMotoboy(motoboyToEdit.id, {
        name: name.trim(),
        phone: phone.trim(),
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        isOnline,
      });
    } else {
      addMotoboy({
        name: name.trim(),
        phone: phone.trim(),
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        isOnline,
      });
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
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
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{motoboyToEdit ? 'Salvar Alterações' : 'Cadastrar Motoboy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
