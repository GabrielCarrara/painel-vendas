import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import 'dayjs/locale/pt-br';
import LembretesLeads from '../components/LembretesLeads';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUserCircle, FaBars } from 'react-icons/fa';
import MinhaContaModal from '../components/MinhaContaModal';
import logoFenix from '../assets/logo.png';
import { 
    FaChartBar, FaUsers, FaPlusCircle, FaTrophy, FaFilter, FaEdit, FaTrash, FaSave, FaTimes, 
    FaDollarSign, FaUserTie, FaExclamationTriangle, FaClipboard, FaWhatsapp, FaChartLine, FaCogs,
    FaFileInvoiceDollar,
    FaTh,
    FaBullseye, 
    FaUserPlus,
    FaFileAlt,
    FaPrint,
} from "react-icons/fa";

import PainelCRM from "./PainelCRM";
import RelatorioHSModal from '../components/RelatorioHSModal';
import RelatorioGeralModal from '../components/RelatorioGeralModal';
import PainelContempladas from "./PainelContempladas";
import AbaGerenciarUsuarios from './AbaGerenciarUsuarios';
import HSCotas from './HSCotas';
import PainelAcoes from './PainelAcoes';
import LembreteAcaoDiaria from '../components/LembreteAcaoDiaria';
import ProcessosKanban from '../components/ProcessosKanban';
import PainelDocumentos from './PainelDocumentos';
import {
  totalComissaoP1RecebidaNoMes,
  isParcelaCheia,
  normalizarMesVenda,
  dayjsMesRef,
  nomeMesPortuguesUpper,
  valorComissaoP1,
} from '../utils/comissoes';
import { limparFlagsLembreteRetorno } from '../utils/crmLembreteStorage';
import { lerAbaPainel, salvarAbaPainel } from '../utils/abaPainelStorage';

dayjs.locale('pt-br');

