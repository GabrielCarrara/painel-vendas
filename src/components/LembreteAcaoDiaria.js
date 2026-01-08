import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { FaCalendarAlt, FaMapMarkerAlt, FaClock, FaUsers, FaTimes, FaExclamationCircle } from 'react-icons/fa';

dayjs.locale('pt-br');

export default function LembreteAcaoDiaria({ usuario, onClose }) {
  const [acoesEncontradas, setAcoesEncontradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const verificarAcoes = async () => {
      if (!usuario?.id || !usuario?.id_filial) {
        setLoading(false);
        return;
      }

      const hoje = dayjs().format('YYYY-MM-DD');
      const amanha = dayjs().add(1, 'day').format('YYYY-MM-DD');

      try {
        // Buscar ações de HOJE e AMANHÃ para a filial do usuário
        const { data, error } = await supabase
          .from('acoes')
          .select('*')
          .in('data', [hoje, amanha]) // <--- ALTERADO PARA PEGAR HOJE E AMANHÃ
          .eq('id_filial', usuario.id_filial)
          .order('data', { ascending: true }) // Primeiro hoje, depois amanhã
          .order('horario', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          // Filtrar ações relevantes para este usuário (Todos ou Específico)
          const acoesParaUsuario = data.filter(a => 
            a.todos === true || (a.usuarios && a.usuarios.includes(String(usuario.id)))
          );

          if (acoesParaUsuario.length > 0) {
            setAcoesEncontradas(acoesParaUsuario);
            setMostrar(true);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar ação:', error);
      } finally {
        setLoading(false);
      }
    };

    verificarAcoes();
  }, [usuario]);

  if (loading || !mostrar || acoesEncontradas.length === 0) return null;

  const handleClose = () => {
    setMostrar(false);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[9999] p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-indigo-500/50 flex flex-col max-h-[90vh]">
        
        {/* CABEÇALHO */}
        <div className="p-6 border-b border-indigo-500/30 bg-gradient-to-r from-indigo-900/50 to-transparent flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/50 animate-pulse">
              <FaExclamationCircle className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Atenção, Colaborador!</h3>
              <p className="text-indigo-200 text-sm">Você tem ações agendadas.</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* CONTEÚDO COM SCROLL SE TIVER MAIS DE UMA AÇÃO */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {acoesEncontradas.map((acao, index) => {
                const isHoje = dayjs(acao.data).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
                const labelDia = isHoje ? "HOJE" : "AMANHÃ";
                const corBorda = isHoje ? "border-green-500" : "border-yellow-500";
                const corTexto = isHoje ? "text-green-400" : "text-yellow-400";
                const dataFormatada = dayjs(acao.data).format('dddd, DD [de] MMMM');

                return (
                    <div key={acao.id} className={`bg-gray-700/30 rounded-xl border-l-4 ${corBorda} p-4 shadow-lg`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded bg-gray-800 ${corTexto} uppercase tracking-wider`}>
                                {labelDia}
                            </span>
                            <span className="text-gray-400 text-xs capitalize">{dataFormatada}</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-semibold">Local</p>
                                <p className="text-xl font-bold text-white flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-indigo-400" /> {acao.local}
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-semibold">Horário</p>
                                    <p className="text-white font-bold flex items-center gap-2">
                                        <FaClock /> {acao.horario}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-semibold">Participantes</p>
                                    <p className="text-white font-bold flex items-center gap-2">
                                        <FaUsers /> {acao.todos ? 'Todos' : 'Selecionados'}
                                    </p>
                                </div>
                            </div>

                            {acao.descricao && (
                                <div className="bg-gray-800/50 p-3 rounded-lg mt-2">
                                    <p className="text-gray-300 text-sm italic">"{acao.descricao}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-indigo-500/30 bg-gray-800/50 flex justify-center shrink-0">
          <button
            onClick={handleClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 px-8 py-3 rounded-lg font-bold text-white transition-all transform active:scale-95 shadow-lg"
          >
            Ciente das Ações
          </button>
        </div>
      </div>
    </div>
  );
}