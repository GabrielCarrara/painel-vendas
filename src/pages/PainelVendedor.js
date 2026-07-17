// src/pages/PainelVendedor.js (VERSÃO CORRIGIDA)
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import LembretesLeads from '../components/LembretesLeads';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import PainelCRM from './PainelCRM';
import {
  FaDollarSign, FaHandHoldingUsd, FaEdit, FaTrash, FaSave, FaPlus,
  FaFileInvoiceDollar, FaUsers, FaTrophy, FaSpinner, FaExclamationTriangle, FaCheckCircle,
  FaBullseye, FaChartLine, FaTh, FaTimes, FaBars,
  FaSignOutAlt, FaUserCircle, FaCalendarAlt, FaClipboard
} from 'react-icons/fa';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import HSCotas from './HSCotas';
import PainelContempladasAprimorado from './PainelContempladas';
import MinhaContaModal from '../components/MinhaContaModal';
import PainelAcoes from './PainelAcoes';
import LembreteAcaoDiaria from '../components/LembreteAcaoDiaria';
import ProcessosKanban from '../components/ProcessosKanban';
import logoFenix from '../assets/logo.png';
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
  valorComissaoP1,
} from '../utils/comissoes';
import { limparFlagsLembreteRetorno } from '../utils/crmLembreteStorage';
import { lerAbaPainel, salvarAbaPainel } from '../utils/abaPainelStorage';

dayjs.locale('pt-br');

const ABA_STORAGE_KEY = 'painel_vendedor_aba';
const ABAS_VALIDAS = ['vendas', 'contempladas', 'hs_cotas', 'processos', 'crm', 'ranking', 'acoes'];

// --- Constantes de Comissão (Corretas) ---
// (Não precisamos de STATUS_OPCOES aqui, pois o vendedor não pode editar)

function somenteNumerosSemZerosAEsquerda(valor) {
  const digits = String(valor || '').replace(/\D/g, '');
  const semZeros = digits.replace(/^0+/, '');
  return semZeros || '';
}

