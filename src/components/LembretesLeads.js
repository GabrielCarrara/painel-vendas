// src/components/LembretesLeads.js — aviso na data de retorno (mesmo dia e mês que hoje)
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import dayjs from 'dayjs';
import { FaPhone, FaExclamationTriangle } from 'react-icons/fa';
import { CRM_RETORNO_STORAGE_PREFIX } from '../utils/crmLembreteStorage';

function mesmoDiaMes(dataRef, hoje) {
  if (!dataRef) return false;
  const d = dayjs(String(dataRef).slice(0, 10));
  if (!d.isValid()) return false;
  return d.month() === hoje.month() && d.date() === hoje.date();
}

function ModalLembreteRetorno({ leads, dataLabel, onFechar }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lembrete-retorno-titulo"
    >
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-5 py-4 flex items-start gap-3">
          <span className="text-amber-400 mt-0.5 shrink-0">
            <FaExclamationTriangle size={22} />
          </span>
          <div>
            <h2 id="lembrete-retorno-titulo" className="text-lg font-bold text-white">
              Lembrete de retorno de contato
            </h2>
            <p className="text-sm text-amber-100/85 mt-1">Hoje ({dataLabel})</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-300 mb-3">
            Entre em contato novamente com:
          </p>
          <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="text-white font-semibold pl-3 border-l-2 border-amber-500/60 py-0.5"
              >
                {(lead.nome || '').toUpperCase()}
                <span className="block text-xs font-normal text-gray-400">{lead.tipo}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 leading-relaxed">
            Confira no CRM os detalhes e entre em contato.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-gray-700 bg-gray-900/40 flex justify-end">
          <button
            type="button"
            onClick={onFechar}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LembretesLeads() {
  const [leadsParaHoje, setLeadsParaHoje] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModalInicial, setMostrarModalInicial] = useState(false);

  useEffect(() => {
    const fetchLeadsRetornoHoje = async () => {
      const hoje = dayjs();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, telefone, tipo, data_retorno')
        .eq('usuario_id', user.id)
        .not('data_retorno', 'is', null);

      if (error) {
        console.error('Erro ao buscar lembretes de retorno:', error);
        setLeadsParaHoje([]);
        setLoading(false);
        return;
      }

      const candidatos = (data || []).filter((lead) => {
        if (lead.tipo === 'VENDIDO') return false;
        return mesmoDiaMes(lead.data_retorno, hoje);
      });

      setLeadsParaHoje(candidatos);

      if (candidatos.length > 0) {
        const hojeKey = hoje.format('YYYY-MM-DD');
        const storageKey = `${CRM_RETORNO_STORAGE_PREFIX}${user.id}_${hojeKey}`;
        if (!sessionStorage.getItem(storageKey)) {
          sessionStorage.setItem(storageKey, '1');
          setMostrarModalInicial(true);
        }
      }

      setLoading(false);
    };

    fetchLeadsRetornoHoje();
  }, []);

  return (
    <>
      {!loading && mostrarModalInicial && leadsParaHoje.length > 0 && (
        <ModalLembreteRetorno
          leads={leadsParaHoje}
          dataLabel={dayjs().format('DD/MM')}
          onFechar={() => setMostrarModalInicial(false)}
        />
      )}

      {loading ? (
        <div className="text-gray-400">Carregando lembretes...</div>
      ) : leadsParaHoje.length > 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/35 rounded-xl p-6 mb-8 animate-fade-in">
          <h3 className="text-xl font-bold text-amber-200 flex items-center gap-3 mb-2">
            <FaExclamationTriangle /> Retorno de contato hoje
          </h3>
          <p className="text-sm text-amber-100/80 mb-4">
            Estes leads estão com <strong>data de retorno</strong> para hoje (dia e mês). Entre em contato
            novamente.
          </p>
          <div className="space-y-3">
            {leadsParaHoje.map((lead) => (
              <div
                key={lead.id}
                className="bg-gray-800/50 p-3 rounded-lg flex justify-between items-center gap-3 flex-wrap"
              >
                <div>
                  <p className="font-bold text-white">{(lead.nome || '').toUpperCase()}</p>
                  <p className="text-sm text-gray-400">{lead.tipo}</p>
                </div>
                <a
                  href={`https://wa.me/55${String(lead.telefone || '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-2 transition-colors shrink-0"
                >
                  <FaPhone size={12} /> Contatar
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
