// src/pages/PainelVendedor.js (VERSÃO CORRIGIDA)
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import LembretesLeads from '../components/LembretesLeads';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import PainelCRM from './PainelCRM';
import {
  FaDollarSign, FaHandHoldingUsd, FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaSave,
  FaFileInvoiceDollar, FaUsers, FaTrophy, FaCar, FaHome, FaBlender, FaSpinner, FaExclamationTriangle, FaCheckCircle,
  FaBullseye, FaChartLine, FaTh, FaFilter, FaLandmark,
  FaSignOutAlt, FaUserCircle, FaCalendarAlt
} from 'react-icons/fa';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import HSCotas from './HSCotas';
import PainelContempladasAprimorado from './PainelContempladas';
import MinhaContaModal from '../components/MinhaContaModal';
import PainelAcoes from './PainelAcoes';
import LembreteAcaoDiaria from '../components/LembreteAcaoDiaria'; // <--- ADICIONE ISSO
import {
  PERCENT_CHEIA,
  PERCENT_MEIA,
  mesReferenciaComissaoP1,
  totalComissaoP1RecebidaNoMes,
  totaisPagamentosP2P3,
  calcularEstornoMes,
  isParcelaCheia,
  normalizarMesVenda,
  dayjsMesRef,
  nomeMesPortuguesUpper,
} from '../utils/comissoes';
import { limparFlagsLembreteRetorno } from '../utils/crmLembreteStorage';

dayjs.locale('pt-br');

// --- Constantes de Comissão (Corretas) ---
// (Não precisamos de STATUS_OPCOES aqui, pois o vendedor não pode editar)