const campoClass = 'w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide';

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-gray-800/60 rounded-lg px-3.5 py-3 border border-gray-700/50 flex items-center gap-3">
    <div className={`p-2 rounded-full shrink-0 ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 truncate">{label}</p>
      <p className="text-base sm:text-lg font-bold text-white tabular-nums">
        {(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  </div>
);

const EmptyStateRow = ({ message, colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-gray-400">{message}</td>
  </tr>
);

const LoadingSpinner = ({ text = 'Carregando...' }) => (
  <div className="flex flex-col justify-center items-center py-12 text-white">
    <FaSpinner className="animate-spin text-indigo-400" size={32} />
    <p className="mt-3 text-sm text-gray-400">{text}</p>
  </div>
);
const RankingCard = ({ posicao, nome, valor, isCurrentUser }) => {
  const medalhas = ['🥇', '🥈', '🥉'];
  const prefixo = posicao < 3 ? medalhas[posicao] : <span className="text-gray-400 font-bold text-sm">{posicao + 1}º</span>;
  return (
    <div className={`px-3 py-2 rounded-lg flex items-center justify-between ${isCurrentUser ? 'bg-indigo-600/25 ring-1 ring-indigo-500' : 'bg-gray-800/60 border border-gray-700/40'}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-base w-7 text-center shrink-0">{prefixo}</span>
        <span className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-white' : 'text-gray-300'}`}>{nome}</span>
      </div>
      <span className="text-sm font-bold text-green-400 tabular-nums shrink-0 ml-2">
        {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-alerta-vendedor-titulo"
      onClick={onFechar}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-4 py-3 flex items-start gap-2.5 ${barra}`}>
          <IconTopo size={18} className="shrink-0 mt-0.5" />
          <div>
            <h2 id="modal-alerta-vendedor-titulo" className="text-base font-semibold text-white">
              {titulo}
            </h2>
            <p className="text-sm text-gray-300 mt-1.5 leading-relaxed whitespace-pre-wrap">{texto}</p>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-excluir-venda-vendedor"
      onClick={onCancelar}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-red-500/10 border-b border-red-500/25 px-4 py-3 flex items-start gap-2.5">
          <FaExclamationTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <h2 id="confirm-excluir-venda-vendedor" className="text-base font-semibold text-white">
              Excluir venda
            </h2>
            <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">
              Excluir a venda de <span className="font-semibold text-white">{(nomeCliente || '').toUpperCase()}</span>? Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-700 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-500 text-white"
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
  const [aba, setAba] = useState(() => lerAbaPainel(ABA_STORAGE_KEY, ABAS_VALIDAS));
  const [formulario, setFormulario] = useState({ cliente: '', grupo: '', cota: '', valor: '', parcela: 'cheia', administradora: 'GAZIN' });
  const [allVendas, setAllVendas] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState(null); 
  const [mesFiltro, setMesFiltro] = useState(dayjs().format('YYYY-MM'));
  const [editandoId, setEditandoId] = useState(null);
  const [formVisivel, setFormVisivel] = useState(false);
  const [, setContempladas] = useState([]);
  const [configuracoes, setConfiguracoes] = useState({ meta_geral: 0, duplas: [] });
  const [, setComissaoLiberadaMes] = useState(0);
  const [pagamentosMes, setPagamentosMes] = useState([]);
  const navigate = useNavigate();
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [modalAlerta, setModalAlerta] = useState(null);
  const [vendaParaExcluirConfirm, setVendaParaExcluirConfirm] = useState(null);
  const [menuLateralAberto, setMenuLateralAberto] = useState(false);

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
    const grupoSan = somenteNumerosSemZerosAEsquerda(formulario.grupo);
    const cotaSan = somenteNumerosSemZerosAEsquerda(formulario.cota);
    if (!grupoSan || !cotaSan) {
      setModalAlerta({
        variant: 'erro',
        titulo: 'Grupo/Cota inválidos',
        texto: 'Informe apenas números em Grupo e Cota (zeros à esquerda são desconsiderados).',
      });
      return;
    }
    const mesSalvar = editandoId
      ? normalizarMesVenda(formulario.mes) || dayjs(mesFiltro).format('YYYY-MM')
      : dayjs(mesFiltro).format('YYYY-MM');

    if (!editandoId) {
      const insertPayload = {
        cliente: formulario.cliente.toUpperCase(),
        grupo: grupoSan,
        cota: cotaSan,
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
        grupo: grupoSan,
        cota: cotaSan,
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
        totalComissaoMesAtual: 0,
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
    const totalComissaoMesAtual = (minhasVendasDoMes || []).reduce((s, v) => {
      const percentuais = isParcelaCheia(v) ? PERCENT_CHEIA : PERCENT_MEIA;
      return s + (Number(v.valor) || 0) * (percentuais[0] || 0);
    }, 0);

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
      totalComissaoMesAtual,
      totalComissaoP2Liberada,
      totalComissaoP3Liberada,
      totalEstorno,
      totalAPagar,
      itensEstorno,
    };
  }, [minhasVendasDoMes, pagamentosMes, allVendas, usuario, mesFiltro]);

  const abas = [
    { id: 'vendas', label: 'Controle de Vendas', icon: <FaFileInvoiceDollar /> },
    { id: 'contempladas', label: 'Cartas Contempladas', icon: <FaChartLine /> },
    { id: 'hs_cotas', label: 'Controle de Cotas HS', icon: <FaTh /> },
    { id: 'processos', label: 'Controle de Processos', icon: <FaClipboard /> },
    { id: 'crm', label: 'Controle de Leads CRM', icon: <FaUsers /> },
    { id: 'ranking', label: 'Ranking de Vendedores', icon: <FaTrophy /> },
    { id: 'acoes', label: 'Quadro de Ações', icon: <FaCalendarAlt /> },
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
                  setEditandoId={setEditandoId}
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
                  cargo={usuario?.cargo}
                  onAviso={(payload) => setModalAlerta(payload)}
              />;
          case 'processos':
              return <ProcessosKanban usuario={usuario} />;
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
    <div className="bg-gray-900 text-gray-200 h-[100dvh] h-screen w-full max-w-[100vw] overflow-hidden flex">
      {menuLateralAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMenuLateralAberto(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 h-full bg-gray-950 border-r border-gray-800 flex flex-col overflow-hidden transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto lg:shrink-0 ${
          menuLateralAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div
          className="relative px-4 pb-4 border-b border-gray-800 flex items-center justify-center shrink-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
        >
          <img src={logoFenix} alt="Fênix Consórcios" className="h-14 w-auto max-w-[15rem] object-contain" />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 lg:hidden text-gray-400 hover:text-white p-1"
            onClick={() => setMenuLateralAberto(false)}
            aria-label="Fechar menu"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-hidden px-3 py-3 space-y-0.5">
          {abas.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setAba(item.id);
                salvarAbaPainel(ABA_STORAGE_KEY, item.id);
                setMenuLateralAberto(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm font-semibold transition-colors ${
                aba === item.id
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              <span className="text-sm shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setModalContaVisivel(true);
              setMenuLateralAberto(false);
            }}
            className="w-full bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
          >
            <FaUserCircle /> Minha Conta
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
          >
            <FaSignOutAlt /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <div
          className="lg:hidden shrink-0 bg-gray-900 border-b border-gray-800 px-4 pb-3 flex items-center"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
        >
          <button
            type="button"
            className="p-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700"
            onClick={() => setMenuLateralAberto(true)}
            aria-label="Abrir menu"
          >
            <FaBars size={18} />
          </button>
        </div>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-5">
          <div className="w-full min-w-0 max-w-none">
            <LembretesLeads />
            <div className="mt-3">{renderContent()}</div>
          </div>
        </main>
      </div>

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
      {usuario && <LembreteAcaoDiaria usuario={usuario} />}

      {formVisivel && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in flex flex-col max-h-[85vh]">
            <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FaPlus className="text-indigo-400" /> {editandoId ? 'Editar venda' : 'Lançar venda'}
              </h3>
              <button type="button" onClick={limparFormulario} className="p-1.5 text-gray-500 hover:text-white rounded-full">
                <FaTimes size={16} />
              </button>
            </header>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
              <div className="sm:col-span-2">
                <label className={labelClass}>Cliente</label>
                <input
                  name="cliente"
                  value={formulario.cliente}
                  onChange={(e) => setFormulario((prev) => ({ ...prev, cliente: e.target.value.toUpperCase() }))}
                  placeholder="Nome do cliente"
                  className={campoClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Valor</label>
                <input
                  name="valor"
                  value={formulario.valor}
                  onChange={(e) => setFormulario((prev) => ({ ...prev, valor: formatInputMoeda(e.target.value) }))}
                  placeholder="0,00"
                  className={`${campoClass} tabular-nums`}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Administradora</label>
                <select
                  name="administradora"
                  value={formulario.administradora}
                  onChange={(e) => setFormulario((prev) => ({ ...prev, administradora: e.target.value }))}
                  className={campoClass}
                >
                  <option>GAZIN</option>
                  <option>HS</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Grupo</label>
                <input
                  name="grupo"
                  inputMode="numeric"
                  value={formulario.grupo}
                  onChange={(e) => setFormulario((prev) => ({ ...prev, grupo: somenteNumerosSemZerosAEsquerda(e.target.value) }))}
                  placeholder="Grupo"
                  className={campoClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Cota</label>
                <input
                  name="cota"
                  inputMode="numeric"
                  value={formulario.cota}
                  onChange={(e) => setFormulario((prev) => ({ ...prev, cota: somenteNumerosSemZerosAEsquerda(e.target.value) }))}
                  placeholder="Cota"
                  className={campoClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Parcela</label>
                <select
                  name="parcela"
                  value={formulario.parcela}
                  onChange={(e) => setFormulario((prev) => ({ ...prev, parcela: e.target.value }))}
                  className={campoClass}
                >
                  <option value="cheia">Parcela Cheia</option>
                  <option value="meia">Parcela Meia</option>
                </select>
              </div>
              {editandoId ? (
                <div>
                  <label className={labelClass}>Mês da venda</label>
                  <input
                    type="month"
                    value={formulario.mes || mesFiltro}
                    onChange={(e) => setFormulario((prev) => ({ ...prev, mes: e.target.value }))}
                    className={campoClass}
                  />
                </div>
              ) : null}
            </div>
            <footer className="px-4 py-3 flex justify-end gap-2 border-t border-gray-700">
              <button type="button" onClick={limparFormulario} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-semibold text-white">
                Cancelar
              </button>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center gap-2">
                <FaSave size={14} /> {editandoId ? 'Salvar' : 'Cadastrar'}
              </button>
            </footer>
          </form>
        </div>
      )}

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
                  .select('id, nome, email, cargo, telefone, foto_url, id_filial, senha_intranet_gazin')
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
const AbaMinhasVendas = ({ totalVendidoEscritorioMes, faltaParaMetaEscritorioMes, totaisVendedorParaPrint, mesFiltro, setMesFiltro, formVisivel, setFormVisivel, formulario, setFormulario, handleSave, editandoId, setEditandoId, limparFormulario, minhasVendas, iniciarEdicao, solicitarExclusaoVenda, formatInputMoeda, loading, onStatusChange }) => {
    const formatarMoeda = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dMes = dayjsMesRef(mesFiltro);
    const mesLabel = dMes.format('MMMM');
    const mesAnoLabel = dMes.format('MMMM [de] YYYY');
    const mesP1VendasLabel = dMes.subtract(1, 'month').format('MMMM [de] YYYY');
    const mesP1RecebeLabel = dMes.format('MMMM [de] YYYY');
    const [anoFiltro, mesNumeroFiltro] = normalizarMesVenda(mesFiltro).split('-');
    const opcoesMes = [
      { value: '01', label: 'Janeiro' },
      { value: '02', label: 'Fevereiro' },
      { value: '03', label: 'Março' },
      { value: '04', label: 'Abril' },
      { value: '05', label: 'Maio' },
      { value: '06', label: 'Junho' },
      { value: '07', label: 'Julho' },
      { value: '08', label: 'Agosto' },
      { value: '09', label: 'Setembro' },
      { value: '10', label: 'Outubro' },
      { value: '11', label: 'Novembro' },
      { value: '12', label: 'Dezembro' },
    ];
    const anoAtual = dayjs().year();
    const anos = Array.from({ length: Math.max(anoAtual, 2025) - 2025 + 1 }, (_, i) => String(2025 + i));
    const atualizarMesAno = (campo, valor) => {
      const proximoMes = campo === 'mes' ? valor : mesNumeroFiltro;
      const proximoAno = campo === 'ano' ? valor : anoFiltro;
      setMesFiltro(`${proximoAno}-${proximoMes}`);
    };

    const cardClass = 'bg-gray-800/40 border border-gray-700/50 rounded-lg px-3 py-2.5';
    const valueClass = 'text-base sm:text-lg font-bold text-white mt-0.5 tabular-nums';
    const titleClass = 'text-xs text-gray-400 font-medium';
    const subtitleClass = 'text-[10px] text-gray-500 mt-1 leading-snug';

    return (
    <div className="animate-fade-in space-y-4">
        <div>
            <h2 className="text-sm font-semibold text-gray-300 mb-2">Total de Vendas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <StatCard icon={<FaDollarSign size={16} />} label={`Total vendido em ${mesAnoLabel}`} value={totalVendidoEscritorioMes} color="bg-green-500/20 text-green-300" />
                <StatCard icon={<FaBullseye size={16} />} label={`Falta para a meta de ${mesLabel}`} value={faltaParaMetaEscritorioMes} color="bg-red-500/20 text-red-300" />
            </div>
        </div>

        <div>
            <h2 className="text-sm font-semibold text-gray-300 mb-2">Relatório de Vendas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <div className={cardClass}>
                    <p className={titleClass}><FaDollarSign className="inline-block mr-1.5" size={11} />Total vendido</p>
                    <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalVendidoMes)}</p>
                </div>
                <div className={cardClass}>
                    <p className={titleClass}><FaFileInvoiceDollar className="inline-block mr-1.5" size={11} />Comissão Mês Passado</p>
                    <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalComissaoP1)}</p>
                    <p className={subtitleClass}>P1 das vendas de {mesP1VendasLabel}, recebida em {mesP1RecebeLabel}.</p>
                </div>
                <div className={cardClass}>
                    <p className={titleClass}><FaHandHoldingUsd className="inline-block mr-1.5" size={11} />Comissão do mês atual</p>
                    <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalComissaoMesAtual)}</p>
                    <p className={subtitleClass}>Previsão P1 das vendas lançadas em {mesAnoLabel}.</p>
                </div>
            </div>
        </div>

        <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-300">
                  Lançamentos — {dayjsMesRef(mesFiltro).format('MMMM/YYYY')}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={mesNumeroFiltro}
                    onChange={(e) => atualizarMesAno('mes', e.target.value)}
                    className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
                    aria-label="Mês dos lançamentos"
                  >
                    {opcoesMes.map((opcao) => (
                      <option key={opcao.value} value={opcao.value}>{opcao.label}</option>
                    ))}
                  </select>
                  <select
                    value={anoFiltro}
                    onChange={(e) => atualizarMesAno('ano', e.target.value)}
                    className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
                    aria-label="Ano dos lançamentos"
                  >
                    {anos.map((ano) => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setFormulario({ cliente: '', grupo: '', cota: '', valor: '', parcela: 'cheia', administradora: 'GAZIN' });
                      setEditandoId(null);
                      setFormVisivel(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-white"
                  >
                    <FaPlus size={11} /> Lançar Venda
                  </button>
                </div>
            </div>
            {loading ? <LoadingSpinner text="Carregando vendas..." /> : (
              <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2.5">
                {minhasVendas.length > 0 ? minhasVendas.map((venda) => {
                  const comissaoMes = valorComissaoP1(venda);
                  const tipoCheia = isParcelaCheia(venda);
                  return (
                    <div key={venda.id} className="rounded-lg border border-gray-700/60 bg-gray-900/40 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-white leading-snug break-words min-w-0">
                          {(venda.cliente || '').toUpperCase()}
                        </h4>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={() => iniciarEdicao(venda)} className="p-1.5 text-blue-400" aria-label="Editar"><FaEdit size={14} /></button>
                          <button type="button" onClick={() => solicitarExclusaoVenda(venda)} className="p-1.5 text-red-500" aria-label="Excluir"><FaTrash size={14} /></button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          venda.administradora === 'HS' ? 'bg-purple-500/15 text-purple-300' : 'bg-indigo-500/15 text-indigo-300'
                        }`}>{venda.administradora || '—'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          tipoCheia ? 'bg-sky-500/15 text-sky-300' : 'bg-amber-500/15 text-amber-300'
                        }`}>{tipoCheia ? 'Cheia' : 'Meia'}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] text-gray-300 bg-gray-700/50 tabular-nums">
                          G:{venda.grupo || '—'} / C:{venda.cota || '—'}
                        </span>
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">Valor</p>
                          <p className="text-green-400 font-semibold tabular-nums">
                            {parseFloat(venda.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Comissão</p>
                          <p className="text-cyan-300 font-semibold tabular-nums">
                            {comissaoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center text-sm text-gray-400 py-8">Nenhuma venda no mês para este período.</p>
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block min-w-0 overflow-x-auto">
                <table className="w-full table-fixed text-xs text-left min-w-[640px]">
                  <thead className="border-b border-gray-700">
                    <tr className="text-gray-400 uppercase tracking-wide">
                      <th className="w-[22%] px-2 py-2">Cliente</th>
                      <th className="w-[10%] px-2 py-2">Admin</th>
                      <th className="w-[14%] px-2 py-2">Grupo/Cota</th>
                      <th className="w-[9%] px-2 py-2">Tipo</th>
                      <th className="w-[16%] px-2 py-2">Valor</th>
                      <th className="w-[16%] px-2 py-2 text-right">Comissão</th>
                      <th className="w-[13%] px-2 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {minhasVendas.length > 0 ? minhasVendas.map((venda) => {
                      const comissaoMes = valorComissaoP1(venda);
                      const tipoCheia = isParcelaCheia(venda);
                      return (
                        <tr key={venda.id} className="border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors">
                          <td className="px-2 py-2 font-medium text-white truncate" title={(venda.cliente || '').toUpperCase()}>
                            {(venda.cliente || '').toUpperCase()}
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              venda.administradora === 'HS'
                                ? 'bg-purple-500/15 text-purple-300'
                                : 'bg-indigo-500/15 text-indigo-300'
                            }`}>
                              {venda.administradora || '—'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-gray-300 tabular-nums truncate" title={`G: ${venda.grupo || '—'} / C: ${venda.cota || '—'}`}>
                            {venda.grupo || '—'} / {venda.cota || '—'}
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              tipoCheia
                                ? 'bg-sky-500/15 text-sky-300'
                                : 'bg-amber-500/15 text-amber-300'
                            }`}>
                              {tipoCheia ? 'Cheia' : 'Meia'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-green-400 font-semibold tabular-nums truncate">
                            {parseFloat(venda.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-2 py-2 text-right font-semibold text-cyan-300 tabular-nums truncate">
                            {comissaoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1 justify-center">
                              <button type="button" onClick={() => iniciarEdicao(venda)} className="p-1 text-blue-400 hover:text-blue-300" title="Editar">
                                <FaEdit size={14} />
                              </button>
                              <button type="button" onClick={() => solicitarExclusaoVenda(venda)} className="p-1 text-red-500 hover:text-red-400" title="Excluir">
                                <FaTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <EmptyStateRow message="Nenhuma venda no mês para este período." colSpan={7} />
                    )}
                  </tbody>
                </table>
              </div>
              </>
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

    const [anoFiltro, mesNumeroFiltro] = normalizarMesVenda(mesFiltro).split('-');
    const opcoesMes = [
      { value: '01', label: 'Janeiro' },
      { value: '02', label: 'Fevereiro' },
      { value: '03', label: 'Março' },
      { value: '04', label: 'Abril' },
      { value: '05', label: 'Maio' },
      { value: '06', label: 'Junho' },
      { value: '07', label: 'Julho' },
      { value: '08', label: 'Agosto' },
      { value: '09', label: 'Setembro' },
      { value: '10', label: 'Outubro' },
      { value: '11', label: 'Novembro' },
      { value: '12', label: 'Dezembro' },
    ];
    const anoAtual = dayjs().year();
    const anos = Array.from({ length: Math.max(anoAtual, 2025) - 2025 + 1 }, (_, i) => String(2025 + i));
    const atualizarMesAno = (campo, valor) => {
      const ano = campo === 'ano' ? valor : anoFiltro;
      const mes = campo === 'mes' ? valor : mesNumeroFiltro;
      setMesFiltro(`${ano}-${mes}`);
    };

    if (loading) return <LoadingSpinner text="Carregando ranking..." />;

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-800/50 rounded-xl">
                <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wide">
                  Metas do escritório
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={mesNumeroFiltro}
                    onChange={(e) => atualizarMesAno('mes', e.target.value)}
                    className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
                    aria-label="Mês do ranking"
                  >
                    {opcoesMes.map((opcao) => (
                      <option key={opcao.value} value={opcao.value}>{opcao.label}</option>
                    ))}
                  </select>
                  <select
                    value={anoFiltro}
                    onChange={(e) => atualizarMesAno('ano', e.target.value)}
                    className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
                    aria-label="Ano do ranking"
                  >
                    {anos.map((ano) => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))}
                  </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <StatCard icon={<FaBullseye size={16} />} label="Meta Geral" value={configuracoes.meta_geral} color="bg-indigo-500/20" />
                <StatCard icon={<FaDollarSign size={16} />} label="Vendido Geral" value={vendidoGeral} color="bg-green-500/20" />
                <StatCard icon={<FaChartLine size={16} />} label="Falta para a Meta" value={faltaParaMeta > 0 ? faltaParaMeta : 0} color={faltaParaMeta > 0 ? "bg-red-500/20" : "bg-green-500/20"} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                    <h3 className="text-xs font-semibold mb-2 text-indigo-300 uppercase tracking-wide">Ranking individual</h3>
                    <div className="space-y-1.5">{rankingIndividual.length > 0 ? rankingIndividual.map((vendedor, index) => ( <RankingCard key={vendedor.id} posicao={index} nome={vendedor.nome} valor={vendedor.vendido} isCurrentUser={vendedor.id === usuarioAtual.id} /> )) : <p className="text-gray-500 text-xs">Ninguém vendeu ainda este mês.</p>}</div>
                </div>
                <div>
                    <h3 className="text-xs font-semibold mb-2 text-indigo-300 uppercase tracking-wide">Ranking de duplas</h3>
                    <div className="space-y-1.5">{totaisDuplas.length > 0 ? totaisDuplas.map((dupla, index) => ( <RankingCard key={dupla.nomes} posicao={index} nome={dupla.nomes} valor={dupla.total} isCurrentUser={dupla.membros.includes(usuarioAtual?.nome)} /> )) : <p className="text-gray-500 text-xs">Duplas não configuradas.</p>}</div>
                </div>
            </div>
        </div>
    );
};
