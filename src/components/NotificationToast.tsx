import React from 'react';
import { useBeverage } from '../context/BeverageContext';
import { Bell, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { toasts, dismissToast, setActiveView } = useBeverage();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isOrder = toast.type === 'order';
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 transition-all transform animate-in slide-in-from-bottom-3 duration-200 ${
              isOrder
                ? 'bg-amber-950/90 border-amber-500 text-amber-100 ring-2 ring-amber-500/50 shadow-amber-950/50'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-100'
                : toast.type === 'warning'
                ? 'bg-rose-950/90 border-rose-500 text-rose-100'
                : 'bg-slate-900/90 border-slate-700 text-slate-100'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isOrder ? (
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold animate-bounce">
                  <Bell className="w-4 h-4" />
                </div>
              ) : toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : toast.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              ) : (
                <Info className="w-5 h-5 text-blue-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider">{toast.title}</h4>
                <span className="text-[10px] opacity-70">{toast.timestamp}</span>
              </div>
              <p className="text-xs mt-1 leading-snug line-clamp-2">{toast.message}</p>

              {isOrder && (
                <button
                  onClick={() => {
                    setActiveView('EMPLOYEE_PDV');
                    dismissToast(toast.id);
                  }}
                  className="mt-2 text-xs font-bold underline text-amber-300 hover:text-amber-200 flex items-center gap-1"
                >
                  Abrir no Painel de Pedidos (KDS) &rarr;
                </button>
              )}
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-white/60 hover:text-white p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