// --- Componentes de UI Reutilizáveis ---
const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-gray-800 p-5 rounded-xl shadow-lg flex items-center space-x-4">
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-2xl font-bold text-white`}>{(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
    </div>
  </div>
);

// SaleCard (Correto - sem <select> de status)
const SaleCard = ({ venda, onEdit, onDelete }) => (
  <div className="bg-gray-800/70 rounded-xl shadow-lg flex flex-col border border-gray-700/50">
    <header className="p-4 flex justify-between items-center border-b border-gray-700">
      <h4 className="font-bold text-lg text-white">{venda.cliente.toUpperCase()}</h4>
      <span className={`px-3 py-1 text-xs font-bold rounded-full ${isParcelaCheia(venda) ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-400'}`}>
        {isParcelaCheia(venda) ? 'PARCELA CHEIA' : 'PARCELA MEIA'}
      </span>
    </header>
    
    <div className="p-4 grid grid-cols-2 gap-4 text-sm flex-grow">
      <div><p className="text-gray-400">Valor</p><p className="font-semibold">{Number(venda.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
      <div><p className="text-gray-400">Admin</p><p className="font-semibold">{venda.administradora}</p></div>
      <div><p className="text-gray-400">Grupo</p><p className="font-semibold">{venda.grupo}</p></div>
      <div><p className="text-gray-400">Cota</p><p className="font-semibold">{venda.cota}</p></div>
    </div>
    <div className="px-4 pb-4 text-xs">
        <p className="text-gray-400 mb-1">Status das Comissões:</p>
        <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map(i => {
                const status = venda[`status_parcela_${i}`] || 'PENDENTE';
                let cor = 'text-gray-500';
                if (status === 'PAGO') cor = 'text-green-400';
                if (status === 'VENCIDO' || status === 'ESTORNO') cor = 'text-red-400';
                if (status === 'PENDENTE') cor = 'text-yellow-400';

                return (
                    <span key={i} className={`font-semibold ${cor}`}>
                        P{i}: {status}
                    </span>
                );
            })}
        </div>
    </div>
    <footer className="p-3 border-t border-gray-700/50 flex justify-end">
      <div className="flex gap-2">
        <button onClick={onEdit} className="p-2 text-blue-400 hover:text-blue-300"><FaEdit size={16} /></button>
        <button onClick={onDelete} className="p-2 text-red-500 hover:text-red-400"><FaTrash size={16} /></button>
      </div>
    </footer>
  </div>
);

const LoadingSpinner = ({ text = "Carregando..." }) => (
    <div className="flex flex-col justify-center items-center h-full py-20 text-white">
        <FaSpinner className="animate-spin text-indigo-400" size={48} /><p className="mt-4 text-lg">{text}</p>
    </div>
);
const EmptyState = ({ title, message }) => (
    <div className="text-center py-20 bg-gray-800/50 rounded-xl">
        <FaExclamationTriangle className="mx-auto text-gray-500" size={48} /><h3 className="mt-4 text-xl font-semibold text-white">{title}</h3><p className="text-gray-400 mt-1">{message}</p>
    </div>
);
const getStatusStyle = (status) => ({ 'DISPONÍVEL': 'bg-green-500/20 text-green-400', 'RESERVADO': 'bg-yellow-500/20 text-yellow-400', 'EM ANÁLISE': 'bg-blue-500/20 text-blue-400', 'VENDIDO': 'bg-red-500/20 text-red-400' }[status] || 'bg-gray-500/20 text-gray-400');
const getTypeIcon = (tipo) => ({ 'AUTOMÓVEL': <FaCar />, 'IMÓVEL': <FaHome />, 'ELETRO': <FaBlender /> }[tipo] || null);
const CartaCard = ({ item }) => (
    <div className="bg-gray-800/70 rounded-xl shadow-lg flex flex-col border border-gray-700/50">
        <header className={`p-4 rounded-t-xl flex justify-between items-center border-b border-gray-700 ${getStatusStyle(item.status)} bg-opacity-30`}>
            <div><p className="text-xs font-bold uppercase flex items-center gap-2">{getTypeIcon(item.tipo)} {item.tipo}</p><p className="text-2xl font-bold text-white">{Number(item.valor_credito).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
            <div className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(item.status)}`}>{item.status}</div>
        </header>
        <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-grow">
            <div><p className="text-gray-400">Entrada</p><p className="font-semibold">{Number(item.entrada).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
            <div><p className="text-gray-400">Parcela</p><p className="font-semibold">{Number(item.parcela).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} x {item.meses}</p></div>
            <div><p className="text-gray-400">Grupo/Cota</p><p className="font-semibold">{item.grupo}/{item.cota}</p></div>
            <div><p className="text-gray-400">Taxa Transf.</p><p className="font-semibold">{Number(item.taxa_transferencia).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
        </div>
        <footer className="px-4 py-3 border-t border-gray-700/50 text-xs">
            <p className="text-gray-400">Responsável: <span className="text-gray-300 font-medium">{item.responsavel}</span></p>
        </footer>
    </div>
);
const RankingCard = ({ posicao, nome, valor, isCurrentUser }) => {
    const medalhas = ['🥇', '🥈', '🥉'];
    const prefixo = posicao < 3 ? medalhas[posicao] : <span className="text-gray-400 font-bold">{posicao + 1}º</span>;
    return (
        <div className={`p-4 rounded-xl flex items-center justify-between transition-all ${isCurrentUser ? 'bg-indigo-600/30 ring-2 ring-indigo-500' : 'bg-gray-800'}`}>
            <div className="flex items-center gap-4">
                <span className="text-2xl w-8 text-center">{prefixo}</span>
                <span className={`font-bold ${isCurrentUser ? 'text-white' : 'text-gray-300'}`}>{nome}</span>
            </div>
            <span className="font-bold text-lg text-green-400">{valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
    );
};

function ModalAlertaVendedor({ titulo, texto, variant, onFechar }) {
  const isErro = variant === 'erro';
  const isOk = variant === 'sucesso';
  const barra = isErro
    ? 'bg-red-500/10 border-b border-red-500/25 text-red-400'
    : isOk
      ? 'bg-green-500/10 border-b border-green-500/30 text-green-400'
      : 'bg-indigo-500/10 border-b border-indigo-500/25 text-indigo-300';
  const IconTopo = isOk ? FaCheckCircle : FaExclamationTriangle;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-alerta-vendedor-titulo"
      onClick={onFechar}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-5 py-4 flex items-start gap-3 ${barra}`}>
          <IconTopo size={22} className="shrink-0 mt-0.5" />
          <div>
            <h2 id="modal-alerta-vendedor-titulo" className="text-lg font-bold text-white">
              {titulo}
            </h2>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed whitespace-pre-wrap">{texto}</p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-700 bg-gray-900/40 flex justify-end">
          <button
            type="button"
            onClick={onFechar}
            className="px-6 py-2.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalConfirmarExcluirVenda({ nomeCliente, onCancelar, onConfirmar }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-excluir-venda-vendedor"
      onClick={onCancelar}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-red-500/10 border-b border-red-500/25 px-5 py-4 flex items-start gap-3">
          <FaExclamationTriangle size={22} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <h2 id="confirm-excluir-venda-vendedor" className="text-lg font-bold text-white">
              Excluir venda
            </h2>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              Excluir a venda de <span className="font-semibold text-white">{(nomeCliente || '').toUpperCase()}</span>? Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-700 bg-gray-900/40 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="px-5 py-2.5 rounded-lg font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="px-5 py-2.5 rounded-lg font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Componente Principal ---
export default function PainelVendedor() {
  const [aba, setAba] = useState('vendas');
  const [formulario, setFormulario] = useState({ cliente: '', grupo: '', cota: '', valor: '', parcela: 'cheia', administradora: 'GAZIN' });
  const [allVendas, setAllVendas] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState(null); 
  const [mesFiltro, setMesFiltro] = useState(dayjs().format('YYYY-MM'));
  const [editandoId, setEditandoId] = useState(null);
  const [formVisivel, setFormVisivel] = useState(false);
  const [contempladas, setContempladas] = useState([]);
  const [configuracoes, setConfiguracoes] = useState({ meta_geral: 0, duplas: [] });
  const [comissaoLiberadaMes, setComissaoLiberadaMes] = useState(0);
  const [pagamentosMes, setPagamentosMes] = useState([]);
  const navigate = useNavigate();
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [modalAlerta, setModalAlerta] = useState(null);
  const [vendaParaExcluirConfirm, setVendaParaExcluirConfirm] = useState(null);

  const handleLogout = async () => {
      limparFlagsLembreteRetorno();
      await supabase.auth.signOut();
      navigate('/login');
  };

  // --- Função separada para buscar comissões ---
  const buscarComissoesLiberadas = useCallback(async (userId) => {
    if (!userId) return;
    
    const mesAtual = dayjs().format('YYYY-MM');
    
    const { data, error } = await supabase
      .from('pagamentos_comissao')
      .select('valor_comissao')
      .eq('mes_pagamento', mesAtual) // Pagamentos no mês atual
      .eq('usuario_id', userId)      // Apenas deste vendedor
      .neq('parcela_index', 1);      // Que não sejam P1

    if (error) {
      console.error("Erro ao buscar comissões liberadas:", error);
      setComissaoLiberadaMes(0);
      return;
    }
    
    if (data) {
      const totalLiberado = data.reduce((acc, item) => acc + item.valor_comissao, 0);
      setComissaoLiberadaMes(totalLiberado);
    } else {
      setComissaoLiberadaMes(0);
    }
  }, []); // Dependência vazia, será chamada manualmente

  const carregarTodosDados = useCallback(async (mes, userId) => {
    if (!userId) return;
    setLoading(true);

    const { data: perfil } = await supabase
      .from('usuarios_custom')
      .select('id_filial')
      .eq('id', userId)
      .single();

    if (!perfil) {
      console.error("Não foi possível encontrar o perfil do usuário.");
      setLoading(false);
      return;
    }

    const [vendasRes, usersRes, contempladasRes, configRes] = await Promise.all([
      supabase.from('vendas')
        .select('*, usuarios_custom(id_filial)')
        .eq('usuarios_custom.id_filial', perfil.id_filial)
        .order('created_at', { ascending: false }),
      supabase.from('usuarios_custom')
        .select('id, nome')
        .eq('id_filial', perfil.id_filial),
      supabase.from('contempladas').select('*'),
      supabase.from('configuracoes_mensais')
              .select('*')
              .eq('mes', mes)
              .eq('id_filial', perfil.id_filial) 
              .single(),
    ]);

    if (vendasRes.data) setAllVendas(vendasRes.data);
    if (usersRes.data) setAllUsers(usersRes.data);
    if (contempladasRes.data) {
        const peso = { 'DISPONÍVEL': 0, 'RESERVADO': 1, 'EM ANÁLISE': 2, 'VENDIDO': 3 };
        setContempladas(contempladasRes.data.sort((a, b) => peso[a.status] - peso[b.status]));
    }
    if (configRes.data) {
        setConfiguracoes(configRes.data);
    } else {
        setConfiguracoes({ mes: mes, meta_geral: 0, duplas: [] });
    }

    const { data: pagamentosData } = await supabase
      .from('pagamentos_comissao')
      .select('*')
      .eq('usuario_id', userId)
      .eq('mes_pagamento', mes);
    setPagamentosMes(pagamentosData || []);
    
    await buscarComissoesLiberadas(userId); // Busca comissões

    setLoading(false);
  }, [buscarComissoesLiberadas]); // Adiciona a função como dependência
  
  useEffect(() => {
    const getUserAndData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }
        
        const { data: perfilData } = await supabase
          .from('usuarios_custom')
          // --- CORREÇÃO AQUI: Adicionado 'id_filial' na lista ---
          .select('id, nome, email, cargo, telefone, foto_url, id_filial') 
          .eq('id', user.id)
          .single();

        if (perfilData) {
          setUsuario(perfilData);
        } else {
          // Fallback caso não tenha perfil customizado, mas idealmente deve ter
          setUsuario({ id: user.id, email: user.email, nome: user.email.split('@')[0], id_filial: null }); 
        }
    }
    getUserAndData();
  }, [navigate]);

  useEffect(() => {
    if (usuario) {
        carregarTodosDados(mesFiltro, usuario.id);
    }
  }, [usuario, mesFiltro, carregarTodosDados]);
  
  const formatInputMoeda = (txt) => {
    if(!txt) return '';
    const valorNumerico = String(txt).replace(/\D/g, '');
    if(!valorNumerico) return '';
    return (parseFloat(valorNumerico) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }

  const desformatarMoeda = (txt) => {
    if(!txt) return 0;
    return parseFloat(String(txt).replace(/\./g, '').replace(',', '.'));
  }

const handleSave = async (e) => {
    e.preventDefault();
    if (!usuario) {
      setModalAlerta({
        variant: 'erro',
        titulo: 'Sessão',
        texto: 'Usuário não encontrado. Faça login novamente.',
      });
      return;
    }

    const valorDesformatado = desformatarMoeda(formulario.valor);
    const mesSalvar = editandoId
      ? normalizarMesVenda(formulario.mes) || dayjs(mesFiltro).format('YYYY-MM')
      : dayjs(mesFiltro).format('YYYY-MM');

    if (!editandoId) {
      const insertPayload = {
        cliente: formulario.cliente.toUpperCase(),
        grupo: formulario.grupo,
        cota: formulario.cota,
        valor: valorDesformatado,
        parcela: formulario.parcela,
        administradora: formulario.administradora,
        mes: mesSalvar,
        usuario_id: usuario.id,
        status_parcela_1: 'PAGO',
        status_parcela_2: 'PENDENTE',
        status_parcela_3: 'PENDENTE',
        status_parcela_4: 'PENDENTE',
        status_parcela_5: 'PENDENTE',
        mes_conferencia_parcela_1: dayjs().format('YYYY-MM'),
      };

      const { data: vendaInserida, error } = await supabase.from('vendas').insert([insertPayload]).select().single();

      if (error) {
        setModalAlerta({
          variant: 'erro',
          titulo: 'Erro ao criar venda',
          texto: error.message,
        });
        return;
      }

      const percentuais = isParcelaCheia(vendaInserida) ? PERCENT_CHEIA : PERCENT_MEIA;
      const valorComissao1 = vendaInserida.valor * percentuais[0];

      if (valorComissao1 > 0) {
        await supabase.from('pagamentos_comissao').insert({
          venda_id: vendaInserida.id,
          usuario_id: usuario.id,
          parcela_index: 1,
          valor_comissao: valorComissao1,
          mes_pagamento: mesReferenciaComissaoP1(vendaInserida.mes),
        });
      }
    } else {
      const updatePayload = {
        cliente: formulario.cliente.toUpperCase(),
        grupo: formulario.grupo,
        cota: formulario.cota,
        valor: valorDesformatado,
        parcela: formulario.parcela,
        administradora: formulario.administradora,
        mes: mesSalvar,
      };

      const { error } = await supabase
        .from('vendas')
        .update(updatePayload)
        .eq('id', editandoId)
        .eq('usuario_id', usuario.id);

      if (error) {
        setModalAlerta({
          variant: 'erro',
          titulo: 'Erro ao atualizar',
          texto: error.message,
        });
        return;
      }
    }

    await carregarTodosDados(mesFiltro, usuario.id);
    limparFormulario();
};
  
  const iniciarEdicao = (venda) => {
    setEditandoId(venda.id);
    setFormulario({
      cliente: venda.cliente || '',
      grupo: venda.grupo ?? '',
      cota: venda.cota ?? '',
      valor: formatInputMoeda(String(Number(venda.valor) * 100)),
      parcela: venda.parcela || 'cheia',
      administradora: venda.administradora || 'GAZIN',
      mes: normalizarMesVenda(venda.mes) || dayjs(mesFiltro).format('YYYY-MM'),
    });
    setFormVisivel(true);
  };

  const solicitarExclusaoVenda = (venda) => {
    setVendaParaExcluirConfirm({ id: venda.id, cliente: venda.cliente });
  };

  const confirmarExclusaoVenda = async () => {
    if (!vendaParaExcluirConfirm || !usuario) return;
    const idExcluir = vendaParaExcluirConfirm.id;
    setVendaParaExcluirConfirm(null);
    setLoading(true);
    const { error } = await supabase
      .from('vendas')
      .delete()
      .eq('id', idExcluir)
      .eq('usuario_id', usuario.id);
    if (error) {
      setModalAlerta({
        variant: 'erro',
        titulo: 'Erro ao excluir',
        texto: error.message,
      });
      setLoading(false);
      return;
    }
    await carregarTodosDados(mesFiltro, usuario.id);
    setModalAlerta({
      variant: 'sucesso',
      titulo: 'Venda excluída',
      texto: 'A venda foi removida com sucesso.',
    });
  };
  
  const limparFormulario = () => {
      setFormulario({ cliente: '', grupo: '', cota: '', valor: '', parcela: 'cheia', administradora: 'GAZIN' });
      setEditandoId(null);
      setFormVisivel(false);
  };

  // Vendedor NÃO PODE alterar status, então esta função é removida.
  // const handleStatusChange = ...

  const minhasVendasDoMes = useMemo(() => {
    const m = normalizarMesVenda(mesFiltro);
    return allVendas.filter(
      (v) => v.usuario_id === usuario?.id && normalizarMesVenda(v.mes) === m
    );
  }, [allVendas, usuario, mesFiltro]);

 const totaisPessoais = useMemo(() => {
    const totalMes = minhasVendasDoMes.reduce((s, v) => s + Number(v.valor), 0);
    
    const comissaoRecebida = minhasVendasDoMes.reduce((s, venda) => {
        const base = Number(venda.valor);
        // ===========================================
        // --- BUG 2 CORRIGIDO AQUI ---
        // (Usando as constantes globais PERCENT_CHEIA/PERCENT_MEIA)
        const pc = isParcelaCheia(venda) ? PERCENT_CHEIA : PERCENT_MEIA;
        // ===========================================
        
        if (venda.status_parcela_1 === 'PAGO') s += base * pc[0];
        if (venda.status_parcela_2 === 'PAGO') s += base * pc[1];
        if (venda.status_parcela_3 === 'PAGO') s += base * pc[2];
        if (venda.status_parcela_4 === 'PAGO') s += base * pc[3]; // <-- Linha corrigida

        return s;
    }, 0);

    return { totalMes, comissaoRecebida };
}, [minhasVendasDoMes]);

  const vendasDoMesEscritorio = useMemo(() => {
    const m = normalizarMesVenda(mesFiltro);
    return allVendas.filter((v) => normalizarMesVenda(v.mes) === m);
  }, [allVendas, mesFiltro]);
  const totalVendidoEscritorioMes = useMemo(() => {
    return vendasDoMesEscritorio.reduce((s, v) => s + Number(v.valor), 0);
  }, [vendasDoMesEscritorio]);

  const faltaParaMetaEscritorioMes = useMemo(() => {
    const meta = configuracoes?.meta_geral || 0;
    const falta = meta - totalVendidoEscritorioMes;
    return falta > 0 ? falta : 0;
  }, [configuracoes?.meta_geral, totalVendidoEscritorioMes]);

  const totaisVendedorParaPrint = useMemo(() => {
    const uid = usuario?.id;
    if (!uid) {
      return {
        totalVendidoMes: 0,
        totalComissaoP1: 0,
        totalComissaoP2Liberada: 0,
        totalComissaoP3Liberada: 0,
        totalEstorno: 0,
        totalAPagar: 0,
        itensEstorno: [],
      };
    }

    const totalVendidoMes = (minhasVendasDoMes || []).reduce(
      (s, v) => s + (Number(v.valor) || 0),
      0
    );

    const vendasPorId = {};
    (allVendas || []).forEach((v) => {
      vendasPorId[v.id] = v;
    });

    const vendasDoVendedor = (allVendas || []).filter((v) => v.usuario_id === uid);

    const totalComissaoP1 = totalComissaoP1RecebidaNoMes(vendasDoVendedor, uid, mesFiltro);
    const { totalComissaoP2Liberada, totalComissaoP3Liberada } = totaisPagamentosP2P3(
      pagamentosMes,
      uid,
      vendasPorId
    );
    const { totalEstorno, itens: itensEstorno } = calcularEstornoMes(vendasDoVendedor, mesFiltro);

    const totalAPagar =
      totalComissaoP1 + totalComissaoP2Liberada + totalComissaoP3Liberada - totalEstorno;

    return {
      totalVendidoMes,
      totalComissaoP1,
      totalComissaoP2Liberada,
      totalComissaoP3Liberada,
      totalEstorno,
      totalAPagar,
      itensEstorno,
    };
  }, [minhasVendasDoMes, pagamentosMes, allVendas, usuario, mesFiltro]);
  
  const totalDisponivelContempladas = useMemo(() => {
    return contempladas
      .filter(c => c.status === 'DISPONÍVEL')
      .reduce((acc, c) => acc + (Number(c.valor_credito) || 0), 0);
  }, [contempladas]);

  const abas = [
    { id: 'vendas', label: 'Minhas Vendas', icon: <FaFileInvoiceDollar /> },
    { id: 'ranking', label: 'Ranking', icon: <FaTrophy /> },
    { id: 'crm', label: 'CRM', icon: <FaUsers /> },
    { id: 'contempladas', label: 'Contempladas', icon: <FaChartLine /> },
    { id: 'hs_cotas', label: 'Cotas HS', icon: <FaTh /> },
    { id: 'acoes', label: 'Ações', icon: <FaCalendarAlt /> }, 
  ];
  
const renderContent = () => {
      if (loading && !usuario) return <LoadingSpinner />;
      
      switch(aba) {
          case 'vendas': 
              return <AbaMinhasVendas 
                  totalVendidoEscritorioMes={totalVendidoEscritorioMes}
                  faltaParaMetaEscritorioMes={faltaParaMetaEscritorioMes}
                  totaisVendedorParaPrint={totaisVendedorParaPrint}
                  mesFiltro={mesFiltro} 
                  setMesFiltro={setMesFiltro} 
                  formVisivel={formVisivel} 
                  setFormVisivel={setFormVisivel} 
                  formulario={formulario} 
                  setFormulario={setFormulario} 
                  handleSave={handleSave} 
                  editandoId={editandoId} 
                  limparFormulario={limparFormulario} 
                  minhasVendas={minhasVendasDoMes}
                  iniciarEdicao={iniciarEdicao} 
                  solicitarExclusaoVenda={solicitarExclusaoVenda} 
                  formatInputMoeda={formatInputMoeda} 
                  loading={loading}
                  // onStatusChange NÃO é passado, pois o vendedor não pode alterar
              />;
          case 'acoes':
            const filialVendedor = usuario?.id_filial ? [{ id: usuario.id_filial, nome: 'Minha Filial' }] : [];
  return <PainelAcoes 
    usuario={usuario}
    podeEditar={false}
    filiais={filialVendedor}
    usuarios={[]}
  />;
          case 'ranking': 
              return <AbaRankingVendedor 
                  vendas={allVendas} 
                  usuarios={allUsers} 
                  mesFiltro={mesFiltro} 
                  setMesFiltro={setMesFiltro} 
                  configuracoes={configuracoes} 
                  usuarioAtual={usuario} 
                  loading={loading}
              />;
          case 'crm': 
              return <PainelCRM 
                  usuarioId={usuario?.id} 
                  onAviso={(payload) => setModalAlerta(payload)}
              />;
          case 'contempladas': 
              return <PainelContempladasAprimorado 
                  usuario={usuario} 
              />;
          case 'hs_cotas': 
              return <HSCotas 
                  usuario={usuario} 
                  onAviso={(payload) => setModalAlerta(payload)}
              />;
          default: 
              return null;
      }
  };
  
  return (
    <div className="min-h-[100dvh] min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-gray-900 text-white p-4 sm:p-6 md:p-8 animate-fade-in">
        <header className="mb-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-4xl font-bold text-white">Painel do Vendedor</h1>
                    <p className="text-gray-400 mt-1">Bem-vindo(a) de volta, {(usuario?.nome || usuario?.email?.split('@')[0] || '').split(' ')[0]}!</p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setModalContaVisivel(true)}
                        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                    >
                        <FaUserCircle /> Minha Conta
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                    >
                        <FaSignOutAlt /> Sair
                    </button>
                </div>
            </div>
            <nav className="mt-6 flex flex-wrap gap-2 border-b border-gray-700 pb-2">
                {abas.map((item) => (
                    <button key={item.id} onClick={() => setAba(item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold transition-all ${aba === item.id ? 'bg-gray-800/50 text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                        {item.icon} {item.label}
                    </button>
                ))}
            </nav>
        </header>

        <LembretesLeads />

        {modalAlerta && (
          <ModalAlertaVendedor
            variant={modalAlerta.variant}
            titulo={modalAlerta.titulo}
            texto={modalAlerta.texto}
            onFechar={() => setModalAlerta(null)}
          />
        )}
        {vendaParaExcluirConfirm && (
          <ModalConfirmarExcluirVenda
            nomeCliente={vendaParaExcluirConfirm.cliente}
            onCancelar={() => setVendaParaExcluirConfirm(null)}
            onConfirmar={confirmarExclusaoVenda}
          />
        )}

        <main className="mt-6">{renderContent()}</main>
        {usuario && <LembreteAcaoDiaria usuario={usuario} />}

        {modalContaVisivel && usuario && (
            <MinhaContaModal 
                usuario={usuario} 
                onClose={() => setModalContaVisivel(false)}
                onUpdate={() => {
                    const reFetchProfile = async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            const { data: perfilData } = await supabase
                              .from('usuarios_custom')
                              .select('id, nome, email, cargo, telefone, foto_url, id_filial')
                              .eq('id', user.id)
                              .single();
                            if (perfilData) setUsuario(perfilData);
                        }
                    };
                    reFetchProfile();
                }}
            />
        )}

    </div>
  );
}