const ABA_STORAGE_KEY = 'painel_diretor_aba';
const ABAS_VALIDAS = ['vendas', 'contempladas', 'hs_cotas', 'processos', 'crm', 'ranking', 'documentos', 'usuarios', 'acoes'];
// --- Componentes de UI Reutilizáveis ---
const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-gray-800 rounded-lg border border-gray-700/50 px-3.5 py-3 flex items-center gap-3 min-w-0">
    <div className={`p-2 rounded-md shrink-0 ${color}`}>{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-400 leading-tight">{label}</p>
      <p className="text-base sm:text-lg font-bold text-white whitespace-nowrap tabular-nums mt-0.5 leading-tight">
        {(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  </div>
);
const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-screen bg-gray-900"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div></div>
);
const EmptyStateRow = ({ message, colSpan }) => (
    <tr><td colSpan={colSpan} className="text-center py-10"><div className="flex flex-col items-center gap-2 text-gray-500"><FaExclamationTriangle size={32} /><p className="font-semibold">{message}</p></div></td></tr>
);

// --- Componente Principal ---
export default function PainelDiretor() {
  dayjs.locale('pt-br'); 

  const [aba, setAba] = useState(() => lerAbaPainel(ABA_STORAGE_KEY, ABAS_VALIDAS));
  const [vendas, setVendas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState({ vendedor: "", mes: dayjs().format("YYYY-MM"), administradora: "", filial: "" });  
  const [filtroCards, setFiltroCards] = useState({
    mes: dayjs().format('MM'),
    ano: dayjs().format('YYYY'),
  });
  const [metaCards, setMetaCards] = useState(0);
  const [editandoId, setEditandoId] = useState(null);
  const [vendaEditada, setVendaEditada] = useState({});
  const [novaVenda, setNovaVenda] = useState({ cliente: "", grupo: "", cota: "", administradora: "GAZIN", valor: "", parcela: "cheia", mes: dayjs().format("YYYY-MM"), usuario_id: "" });
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configuracoes, setConfiguracoes] = useState({ meta_geral: 0, duplas: [] });
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [listaFiliais, setListaFiliais] = useState([]);
  const [filialSelecionadaId, setFilialSelecionadaId] = useState(null);
  const navigate = useNavigate();
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [modalRelatorioHS, setModalRelatorioHS] = useState(false);
  const [modalRelatorioGazin, setModalRelatorioGazin] = useState(false);
  const [modalRelatorioGeral, setModalRelatorioGeral] = useState(false);
  const [modalLancarVenda, setModalLancarVenda] = useState(false);
  const [menuLateralAberto, setMenuLateralAberto] = useState(false);

  const handleLogout = async () => {
      limparFlagsLembreteRetorno();
      await supabase.auth.signOut();
      navigate('/login');
  };
  
  const buscarUsuarios = async () => {
      const { data } = await supabase
        .from("usuarios_custom")
        .select("id, nome, id_filial, email, cargo, telefone, ativo, foto_url, senha_intranet_gazin")
        .order('nome', { ascending: true });
      if (data) setUsuarios(data);
  };
  
  const buscarVendas = async () => {
      const { data } = await supabase.from("vendas").select("*").order("created_at", { ascending: false });
      if (data) setVendas(data);
  };
  
  const buscarTodasFiliais = async () => {
      const { data } = await supabase.from('filiais').select('*');
      if (data) {
          setListaFiliais(data);
      }
  };
  
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
    
   useEffect(() => {
      const carregarDadosIniciais = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
  
        if (user) {
          setUsuarioAtual(user);
          setNovaVenda(prev => ({ ...prev, usuario_id: user.id }));
  
          const { data: perfilData } = await supabase
            .from('usuarios_custom')
            .select('*')
            .eq('id', user.id)
            .single();
  
          if (perfilData) {
            setPerfilUsuario(perfilData);
            setFilialSelecionadaId(perfilData.id_filial);
  
            await Promise.all([
              buscarUsuarios(),
              buscarVendas(),
              fetchConfiguracoes(filtros.mes, perfilData.id_filial),
              buscarTodasFiliais(),
            ]);
          }
        }
        setLoading(false);
      };
  
      carregarDadosIniciais();
      // Montagem inicial apenas; fetchConfiguracoes reage em outros efeitos.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
   
      
    useEffect(() => {
      // Configurações do ranking / aba ranking (não influenciam os cards do Relatório de Vendas)
      const filialIdEfetiva = filtros.filial || filialSelecionadaId;
      if (filtros.mes && filialIdEfetiva) {
        fetchConfiguracoes(filtros.mes, filialIdEfetiva);
      }
    }, [filtros.mes, filtros.filial, filialSelecionadaId, fetchConfiguracoes]);

    const mesReferenciaCards = `${filtroCards.ano}-${filtroCards.mes}`;

    useEffect(() => {
      const carregarMetaCards = async () => {
        const { data } = await supabase
          .from('configuracoes_mensais')
          .select('meta_geral')
          .eq('mes', mesReferenciaCards);
        if (data?.length) {
          setMetaCards(data.reduce((s, r) => s + (parseFloat(r.meta_geral) || 0), 0));
        } else {
          setMetaCards(0);
        }
      };
      carregarMetaCards();
    }, [mesReferenciaCards]);
    
  
    const nomeVendedor = (id) => usuarios.find((u) => u.id === id)?.nome || "Desconhecido";

    const limparFormularioNovaVenda = () => {
      setNovaVenda((prev) => ({
        cliente: "",
        grupo: "",
        cota: "",
        administradora: "GAZIN",
        valor: "",
        parcela: "cheia",
        mes: filtros.mes || dayjs().format("YYYY-MM"),
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
          mes: filtros.mes || dayjs(novaVenda.mes).format("YYYY-MM"),
          // Define o status inicial de todas as parcelas
          // P1 agora é confirmada pela automação Gazin; começa pendente.
          status_parcela_1: 'PENDENTE',
          status_parcela_2: 'PENDENTE',
          status_parcela_3: 'PENDENTE',
          status_parcela_4: 'PENDENTE',
          status_parcela_5: 'PENDENTE',
          mes_conferencia_parcela_1: null,
      };
  
      // Insere a venda e recupera o registro inserido
      const { error } = await supabase.from('vendas').insert([dadosParaSalvar]);
      
      if (error) {
          alert('Erro ao criar venda: ' + error.message);
          return;
      }
  
      // P1 é registrada quando a automação confirmar (persistirMudancaStatusParcela).
  
      // Recarrega os dados, limpa o formulário e volta para a aba de vendas
      await buscarVendas();
      limparFormularioNovaVenda();
      setModalLancarVenda(false);
      alert("Venda cadastrada com sucesso!");
    };
    
    const editarVenda = (venda) => { setEditandoId(venda.id); setVendaEditada({ ...venda, valor: parseFloat(venda.valor) || 0 }); };
    const salvarEdicao = async () => { 
      const dadosParaAtualizar = { ...vendaEditada, valor: parseFloat(vendaEditada.valor) || 0 };
      await supabase.from("vendas").update(dadosParaAtualizar).eq("id", editandoId); 
      setEditandoId(null); setVendaEditada({}); buscarVendas(); 
    };
    const excluirVenda = async (id) => {
      if (!window.confirm("Tem certeza?")) return;
      await supabase.from("vendas").delete().eq("id", id);
      if (editandoId === id) {
        setEditandoId(null);
        setVendaEditada({});
      }
      buscarVendas();
    };
  
  // COLE ESTE BLOCO CORRIGIDO NO LUGAR DO SEU calculosDoMes ATUAL
  const calculosDoMes = useMemo(() => {
      // Primeiro, filtramos os usuários com base na filial selecionada no filtro.
      const usuariosDaFilialFiltrada = filtros.filial
          ? usuarios.filter((u) => String(u.id_filial) === String(filtros.filial))
          : usuarios;
  
      // Criamos uma lista de IDs desses usuários para usar no filtro de vendas.
      const idsUsuariosDaFilial = usuariosDaFilialFiltrada.map(u => u.id);
  
      const mesFiltroNorm = filtros.mes ? normalizarMesVenda(filtros.mes) : '';

      const vendasFiltradas = vendas.filter((v) => {
          const matchFilial = !filtros.filial || idsUsuariosDaFilial.includes(v.usuario_id);
          const matchVendedor = !filtros.vendedor || v.usuario_id === filtros.vendedor;
          const matchMes = !mesFiltroNorm || normalizarMesVenda(v.mes) === mesFiltroNorm;
          const matchAdm = !filtros.administradora || v.administradora === filtros.administradora;
          return matchFilial && matchVendedor && matchMes && matchAdm;
      });
  
      const totaisPorVendedor = {};
      usuarios.forEach(u => { totaisPorVendedor[u.id] = { nome: u.nome, vendido: 0 }; });
  
      vendasFiltradas.forEach((venda) => {
        const id = venda.usuario_id;
        const valor = parseFloat(venda.valor) || 0;
        if (totaisPorVendedor[id] && (!mesFiltroNorm || normalizarMesVenda(venda.mes) === mesFiltroNorm)) {
            totaisPorVendedor[id].vendido += valor;
        }
      });
  
      return { vendasFiltradas, totaisPorVendedor };
  }, [vendas, usuarios, filtros]);

  // Totais dos cards: só mês/ano do Relatório de Vendas (ignoram filtros de lançamentos)
  const calculosCards = useMemo(() => {
      const mesNorm = normalizarMesVenda(mesReferenciaCards);
      let totalMesTodos = 0;
      let totalVendidoGAZIN = 0;
      let totalVendidoHS = 0;

      vendas.forEach((venda) => {
        if (normalizarMesVenda(venda.mes) !== mesNorm) return;
        const valor = parseFloat(venda.valor) || 0;
        totalMesTodos += valor;
        if (venda.administradora === 'GAZIN') totalVendidoGAZIN += valor;
        if (venda.administradora === 'HS') totalVendidoHS += valor;
      });

      return { totalMesTodos, totalVendidoGAZIN, totalVendidoHS };
  }, [vendas, mesReferenciaCards]);

  const valorFaltanteParaMeta = useMemo(() => {
      return (metaCards || 0) - (calculosCards?.totalMesTodos || 0);
  }, [metaCards, calculosCards?.totalMesTodos]);
  
  
    // CAMINHO DE ABAS
    const abas = [
      { id: 'vendas', label: 'Controle de Vendas', icon: <FaChartBar /> },
      { id: 'contempladas', label: 'Cartas Contempladas', icon: <FaChartLine /> },
      { id: 'hs_cotas', label: 'Controle de Cotas HS', icon: <FaTh /> },
      { id: 'processos', label: 'Controle de Processos', icon: <FaClipboard /> },
      { id: 'crm', label: 'Controle de Leads CRM', icon: <FaUsers /> },
      { id: 'ranking', label: 'Ranking de Vendedores', icon: <FaTrophy /> },
      { id: 'documentos', label: 'Edição de Documentações', icon: <FaFileAlt /> },
      { id: 'usuarios', label: 'Gerenciamento de Usuários', icon: <FaUserPlus /> },
    ];
    
    const renderContent = () => {
      switch (aba) {
       case 'vendas': return <AbaVendas 
       listaFiliais={listaFiliais} 
    vendasFiltradas={calculosDoMes.vendasFiltradas}
    vendasTodas={vendas}
    totalMesTodos={calculosCards.totalMesTodos}
    totalVendidoGAZIN={calculosCards.totalVendidoGAZIN}
    totalVendidoHS={calculosCards.totalVendidoHS}
    filtroCards={filtroCards}
    setFiltroCards={setFiltroCards}
    usuarios={usuarios}
    filtros={filtros} setFiltros={setFiltros} 
    nomeVendedor={nomeVendedor} 
    editandoId={editandoId} setEditandoId={setEditandoId} 
    vendaEditada={vendaEditada} setVendaEditada={setVendaEditada}
    editarVenda={editarVenda} salvarEdicao={salvarEdicao} 
    excluirVenda={excluirVenda} 
    valorFaltanteParaMeta={valorFaltanteParaMeta}
    onAbrirModalRelatorioGeral={() => setModalRelatorioGeral(true)}
    onLancarVenda={abrirModalLancarVenda}
  />;
          // CASES PARA ROTAS
          case 'acoes': 
  return <PainelAcoes 
    usuario={perfilUsuario} 
    podeEditar={true}
    filiais={listaFiliais}
    usuarios={usuarios}
  />;
  case 'ranking': {
      // 1. Filtra os usuários com base na filial selecionada no dropdown
      const usuariosParaRanking = filialSelecionadaId
          ? usuarios.filter((u) => String(u.id_filial) === String(filialSelecionadaId))
          : usuarios;
  
      // Pega os IDs dos usuários filtrados para usar no filtro de vendas
      const idsDosUsuariosParaRanking = usuariosParaRanking.map(u => u.id);
  
      // 2. Filtra as vendas para incluir apenas as dos usuários da filial selecionada
      const vendasParaRanking = filialSelecionadaId
          ? vendas.filter(v => idsDosUsuariosParaRanking.includes(v.usuario_id))
          : vendas;
  
      return (
          <AbaRanking 
              perfilUsuario={perfilUsuario} 
              vendas={vendasParaRanking}
              usuarios={usuariosParaRanking}
              filtros={filtros} 
              setFiltros={setFiltros} 
              configuracoes={configuracoes} 
              onSave={fetchConfiguracoes}
              listaFiliais={listaFiliais}
              filialSelecionadaId={filialSelecionadaId}
              setFilialSelecionadaId={setFilialSelecionadaId}
              onAbrirModalRelatorioHS={() => setModalRelatorioHS(true)}
              onAbrirModalRelatorioGazin={() => setModalRelatorioGazin(true)}
          />
      );
  }     
        case 'crm': return (
          <PainelCRM
            cargo={perfilUsuario?.cargo}
            usuarioLogadoId={perfilUsuario?.id || usuarioAtual?.id}
            listaUsuarios={usuarios}
          />
        ); 
        case 'contempladas': return <PainelContempladas usuario={perfilUsuario} />;
        case 'hs_cotas': return <HSCotas usuario={perfilUsuario} />;  
        case 'processos': return <ProcessosKanban usuario={perfilUsuario} />;
  case 'usuarios': 
    return <AbaGerenciarUsuarios 
      listaFiliais={listaFiliais} 
      listaUsuarios={usuarios}
      onRefreshUsuarios={buscarUsuarios}
    />;
        case 'documentos':
          return <PainelDocumentos />;
        default: return null;
      }
      
    };
    
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
          <div className="relative px-4 py-4 border-b border-gray-800 flex items-center justify-center shrink-0">
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
          <div className="lg:hidden shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center">
            <button
              type="button"
              className="p-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700"
              onClick={() => setMenuLateralAberto(true)}
              aria-label="Abrir menu"
            >
              <FaBars size={18} />
            </button>
          </div>

          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-3 sm:p-4 md:p-5">
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
              buscarUsuarios();
            }}
          />
        )}
        {modalRelatorioHS && (
          <RelatorioHSModal
            vendas={vendas}
            usuarios={usuarios}
            administradora="HS"
            onClose={() => setModalRelatorioHS(false)}
          />
        )}
        {modalRelatorioGazin && (
          <RelatorioHSModal
            vendas={vendas}
            usuarios={usuarios}
            administradora="GAZIN"
            onClose={() => setModalRelatorioGazin(false)}
          />
        )}
        {modalRelatorioGeral && (
          <RelatorioGeralModal
            vendas={vendas}
            usuarios={usuarios}
            filtros={filtros}
            listaFiliais={listaFiliais}
            onClose={() => setModalRelatorioGeral(false)}
          />
        )}
        {modalLancarVenda && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in">
              <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <FaPlusCircle className="text-indigo-400" /> Lançar Venda
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
                  <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Vendedor</label>
                  <select
                    className="w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Cliente</label>
                    <input
                      placeholder="Nome do cliente"
                      className="w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={novaVenda.cliente}
                      onChange={(e) => setNovaVenda({ ...novaVenda, cliente: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Valor do crédito</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      className="w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={novaVenda.valor}
                      onChange={(e) => setNovaVenda({ ...novaVenda, valor: formatInputMoeda(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Parcela</label>
                    <select
                      className="w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={novaVenda.parcela}
                      onChange={(e) => setNovaVenda({ ...novaVenda, parcela: e.target.value })}
                    >
                      <option value="cheia">Cheia</option>
                      <option value="meia">Meia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Grupo</label>
                    <input
                      placeholder="Grupo"
                      className="w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={novaVenda.grupo}
                      onChange={(e) => setNovaVenda({ ...novaVenda, grupo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Cota</label>
                    <input
                      placeholder="Cota"
                      className="w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={novaVenda.cota}
                      onChange={(e) => setNovaVenda({ ...novaVenda, cota: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Administradora</label>
                    <select
                      className="w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={cadastrarVenda}
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2"
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
  const AbaVendas = ({ listaFiliais, vendasFiltradas, vendasTodas, totalMesTodos, totalVendidoGAZIN, totalVendidoHS, filtroCards, setFiltroCards, usuarios, filtros, setFiltros, nomeVendedor, editandoId, setEditandoId, vendaEditada, setVendaEditada, editarVenda, salvarEdicao, excluirVenda, valorFaltanteParaMeta, onAbrirModalRelatorioGeral, onLancarVenda }) => {
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
      const anoMinimo = 2025;
      const anoMaximo = Math.max(anoAtual, anoMinimo);
      const opcoesAno = Array.from(
        { length: anoMaximo - anoMinimo + 1 },
        (_, i) => String(anoMinimo + i)
      );

      const dMes = dayjsMesRef(filtros.mes);
      const faltaParaMetaClamped = valorFaltanteParaMeta > 0 ? valorFaltanteParaMeta : 0;
      const mesLabel = dMes.format('MMMM');
  
      const vendedorSelecionadoId = filtros.vendedor;
      const nomeVendedorSelecionado = vendedorSelecionadoId ? nomeVendedor(vendedorSelecionadoId) : "";

      const formatarMoeda = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      const mesP1VendasLabel = dMes.subtract(1, 'month').format('MMMM [de] YYYY');
      const mesP1RecebeLabel = dMes.format('MMMM [de] YYYY');
      const subtituloComissaoP1 = `Comissão P1 das vendas de ${mesP1VendasLabel}, recebida em ${mesP1RecebeLabel}.`;
      const mesNomeUpper = nomeMesPortuguesUpper(filtros.mes);
      const mesSeguinteLabel = dMes.add(1, 'month').format('MMMM [de] YYYY');
      const subtituloComissaoMesAtual = `Comissão P1 das vendas de ${mesLabel}, a receber em ${mesSeguinteLabel}.`;

      const totaisVendedorParaPrint = useMemo(() => {
          const mesRef = filtros.mes;
          const uid = vendedorSelecionadoId;
          if (!uid) {
            return {
              totalVendidoMes: 0,
              totalComissaoP1: 0,
              totalComissaoMesAtual: 0,
            };
          }

          const mesRefNorm = normalizarMesVenda(mesRef);
          const vendasDoMes = (vendasTodas || []).filter(
            (v) => v.usuario_id === uid && normalizarMesVenda(v.mes) === mesRefNorm
          );
          const totalVendidoMes = vendasDoMes.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
          const totalComissaoMesAtual = vendasDoMes.reduce((s, v) => s + valorComissaoP1(v), 0);
          const vendasDoVendedor = (vendasTodas || []).filter((v) => v.usuario_id === uid);
          const totalComissaoP1 = totalComissaoP1RecebidaNoMes(vendasDoVendedor, uid, mesRef);

          return {
              totalVendidoMes,
              totalComissaoP1,
              totalComissaoMesAtual,
          };
      }, [vendasTodas, filtros.mes, vendedorSelecionadoId]);

      const PrintMetricCard = ({ title, value, subtitle }) => (
          <div className="bg-white border border-gray-300 rounded-lg p-3">
              <p className="text-[11px] font-extrabold text-black">{title}</p>
              <p className="text-base font-extrabold text-black mt-1">{formatarMoeda(value)}</p>
              {subtitle ? <p className="text-[10px] text-gray-700 mt-2 leading-snug">{subtitle}</p> : null}
          </div>
      );

      const vendedoresFiltradosParaDropdown = useMemo(() => {
          if (!filtros.filial) {
              return usuarios; 
          }
          return usuarios.filter((u) => String(u.id_filial) === String(filtros.filial));
      }, [usuarios, filtros.filial]);
  
      return (
      <div className="animate-fade-in space-y-5">
          <div className="print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h2 className="text-lg font-bold text-white leading-none">Relatório de Vendas</h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filtroCards.mes}
                  onChange={(e) => setFiltroCards((prev) => ({ ...prev, mes: e.target.value }))}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  aria-label="Mês do relatório de vendas"
                >
                  {opcoesMes.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={filtroCards.ano}
                  onChange={(e) => setFiltroCards((prev) => ({ ...prev, ano: e.target.value }))}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  aria-label="Ano do relatório de vendas"
                >
                  {opcoesAno.map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard icon={<FaDollarSign size={18} />} label="Total Vendido" value={totalMesTodos} color="bg-green-500/20 text-green-400" />
                <StatCard
                  icon={<FaBullseye size={18} />}
                  label="Valor Faltante para Meta"
                  value={faltaParaMetaClamped}
                  color={faltaParaMetaClamped > 0 ? "bg-red-500/20 text-red-400" : "bg-green-500/20"}
                />
                <StatCard
                  icon={<FaDollarSign size={18} />}
                  label="Total de Vendas Gazin"
                  value={totalVendidoGAZIN}
                  color="bg-indigo-500/20 text-indigo-300"
                />
                <StatCard
                  icon={<FaDollarSign size={18} />}
                  label="Total de Vendas HS"
                  value={totalVendidoHS}
                  color="bg-purple-500/20 text-purple-300"
                />
            </div>
          </div>

          <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h2 className="text-lg font-bold text-white leading-none">Relatório de Vendas Lançadas</h2>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                      type="button"
                      onClick={onLancarVenda}
                      className="bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5"
                  >
                      <FaPlusCircle size={12} /> Lançar Venda
                  </button>
                  <button
                      type="button"
                      onClick={onAbrirModalRelatorioGeral}
                      className="bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5"
                  >
                      <FaPrint size={12} /> Relatório de Comissão Mensal
                  </button>
              </div>
          </div>

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
                  <div className="grid grid-cols-3 gap-3">
                      <PrintMetricCard title={`TOTAL VENDIDO MÊS DE ${mesNomeUpper}`} value={totaisVendedorParaPrint.totalVendidoMes} />
                      <PrintMetricCard
                          title="COMISSÃO DAS VENDAS DO MÊS PASSADO"
                          value={totaisVendedorParaPrint.totalComissaoP1}
                          subtitle={subtituloComissaoP1}
                      />
                      <PrintMetricCard
                          title="COMISSÃO A RECEBER (MÊS ATUAL)"
                          value={totaisVendedorParaPrint.totalComissaoMesAtual}
                          subtitle={subtituloComissaoMesAtual}
                      />
                  </div>
              ) : (
                  <p className="text-[11px] text-black/70">Selecione um vendedor para imprimir o resultado.</p>
              )}
          </div>
          
          <main className="bg-gray-800/50 rounded-xl shadow-2xl p-4 print:hidden"> 
  
              {/* --- DIV DE FILTROS E BOTÕES (LAYOUT CORRIGIDO) --- */}
              <div className="print-hidden mb-4 pb-4 border-b border-gray-700 space-y-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2 text-gray-300">
                    <FaFilter size={12} /> Filtros
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                      <select
                        value={(filtros.mes || '').split('-')[1] || dayjs().format('MM')}
                        onChange={(e) => {
                          const ano = (filtros.mes || '').split('-')[0] || dayjs().format('YYYY');
                          setFiltros({ ...filtros, mes: `${ano}-${e.target.value}` });
                        }}
                        className="w-full bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                        aria-label="Mês das vendas lançadas"
                      >
                        {opcoesMes.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>

                      <select
                        value={(filtros.mes || '').split('-')[0] || dayjs().format('YYYY')}
                        onChange={(e) => {
                          const mes = (filtros.mes || '').split('-')[1] || dayjs().format('MM');
                          setFiltros({ ...filtros, mes: `${e.target.value}-${mes}` });
                        }}
                        className="w-full bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                        aria-label="Ano das vendas lançadas"
                      >
                        {opcoesAno.map((ano) => (
                          <option key={ano} value={ano}>{ano}</option>
                        ))}
                      </select>

                      <select
                          value={filtros.filial}
                          onChange={(e) => setFiltros({ ...filtros, filial: e.target.value, vendedor: "" })}
                          className="w-full bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                          <option value="">Todas as Filiais</option>
                          {listaFiliais.map((filial) => (
                              <option key={filial.id} value={filial.id}>{filial.nome}</option>
                          ))}
                      </select>

                      <select
                          value={filtros.vendedor}
                          onChange={(e) => setFiltros({ ...filtros, vendedor: e.target.value })}
                          className="w-full bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                          <option value="">Todos os Vendedores</option>
                          {vendedoresFiltradosParaDropdown.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>

                      <select
                        value={filtros.administradora}
                        onChange={(e) => setFiltros({ ...filtros, administradora: e.target.value })}
                        className="w-full bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                          <option value="">Todas Administradoras</option>
                          <option value="HS">HS</option>
                          <option value="GAZIN">GAZIN</option>
                      </select>
                  </div>
              </div>

              {vendedorSelecionadoId && (
                <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gray-900/40 border border-gray-700 rounded-lg px-3.5 py-3">
                    <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                      <FaDollarSign /> Total Vendido
                    </p>
                    <p className="text-lg font-bold text-white mt-1 tabular-nums">{formatarMoeda(totaisVendedorParaPrint.totalVendidoMes)}</p>
                  </div>
                  <div className="bg-gray-900/40 border border-gray-700 rounded-lg px-3.5 py-3">
                    <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                      <FaFileInvoiceDollar /> Comissão do mês passado
                    </p>
                    <p className="text-lg font-bold text-white mt-1 tabular-nums">{formatarMoeda(totaisVendedorParaPrint.totalComissaoP1)}</p>
                  </div>
                  <div className="bg-gray-900/40 border border-gray-700 rounded-lg px-3.5 py-3">
                    <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                      <FaUserTie /> Comissão a receber (mês atual)
                    </p>
                    <p className="text-lg font-bold text-white mt-1 tabular-nums">{formatarMoeda(totaisVendedorParaPrint.totalComissaoMesAtual)}</p>
                  </div>
                </div>
              )}
              {/* --- FIM DA DIV DE FILTROS E BOTÕES --- */}
              
              {/* Tabela de Lançamentos */}
              <div className="min-w-0">
                  <div className="w-full min-w-0">
                      <table className="w-full table-fixed text-xs text-left">
                          <thead className="border-b border-gray-700">
                            <tr className="text-gray-400 uppercase tracking-wide">
                              <th className="w-[18%] px-2 py-2">Cliente</th>
                              <th className="w-[9%] px-2 py-2">Admin</th>
                              <th className="w-[11%] px-2 py-2">Grupo/Cota</th>
                              <th className="w-[7%] px-2 py-2">Tipo</th>
                              <th className="w-[13%] px-2 py-2">Valor</th>
                              <th className="w-[20%] px-2 py-2">Vendedor</th>
                              <th className="w-[12%] px-2 py-2 text-right">Comissão</th>
                              <th className="w-[10%] px-2 py-2 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                              {vendasFiltradas.length > 0 ? vendasFiltradas.map((venda) => {
                                  const comissaoMes = valorComissaoP1(venda);
                                  const tipoCheia = isParcelaCheia(venda);
                                  return (
                                  <tr key={venda.id} className="border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors">
                                      {editandoId === venda.id ? (
                                          <>
                                              <td className="p-1.5">
                                                <input value={vendaEditada.cliente || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, cliente: e.target.value.toUpperCase() })} className="bg-gray-600 p-1.5 rounded w-full text-xs"/>
                                              </td>
                                              <td className="p-1.5">
                                                <select value={vendaEditada.administradora || 'GAZIN'} onChange={(e) => setVendaEditada({ ...vendaEditada, administradora: e.target.value })} className="bg-gray-600 p-1.5 rounded w-full text-xs">
                                                  <option value="GAZIN">GAZIN</option>
                                                  <option value="HS">HS</option>
                                                </select>
                                              </td>
                                              <td className="p-1.5">
                                                <div className="flex gap-1">
                                                  <input placeholder="G" value={vendaEditada.grupo || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, grupo: e.target.value })} className="bg-gray-600 p-1.5 rounded w-1/2 text-xs"/>
                                                  <input placeholder="C" value={vendaEditada.cota || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, cota: e.target.value })} className="bg-gray-600 p-1.5 rounded w-1/2 text-xs"/>
                                                </div>
                                              </td>
                                              <td className="p-1.5">
                                                <select value={vendaEditada.parcela || 'cheia'} onChange={(e) => setVendaEditada({...vendaEditada, parcela: e.target.value})} className="bg-gray-600 p-1.5 rounded w-full text-xs">
                                                      <option value="cheia">Cheia</option>
                                                      <option value="meia">Meia</option>
                                                  </select>
                                              </td>
                                              <td className="p-1.5">
                                                <input
                                                  type="text"
                                                  inputMode="numeric"
                                                  value={
                                                    vendaEditada.valor
                                                      ? Number(vendaEditada.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                      : ''
                                                  }
                                                  onChange={(e) => {
                                                    const digits = String(e.target.value).replace(/\D/g, '');
                                                    const valor = digits ? parseFloat(digits) / 100 : 0;
                                                    setVendaEditada({ ...vendaEditada, valor });
                                                  }}
                                                  className="bg-gray-600 p-1.5 rounded w-full text-xs tabular-nums"
                                                  placeholder="0,00"
                                                />
                                              </td>
                                              <td className="p-1.5 truncate" title={nomeVendedor(venda.usuario_id)}>{nomeVendedor(venda.usuario_id)}</td>
                                              <td className="p-1.5 text-right text-gray-400">—</td>
                                              <td className="p-1.5">
                                                  <div className="flex gap-1 justify-center">
                                                      <button type="button" onClick={salvarEdicao} className="p-1 text-green-400 hover:text-green-300" title="Salvar"><FaSave size={14} /></button>
                                                      <button type="button" onClick={() => { setEditandoId(null); setVendaEditada({}); }} className="p-1 text-gray-400 hover:text-gray-200" title="Cancelar"><FaTimes size={14} /></button>
                                                      <button type="button" onClick={() => excluirVenda(venda.id)} className="p-1 text-red-500 hover:text-red-400" title="Excluir"><FaTrash size={14} /></button>
                                                  </div>
                                              </td>
                                          </>
                                      ) : (
                                          <>
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
                                                {parseFloat(venda.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                              </td>
                                              <td className="px-2 py-2 text-gray-200 truncate" title={nomeVendedor(venda.usuario_id)}>
                                                {nomeVendedor(venda.usuario_id)}
                                              </td>
                                              <td className="px-2 py-2 text-right font-semibold text-cyan-300 tabular-nums truncate">
                                                {comissaoMes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                              </td>
                                              <td className="px-2 py-2">
                                                  <div className="flex gap-1 justify-center">
                                                      <button onClick={() => editarVenda(venda)} className="p-1 text-blue-400 hover:text-blue-300"><FaEdit size={14} /></button>
                                                      <button onClick={() => excluirVenda(venda.id)} className="p-1 text-red-500 hover:text-red-400"><FaTrash size={14} /></button>
                                                  </div>
                                              </td>
                                          </>
                                      )}
                                  </tr>
                                  );
                              }) : <EmptyStateRow message="Nenhuma venda encontrada para os filtros aplicados" colSpan={8} />}
                          </tbody>
                      </table>
                  </div>
              </div>
          </main>
      </div>
      );
  };
  
  // --- Componente da Aba de Ranking (VERSÃO FINAL CORRIGIDA) ---
  const AbaRanking = ({ perfilUsuario, vendas, usuarios, filtros, setFiltros, configuracoes: initialConfig, onSave, listaFiliais, filialSelecionadaId, setFilialSelecionadaId, onAbrirModalRelatorioHS, onAbrirModalRelatorioGazin }) => {
      const [config, setConfig] = useState(initialConfig);
      const [modalConfigVisivel, setModalConfigVisivel] = useState(false);
      const [modalWhatsappVisivel, setModalWhatsappVisivel] = useState(false);
      const [selecaoDupla, setSelecaoDupla] = useState(['', '']);
      const [textoRanking, setTextoRanking] = useState('');

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
      const opcoesAno = Array.from(
        { length: Math.max(anoAtual, 2025) - 2025 + 1 },
        (_, i) => String(2025 + i)
      );
  
      useEffect(() => {
          setConfig(initialConfig);
      }, [initialConfig]);
  
      // Funções para calcular os totais
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

      const nomeCurto = (nomeCompleto = '') => {
          const partes = String(nomeCompleto).trim().split(/\s+/).filter(Boolean);
          if (partes.length === 0) return '';
          const formatar = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
          if (partes.length === 1) return formatar(partes[0]);
          return `${formatar(partes[0])} ${formatar(partes[partes.length - 1])}`;
      };

      const formatarDuplaCurta = (membros = []) =>
          membros.map(nomeCurto).filter(Boolean).join(' e ');
  
      const rankingIndividual = useMemo(() => Object.values(totaisPorVendedor).filter(v => v.vendido > 0).sort((a, b) => b.vendido - a.vendido), [totaisPorVendedor]);
      const vendidoGeral = useMemo(() => rankingIndividual.reduce((acc, v) => acc + v.vendido, 0), [rankingIndividual]);
      const faltaParaMeta = useMemo(() => (config.meta_geral || 0) - vendidoGeral, [config.meta_geral, vendidoGeral]);

      const vendedoresDisponiveis = useMemo(() => {
          const emDupla = new Set((config.duplas || []).flat());
          return usuarios
            .filter((u) => u.nome && !emDupla.has(u.nome))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      }, [usuarios, config.duplas]);
  
      // Componente para exibir o card de ranking
      const RankingCard = ({ posicao, nome, valor, isCurrentUser }) => {
          const medalhas = ['🥇', '🥈', '🥉'];
          const prefixo = posicao < 3 ? medalhas[posicao] : <span className="text-gray-400 font-bold text-sm">{posicao + 1}º</span>;
          return (
              <div className={`px-3 py-2 rounded-lg flex items-center justify-between gap-2 ${isCurrentUser ? 'bg-indigo-600/30 ring-1 ring-indigo-500' : 'bg-gray-800'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base w-6 text-center shrink-0">{prefixo}</span>
                    <span className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-white' : 'text-gray-300'}`}>{nome}</span>
                  </div>
                  <span className="text-sm font-bold text-green-400 whitespace-nowrap tabular-nums">{valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
          );
      };
  
      // Funções para gerenciar as duplas
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
      
      // Função para salvar as configurações
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
      // NOVA FUNÇÃO PARA CALCULAR OS DIAS ÚTEIS RESTANTES
      // ==================================================================
      const calcularDiasUteisRestantes = () => {
          const hoje = dayjs();
          const ultimoDiaDoMes = hoje.endOf('month').date();
          let diasUteis = 0;
  
          // Loop a partir de hoje até o fim do mês
          for (let dia = hoje.date(); dia <= ultimoDiaDoMes; dia++) {
              const dataVerificada = hoje.date(dia);
              // day() retorna 0 para Domingo
              if (dataVerificada.day() !== 0) {
                  diasUteis++;
              }
          }
          // Retorna no mínimo 1 para evitar divisão por zero
          return diasUteis > 0 ? diasUteis : 1;
      };
      // ==================================================================
      // FUNÇÃO PRINCIPAL PARA GERAR O TEXTO DO WHATSAPP (VERSÃO ATUALIZADA)
      // ==================================================================
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
          
          // --- LÓGICA ATUALIZADA AQUI ---
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
  
      // PARTE VISUAL DO COMPONENTE
      return (
          <div className="animate-fade-in space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3 bg-gray-800/50 rounded-xl">
                  <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-300">
                        <FaFilter size={12} /> Filtros
                      </h3>
                      <select
                        value={(filtros.mes || '').split('-')[1] || dayjs().format('MM')}
                        onChange={(e) => {
                          const ano = (filtros.mes || '').split('-')[0] || dayjs().format('YYYY');
                          setFiltros({ ...filtros, mes: `${ano}-${e.target.value}` });
                        }}
                        className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
                        aria-label="Mês do ranking"
                      >
                        {opcoesMes.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <select
                        value={(filtros.mes || '').split('-')[0] || dayjs().format('YYYY')}
                        onChange={(e) => {
                          const mes = (filtros.mes || '').split('-')[1] || dayjs().format('MM');
                          setFiltros({ ...filtros, mes: `${e.target.value}-${mes}` });
                        }}
                        className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
                        aria-label="Ano do ranking"
                      >
                        {opcoesAno.map((ano) => (
                          <option key={ano} value={ano}>{ano}</option>
                        ))}
                      </select>
                      {perfilUsuario?.cargo?.toLowerCase() === 'diretor' && (
                          <select
                            value={filialSelecionadaId || ''}
                            onChange={(e) => setFilialSelecionadaId(e.target.value)}
                            className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
                          >
                              <option value="" disabled>Selecione uma filial</option>
                              {listaFiliais.map(filial => (<option key={filial.id} value={filial.id}>{filial.nome}</option>))}
                          </select>
                      )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                      <button
                          type="button"
                          onClick={onAbrirModalRelatorioHS}
                          className="bg-cyan-600 hover:bg-cyan-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5"
                      >
                          <FaChartLine size={12} /> RANK HS
                      </button>
                      <button
                          type="button"
                          onClick={onAbrirModalRelatorioGazin}
                          className="bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5"
                      >
                          <FaChartLine size={12} /> RANK GAZIN
                      </button>
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
                      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700 animate-fade-in">
                          <header className="p-4 flex justify-between items-center border-b border-gray-700">
                              <h3 className="text-base font-semibold flex items-center gap-2">
                                  <FaWhatsapp className="text-green-400" /> Pré-visualização do Ranking
                              </h3>
                              <button type="button" onClick={() => setModalWhatsappVisivel(false)} className="p-2 text-gray-500 hover:text-white rounded-full">
                                  <FaTimes size={18} />
                              </button>
                          </header>
                          <div className="p-4">
                              <textarea readOnly value={textoRanking} className="w-full h-72 bg-gray-900/50 p-2.5 rounded-lg text-xs font-mono whitespace-pre-wrap" />
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
              
              {/* --- MODAL DE CONFIGURAÇÕES --- */}
  {modalConfigVisivel && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in">
              <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <FaCogs className="text-indigo-400" /> Metas e Duplas — {dayjs(filtros.mes).format('MMMM YYYY')}
                  </h3>
                  <button type="button" onClick={() => setModalConfigVisivel(false)} className="p-1.5 text-gray-500 hover:text-white rounded-full">
                    <FaTimes size={16} />
                  </button>
              </header>

              <div className="p-4 space-y-5">
                  <div>
                      <label className="block mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Meta geral do escritório</label>
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
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Duplas do mês</label>
                        <span className="text-xs text-gray-500">{(config.duplas || []).length} formada{(config.duplas || []).length === 1 ? '' : 's'}</span>
                      </div>

                      <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                          {(config.duplas || []).length === 0 ? (
                            <p className="text-sm text-gray-500 py-2">Nenhuma dupla formada ainda.</p>
                          ) : (
                            (config.duplas || []).map((dupla, index) => (
                              <div key={index} className="flex items-center justify-between gap-2 bg-gray-900/50 border border-gray-700/80 px-3 py-2 rounded-lg">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-bold text-indigo-400 w-5 shrink-0">{index + 1}</span>
                                    <span className="text-sm text-gray-200 truncate">{formatarDuplaCurta(dupla)}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removerDupla(index)}
                                    className="shrink-0 p-1 text-gray-500 hover:text-red-400 rounded"
                                    title="Remover dupla"
                                  >
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
                  <button onClick={() => setModalConfigVisivel(false)} type="button" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-semibold">Cancelar</button>
                  <button
                    type="button"
                    onClick={() => { handleSalvarConfig(); setModalConfigVisivel(false); }}
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2"
                  >
                    <FaSave size={14} /> Salvar
                  </button>
              </footer>
          </div>
      </div>
  )}
  
              <div>
                  <h3 className="text-sm font-semibold mb-2 text-indigo-400">METAS DO ESCRITÓRIO</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <StatCard icon={<FaBullseye size={18} />} label="Meta Geral" value={config.meta_geral} color="bg-indigo-500/20 text-indigo-300" />
                      <StatCard icon={<FaDollarSign size={18} />} label="Vendido Geral" value={vendidoGeral} color="bg-green-500/20 text-green-400" />
                      <StatCard icon={<FaChartLine size={18} />} label="Falta para a Meta" value={faltaParaMeta > 0 ? faltaParaMeta : 0} color={faltaParaMeta > 0 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"} />
                  </div>
              </div>
  
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                      <h3 className="text-sm font-semibold mb-2 text-indigo-400">RANKING INDIVIDUAL</h3>
                      <div className="space-y-1.5">
                          {rankingIndividual.length > 0 ? rankingIndividual.map((vendedor, index) => (
                              <RankingCard key={vendedor.id} posicao={index} nome={vendedor.nome} valor={vendedor.vendido} isCurrentUser={vendedor.id === perfilUsuario?.id} />
                          )) : <p className="text-sm text-gray-500">Ninguém vendeu ainda este mês.</p>}
                      </div>
                  </div>
                  <div>
                      <h3 className="text-sm font-semibold mb-2 text-indigo-400">RANKING DE DUPLAS</h3>
                      <div className="space-y-1.5">
                          {totaisDuplas.length > 0 ? totaisDuplas.map((dupla, index) => (
                              <RankingCard key={dupla.nomes} posicao={index} nome={formatarDuplaCurta(dupla.membros)} valor={dupla.total} isCurrentUser={dupla.membros.includes(perfilUsuario?.nome)} />
                          )) : <p className="text-sm text-gray-500">Duplas não configuradas para este mês.</p>}
                      </div>
                  </div>
              </div>
              
          </div>
      );
  };