import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import utc from 'dayjs/plugin/utc';
import isBetween from 'dayjs/plugin/isBetween';
import {
  FaCalendarAlt, FaPlus, FaTrash, FaTimes, FaSave, FaUsers, FaMapMarkerAlt,
  FaClock, FaSpinner, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

dayjs.extend(utc);
dayjs.extend(isBetween);
dayjs.locale('pt-br');

// ==================== COMPONENTE: MODAL DE LEMBRETE DE AÇÃO ====================
const ModalLembreteAcao = ({ acao, usuario, onClose }) => {
  if (!acao) return null;

  const dataAcao = dayjs(acao.data);
  const dataFormatada = dataAcao.format('dddd, [de] MMMM [de] YYYY');

  // Converter usuários para nomes se disponível
  const usuariosNome = acao.usuarios?.length > 0 
    ? acao.usuarios.join(', ') 
    : 'Todos';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-indigo-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-indigo-500/50 animate-bounce-in">
        <header className="p-6 border-b border-indigo-500/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-indigo-400" size={24} />
            <h3 className="text-2xl font-bold text-white">Ação do Dia!</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full">
            <FaTimes size={20} />
          </button>
        </header>

        <div className="p-6 space-y-4">
          <div className="bg-indigo-500/20 p-4 rounded-xl border border-indigo-500/50">
            <p className="text-sm text-gray-300 mb-1">Local da Ação</p>
            <p className="text-2xl font-bold text-indigo-300 flex items-center gap-2">
              <FaMapMarkerAlt /> {acao.local}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
              <p className="text-xs text-gray-400 mb-1">Data</p>
              <p className="font-semibold text-white">{dataFormatada}</p>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
              <p className="text-xs text-gray-400 mb-1">Horário</p>
              <p className="font-semibold text-white flex items-center gap-2">
                <FaClock size={16} /> {acao.horario}
              </p>
            </div>
          </div>

          <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
            <p className="text-xs text-gray-400 mb-2">Participantes</p>
            <p className="font-semibold text-white flex items-center gap-2">
              <FaUsers size={16} /> {acao.todos ? '👥 Todos os usuários' : usuariosNome}
            </p>
          </div>

          {acao.descricao && (
            <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
              <p className="text-xs text-gray-400 mb-2">Descrição</p>
              <p className="text-white">{acao.descricao}</p>
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-indigo-500/30 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-semibold text-white transition-all"
          >
            Entendi!
          </button>
        </footer>
      </div>
    </div>
  );
};

// ==================== COMPONENTE: MODAL DE CRIAÇÃO/EDIÇÃO ====================
const ModalAcao = ({ acao, filiais, usuarios, filialPadrao = '', dataPadrao, onClose, onSave }) => {
  const [formData, setFormData] = useState(
    acao || {
      local: '',
      data: dataPadrao || dayjs().format('YYYY-MM-DD'),
      horario: '09:00',
      usuarios: [],
      todos: true,
      descricao: '',
      id_filial: filialPadrao ? String(filialPadrao) : '',
    }
  );

  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([]);

  // Atualizar usuários disponíveis quando a filial mudar
  useEffect(() => {
    if (formData.id_filial) {
      const filialId = parseInt(formData.id_filial);
      const filtered = usuarios.filter(u => parseInt(u.id_filial) === filialId);
      setUsuariosDisponiveis(filtered);
    } else {
      setUsuariosDisponiveis([]);
    }
  }, [formData.id_filial, usuarios]);

  // Carregar usuários disponíveis quando o modal abrir com uma ação existente
  useEffect(() => {
    if (acao && acao.id_filial) {
      const filialId = parseInt(acao.id_filial);
      const filtered = usuarios.filter(u => parseInt(u.id_filial) === filialId);
      setUsuariosDisponiveis(filtered);
    }
  }, [acao, usuarios]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUsuarioToggle = (usuarioId) => {
    // Converter para string para comparação consistente
    const usuarioIdString = String(usuarioId);
    
    setFormData(prev => ({
      ...prev,
      usuarios: prev.usuarios.map(u => String(u)).includes(usuarioIdString)
        ? prev.usuarios.filter(u => String(u) !== usuarioIdString)
        : [...prev.usuarios, usuarioIdString]
    }));
  };

  const handleSave = () => {
    if (!formData.local || !formData.data || !formData.horario || !formData.id_filial) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }
    
    // Converter id_filial para BIGINT
    const dadosParaSalvar = {
      ...formData,
      id_filial: parseInt(formData.id_filial),
      usuarios: formData.usuarios.map(u => String(u)) // Garante strings
    };
    
    onSave(dadosParaSalvar);
  };

  const campoClass = 'w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const labelClass = 'block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in flex flex-col max-h-[85vh]">
        <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-400" /> {acao ? 'Editar ação' : 'Nova ação'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-full">
            <FaTimes size={16} />
          </button>
        </header>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
          <div className="sm:col-span-2">
            <label className={labelClass}>Filial *</label>
            <select name="id_filial" value={formData.id_filial} onChange={handleChange} className={campoClass}>
              <option value="">Selecione uma filial</option>
              {filiais.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Local da ação *</label>
            <input
              type="text"
              name="local"
              value={formData.local}
              onChange={handleChange}
              placeholder="Ex: Shopping, Supermercado, Centro"
              className={campoClass}
            />
          </div>

          <div>
            <label className={labelClass}>Data *</label>
            <input type="date" name="data" value={formData.data} onChange={handleChange} className={campoClass} />
          </div>
          <div>
            <label className={labelClass}>Horário *</label>
            <input type="time" name="horario" value={formData.horario} onChange={handleChange} className={campoClass} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Descrição</label>
            <textarea
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Detalhes sobre a ação..."
              className={`${campoClass} resize-none`}
              rows="3"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                id="todos"
                name="todos"
                checked={formData.todos}
                onChange={handleChange}
                className="w-4 h-4 rounded"
              />
              Todos os usuários participam
            </label>

            {!formData.todos && (
              <div className="mt-2">
                <label className={labelClass}>Participantes</label>
                <div className="bg-gray-900/40 p-2 rounded-md border border-gray-600 max-h-40 overflow-y-auto">
                  {usuariosDisponiveis.length > 0 ? (
                    <div className="space-y-0.5">
                      {usuariosDisponiveis.map(usuario => (
                        <label key={usuario.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/50 px-2 py-1.5 rounded">
                          <input
                            type="checkbox"
                            checked={formData.usuarios.map(u => String(u)).includes(String(usuario.id))}
                            onChange={() => handleUsuarioToggle(usuario.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-gray-200 text-sm">{usuario.nome}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs py-1.5 px-2">
                      {formData.id_filial ? 'Nenhum usuário nesta filial' : 'Selecione uma filial primeiro'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="px-4 py-3 flex justify-end gap-2 border-t border-gray-700">
          <button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-semibold text-white">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center gap-2">
            <FaSave size={14} /> Salvar
          </button>
        </footer>
      </div>
    </div>
  );
};

// ==================== COMPONENTE: CARD DE AÇÃO DO CALENDÁRIO ====================
const CardAcao = ({ acao, podeEditar, onEdit, onDelete, onView }) => {
  return (
    <div
      onClick={() => (podeEditar ? onEdit(acao) : onView(acao))}
      className="bg-indigo-500/15 rounded border border-indigo-500/40 px-1.5 py-1 hover:bg-indigo-500/25 transition-colors cursor-pointer group"
      title={`${acao.local} · ${acao.horario}`}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="font-semibold text-indigo-200 text-[11px] truncate flex items-center gap-1 min-w-0">
          <FaMapMarkerAlt size={9} className="shrink-0" /> {acao.local}
        </p>
        {podeEditar && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(acao.id); }}
            className="p-0.5 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Deletar"
          >
            <FaTrash size={9} />
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
        <FaClock size={8} /> {acao.horario}
      </p>
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL: CALENDÁRIO DE AÇÕES ====================
export default function PainelAcoes({ usuario, podeEditar = false, filiais = [], usuarios = [] }) {
  const [acoes, setAcoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(dayjs());
  const [modalVisivel, setModalVisivel] = useState(false);
  const [acaoEditando, setAcaoEditando] = useState(null);
  const [lembreteVisivel, setLembreteVisivel] = useState(false);
  const [lembreteDia, setLembreteDia] = useState(null);
  const [filialSelecionada, setFilialSelecionada] = useState('');

  // Buscar ações do Supabase
  const buscarAcoes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('acoes')
        .select('*')
        .order('data', { ascending: true });

      if (error) {
        console.error('Erro ao buscar ações:', error);
      } else {
        setAcoes(data || []);
      }
    } catch (err) {
      console.error('Erro na busca de ações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buscarAcoes();
  }, [buscarAcoes]);

  // Determinar filial padrão do usuário
  useEffect(() => {
    if (usuario?.id_filial && !filialSelecionada) {
      setFilialSelecionada(usuario.id_filial);
    }
  }, [usuario, filialSelecionada]);

  // Verificar lembrete ao carregar
  useEffect(() => {
    const verificarLembrete = () => {
      const hoje = dayjs().format('YYYY-MM-DD');
      const acaoDia = acoes.find(a => a.data === hoje && a.id_filial === filialSelecionada);

      if (acaoDia) {
        // Converter IDs para string para comparação
        const usuarioIdString = String(usuario?.id);
        const usuariosParticipantes = (acaoDia.usuarios || []).map(u => String(u));

        // Verificar se o usuário participa
        const participaAcao = acaoDia.todos || usuariosParticipantes.includes(usuarioIdString);
        if (participaAcao) {
          setLembreteDia(acaoDia);
          setLembreteVisivel(true);
        }
      }
    };

    if (acoes.length > 0 && filialSelecionada && usuario?.id) {
      verificarLembrete();
    }
  }, [acoes, filialSelecionada, usuario]);

  // Salvar/atualizar ação
  const handleSaveAcao = async (formData) => {
    try {
      if (acaoEditando) {
        // Remover o ID dos dados que serão atualizados
        const { id, ...dadosParaAtualizar } = formData;
        
        const { error } = await supabase
          .from('acoes')
          .update(dadosParaAtualizar)
          .eq('id', acaoEditando.id);

        if (error) {
          alert('Erro ao atualizar: ' + error.message);
          console.error('Erro:', error);
          return;
        }
      } else {
        const { error } = await supabase
          .from('acoes')
          .insert([formData]);

        if (error) {
          alert('Erro ao criar: ' + error.message);
          console.error('Erro:', error);
          return;
        }
      }

      setModalVisivel(false);
      setAcaoEditando(null);
      await buscarAcoes();
    } catch (err) {
      console.error('Erro ao salvar ação:', err);
      alert('Erro inesperado ao salvar ação');
    }
  };

  // Deletar ação
  const handleDeleteAcao = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta ação?')) return;

    try {
      const { error } = await supabase
        .from('acoes')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Erro ao deletar: ' + error.message);
      } else {
        await buscarAcoes();
      }
    } catch (err) {
      console.error('Erro ao deletar ação:', err);
    }
  };

  // Obter ações do mês selecionado e filial
  const acoesDoMes = useMemo(() => {
    const inicioMes = mesSelecionado.startOf('month');
    const fimMes = mesSelecionado.endOf('month');
    
    return acoes.filter(a =>
      a.id_filial === parseInt(filialSelecionada) &&
      dayjs(a.data).isBetween(inicioMes, fimMes, null, '[]')
    );
  }, [acoes, mesSelecionado, filialSelecionada]);

  // Gerar dias do calendário
  const diasCalendario = useMemo(() => {
    const primeirodia = mesSelecionado.startOf('month');
    const ultimoDia = mesSelecionado.endOf('month');
    const diasAnteriores = primeirodia.day();

    const dias = [];

    // Dias do mês anterior (cinza)
    for (let i = diasAnteriores - 1; i >= 0; i--) {
      dias.push({
        data: primeirodia.subtract(i + 1, 'day'),
        mesAnterior: true
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= ultimoDia.date(); i++) {
      dias.push({
        data: mesSelecionado.date(i),
        mesAnterior: false
      });
    }

    // Dias do próximo mês para completar a grade
    const diasFaltando = 42 - dias.length;
    for (let i = 1; i <= diasFaltando; i++) {
      dias.push({
        data: ultimoDia.add(i, 'day'),
        mesProximo: true
      });
    }

    return dias;
  }, [mesSelecionado]);

  const nomeFilial = useMemo(() => {
    return filiais.find(f => f.id === parseInt(filialSelecionada))?.nome || 'Selecione';
  }, [filialSelecionada, filiais]);

  // Filial padrão para novo cadastro: sempre "Pontes e Lacerda" se existir
  const filialPadrao = useMemo(() => {
    const pl = filiais.find(f => /pontes e lacerda/i.test(f.nome || ''));
    return pl ? pl.id : (filialSelecionada || '');
  }, [filiais, filialSelecionada]);

  // Data padrão para novo cadastro: dia seguinte à última ação da filial padrão
  const dataPadrao = useMemo(() => {
    const idFilial = parseInt(filialPadrao);
    const acoesFilial = acoes.filter(a => a.id_filial === idFilial);
    if (acoesFilial.length === 0) return dayjs().format('YYYY-MM-DD');
    const ultimaData = acoesFilial.reduce((max, a) => (a.data > max ? a.data : max), acoesFilial[0].data);
    return dayjs(ultimaData).add(1, 'day').format('YYYY-MM-DD');
  }, [acoes, filialPadrao]);

  return (
    <div className="animate-fade-in space-y-4">
      {/* LEMBRETE */}
      {lembreteVisivel && (
        <ModalLembreteAcao
          acao={lembreteDia}
          usuario={usuario}
          onClose={() => setLembreteVisivel(false)}
        />
      )}

      {/* MODAL DE AÇÃO */}
      {modalVisivel && (
        <ModalAcao
          acao={acaoEditando}
          filiais={filiais}
          usuarios={usuarios}
          filialPadrao={filialPadrao}
          dataPadrao={dataPadrao}
          onClose={() => {
            setModalVisivel(false);
            setAcaoEditando(null);
          }}
          onSave={handleSaveAcao}
        />
      )}

      {/* BARRA SUPERIOR */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3 bg-gray-800/50 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-300">
            <FaCalendarAlt size={12} /> Ações — {nomeFilial}
          </h3>
          {filiais.length > 0 && (
            <select
              value={filialSelecionada}
              onChange={(e) => setFilialSelecionada(e.target.value)}
              className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
            >
              {filiais.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-700/60 rounded-md px-1 py-0.5">
            <button
              type="button"
              onClick={() => setMesSelecionado(mesSelecionado.subtract(1, 'month'))}
              className="p-1.5 hover:bg-gray-600 rounded text-gray-200"
              aria-label="Mês anterior"
            >
              <FaChevronLeft size={12} />
            </button>
            <span className="text-sm font-semibold text-white capitalize min-w-[130px] text-center">
              {mesSelecionado.format('MMMM [de] YYYY')}
            </span>
            <button
              type="button"
              onClick={() => setMesSelecionado(mesSelecionado.add(1, 'month'))}
              className="p-1.5 hover:bg-gray-600 rounded text-gray-200"
              aria-label="Próximo mês"
            >
              <FaChevronRight size={12} />
            </button>
          </div>
          {podeEditar && (
            <button
              type="button"
              onClick={() => {
                setAcaoEditando(null);
                setModalVisivel(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-white shrink-0"
            >
              <FaPlus size={12} /> Nova Ação
            </button>
          )}
        </div>
      </div>

      {/* CALENDÁRIO */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <FaSpinner className="animate-spin text-indigo-400" size={32} />
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
          {/* Cabeçalho de dias da semana */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(dia => (
              <div key={dia} className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-1">
                {dia}
              </div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-1.5">
            {diasCalendario.map((dia, idx) => {
              const dataFormatada = dia.data.format('YYYY-MM-DD');
              const acoesdo = acoesDoMes.filter(a => a.data === dataFormatada);
              const ehHoje = dayjs().format('YYYY-MM-DD') === dataFormatada;
              const foraDoMes = dia.mesAnterior || dia.mesProximo;

              return (
                <div
                  key={idx}
                  className={`min-h-[72px] sm:min-h-[88px] p-1.5 rounded-lg border transition-colors ${
                    foraDoMes
                      ? 'bg-gray-800/20 border-gray-700/40'
                      : ehHoje
                      ? 'bg-green-500/10 border-green-500/70'
                      : 'bg-gray-900/30 border-gray-700/60 hover:border-indigo-500/50'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-1 ${
                    foraDoMes ? 'text-gray-600' : ehHoje ? 'text-green-300' : 'text-gray-300'
                  }`}>
                    {dia.data.date()}
                  </p>

                  <div className="space-y-1">
                    {acoesdo.map(acao => (
                      <CardAcao
                        key={acao.id}
                        acao={acao}
                        podeEditar={podeEditar}
                        onEdit={(a) => {
                          setAcaoEditando(a);
                          setModalVisivel(true);
                        }}
                        onDelete={handleDeleteAcao}
                        onView={(a) => {
                          setLembreteDia(a);
                          setLembreteVisivel(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* LEGENDA */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-gray-700/50">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-500/20 border border-green-500 rounded-sm" />
              <span className="text-[11px] text-gray-400">Hoje</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-indigo-600/20 border border-indigo-500 rounded-sm" />
              <span className="text-[11px] text-gray-400">Ação cadastrada</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}