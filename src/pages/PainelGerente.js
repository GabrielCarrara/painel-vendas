// src/pages/PainelGerente.js (Versão 100% Completa e Corrigida)
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import 'dayjs/locale/pt-br';
import LembretesLeads from '../components/LembretesLeads';
import { 
    FaChartBar, FaUsers, FaPlusCircle, FaPlus, FaTrophy, FaFilter, FaEdit, FaTrash, FaSave, FaTimes, 
    FaDollarSign, FaExclamationTriangle, FaClipboard, FaWhatsapp, FaChartLine, FaCogs,
    FaFileInvoiceDollar, FaHandHoldingUsd, FaLandmark,
    FaTh,
    FaBullseye,
    FaCalendarAlt,
    FaSignOutAlt, FaUserCircle, FaBars,
} from "react-icons/fa";

import { useNavigate } from 'react-router-dom';
import MinhaContaModal from '../components/MinhaContaModal';
import logoFenix from '../assets/logo.png';

// Componentes importados (verifique os caminhos)
import PainelCRM from "./PainelCRM";
import { limparFlagsLembreteRetorno } from '../utils/crmLembreteStorage';
import { lerAbaPainel, salvarAbaPainel } from '../utils/abaPainelStorage';
import PainelContempladas from "./PainelContempladas";
import HSCotas from './HSCotas';
import PainelAcoes from './PainelAcoes';
import LembreteAcaoDiaria from '../components/LembreteAcaoDiaria';
import ProcessosKanban from '../components/ProcessosKanban';
import {
  PERCENT_CHEIA,
  PERCENT_MEIA,
  persistirMudancaStatusParcela,
  totalComissaoP1RecebidaNoMes,
  totaisPagamentosP2P3,
  calcularEstornoMes,
  isParcelaCheia,
  normalizarMesVenda,
  dayjsMesRef,
  nomeMesPortuguesUpper,
} from '../utils/comissoes';

dayjs.locale('pt-br');

const ABA_STORAGE_KEY = 'painel_gerente_aba';
const ABAS_VALIDAS = ['vendas', 'contempladas', 'hs_cotas', 'processos', 'crm', 'ranking', 'acoes'];
// --- Constantes ---
const STATUS_OPCOES = ['PENDENTE', 'PAGO', 'VENCIDO', 'ESTORNO', 'CANCELADO'];
const campoClass = 'w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide';