// --- COMPONENTE AbaMinhasVendas ---
const AbaMinhasVendas = ({ totalVendidoEscritorioMes, faltaParaMetaEscritorioMes, totaisVendedorParaPrint, mesFiltro, setMesFiltro, formVisivel, setFormVisivel, formulario, setFormulario, handleSave, editandoId, limparFormulario, minhasVendas, iniciarEdicao, solicitarExclusaoVenda, formatInputMoeda, loading, onStatusChange }) => {
    const formatarMoeda = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const [modalEstornoAberto, setModalEstornoAberto] = useState(false);
    const dMes = dayjsMesRef(mesFiltro);
    const mesLabel = dMes.format('MMMM');
    const mesAnoLabel = dMes.format('MMMM [de] YYYY');
    const mesNomeUpper = nomeMesPortuguesUpper(mesFiltro);
    const mesSeguinteLabel = dMes.add(1, 'month').format('MMMM [de] YYYY');
    const mesP1VendasLabel = dMes.subtract(1, 'month').format('MMMM [de] YYYY');
    const mesP1RecebeLabel = dMes.format('MMMM [de] YYYY');
    const subtituloComissaoP1 = `Comissão P1 (0,30% meia ou 0,60% cheia) das vendas lançadas em ${mesP1VendasLabel}. Você recebe esse valor em ${mesP1RecebeLabel}.`;
    const subtituloEstornoCard = `Esse valor é seu estorno de clientes que foram excluídos no mês de ${mesLabel} que reflete na comissão de ${mesSeguinteLabel}`;
    const subtituloTotalReceber = `Valor total que vai receber das comissões em ${mesSeguinteLabel} já descontado o estorno`;

    const cardClass = "bg-gray-900/30 border border-gray-700 rounded-xl p-4";
    const valueClass = "text-2xl font-extrabold text-white mt-1";
    const titleClass = "text-sm text-gray-400 font-semibold";
    const subtitleClass = "text-[11px] text-gray-400 mt-2 leading-snug";

    return (
    <div className="animate-fade-in">
        {/* Relatório Geral (escritório) */}
        <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Relatório Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={cardClass}>
                    <p className={titleClass}><FaDollarSign className="inline-block mr-2" />{`Total Vendido em ${mesAnoLabel}`}</p>
                    <p className={valueClass}>{formatarMoeda(totalVendidoEscritorioMes)}</p>
                </div>
                <div className={cardClass}>
                    <p className={titleClass}><FaBullseye className="inline-block mr-2" />{`Valor faltante para atingir a meta de ${mesLabel}`}</p>
                    <p className={valueClass}>{formatarMoeda(faltaParaMetaEscritorioMes)}</p>
                </div>
            </div>
        </div>

        {/* Relatório por Vendedor */}
        <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Relatório por Vendedor</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className={cardClass}>
                    <p className={titleClass}><FaDollarSign className="inline-block mr-2" />{`TOTAL VENDIDO MÊS DE ${mesNomeUpper}`}</p>
                    <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalVendidoMes)}</p>
                </div>
                <div className={cardClass}>
                    <p className={titleClass}><FaFileInvoiceDollar className="inline-block mr-2" />TOTAL DE COMISSÃO P1</p>
                    <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalComissaoP1)}</p>
                    <p className={subtitleClass}>{subtituloComissaoP1}</p>
                </div>
                <div className={cardClass}>
                    <p className={titleClass}><FaHandHoldingUsd className="inline-block mr-2" />TOTAL DE COMISSÃO LIBERADA EM P2</p>
                    <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalComissaoP2Liberada)}</p>
                    <p className={subtitleClass}>Esse valor é sua comissão de clientes que pagaram a 2º parcela das vendas anteriores</p>
                </div>
                <div className={cardClass}>
                    <p className={titleClass}><FaHandHoldingUsd className="inline-block mr-2" />TOTAL DE COMISSÃO LIBERADA EM P3</p>
                    <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalComissaoP3Liberada)}</p>
                    <p className={subtitleClass}>Esse valor é sua comissão de clientes que pagaram a 3º parcela das vendas anteriores</p>
                </div>
                <div className={cardClass}>
                    <p className={titleClass + ' flex items-center gap-2 flex-wrap'}>
                      <FaExclamationTriangle className="inline-block" />TOTAL DE ESTORNO
                      <button
                        type="button"
                        title="Ver detalhes dos estornos conferidos neste mês"
                        onClick={() => setModalEstornoAberto(true)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 font-bold text-sm"
                      >
                        !
                      </button>
                    </p>
                    <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalEstorno)}</p>
                    <p className={subtitleClass}>{subtituloEstornoCard}</p>
                </div>
                <div className={cardClass}>
                    <p className={titleClass}><FaLandmark className="inline-block mr-2" />TOTAL À RECEBER</p>
                    <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalAPagar)}</p>
                    <p className={subtitleClass}>{subtituloTotalReceber}</p>
                </div>
            </div>
        </div>

        {modalEstornoAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-gray-800 border border-gray-600 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">Estornos em {mesLabel}</h3>
                <button type="button" onClick={() => setModalEstornoAberto(false)} className="text-gray-400 hover:text-white text-xl px-2">&times;</button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] text-sm">
                {(totaisVendedorParaPrint.itensEstorno || []).length === 0 ? (
                  <p className="text-gray-400">Nenhum estorno (P2–P5) conferido neste mês.</p>
                ) : (
                  <ul className="space-y-3">
                    {totaisVendedorParaPrint.itensEstorno.map((it, idx) => (
                      <li key={`${it.vendaId}-${it.parcela}-${idx}`} className="border border-gray-700 rounded-lg p-3 bg-gray-900/50">
                        <p className="font-semibold text-white">{(it.cliente || '').toUpperCase()}</p>
                        <p className="text-gray-400 text-xs mt-1">Parcela com estorno: P{it.parcela} · Valor P1 estornado: {formatarMoeda(it.valorEstornoComissaoP1)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Lançamentos de {dayjsMesRef(mesFiltro).format('MMMM/YYYY')}</h3>
                <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="bg-gray-700 p-2 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="border-b border-gray-700 mb-4">
                <button onClick={() => setFormVisivel(!formVisivel)} className="w-full flex justify-between items-center py-3 text-lg font-semibold text-indigo-400">
                    <span>{editandoId ? 'Editando Venda' : 'Adicionar Nova Venda'}</span>{formVisivel ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {formVisivel && (
                    <form onSubmit={handleSave} className="pb-4 space-y-4 animate-fade-in">
                        <div className="grid md:grid-cols-3 gap-4">
                            <input name="cliente" value={formulario.cliente} onChange={(e) => setFormulario(prev => ({...prev, cliente: e.target.value.toUpperCase()}))} placeholder="Nome do cliente" className="p-3 bg-gray-700 rounded-lg border border-gray-600" required />
                            <input name="valor" value={formulario.valor} onChange={(e) => setFormulario(prev => ({...prev, valor: formatInputMoeda(e.target.value)}))} placeholder="Valor da venda" className="p-3 bg-gray-700 rounded-lg border border-gray-600" required />
                            <select name="administradora" value={formulario.administradora} onChange={(e) => setFormulario(prev => ({...prev, administradora: e.target.value}))} className="p-3 bg-gray-700 rounded-lg border border-gray-600"><option>GAZIN</option><option>HS</option></select>
                            <input name="grupo" value={formulario.grupo} onChange={(e) => setFormulario(prev => ({...prev, grupo: e.target.value}))} placeholder="Grupo" className="p-3 bg-gray-700 rounded-lg border border-gray-600" required />
                            <input name="cota" value={formulario.cota} onChange={(e) => setFormulario(prev => ({...prev, cota: e.target.value}))} placeholder="Cota" className="p-3 bg-gray-700 rounded-lg border border-gray-600" required />
                            <select name="parcela" value={formulario.parcela} onChange={(e) => setFormulario(prev => ({...prev, parcela: e.target.value}))} className="p-3 bg-gray-700 rounded-lg border border-gray-600"><option value="cheia">Parcela Cheia</option><option value="meia">Parcela Meia</option></select>
                            {editandoId ? (
                              <input type="month" value={formulario.mes || mesFiltro} onChange={(e) => setFormulario(prev => ({ ...prev, mes: e.target.value }))} className="p-3 bg-gray-700 rounded-lg border border-gray-600 md:col-span-1" title="Mês da venda" />
                            ) : null}
                        </div>
                        <div className="flex gap-4"><button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2"><FaSave /> {editandoId ? 'Salvar' : 'Cadastrar'}</button><button type="button" onClick={limparFormulario} className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg">Cancelar</button></div>
                    </form>
                )}
            </div>
            {loading ? <LoadingSpinner text="Carregando vendas..." /> : (
                minhasVendas.length > 0 ? 
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{minhasVendas.map((v) => 
                    <SaleCard 
                        key={v.id} 
                        venda={v} 
                        onEdit={() => iniciarEdicao(v)} 
                        onDelete={() => solicitarExclusaoVenda(v)} 
                    />
                )}</div> 
                : <EmptyState title="Nenhuma Venda no Mês" message="Você ainda não lançou vendas para este período." />
            )}
        </div>
    </div>
    );
};

// --- COMPONENTE AbaRankingVendedor ---
const AbaRankingVendedor = ({ vendas, usuarios, mesFiltro, setMesFiltro, configuracoes, usuarioAtual, loading }) => {
    const totaisPorVendedor = useMemo(() => {
        const m = normalizarMesVenda(mesFiltro);
        const totais = {};
        const vendasDoMes = vendas.filter((v) => normalizarMesVenda(v.mes) === m);
        usuarios.forEach(u => { totais[u.id] = { id: u.id, nome: u.nome, vendido: 0 }; });
        vendasDoMes.forEach((venda) => { if (totais[venda.usuario_id]) { totais[venda.usuario_id].vendido += parseFloat(venda.valor) || 0; } });
        return totais;
    }, [vendas, mesFiltro, usuarios]);
    
    const rankingIndividual = useMemo(() => Object.values(totaisPorVendedor).filter(v => v.vendido > 0).sort((a, b) => b.vendido - a.vendido), [totaisPorVendedor]);
    
    const totaisDuplas = useMemo(() => {
        const duplasParaCalculo = configuracoes.duplas || [];
        return duplasParaCalculo.map(dupla => { 
            const total = dupla.reduce((acc, nome) => { 
                const vendedor = Object.values(totaisPorVendedor).find(v => v.nome === nome); 
                return acc + (vendedor ? vendedor.vendido : 0); 
            }, 0); 
            return { nomes: dupla.join(' e '), total, membros: dupla }; 
        }).sort((a, b) => b.total - a.total);
    }, [configuracoes.duplas, totaisPorVendedor]);

    const vendidoGeral = useMemo(() => rankingIndividual.reduce((acc, v) => acc + v.vendido, 0), [rankingIndividual]);
    const faltaParaMeta = (configuracoes.meta_geral || 0) - vendidoGeral;

    if (loading) return <LoadingSpinner text="Carregando ranking..." />;

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800/50 rounded-xl">
                <h3 className="text-xl font-bold flex items-center gap-2"><FaFilter /> Visualizar Ranking de:</h3>
                <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="w-full md:w-auto bg-gray-700 p-3 rounded-lg border border-gray-600" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-indigo-400">RANKING INDIVIDUAL</h3>
                    <div className="space-y-3">{rankingIndividual.length > 0 ? rankingIndividual.map((vendedor, index) => ( <RankingCard key={vendedor.id} posicao={index} nome={vendedor.nome} valor={vendedor.vendido} isCurrentUser={vendedor.id === usuarioAtual.id} /> )) : <p className="text-gray-500">Ninguém vendeu ainda este mês.</p>}</div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-indigo-400">RANKING DE DUPLAS</h3>
                    <div className="space-y-3">{totaisDuplas.length > 0 ? totaisDuplas.map((dupla, index) => ( <RankingCard key={dupla.nomes} posicao={index} nome={dupla.nomes} valor={dupla.total} isCurrentUser={dupla.membros.includes(usuarioAtual?.nome)} /> )) : <p className="text-gray-500">Duplas não configuradas.</p>}</div>
                </div>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-4 text-indigo-400">METAS DO ESCRITÓRIO</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon={<FaBullseye size={24} />} label="Meta Geral" value={configuracoes.meta_geral} color="bg-indigo-500/20" />
                    <StatCard icon={<FaDollarSign size={24} />} label="Vendido Geral" value={vendidoGeral} color="bg-green-500/20" />
                    <StatCard icon={<FaChartLine size={24} />} label="Falta para a Meta" value={faltaParaMeta > 0 ? faltaParaMeta : 0} color={faltaParaMeta > 0 ? "bg-red-500/20" : "bg-green-500/20"} />
                </div>
            </div>
        </div>
    );
};
