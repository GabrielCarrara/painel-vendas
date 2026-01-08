import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import utc from 'dayjs/plugin/utc';
import isBetween from 'dayjs/plugin/isBetween';
import {
  FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaUsers, FaMapMarkerAlt,
  FaClock, FaExclamationTriangle, FaSpinner, FaChevronLeft, FaChevronRight, FaEye
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
const ModalAcao = ({ acao, filiais, usuarios, onClose, onSave }) => {
  const [formData, setFormData] = useState(
    acao || {
      local: '',
      data: dayjs().format('YYYY-MM-DD'),
      horario: '09:00',
      usuarios: [],
      todos: true,
      descricao: '',
      id_filial: '',
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        <header className="p-6 flex justify-between items-center border-b border-gray-700 sticky top-0 bg-gray-800">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaCalendarAlt /> {acao ? 'Editar Ação' : 'Nova Ação'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full">
            <FaTimes size={20} />
          </button>
        </header>

        <div className="p-6 space-y-4">
          {/* Filial */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Filial *</label>
            <select
              name="id_filial"
              value={formData.id_filial}
              onChange={handleChange}
              className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione uma filial</option>
              {filiais.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          {/* Local */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Local da Ação *</label>
            <input
              type="text"
              name="local"
              value={formData.local}
              onChange={handleChange}
              placeholder="Ex: Shopping, Supermercado, Centro"
              className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Data *</label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Horário *</label>
              <input
                type="time"
                name="horario"
                value={formData.horario}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Descrição (opcional)</label>
            <textarea
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Detalhes sobre a ação..."
              className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
            />
          </div>

          {/* Seleção de Usuários */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="todos"
                name="todos"
                checked={formData.todos}
                onChange={handleChange}
                className="w-5 h-5 rounded"
              />
              <label htmlFor="todos" className="text-sm font-medium text-gray-300">
                Todos os usuários participam
              </label>
            </div>

            {!formData.todos && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Selecione os participantes:
                </label>
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 max-h-48 overflow-y-auto">
                  {usuariosDisponiveis.length > 0 ? (
                    <div className="space-y-2">
                      {usuariosDisponiveis.map(usuario => (
                        <label key={usuario.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-600/50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formData.usuarios.map(u => String(u)).includes(String(usuario.id))}
                            onChange={() => handleUsuarioToggle(usuario.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-white text-sm">{usuario.nome}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      {formData.id_filial ? 'Nenhum usuário encontrado nesta filial' : 'Selecione uma filial primeiro'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="p-4 flex justify-end gap-3 border-t border-gray-700 sticky bottom-0 bg-gray-800">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg font-semibold text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-semibold text-white flex items-center gap-2"
          >
            <FaSave /> Salvar
          </button>
        </footer>
      </div>
    </div>
  );
};

// ==================== COMPONENTE: CARD DE AÇÃO DO CALENDÁRIO ====================
const CardAcao = ({ acao, podeEditar, onEdit, onDelete, onView }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-600/20 to-gray-800 rounded-lg border border-indigo-500/50 p-3 hover:shadow-lg hover:shadow-indigo-500/20 transition-all">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="font-bold text-indigo-300 text-sm flex items-center gap-1">
            <FaMapMarkerAlt size={12} /> {acao.local}
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
            <FaClock size={10} /> {acao.horario}
          </p>
        </div>
        {!podeEditar && (
          <button
            onClick={() => onView(acao)}
            className="p-1 text-indigo-400 hover:text-indigo-300"
            title="Ver detalhes"
          >
            <FaEye size={14} />
          </button>
        )}
      </div>

      {podeEditar && (
        <div className="flex gap-2 pt-2 border-t border-indigo-500/30">
          <button
            onClick={() => onEdit(acao)}
            className="flex-1 text-xs bg-blue-600/50 hover:bg-blue-600 py-1 rounded text-white flex items-center justify-center gap-1"
          >
            <FaEdit size={10} /> Editar
          </button>
          <button
            onClick={() => onDelete(acao.id)}
            className="flex-1 text-xs bg-red-600/50 hover:bg-red-600 py-1 rounded text-white flex items-center justify-center gap-1"
          >
            <FaTrash size={10} /> Deletar
          </button>
        </div>
      )}
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

  return (
    <div className="animate-fade-in">
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
          onClose={() => {
            setModalVisivel(false);
            setAcaoEditando(null);
          }}
          onSave={handleSaveAcao}
        />
      )}

      {/* CABEÇALHO */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <FaCalendarAlt /> Ações Mensais - {nomeFilial}
        </h2>

        <div className="flex items-center gap-4">
          {podeEditar && (
            <button
              onClick={() => {
                setAcaoEditando(null);
                setModalVisivel(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2 text-white"
            >
              <FaPlus /> Nova Ação
            </button>
          )}

          {filiais.length > 0 && (
            <select
              value={filialSelecionada}
              onChange={(e) => setFilialSelecionada(e.target.value)}
              className="bg-gray-700 p-3 rounded-lg border border-gray-600 text-white"
            >
              {filiais.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* NAVEGAÇÃO DE MÊS */}
      <div className="flex justify-between items-center mb-6 bg-gray-800/50 p-4 rounded-xl">
        <button
          onClick={() => setMesSelecionado(mesSelecionado.subtract(1, 'month'))}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
        >
          <FaChevronLeft />
        </button>

        <h3 className="text-2xl font-bold text-white">
          {mesSelecionado.format('MMMM [de] YYYY')}
        </h3>

        <button
          onClick={() => setMesSelecionado(mesSelecionado.add(1, 'month'))}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
        >
          <FaChevronRight />
        </button>
      </div>

      {/* CALENDÁRIO */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <FaSpinner className="animate-spin text-indigo-400" size={48} />
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          {/* Cabeçalho de dias da semana */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(dia => (
              <div key={dia} className="text-center font-bold text-indigo-400 py-2">
                {dia}
              </div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-2">
            {diasCalendario.map((dia, idx) => {
              const dataFormatada = dia.data.format('YYYY-MM-DD');
              const acoesdo = acoesDoMes.filter(a => a.data === dataFormatada);
              const ehHoje = dayjs().format('YYYY-MM-DD') === dataFormatada;

              return (
                <div
                  key={idx}
                  className={`min-h-24 p-2 rounded-lg border-2 transition-all ${
                    dia.mesAnterior || dia.mesProximo
                      ? 'bg-gray-700/30 border-gray-700/50'
                      : ehHoje
                      ? 'bg-green-500/20 border-green-500'
                      : 'bg-gray-700/50 border-gray-600/50'
                  } hover:border-indigo-500`}
                >
                  <p className={`text-sm font-bold mb-1 ${
                    dia.mesAnterior || dia.mesProximo ? 'text-gray-500' : 'text-white'
                  }`}>
                    {dia.data.date()}
                  </p>

                  <div className="space-y-1 text-xs">
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
        </div>
      )}

      {/* LEGENDA */}
      <div className="mt-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700 text-sm text-gray-300">
        <p className="font-semibold mb-2 text-white">Legenda:</p>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500/20 border-2 border-green-500 rounded"></div>
            <span>Hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-600/20 border border-indigo-500 rounded"></div>
            <span>Ação cadastrada</span>
          </div>
        </div>
      </div>
    </div>
  );
}