// --- Componentes de UI Reutilizáveis ---
const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-gray-800/60 rounded-lg px-3.5 py-3 border border-gray-700/50 flex items-center gap-3 min-w-0">
    <div className={`p-2 rounded-full shrink-0 ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 truncate">{label}</p>
      <p className="text-base sm:text-lg font-bold text-white tabular-nums">
        {(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  </div>
);

const RankingCard = ({ posicao, nome, valor, isCurrentUser }) => {
  const medalhas = ['🥇', '🥈', '🥉'];
  const prefixo = posicao < 3 ? medalhas[posicao] : <span className="text-gray-400 font-bold text-sm">{posicao + 1}º</span>;
  return (
    <div className={`px-3 py-2 rounded-lg flex items-center justify-between gap-2 ${isCurrentUser ? 'bg-indigo-600/25 ring-1 ring-indigo-500' : 'bg-gray-800/60 border border-gray-700/40'}`}>
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

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-screen bg-gray-900"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div></div>
);

const EmptyStateRow = ({ message, colSpan }) => (
    <tr><td colSpan={colSpan} className="text-center py-10"><div className="flex flex-col items-center gap-2 text-gray-500"><FaExclamationTriangle size={32} /><p className="font-semibold">{message}</p></div></td></tr>
);

// --- Componente Principal ---
export default function PainelGerenteAprimorado() {
  dayjs.locale('pt-br'); 

  // --- States do Painel ---
  const [aba, setAba] = useState(() => lerAbaPainel(ABA_STORAGE_KEY, ABAS_VALIDAS));
  const [vendas, setVendas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState({ vendedor: "", mes: dayjs().format("YYYY-MM"), administradora: "" });
  const [editandoId, setEditandoId] = useState(null);
  const [vendaEditada, setVendaEditada] = useState({});
  const [novaVenda, setNovaVenda] = useState({ cliente: "", grupo: "", cota: "", administradora: "GAZIN", valor: "", parcela: "cheia", mes: dayjs().format("YYYY-MM"), usuario_id: "" });
  const [usuarioAtual, setUsuarioAtual] = useState(null); // Auth user
  const [loading, setLoading] = useState(true);
  const [configuracoes, setConfiguracoes] = useState({ meta_geral: 0, duplas: [] });
  const [comissoesLiberadasMes, setComissoesLiberadasMes] = useState(0);
  const [perfilUsuario, setPerfilUsuario] = useState(null); // Perfil da tabela usuarios_custom

  // --- NOVOS STATES (Conta e Logout) ---
  const navigate = useNavigate();
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [modalLancarVenda, setModalLancarVenda] = useState(false);
  const [menuLateralAberto, setMenuLateralAberto] = useState(false);
  const [pagamentosDoMes, setPagamentosDoMes] = useState([]);

  const buscarPagamentosDoMes = useCallback(async (mes) => {
    if (!mes || !perfilUsuario) return;
    const { data: usuariosDaFilial } = await supabase
      .from('usuarios_custom')
      .select('id')
      .eq('id_filial', perfilUsuario.id_filial);
    if (!usuariosDaFilial || usuariosDaFilial.length === 0) {
      setPagamentosDoMes([]);
      return;
    }
    const { data, error } = await supabase
      .from('pagamentos_comissao')
      .select('*')
      .eq('mes_pagamento', mes)
      .in(
        'usuario_id',
        usuariosDaFilial.map((u) => u.id)
      );
    if (!error && data) setPagamentosDoMes(data);
    else setPagamentosDoMes([]);
  }, [perfilUsuario]);

  // --- NOVA FUNÇÃO DE LOGOUT ---
  const handleLogout = async () => {
    limparFlagsLembreteRetorno();
    await supabase.auth.signOut();
    navigate('/login');
  };

  // --- Funções de Busca de Dados ---
  const buscarUsuarios = async (perfil) => {
    let query = supabase.from("usuarios_custom").select("id, nome, id_filial").order('nome', { ascending: true });
    
    // APLICA O FILTRO APENAS SE O CARGO FOR 'gerente'
    if (perfil && perfil.cargo?.toLowerCase() === 'gerente') { // Usando 'cargo'
      query = query.eq('id_filial', perfil.id_filial);
    }

    const { data } = await query;
    if (data) setUsuarios(data);
  };

  const buscarVendas = async (perfil) => {
    let queryVendas = supabase.from("vendas").select("*").order("created_at", { ascending: false });

    // APLICA O FILTRO DE FILIAL APENAS PARA O CARGO 'gerente'
    if (perfil && perfil.cargo?.toLowerCase() === 'gerente') { // Usando 'cargo'
      const { data: usuariosDaFilial } = await supabase
        .from('usuarios_custom')
        .select('id')
        .eq('id_filial', perfil.id_filial);

      if (usuariosDaFilial && usuariosDaFilial.length > 0) {
        const idsDosUsuarios = usuariosDaFilial.map(u => u.id);
        queryVendas = queryVendas.in('usuario_id', idsDosUsuarios);
      } else {
        queryVendas = queryVendas.in('usuario_id', []); 
      }
    }

    const { data } = await queryVendas;
    if (data) setVendas(data);
  };

// =========================================================================
// --- FUNÇÃO CORRIGIDA COM useCALLBACK (Garante a atualização do card) ---
// =========================================================================
  const buscarComissoesLiberadas = useCallback(async () => {
    const mesAtual = filtros.mes; // usa o mês selecionado no filtro

    let query = supabase
      .from('pagamentos_comissao')
      .select('valor_comissao')
      .eq('mes_pagamento', mesAtual)
      .neq('parcela_index', 1);

    query = query.order('created_at', { ascending: false });

    // O filtro pela filial do gerente (perfilUsuario)
    if (perfilUsuario) {
        const { data: usuariosDaFilial } = await supabase
            .from('usuarios_custom')
            .select('id')
            .eq('id_filial', perfilUsuario.id_filial);

        if (usuariosDaFilial) {
            const idsDosUsuarios = usuariosDaFilial.map(u => u.id);
            query = query.in('usuario_id', idsDosUsuarios);
        } else {
             // Garante que não retorne nada se não houver usuários na filial
             query = query.in('usuario_id', ['99999999-9999-9999-9999-999999999999']);
        }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar comissões liberadas:", error);
      setComissoesLiberadasMes(0);
      return;
    }

    if (data) {
      const totalLiberado = data.reduce((acc, item) => acc + item.valor_comissao, 0);
      setComissoesLiberadasMes(totalLiberado);
    } else {
      setComissoesLiberadasMes(0);
    }
  }, [perfilUsuario, filtros.mes, setComissoesLiberadasMes]); // <--- DEPENDÊNCIAS CHAVE
// =========================================================================
  
const fetchConfiguracoes = useCallback(async (mes, id_filial) => {
    if (!id_filial) return;
    const { data } = await supabase
      .from('configuracoes_mensais')
      .select('*')
      .eq('mes', mes)
      .eq('id_filial', id_filial)
      .single();

    if (data) {
      setConfiguracoes(data);
    } else {
      setConfiguracoes({ mes, id_filial, meta_geral: 10000000, duplas: [] });
    }
  }, []);
  // --- UseEffects (Carregamento de Dados) ---
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      setUsuarioAtual(user);
      setNovaVenda(prev => ({ ...prev, usuario_id: user.id }));

      const { data: perfilData } = await supabase
        .from('usuarios_custom')
        .select('*')
        .eq('id', user.id)
        .single();

      if (perfilData) {
        setPerfilUsuario(perfilData);

        await Promise.all([
          buscarUsuarios(perfilData),
          buscarVendas(perfilData),
          fetchConfiguracoes(filtros.mes, perfilData.id_filial),
        ]);
      }
      setLoading(false);
    };

    carregarDadosIniciais();
    // Montagem inicial apenas; mês/config reagem em outros efeitos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);
  
  useEffect(() => { 
    if(filtros.mes && perfilUsuario) {
        fetchConfiguracoes(filtros.mes, perfilUsuario.id_filial);
    }
  }, [filtros.mes, fetchConfiguracoes, perfilUsuario]);

useEffect(() => {
    if (perfilUsuario) {
        buscarComissoesLiberadas();
    }
  }, [perfilUsuario, buscarComissoesLiberadas]); // <-- Adicionado buscarComissoesLiberadas nas dependências

  useEffect(() => {
    if (perfilUsuario && filtros.mes) {
      buscarPagamentosDoMes(filtros.mes);
    }
  }, [perfilUsuario, filtros.mes, vendas, buscarPagamentosDoMes]);

  // --- Funções de Ação (CRUD Vendas) ---
  const nomeVendedor = (id) => usuarios.find((u) => u.id === id)?.nome || "Desconhecido";

  const limparFormularioNovaVenda = () => {
    setNovaVenda((prev) => ({
      cliente: "",
      grupo: "",
      cota: "",
      administradora: "GAZIN",
      valor: "",
      parcela: "cheia",
      mes: dayjs().format("YYYY-MM"),
      usuario_id: prev.usuario_id || usuarioAtual?.id || "",
    }));
  };

  const abrirModalLancarVenda = () => {
    limparFormularioNovaVenda();
    setModalLancarVenda(true);
  };

  const formatInputMoeda = (txt) => {
    if (!txt) return '';
    const valorNumerico = String(txt).replace(/\D/g, '');
    if (!valorNumerico) return '';
    return (parseFloat(valorNumerico) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const cadastrarVenda = async () => {
    if (!usuarioAtual) return alert("Usuário não autenticado.");
    if (!novaVenda.cliente || !novaVenda.valor || !novaVenda.usuario_id) return alert("Cliente, Valor e Vendedor são obrigatórios.");
    
    const valorNumerico = parseFloat(String(novaVenda.valor).replace(/\./g, '').replace(',', '.'));
    
    const dadosParaSalvar = { 
        ...novaVenda, 
        valor: valorNumerico, 
        cliente: novaVenda.cliente.toUpperCase(), 
        mes: dayjs(novaVenda.mes).format("YYYY-MM"),
        status_parcela_1: 'PENDENTE',
        status_parcela_2: 'PENDENTE',
        status_parcela_3: 'PENDENTE',
        status_parcela_4: 'PENDENTE',
        status_parcela_5: 'PENDENTE',
        mes_conferencia_parcela_1: null,
    };

    const { error } = await supabase.from('vendas').insert([dadosParaSalvar]);
    
    if (error) {
        alert('Erro ao criar venda: ' + error.message);
        return;
    }

    // P1 é registrada quando a automação confirmar (persistirMudancaStatusParcela).

    await buscarVendas(perfilUsuario);
    limparFormularioNovaVenda();
    setModalLancarVenda(false);
    alert("Venda cadastrada com sucesso!");
  };
  
  const editarVenda = (venda) => { setEditandoId(venda.id); setVendaEditada({ ...venda, valor: venda.valor.toString() }); };
  
  const salvarEdicao = async () => { 
    const dadosParaAtualizar = { ...vendaEditada, valor: parseFloat(vendaEditada.valor) };
    await supabase.from("vendas").update(dadosParaAtualizar).eq("id", editandoId); 
    setEditandoId(null); setVendaEditada({}); 
    await buscarVendas(perfilUsuario); // Recarrega com filtro
  };
  
  const excluirVenda = async (id) => { 
    if (window.confirm("Tem certeza?")) { 
      await supabase.from("vendas").delete().eq("id", id); 
      await buscarVendas(perfilUsuario); // Recarrega com filtro
    } 
  };

  const handleStatusChange = async (venda, parcelaIndex, novoStatus) => {
    const nomeColuna = `status_parcela_${parcelaIndex}`;
    const statusAntigo = venda[nomeColuna];

    if (statusAntigo === novoStatus) return;

    const res = await persistirMudancaStatusParcela(
      supabase,
      venda,
      parcelaIndex,
      novoStatus,
      statusAntigo
    );

    if (!res.ok) {
      alert('Erro ao atualizar status da venda: ' + (res.error?.message || 'desconhecido'));
      return;
    }

    await buscarVendas(perfilUsuario); // Recarrega com filtro
    await buscarComissoesLiberadas();
    await buscarPagamentosDoMes(filtros.mes);
  };

  // --- Cálculos e Memos ---
  const calculosDoMes = useMemo(() => {
    const mesFiltroNorm = filtros.mes ? normalizarMesVenda(filtros.mes) : '';

    const vendasFiltradas = vendas.filter((v) => {
        const matchVendedor = !filtros.vendedor || v.usuario_id === filtros.vendedor;
        const matchMes = !mesFiltroNorm || normalizarMesVenda(v.mes) === mesFiltroNorm;
        const matchAdm = !filtros.administradora || v.administradora === filtros.administradora;
        return matchVendedor && matchMes && matchAdm;
    });

    // Totais dos cards: independentes de vendedor e administradora (apenas mês)
    const vendasBaseParaCards = vendas.filter((v) => !mesFiltroNorm || normalizarMesVenda(v.mes) === mesFiltroNorm);

    const totaisPorVendedor = {};
    usuarios.forEach(u => { totaisPorVendedor[u.id] = { nome: u.nome, vendido: 0 }; });

    let totalMesTodos = 0;
    let totalComissaoVendedor = 0;
    let totalVendidoGAZIN = 0;
    let totalVendidoHS = 0;
    vendasBaseParaCards.forEach((venda) => {
      const valor = parseFloat(venda.valor) || 0;

      totalMesTodos += valor;

      const percentuais = isParcelaCheia(venda) ? PERCENT_CHEIA : PERCENT_MEIA;
      const comissaoP1DaVenda = valor * percentuais[0];
      totalComissaoVendedor += comissaoP1DaVenda;

      if (venda.administradora === 'GAZIN') totalVendidoGAZIN += valor;
      if (venda.administradora === 'HS') totalVendidoHS += valor;
    });

    // Totais por vendedor (usados no ranking e texto): respeitam filtros de vendedor/admin
    vendasFiltradas.forEach((venda) => {
      const id = venda.usuario_id;
      const valor = parseFloat(venda.valor) || 0;

      if (totaisPorVendedor[id] && (!mesFiltroNorm || normalizarMesVenda(venda.mes) === mesFiltroNorm)) {
          totaisPorVendedor[id].vendido += valor;
      }
    });

    return { vendasFiltradas, totaisPorVendedor, totalMesTodos, totalComissaoVendedor, totalVendidoGAZIN, totalVendidoHS };
  }, [vendas, usuarios, filtros]);

  const valorFaltanteParaMeta = useMemo(() => {
    const meta = configuracoes?.meta_geral || 0;
    const vendido = calculosDoMes?.totalMesTodos || 0;
    return meta - vendido;
  }, [configuracoes?.meta_geral, calculosDoMes?.totalMesTodos]);

  // --- Abas e Renderização ---
  const abas = [
    { id: 'vendas', label: 'Controle de Vendas', icon: <FaChartBar /> },
    { id: 'contempladas', label: 'Cartas Contempladas', icon: <FaChartLine /> },
    { id: 'hs_cotas', label: 'Controle de Cotas HS', icon: <FaTh /> },
    { id: 'processos', label: 'Controle de Processos', icon: <FaClipboard /> },
    { id: 'crm', label: 'Controle de Leads CRM', icon: <FaUsers /> },
    { id: 'ranking', label: 'Ranking de Vendedores', icon: <FaTrophy /> },
    { id: 'acoes', label: 'Quadro de Ações', icon: <FaCalendarAlt /> },
  ];
  
  const renderContent = () => {
    switch (aba) {
     case 'vendas': return <AbaVendas 
        vendasFiltradas={calculosDoMes.vendasFiltradas}
        vendasTodas={vendas}
        pagamentosDoMes={pagamentosDoMes}
        totalMesTodos={calculosDoMes.totalMesTodos}
        totalComissaoVendedor={calculosDoMes.totalComissaoVendedor}
        totalVendidoGAZIN={calculosDoMes.totalVendidoGAZIN}
        totalVendidoHS={calculosDoMes.totalVendidoHS}
        valorFaltanteParaMeta={valorFaltanteParaMeta}
        usuarios={usuarios}
        filtros={filtros} setFiltros={setFiltros} 
        nomeVendedor={nomeVendedor} 
        editandoId={editandoId} setEditandoId={setEditandoId} 
        vendaEditada={vendaEditada} setVendaEditada={setVendaEditada}
        editarVenda={editarVenda} salvarEdicao={salvarEdicao} 
        excluirVenda={excluirVenda} 
        handleStatusChange={handleStatusChange}
        comissoesLiberadasMes={comissoesLiberadasMes}
        onLancarVenda={abrirModalLancarVenda}
      />;
      case 'acoes':
  return <PainelAcoes 
    usuario={perfilUsuario}
    podeEditar={false}
    filiais={[]}
    usuarios={usuarios}
  />;
      case 'ranking':
        return <AbaRanking 
                perfilUsuario={perfilUsuario}
                vendas={vendas} // Passa todas as vendas da filial
                usuarios={usuarios} // Passa todos os usuários da filial
                filtros={filtros} 
                setFiltros={setFiltros} 
                configuracoes={configuracoes} 
                onSave={fetchConfiguracoes}
                listaFiliais={[]} // Gerente não vê outras filiais
                filialSelecionadaId={perfilUsuario?.id_filial} // ID da filial do gerente
                setFilialSelecionadaId={() => {}}
              />;

      case 'crm': return (
        <PainelCRM
          usuarioId={perfilUsuario?.id}
          cargo={perfilUsuario?.cargo}
        />
      );
      case 'contempladas': return <PainelContempladas usuario={perfilUsuario} />;
      case 'hs_cotas': return <HSCotas usuario={perfilUsuario} />;     
      case 'processos': return <ProcessosKanban usuario={perfilUsuario} />;
      default: return null;
    }
  };
  
  // --- JSX Principal ---
  if (loading && !perfilUsuario) return <LoadingSpinner />;
  
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

      {perfilUsuario && <LembreteAcaoDiaria usuario={perfilUsuario} />}

      {modalContaVisivel && perfilUsuario && (
        <MinhaContaModal
          usuario={perfilUsuario}
          onClose={() => setModalContaVisivel(false)}
          onUpdate={() => {
            const reFetchProfile = async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data: perfilData } = await supabase
                  .from('usuarios_custom')
                  .select('*')
                  .eq('id', user.id)
                  .single();
                if (perfilData) setPerfilUsuario(perfilData);
              }
            };
            reFetchProfile();
            if (perfilUsuario) buscarUsuarios(perfilUsuario);
          }}
        />
      )}

      {modalLancarVenda && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in">
            <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-base font-semibold flex items-center gap-2 text-white">
                <FaPlus className="text-indigo-400" /> Lançar Venda
              </h3>
              <button
                type="button"
                onClick={() => { setModalLancarVenda(false); limparFormularioNovaVenda(); }}
                className="p-1.5 text-gray-500 hover:text-white rounded-full"
              >
                <FaTimes size={16} />
              </button>
            </header>

            <div className="p-4 space-y-3">
              <div>
                <label className={labelClass}>Lançar para o vendedor</label>
                <select
                  className={campoClass}
                  value={novaVenda.usuario_id}
                  onChange={(e) => setNovaVenda({ ...novaVenda, usuario_id: e.target.value })}
                >
                  <option value={usuarioAtual?.id}>Lançar para mim ({usuarioAtual?.email?.split('@')[0]})</option>
                  {usuarios.filter((u) => u.id !== usuarioAtual?.id).map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Cliente</label>
                  <input
                    placeholder="Nome do cliente"
                    className={campoClass}
                    value={novaVenda.cliente}
                    onChange={(e) => setNovaVenda({ ...novaVenda, cliente: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Valor do crédito</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    className={`${campoClass} tabular-nums`}
                    value={novaVenda.valor}
                    onChange={(e) => setNovaVenda({ ...novaVenda, valor: formatInputMoeda(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Parcela</label>
                  <select
                    className={campoClass}
                    value={novaVenda.parcela}
                    onChange={(e) => setNovaVenda({ ...novaVenda, parcela: e.target.value })}
                  >
                    <option value="cheia">Cheia</option>
                    <option value="meia">Meia</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Grupo</label>
                  <input
                    placeholder="Grupo"
                    className={campoClass}
                    value={novaVenda.grupo}
                    onChange={(e) => setNovaVenda({ ...novaVenda, grupo: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Cota</label>
                  <input
                    placeholder="Cota"
                    className={campoClass}
                    value={novaVenda.cota}
                    onChange={(e) => setNovaVenda({ ...novaVenda, cota: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Administradora</label>
                  <select
                    className={campoClass}
                    value={novaVenda.administradora}
                    onChange={(e) => setNovaVenda({ ...novaVenda, administradora: e.target.value })}
                  >
                    <option value="GAZIN">GAZIN</option>
                    <option value="HS">HS</option>
                  </select>
                </div>
              </div>
            </div>

            <footer className="px-4 py-3 flex justify-end gap-2 border-t border-gray-700">
              <button
                type="button"
                onClick={() => { setModalLancarVenda(false); limparFormularioNovaVenda(); }}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-semibold text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={cadastrarVenda}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 text-white"
              >
                <FaSave size={14} /> Salvar venda
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}


// --- Componente da Aba de Vendas (Dashboard) ---
const AbaVendas = ({ vendasFiltradas, vendasTodas, pagamentosDoMes, totalMesTodos, totalComissaoVendedor, totalVendidoGAZIN, totalVendidoHS, valorFaltanteParaMeta, usuarios, filtros, setFiltros, nomeVendedor, editandoId, setEditandoId, vendaEditada, setVendaEditada, editarVenda, salvarEdicao, excluirVenda, handleStatusChange, comissoesLiberadasMes, onLancarVenda }) => {
    const dMes = dayjsMesRef(filtros.mes);
    const mesSelecionadoLabel = dMes.format('MMMM [de] YYYY');
    const faltaParaMetaClamped = valorFaltanteParaMeta > 0 ? valorFaltanteParaMeta : 0;
    const mesLabel = dMes.format('MMMM');
    const [modalEstornoAberto, setModalEstornoAberto] = useState(false);

    const vendedorSelecionadoId = filtros.vendedor;
    const nomeVendedorSelecionado = vendedorSelecionadoId ? nomeVendedor(vendedorSelecionadoId) : "";

    const formatarMoeda = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const mesP1VendasLabel = dMes.subtract(1, 'month').format('MMMM [de] YYYY');
    const mesP1RecebeLabel = dMes.format('MMMM [de] YYYY');
    const subtituloComissaoP1 = `Comissão P1 (0,30% meia ou 0,60% cheia) das vendas lançadas em ${mesP1VendasLabel}. Você recebe esse valor em ${mesP1RecebeLabel}.`;
    const mesNomeUpper = nomeMesPortuguesUpper(filtros.mes);
    const mesSeguinteLabel = dMes.add(1, 'month').format('MMMM [de] YYYY');
    const subtituloEstornoCard = `Esse valor é seu estorno de clientes que foram excluídos no mês de ${mesLabel} que reflete na comissão de ${mesSeguinteLabel}`;
    const subtituloTotalReceber = `Valor total que vai receber das comissões em ${mesSeguinteLabel} já descontado o estorno`;

    const totaisVendedorParaPrint = useMemo(() => {
        const mesRef = filtros.mes;
        const uid = vendedorSelecionadoId;
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

        const mesRefNorm = normalizarMesVenda(mesRef);
        const totalVendidoMes = (vendasTodas || [])
          .filter((v) => v.usuario_id === uid && normalizarMesVenda(v.mes) === mesRefNorm)
          .reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);

        const vendasPorId = {};
        (vendasTodas || []).forEach((v) => {
          vendasPorId[v.id] = v;
        });

        const vendasDoVendedor = (vendasTodas || []).filter((v) => v.usuario_id === uid);

        const totalComissaoP1 = totalComissaoP1RecebidaNoMes(vendasDoVendedor, uid, mesRef);
        const { totalComissaoP2Liberada, totalComissaoP3Liberada } = totaisPagamentosP2P3(
          pagamentosDoMes,
          uid,
          vendasPorId
        );
        const { totalEstorno, itens: itensEstorno } = calcularEstornoMes(vendasDoVendedor, mesRef);

        const totalAPagar = totalComissaoP1 + totalComissaoP2Liberada + totalComissaoP3Liberada - totalEstorno;

        return {
            totalVendidoMes,
            totalComissaoP1,
            totalComissaoP2Liberada,
            totalComissaoP3Liberada,
            totalEstorno,
            totalAPagar,
            itensEstorno,
        };
    }, [vendasTodas, pagamentosDoMes, filtros.mes, vendedorSelecionadoId]);

    const PrintMetricCard = ({ title, value, subtitle }) => (
        <div className="bg-white border border-gray-300 rounded-lg p-3">
            <p className="text-[11px] font-extrabold text-black">{title}</p>
            <p className="text-base font-extrabold text-black mt-1">{formatarMoeda(value)}</p>
            {subtitle ? <p className="text-[10px] text-gray-700 mt-2 leading-snug">{subtitle}</p> : null}
        </div>
    );

    const cardClass = 'bg-gray-800/40 border border-gray-700/50 rounded-lg px-3 py-2.5';
    const valueClass = 'text-base sm:text-lg font-bold text-white mt-0.5 tabular-nums';
    const titleClass = 'text-xs text-gray-400 font-medium';
    const subtitleClass = 'text-[10px] text-gray-500 mt-1 leading-snug';

    return (
    <div className="animate-fade-in space-y-4">
        <div>
            <h2 className="text-sm font-semibold text-gray-300 mb-2">Relatório Geral</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 print:hidden">
                <StatCard icon={<FaDollarSign size={16} />} label={`Total vendido em ${mesSelecionadoLabel}`} value={totalMesTodos} color="bg-green-500/20 text-green-400" />
                <StatCard
                  icon={<FaBullseye size={16} />}
                  label={`Falta para meta de ${mesLabel}`}
                  value={faltaParaMetaClamped}
                  color={faltaParaMetaClamped > 0 ? "bg-red-500/20 text-red-400" : "bg-green-500/20"}
                />
                <StatCard icon={<FaDollarSign size={16} />} label={`Vendido GAZIN — ${mesSelecionadoLabel}`} value={totalVendidoGAZIN} color="bg-indigo-500/20 text-indigo-300" />
                <StatCard icon={<FaDollarSign size={16} />} label={`Vendido HS — ${mesSelecionadoLabel}`} value={totalVendidoHS} color="bg-purple-500/20 text-purple-300" />
            </div>
        </div>

        <div className="print:hidden">
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Relatório por Vendedor</h2>
          {vendedorSelecionadoId ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <div className={cardClass}>
                <p className={titleClass}><FaDollarSign className="inline-block mr-1.5" size={11} />Total vendido — {mesNomeUpper}</p>
                <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalVendidoMes)}</p>
              </div>
              <div className={cardClass}>
                <p className={titleClass}><FaFileInvoiceDollar className="inline-block mr-1.5" size={11} />Comissão P1</p>
                <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalComissaoP1)}</p>
                <p className={subtitleClass}>{subtituloComissaoP1}</p>
              </div>
              <div className={cardClass}>
                <p className={titleClass}><FaHandHoldingUsd className="inline-block mr-1.5" size={11} />Comissão P2 liberada</p>
                <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalComissaoP2Liberada)}</p>
                <p className={subtitleClass}>Comissão de clientes que pagaram a 2ª parcela</p>
              </div>
              <div className={cardClass}>
                <p className={titleClass}><FaHandHoldingUsd className="inline-block mr-1.5" size={11} />Comissão P3 liberada</p>
                <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalComissaoP3Liberada)}</p>
                <p className={subtitleClass}>Comissão de clientes que pagaram a 3ª parcela</p>
              </div>
              <div className={cardClass}>
                <p className={`${titleClass} flex items-center gap-1.5 flex-wrap`}>
                  <FaExclamationTriangle className="inline-block" size={11} />Estorno
                  <button
                    type="button"
                    title="Ver detalhes dos estornos"
                    onClick={() => setModalEstornoAberto(true)}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 font-bold text-[10px]"
                  >
                    !
                  </button>
                </p>
                <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalEstorno)}</p>
                <p className={subtitleClass}>{subtituloEstornoCard}</p>
              </div>
              <div className={cardClass}>
                <p className={titleClass}><FaLandmark className="inline-block mr-1.5" size={11} />Total a receber</p>
                <p className={valueClass}>{formatarMoeda(totaisVendedorParaPrint.totalAPagar)}</p>
                <p className={subtitleClass}>{subtituloTotalReceber}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Selecione um vendedor nos filtros abaixo para ver o relatório.</p>
          )}
        </div>

        {modalEstornoAberto && vendedorSelecionadoId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 print:hidden">
            <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white">Estornos em {mesLabel}</h3>
                <button type="button" onClick={() => setModalEstornoAberto(false)} className="p-1 text-gray-400 hover:text-white"><FaTimes size={14} /></button>
              </div>
              <div className="p-3 overflow-y-auto max-h-[60vh] text-xs">
                {(totaisVendedorParaPrint.itensEstorno || []).length === 0 ? (
                  <p className="text-gray-400">Nenhum estorno (P2–P5) conferido neste mês para este vendedor.</p>
                ) : (
                  <ul className="space-y-2">
                    {totaisVendedorParaPrint.itensEstorno.map((it, idx) => (
                      <li key={`${it.vendaId}-${it.parcela}-${idx}`} className="border border-gray-700 rounded-md p-2.5 bg-gray-900/40">
                        <p className="font-semibold text-white text-sm">{(it.cliente || '').toUpperCase()}</p>
                        <p className="text-gray-400 text-[11px] mt-0.5">P{it.parcela} · {formatarMoeda(it.valorEstornoComissaoP1)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRINT */}
        <div className="hidden print:block space-y-4">
            <h2 className="text-[16px] font-extrabold text-black">Resultados Fênix</h2>
            <div className="grid grid-cols-4 gap-3">
                <PrintMetricCard title={`TOTAL VENDIDO MÊS DE ${mesNomeUpper}`} value={totalMesTodos} />
                <PrintMetricCard title={`VALOR FALTANTE PARA A META DE ${mesNomeUpper}`} value={faltaParaMetaClamped} />
                <PrintMetricCard title="TOTAL VENDIDO GAZIN" value={totalVendidoGAZIN} />
                <PrintMetricCard title="TOTAL VENDIDO HS" value={totalVendidoHS} />
            </div>

            <h2 className="text-[16px] font-extrabold text-black pt-3">
                Resultado do Vendedor: {nomeVendedorSelecionado || '---'}
            </h2>

            {vendedorSelecionadoId ? (
                <div className="grid grid-cols-2 gap-3">
                    <PrintMetricCard title={`TOTAL VENDIDO MÊS DE ${mesNomeUpper}`} value={totaisVendedorParaPrint.totalVendidoMes} />
                    <PrintMetricCard
                        title="TOTAL DE COMISSÃO P1"
                        value={totaisVendedorParaPrint.totalComissaoP1}
                        subtitle={subtituloComissaoP1}
                    />
                    <PrintMetricCard
                        title="TOTAL DE COMISSÃO LIBERADA EM P2"
                        value={totaisVendedorParaPrint.totalComissaoP2Liberada}
                        subtitle="Esse valor é sua comissão de clientes que pagaram a 2º parcela das vendas anteriores"
                    />
                    <PrintMetricCard
                        title="TOTAL DE COMISSÃO LIBERADA EM P3"
                        value={totaisVendedorParaPrint.totalComissaoP3Liberada}
                        subtitle="Esse valor é sua comissão de clientes que pagaram a 3º parcela das vendas anteriores"
                    />
                    <PrintMetricCard
                        title="TOTAL DE ESTORNO"
                        value={totaisVendedorParaPrint.totalEstorno}
                        subtitle={subtituloEstornoCard}
                    />
                    <PrintMetricCard
                        title="TOTAL À RECEBER"
                        value={totaisVendedorParaPrint.totalAPagar}
                        subtitle={subtituloTotalReceber}
                    />
                </div>
            ) : (
                <p className="text-[11px] text-black/70">Selecione um vendedor para imprimir o resultado.</p>
            )}
        </div>
        
        <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-3 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 pb-3 border-b border-gray-700/60">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
                  <FaFilter size={12} /> Lançamentos de Vendas
                </h3>
                <button
                  type="button"
                  onClick={onLancarVenda}
                  className="bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-white shrink-0"
                >
                  <FaPlus size={11} /> Lançar Venda
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <select value={filtros.vendedor} onChange={(e) => setFiltros({ ...filtros, vendedor: e.target.value })} className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 focus:ring-1 focus:ring-indigo-500 outline-none">
                    <option value="">Todos os Vendedores</option>
                    {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <input type="month" value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })} className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 focus:ring-1 focus:ring-indigo-500 outline-none" />
                <select value={filtros.administradora} onChange={(e) => setFiltros({ ...filtros, administradora: e.target.value })} className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 focus:ring-1 focus:ring-indigo-500 outline-none">
                    <option value="">Todas Administradoras</option>
                    <option value="HS">HS</option><option value="GAZIN">GAZIN</option>
                </select>
            </div>
            
            <div className="min-w-0">
                {/* Mobile cards */}
                <div className="md:hidden space-y-2.5">
                  {vendasFiltradas.length > 0 ? vendasFiltradas.map((venda) => (
                    <div key={venda.id} className="rounded-lg border border-gray-700/60 bg-gray-900/40 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white break-words">{venda.cliente.toUpperCase()}</h4>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{nomeVendedor(venda.usuario_id)}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={() => editarVenda(venda)} className="p-1.5 text-blue-400"><FaEdit size={14} /></button>
                          <button type="button" onClick={() => excluirVenda(venda.id)} className="p-1.5 text-red-500"><FaTrash size={14} /></button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-200 font-semibold">{venda.administradora}</span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300 tabular-nums">G:{venda.grupo} / C:{venda.cota}</span>
                        <span className={`px-1.5 py-0.5 rounded ${isParcelaCheia(venda) ? 'bg-blue-900/70 text-blue-300' : 'bg-yellow-900/70 text-yellow-300'}`}>
                          {isParcelaCheia(venda) ? 'Cheia' : 'Meia'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-green-400 font-semibold tabular-nums">
                        {parseFloat(venda.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {[1, 2, 3, 4, 5].map((i) => {
                          const statusAtual = venda[`status_parcela_${i}`] || 'PENDENTE';
                          let corSeletor = 'bg-gray-700 border-gray-600 text-gray-300';
                          if (statusAtual === 'PAGO') corSeletor = 'bg-green-500/20 border-green-700 text-green-300';
                          if (statusAtual === 'PENDENTE') corSeletor = 'bg-yellow-500/20 border-yellow-700 text-yellow-300';
                          if (statusAtual === 'VENCIDO' || statusAtual === 'ESTORNO') corSeletor = 'bg-red-500/20 border-red-700 text-red-300';
                          if (statusAtual === 'CANCELADO') corSeletor = 'bg-gray-600 border-gray-500 text-gray-200';
                          return (
                            <select
                              key={i}
                              value={statusAtual}
                              onChange={(e) => handleStatusChange(venda, i, e.target.value)}
                              className={`p-1.5 text-[11px] rounded border font-medium ${corSeletor}`}
                            >
                              {STATUS_OPCOES.map(opt => <option key={opt} value={opt}>{`P${i}: ${opt}`}</option>)}
                            </select>
                          );
                        })}
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-sm text-gray-400 py-8">Nenhuma venda encontrada para os filtros aplicados</p>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto min-w-0">
                <table className="w-full min-w-[720px] text-xs text-left">
                    <thead className="border-b border-gray-700">
                      <tr className="text-gray-400 uppercase tracking-wide">
                        <th className="px-2 py-2">Cliente</th>
                        <th className="px-2 py-2">Produto</th>
                        <th className="px-2 py-2">Valor</th>
                        <th className="px-2 py-2">Vendedor</th>
                        <th className="px-2 py-2 text-center">Comissões</th>
                        <th className="px-2 py-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                        {vendasFiltradas.length > 0 ? vendasFiltradas.map((venda) => (
                            <tr key={venda.id} className="border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors">
                                {editandoId === venda.id ? (
                                    <>
                                      <td className="p-1.5"><input value={vendaEditada.cliente || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, cliente: e.target.value.toUpperCase() })} className="bg-gray-600 p-1.5 rounded w-full text-xs"/></td>
                                      <td className="p-1.5 space-y-1">
                                          <input placeholder="Admin" value={vendaEditada.administradora || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, administradora: e.target.value })} className="bg-gray-600 p-1.5 rounded w-full text-xs"/>
                                          <input placeholder="Grupo" value={vendaEditada.grupo || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, grupo: e.target.value })} className="bg-gray-600 p-1.5 rounded w-full text-xs"/>
                                          <input placeholder="Cota" value={vendaEditada.cota || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, cota: e.target.value })} className="bg-gray-600 p-1.5 rounded w-full text-xs"/>
                                          <select value={vendaEditada.parcela || 'cheia'} onChange={(e) => setVendaEditada({...vendaEditada, parcela: e.target.value})} className="bg-gray-600 p-1.5 rounded w-full text-xs">
                                              <option value="cheia">Cheia</option>
                                              <option value="meia">Meia</option>
                                          </select>
                                      </td>
                                      <td className="p-1.5"><input type="number" value={vendaEditada.valor || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, valor: e.target.value })} className="bg-gray-600 p-1.5 rounded w-full text-xs"/></td>
                                      <td className="p-1.5">{nomeVendedor(venda.usuario_id)}</td>
                                      <td className="p-1.5 text-center">-</td>
                                      <td className="p-1.5">
                                          <div className="flex gap-1 justify-center">
                                              <button type="button" onClick={salvarEdicao} className="p-1.5 text-green-400 hover:text-green-300"><FaSave size={14} /></button>
                                              <button type="button" onClick={() => setEditandoId(null)} className="p-1.5 text-gray-400 hover:text-gray-200"><FaTimes size={14} /></button>
                                          </div>
                                      </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-2 py-2 font-medium">{venda.cliente.toUpperCase()}</td>
                                        <td className="px-2 py-2">
                                            <div className="flex flex-col gap-0.5">
                                                <div><span className="font-semibold">{venda.administradora}</span><span className="text-[10px] text-gray-400 ml-1.5">G:{venda.grupo} / C:{venda.cota}</span></div>
                                                <span className={`inline-block w-fit px-1.5 py-0.5 text-[10px] font-medium rounded ${isParcelaCheia(venda) ? 'bg-blue-900/70 text-blue-300' : 'bg-yellow-900/70 text-yellow-300'}`}>{isParcelaCheia(venda) ? 'Cheia' : 'Meia'}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-green-400 font-semibold tabular-nums">{parseFloat(venda.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                                        <td className="px-2 py-2">{nomeVendedor(venda.usuario_id)}</td>
                                        <td className="px-2 py-2">
                                            <div className="flex flex-wrap gap-1 justify-center items-center">
                                                {[1, 2, 3, 4, 5].map((i) => {
                                                    const statusAtual = venda[`status_parcela_${i}`] || 'PENDENTE';
                                                    let corSeletor = 'bg-gray-700 border-gray-600 text-gray-300';
                                                    if (statusAtual === 'PAGO') corSeletor = 'bg-green-500/20 border-green-700 text-green-300';
                                                    if (statusAtual === 'PENDENTE') corSeletor = 'bg-yellow-500/20 border-yellow-700 text-yellow-300';
                                                    if (statusAtual === 'VENCIDO' || statusAtual === 'ESTORNO') corSeletor = 'bg-red-500/20 border-red-700 text-red-300';
                                                    if (statusAtual === 'CANCELADO') corSeletor = 'bg-gray-600 border-gray-500 text-gray-200';

                                                    return (
                                                        <select 
                                                            key={i}
                                                            value={statusAtual}
                                                            onChange={(e) => handleStatusChange(venda, i, e.target.value)}
                                                            className={`p-0.5 text-[10px] rounded border focus:ring-1 focus:ring-indigo-400 font-medium ${corSeletor}`}
                                                        >
                                                            {STATUS_OPCOES.map(opt => <option key={opt} value={opt}>{`P${i}: ${opt}`}</option>)}
                                                        </select>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2">
                                          <div className="flex gap-1 justify-center">
                                            <button type="button" onClick={() => editarVenda(venda)} className="p-1.5 text-blue-400 hover:text-blue-300"><FaEdit size={14} /></button>
                                            <button type="button" onClick={() => excluirVenda(venda.id)} className="p-1.5 text-red-500 hover:text-red-400"><FaTrash size={14} /></button>
                                          </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        )) : <EmptyStateRow message="Nenhuma venda encontrada para os filtros aplicados" colSpan={6} />}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    </div>
    );
};


// --- Componente da Aba de Ranking ---
const AbaRanking = ({ perfilUsuario, vendas, usuarios, filtros, setFiltros, configuracoes: initialConfig, onSave, listaFiliais, filialSelecionadaId, setFilialSelecionadaId }) => {
    const [config, setConfig] = useState(initialConfig);
    const [modalConfigVisivel, setModalConfigVisivel] = useState(false);
    const [modalWhatsappVisivel, setModalWhatsappVisivel] = useState(false);
    const [selecaoDupla, setSelecaoDupla] = useState(['', '']);
    const [textoRanking, setTextoRanking] = useState('');

    useEffect(() => {
        setConfig(initialConfig);
    }, [initialConfig]);

    const totaisPorVendedor = useMemo(() => {
        const totais = {};
        const mRank = filtros.mes ? normalizarMesVenda(filtros.mes) : '';
        const vendasDoMes = vendas.filter((v) => !mRank || normalizarMesVenda(v.mes) === mRank);
        usuarios.forEach(u => { totais[u.id] = { id: u.id, nome: u.nome, vendido: 0 }; });
        vendasDoMes.forEach((venda) => {
          if (totais[venda.usuario_id]) { totais[venda.usuario_id].vendido += parseFloat(venda.valor) || 0; }
        });
        return totais;
    }, [vendas, filtros.mes, usuarios]);

    const totaisDuplas = useMemo(() => {
        return (config.duplas || []).map(dupla => {
            const total = dupla.reduce((acc, nome) => {
                const vendedor = Object.values(totaisPorVendedor).find(v => v.nome === nome);
                return acc + (vendedor ? vendedor.vendido : 0);
            }, 0);
            return { nomes: dupla.join(' e '), total, membros: dupla };
        }).sort((a, b) => b.total - a.total);
    }, [config.duplas, totaisPorVendedor]);

    const rankingIndividual = useMemo(() => Object.values(totaisPorVendedor).filter(v => v.vendido > 0).sort((a, b) => b.vendido - a.vendido), [totaisPorVendedor]);
    const vendidoGeral = useMemo(() => rankingIndividual.reduce((acc, v) => acc + v.vendido, 0), [rankingIndividual]);
    const faltaParaMeta = useMemo(() => (config.meta_geral || 0) - vendidoGeral, [config.meta_geral, vendidoGeral]);

    const vendedoresDisponiveis = useMemo(() => {
        const emDupla = new Set((config.duplas || []).flat());
        return usuarios
          .filter((u) => u.nome && !emDupla.has(u.nome))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }, [usuarios, config.duplas]);

    const nomeCurto = (nomeCompleto = '') => {
        const partes = String(nomeCompleto).trim().split(/\s+/).filter(Boolean);
        if (partes.length === 0) return '';
        const formatar = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
        if (partes.length === 1) return formatar(partes[0]);
        return `${formatar(partes[0])} ${formatar(partes[partes.length - 1])}`;
    };

    const formatarDuplaCurta = (membros = []) =>
        membros.map(nomeCurto).filter(Boolean).join(' e ');

    const adicionarDupla = () => {
        const [p1, p2] = selecaoDupla;
        if (!p1 || !p2 || p1 === p2) return;
        setConfig({ ...config, duplas: [...(config.duplas || []), [p1, p2]] });
        setSelecaoDupla(['', '']);
    };

    const removerDupla = (indexParaRemover) => {
        const novaListaDuplas = config.duplas.filter((_, index) => index !== indexParaRemover);
        setConfig({ ...config, duplas: novaListaDuplas });
    };
    
    const handleSalvarConfig = async () => {
        const id_filial_atual = filialSelecionadaId || perfilUsuario?.id_filial;
        if (!id_filial_atual) {
            alert("Erro: Filial não selecionada. Não é possível salvar.");
            return;
        }
        const payload = { ...config, mes: filtros.mes, id_filial: id_filial_atual };
        const { error } = await supabase.from('configuracoes_mensais').upsert(payload, { onConflict: 'mes,id_filial' }); 
        if (error) { alert('Erro ao salvar configurações: ' + error.message); }
        else { alert('Configurações salvas com sucesso!'); onSave(filtros.mes, id_filial_atual); }
    };

    const calcularDiasUteisRestantes = () => {
        const hoje = dayjs();
        const ultimoDiaDoMes = hoje.endOf('month').date();
        let diasUteis = 0;
        for (let dia = hoje.date(); dia <= ultimoDiaDoMes; dia++) {
            const dataVerificada = hoje.date(dia);
            if (dataVerificada.day() !== 0) { // Conta Sábado, ignora Domingo
                diasUteis++;
            }
        }
        return diasUteis > 0 ? diasUteis : 1;
    };
    
    const gerarTextoRanking = useCallback(() => {
        const mesFormatado = dayjs(filtros.mes).format('MMMM');
        const emojisIndividuais = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const emojisDuplas = ['🏆', '🥇', '🥈', '🥉'];
        const formatarValor = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        let texto = `Muito bom dia!\nSegue o rank mensal de ${mesFormatado} para acompanhamento.\n\n`;
        
        texto += `VENDEDORES INDIVIDUAIS:\n\n`;
        rankingIndividual.forEach((vendedor, index) => {
            const emoji = emojisIndividuais[index] || `${index + 1}.`;
            texto += `${emoji} ${vendedor.nome}: ${formatarValor(vendedor.vendido)}\n`;
        });

        if (totaisDuplas.length > 0) {
            texto += `\nRANK DUPLAS:\n\n`;
            totaisDuplas.forEach((dupla, index) => {
                const emoji = emojisDuplas[index] || `${index + 1}.`;
                texto += `${emoji} ${dupla.nomes}: ${formatarValor(dupla.total)}\n`;
            });
        }
        
        const diasRestantes = calcularDiasUteisRestantes();
        const divisaoMeta = faltaParaMeta > 0 ? faltaParaMeta / diasRestantes : 0;

        texto += `\nESCRITÓRIO:\n\n`;
        texto += `META GERAL: ${formatarValor(config.meta_geral || 0)}\n`;
        texto += `VENDIDO GERAL: ${formatarValor(vendidoGeral)}\n`;
        texto += `FALTA PARA META: ${formatarValor(faltaParaMeta > 0 ? faltaParaMeta : 0)}\n`;
        texto += `DIVISÃO POR ${diasRestantes} DIAS DE VENDAS: ${formatarValor(divisaoMeta)}\n`;

        setTextoRanking(texto);
    }, [filtros.mes, rankingIndividual, totaisDuplas, vendidoGeral, faltaParaMeta, config.meta_geral]);

    useEffect(() => {
        gerarTextoRanking();
    }, [gerarTextoRanking]);

    const copiarParaClipboard = () => { navigator.clipboard.writeText(textoRanking); alert('Ranking copiado!'); };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/40">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-300">
                      <FaFilter size={12} /> Ranking de
                    </h3>
                    <input type="month" value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })} className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setModalWhatsappVisivel(true)}
                        className="bg-green-600 hover:bg-green-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5"
                    >
                        <FaWhatsapp size={12} /> WhatsApp
                    </button>
                    <button
                        type="button"
                        onClick={() => setModalConfigVisivel(true)}
                        className="bg-gray-700 hover:bg-gray-600 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5"
                    >
                        <FaCogs size={12} /> Metas e Duplas
                    </button>
                </div>
            </div>

            {modalWhatsappVisivel && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700 animate-fade-in">
                        <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
                            <h3 className="text-base font-semibold flex items-center gap-2 text-white">
                                <FaWhatsapp className="text-green-400" /> Pré-visualização do Ranking
                            </h3>
                            <button type="button" onClick={() => setModalWhatsappVisivel(false)} className="p-1.5 text-gray-500 hover:text-white rounded-full">
                                <FaTimes size={16} />
                            </button>
                        </header>
                        <div className="p-4">
                            <textarea readOnly value={textoRanking} className="w-full h-64 bg-gray-900/50 p-2.5 rounded-lg text-xs font-mono whitespace-pre-wrap border border-gray-700" />
                            <div className="flex flex-wrap gap-2 mt-3">
                                <button type="button" onClick={copiarParaClipboard} className="bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5">
                                    <FaClipboard size={12} /> Copiar Ranking
                                </button>
                                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(textoRanking)}`} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5">
                                    <FaWhatsapp size={12} /> Enviar no WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {modalConfigVisivel && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in">
                        <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
                            <h3 className="text-base font-semibold flex items-center gap-2 text-white">
                              <FaCogs className="text-indigo-400" /> Metas e Duplas — {dayjs(filtros.mes).format('MMMM YYYY')}
                            </h3>
                            <button type="button" onClick={() => setModalConfigVisivel(false)} className="p-1.5 text-gray-500 hover:text-white rounded-full">
                              <FaTimes size={16} />
                            </button>
                        </header>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className={labelClass}>Meta geral do escritório</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                      config.meta_geral
                                        ? Number(config.meta_geral).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : ''
                                    }
                                    onChange={(e) => {
                                      const digits = String(e.target.value).replace(/\D/g, '');
                                      const valor = digits ? parseFloat(digits) / 100 : 0;
                                      setConfig({ ...config, meta_geral: valor });
                                    }}
                                    className="w-full bg-gray-900/60 pl-10 pr-3 py-2.5 rounded-lg border border-gray-600 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="0,00"
                                  />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className={labelClass}>Duplas do mês</label>
                                  <span className="text-xs text-gray-500">{(config.duplas || []).length} formada{(config.duplas || []).length === 1 ? '' : 's'}</span>
                                </div>
                                <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto">
                                    {(config.duplas || []).length === 0 ? (
                                      <p className="text-sm text-gray-500 py-2">Nenhuma dupla formada ainda.</p>
                                    ) : (
                                      (config.duplas || []).map((dupla, index) => (
                                        <div key={index} className="flex items-center justify-between gap-2 bg-gray-900/50 border border-gray-700/80 px-3 py-2 rounded-lg">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="text-xs font-bold text-indigo-400 w-5 shrink-0">{index + 1}</span>
                                              <span className="text-sm text-gray-200 truncate">{formatarDuplaCurta(dupla)}</span>
                                            </div>
                                            <button type="button" onClick={() => removerDupla(index)} className="shrink-0 p-1 text-gray-500 hover:text-red-400 rounded" title="Remover dupla">
                                              <FaTimes size={12} />
                                            </button>
                                        </div>
                                      ))
                                    )}
                                </div>
                                <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3 space-y-2.5">
                                    <p className="text-xs text-gray-400">Nova dupla</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <select
                                        value={selecaoDupla[0] || ''}
                                        onChange={(e) => {
                                          const p1 = e.target.value;
                                          const p2 = selecaoDupla[1] === p1 ? '' : (selecaoDupla[1] || '');
                                          setSelecaoDupla([p1, p2]);
                                        }}
                                        className="bg-gray-800 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      >
                                        <option value="">1º vendedor</option>
                                        {vendedoresDisponiveis
                                          .filter((u) => u.nome !== selecaoDupla[1])
                                          .map((user) => (
                                            <option key={user.id} value={user.nome}>{nomeCurto(user.nome)}</option>
                                          ))}
                                      </select>
                                      <select
                                        value={selecaoDupla[1] || ''}
                                        onChange={(e) => setSelecaoDupla([selecaoDupla[0] || '', e.target.value])}
                                        className="bg-gray-800 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        disabled={!selecaoDupla[0]}
                                      >
                                        <option value="">2º vendedor</option>
                                        {vendedoresDisponiveis
                                          .filter((u) => u.nome !== selecaoDupla[0])
                                          .map((user) => (
                                            <option key={user.id} value={user.nome}>{nomeCurto(user.nome)}</option>
                                          ))}
                                      </select>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={adicionarDupla}
                                      disabled={!selecaoDupla[0] || !selecaoDupla[1]}
                                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2"
                                    >
                                      <FaPlusCircle size={14} /> Adicionar dupla
                                    </button>
                                </div>
                            </div>
                        </div>
                        <footer className="px-4 py-3 flex justify-end gap-2 border-t border-gray-700">
                            <button type="button" onClick={() => setModalConfigVisivel(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-semibold text-white">Cancelar</button>
                            <button type="button" onClick={() => { handleSalvarConfig(); setModalConfigVisivel(false); }} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 text-white">
                              <FaSave size={14} /> Salvar
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-xs font-semibold mb-2 text-indigo-300 uppercase tracking-wide">Metas do escritório</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <StatCard icon={<FaBullseye size={16} />} label="Meta Geral" value={config.meta_geral} color="bg-indigo-500/20" />
                    <StatCard icon={<FaDollarSign size={16} />} label="Vendido Geral" value={vendidoGeral} color="bg-green-500/20" />
                    <StatCard icon={<FaChartLine size={16} />} label="Falta para a Meta" value={faltaParaMeta > 0 ? faltaParaMeta : 0} color={faltaParaMeta > 0 ? "bg-red-500/20" : "bg-green-500/20"} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                    <h3 className="text-xs font-semibold mb-2 text-indigo-300 uppercase tracking-wide">Ranking individual</h3>
                    <div className="space-y-1.5">
                        {rankingIndividual.length > 0 ? rankingIndividual.map((vendedor, index) => (
                            <RankingCard key={vendedor.id} posicao={index} nome={vendedor.nome} valor={vendedor.vendido} isCurrentUser={vendedor.id === perfilUsuario?.id} />
                        )) : <p className="text-gray-500 text-xs">Ninguém vendeu ainda este mês.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="text-xs font-semibold mb-2 text-indigo-300 uppercase tracking-wide">Ranking de duplas</h3>
                    <div className="space-y-1.5">
                        {totaisDuplas.length > 0 ? totaisDuplas.map((dupla, index) => (
                            <RankingCard key={dupla.nomes} posicao={index} nome={dupla.nomes} valor={dupla.total} isCurrentUser={dupla.membros.includes(perfilUsuario?.nome)} />
                        )) : <p className="text-gray-500 text-xs">Duplas não configuradas para este mês.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};