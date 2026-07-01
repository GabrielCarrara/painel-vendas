import React, { useEffect, useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import 'dayjs/locale/pt-br';
import LembretesLeads from '../components/LembretesLeads';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import MinhaContaModal from '../components/MinhaContaModal';
import { 
    FaChartBar, FaUsers, FaPlusCircle, FaTrophy, FaFilter, FaEdit, FaTrash, FaSave, FaTimes, 
    FaDollarSign, FaUserTie, FaExclamationTriangle, FaClipboard, FaWhatsapp, FaChartLine, FaCogs,
    FaFileInvoiceDollar,
    FaTh,
    FaBullseye, 
    FaUserPlus,
    FaCalendarAlt,
    FaFileAlt,
    FaPrint,
    FaFileExcel,
    FaSearch,
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
import {
  filtrarVendasVendedoresUltimos8Meses,
  ordenarLinhasComoExcel,
  montarClientesGazinUnicos8Meses,
} from '../utils/vendasLista8MesesVendedores';
import { limparFlagsLembreteRetorno } from '../utils/crmLembreteStorage';

const STATUS_OPCOES = ['PENDENTE', 'PAGO', 'VENCIDO', 'ESTORNO', 'CANCELADO'];

// --- Componentes de UI Reutilizáveis ---
const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-gray-800 p-5 rounded-xl shadow-lg flex items-center space-x-4 transition-transform hover:scale-105">
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white">{(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
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

  const [aba, setAba] = useState("vendas");
  const [vendas, setVendas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState({ vendedor: "", mes: dayjs().format("YYYY-MM"), administradora: "", filial: "" });  
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
  const [modalRelatorioGeral, setModalRelatorioGeral] = useState(false);
  const [pagamentosDoMes, setPagamentosDoMes] = useState([]);

  const buscarPagamentosDoMes = useCallback(async (mes) => {
    if (!mes) return;
    const { data, error } = await supabase
      .from('pagamentos_comissao')
      .select('*')
      .eq('mes_pagamento', mes);
    if (!error && data) setPagamentosDoMes(data);
    else setPagamentosDoMes([]);
  }, []);

  const handleLogout = async () => {
      limparFlagsLembreteRetorno();
      await supabase.auth.signOut();
      navigate('/login');
  };
  
  const buscarUsuarios = async () => {
      const { data } = await supabase
        .from("usuarios_custom")
        .select("id, nome, id_filial, email, cargo, telefone, ativo, foto_url")
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
              buscarPagamentosDoMes(filtros.mes),
            ]);
          }
        }
        setLoading(false);
      };
  
      carregarDadosIniciais();
      // Montagem inicial apenas; fetchConfiguracoes/pagamentos reagem em outros efeitos.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
   
      
    useEffect(() => {
      // Usa a filial do filtro de Vendas (se selecionada) para manter os cards consistentes
      const filialIdEfetiva = filtros.filial || filialSelecionadaId;
      if (filtros.mes && filialIdEfetiva) {
        fetchConfiguracoes(filtros.mes, filialIdEfetiva);
      }
    }, [filtros.mes, filtros.filial, filialSelecionadaId, fetchConfiguracoes]);

    useEffect(() => {
      buscarPagamentosDoMes(filtros.mes);
    }, [filtros.mes, buscarPagamentosDoMes, vendas]);
    
  
    const nomeVendedor = (id) => usuarios.find((u) => u.id === id)?.nome || "Desconhecido";
  
   const cadastrarVenda = async () => {
      if (!usuarioAtual) return alert("Usuário não autenticado.");
      if (!novaVenda.cliente || !novaVenda.valor || !novaVenda.usuario_id) return alert("Cliente, Valor e Vendedor são obrigatórios.");
      
      const valorNumerico = parseFloat(String(novaVenda.valor).replace(/\./g, '').replace(',', '.'));
      
      const dadosParaSalvar = { 
          ...novaVenda, 
          valor: valorNumerico, 
          cliente: novaVenda.cliente.toUpperCase(), 
          mes: dayjs(novaVenda.mes).format("YYYY-MM"),
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
      await buscarPagamentosDoMes(filtros.mes);
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
      setAba("vendas");
      alert("Venda cadastrada com sucesso!");
    };
    
    const editarVenda = (venda) => { setEditandoId(venda.id); setVendaEditada({ ...venda, valor: venda.valor.toString() }); };
    const salvarEdicao = async () => { 
      const dadosParaAtualizar = { ...vendaEditada, valor: parseFloat(vendaEditada.valor) };
      await supabase.from("vendas").update(dadosParaAtualizar).eq("id", editandoId); 
      setEditandoId(null); setVendaEditada({}); buscarVendas(); 
    };
    const excluirVenda = async (id) => { if (window.confirm("Tem certeza?")) { await supabase.from("vendas").delete().eq("id", id); buscarVendas(); } };
   
    const handleStatusChange = async (venda, parcelaIndex, novoStatus) => {
      const nomeColuna = `status_parcela_${parcelaIndex}`;
      const statusAntigo = venda[nomeColuna];
  
      if (statusAntigo === novoStatus) {
          return;
      }

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

      await buscarVendas();
      await buscarPagamentosDoMes(filtros.mes);
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
          // Nova condição: a venda pertence a um usuário da filial selecionada?
          const matchFilial = !filtros.filial || idsUsuariosDaFilial.includes(v.usuario_id);
  
          const matchVendedor = !filtros.vendedor || v.usuario_id === filtros.vendedor;
          const matchMes = !mesFiltroNorm || normalizarMesVenda(v.mes) === mesFiltroNorm;
          const matchAdm = !filtros.administradora || v.administradora === filtros.administradora;
  
          return matchFilial && matchVendedor && matchMes && matchAdm;
      });
  
      // Totais dos cards: independentes de vendedor e administradora (apenas mês + filial)
      const vendasBaseParaCards = vendas.filter((v) => {
          const matchFilialBase = !filtros.filial || idsUsuariosDaFilial.includes(v.usuario_id);
          const matchMesBase = !mesFiltroNorm || normalizarMesVenda(v.mes) === mesFiltroNorm;
          return matchFilialBase && matchMesBase;
      });

      const totaisPorVendedor = {};
      usuarios.forEach(u => { totaisPorVendedor[u.id] = { nome: u.nome, vendido: 0 }; });
  
      let totalMesTodos = 0;
      let totalComissaoVendedor = 0;
      let totalVendidoGAZIN = 0;
      let totalVendidoHS = 0;
      // Totais dos cards
      vendasBaseParaCards.forEach((venda) => {
        const valor = parseFloat(venda.valor) || 0;
  
        // matchMesBase garante que estamos no mês selecionado
        totalMesTodos += valor;

        const percentuais = isParcelaCheia(venda) ? PERCENT_CHEIA : PERCENT_MEIA;
        const comissaoP1DaVenda = valor * percentuais[0];
        totalComissaoVendedor += comissaoP1DaVenda;

        if (venda.administradora === 'GAZIN') totalVendidoGAZIN += valor;
        if (venda.administradora === 'HS') totalVendidoHS += valor;
      });

      // Totais por vendedor (usados no ranking e texto)
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
  
  
    // CAMINHO DE ABAS
    const abas = [
      { id: 'vendas', label: 'Dashboard de Vendas', icon: <FaChartBar /> },
      { id: 'ranking', label: 'Ranking', icon: <FaTrophy /> },
      { id: 'nova_venda', label: 'Nova Venda', icon: <FaPlusCircle /> },
      { id: 'contempladas', label: 'Contempladas', icon: <FaChartLine /> },
      { id: 'crm', label: 'CRM', icon: <FaUsers /> },
      { id: 'hs_cotas', label: 'Cotas HS', icon: <FaTh /> },
      { id: 'processos', label: 'Processos', icon: <FaClipboard /> },
      { id: 'usuarios', label: 'Gerenciar Usuários', icon: <FaUserPlus /> },
      { id: 'acoes', label: 'Ações', icon: <FaCalendarAlt /> },
      { id: 'documentos', label: 'Documentos', icon: <FaFileAlt /> },
    ];
    
    const renderContent = () => {
      switch (aba) {
       case 'vendas': return <AbaVendas 
       listaFiliais={listaFiliais} 
    vendasFiltradas={calculosDoMes.vendasFiltradas}
    vendasTodas={vendas}
    pagamentosDoMes={pagamentosDoMes}
    totalMesTodos={calculosDoMes.totalMesTodos}
    totalComissaoVendedor={calculosDoMes.totalComissaoVendedor}
    totalVendidoGAZIN={calculosDoMes.totalVendidoGAZIN}
    totalVendidoHS={calculosDoMes.totalVendidoHS}
    usuarios={usuarios}
    filtros={filtros} setFiltros={setFiltros} 
    nomeVendedor={nomeVendedor} 
    editandoId={editandoId} setEditandoId={setEditandoId} 
    vendaEditada={vendaEditada} setVendaEditada={setVendaEditada}
    editarVenda={editarVenda} salvarEdicao={salvarEdicao} 
    excluirVenda={excluirVenda} 
    handleStatusChange={handleStatusChange}
    valorFaltanteParaMeta={valorFaltanteParaMeta}
    onAbrirModalRelatorioGeral={() => setModalRelatorioGeral(true)}
    onAbrirModalRelatorioHS={() => setModalRelatorioHS(true)}
    recarregarVendas={buscarVendas}
    recarregarPagamentos={buscarPagamentosDoMes}
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
          />
      );
  }     
          case 'nova_venda': return <AbaNovaVenda novaVenda={novaVenda} setNovaVenda={setNovaVenda} cadastrarVenda={cadastrarVenda} usuarios={usuarios} usuarioAtual={usuarioAtual} />;
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
    
    if (loading) return <LoadingSpinner />;
    
    return (
      <div className="bg-gray-900 text-gray-200 min-h-[100dvh] min-h-screen w-full max-w-[100vw] overflow-x-hidden p-4 sm:p-6 md:p-8">
        <div className="container mx-auto">
          <header className="mb-8">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h1 className="text-4xl font-bold text-white">Painel do Diretor</h1>
                      <p className="text-gray-400 mt-1">Gerencie vendas, comissões, rankings e sua equipe.</p>
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
          
          {aba === 'vendas' && (
            <div className="mt-5 mb-4 print:hidden">
              <h2 className="text-xl font-bold text-white">Relatório Geral</h2>
            </div>
          )}
          <LembretesLeads />
          <div className="mt-6">{renderContent()}</div>
  {perfilUsuario && <LembreteAcaoDiaria usuario={perfilUsuario} />}
          {modalContaVisivel && perfilUsuario && (
              <MinhaContaModal 
                  usuario={perfilUsuario} 
                  onClose={() => setModalContaVisivel(false)}
                  onUpdate={() => {
                      // Função para recarregar os dados do perfil após a atualização
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
                  onClose={() => setModalRelatorioHS(false)}
              />
          )}
      {modalRelatorioGeral && (
          <RelatorioGeralModal
              vendas={vendas}
              usuarios={usuarios}
              filtros={filtros}
              listaFiliais={listaFiliais}
              pagamentosDoMes={pagamentosDoMes}
              onClose={() => setModalRelatorioGeral(false)}
          />
      )}
  
        </div>
      </div>
    );
  }
  
  
  // --- Componente da Aba de Vendas (Dashboard) ---
  const AbaVendas = ({ listaFiliais, vendasFiltradas, vendasTodas, pagamentosDoMes, totalMesTodos, totalComissaoVendedor, totalVendidoGAZIN, totalVendidoHS, usuarios, filtros, setFiltros, nomeVendedor, editandoId, setEditandoId, vendaEditada, setVendaEditada, editarVenda, salvarEdicao, excluirVenda, handleStatusChange, valorFaltanteParaMeta, onAbrirModalRelatorioGeral, onAbrirModalRelatorioHS, recarregarVendas, recarregarPagamentos }) => {
      const [exportandoLista8Meses, setExportandoLista8Meses] = useState(false);
      const [buscandoGazin, setBuscandoGazin] = useState(false);

      const exportarExcelVendasVendedores8Meses = useCallback(() => {
          const filtro = filtrarVendasVendedoresUltimos8Meses({
              vendasTodas,
              usuarios,
              filialId: filtros.filial,
          });
          if (filtro.erro) {
              window.alert(filtro.erro);
              return;
          }
          const linhasOrd = ordenarLinhasComoExcel(filtro.linhas, nomeVendedor);

          setExportandoLista8Meses(true);
          try {
              const header = ["Mês referência", "Vendedor", "Cliente", "Grupo", "Cota"];
              const dados = [
                  header,
                  ...linhasOrd.map(({ v, m }) => [
                      m,
                      nomeVendedor(v.usuario_id),
                      String(v.cliente || "").toUpperCase(),
                      v.grupo ?? "",
                      v.cota ?? "",
                  ]),
              ];
              const ws = XLSX.utils.aoa_to_sheet(dados);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Vendas");
              const sufixo = dayjs().format("YYYYMMDD_HHmm");
              XLSX.writeFile(wb, `vendas_vendedores_8meses_${sufixo}.xlsx`);
          } catch (e) {
              console.error(e);
              window.alert("Não foi possível gerar o Excel. Tente novamente.");
          } finally {
              setExportandoLista8Meses(false);
          }
      }, [vendasTodas, usuarios, filtros.filial, nomeVendedor]);

      const aplicarStatusParcelasPorQuantidade = useCallback(async (vendaOriginal, parcelasPagas) => {
          // Regra:
          // 0  -> P1 CANCELADO (cancela P1–P5)
          // 1  -> P1 PAGO
          // 2  -> P1,P2 PAGO
          // 3  -> P1,P2,P3 PAGO
          // 4  -> P1..P4 PAGO
          // 5+ -> P1..P5 PAGO
          const venda = { ...vendaOriginal }; // evita mutações inesperadas no state
          const qtd = Math.max(0, Math.min(5, Number(parcelasPagas) || 0));

          if (qtd === 0) {
              const antigo = venda.status_parcela_1 || 'PENDENTE';
              const res = await persistirMudancaStatusParcela(supabase, venda, 1, 'CANCELADO', antigo);
              if (!res.ok) throw new Error(res.error?.message || 'Erro ao cancelar P1');
              return;
          }

          for (let i = 1; i <= 5; i++) {
              const desejado = i <= qtd ? 'PAGO' : 'PENDENTE';
              const nomeColuna = `status_parcela_${i}`;
              const antigo = venda[nomeColuna] || 'PENDENTE';
              if (antigo === desejado) continue;
              const res = await persistirMudancaStatusParcela(supabase, venda, i, desejado, antigo);
              if (!res.ok) throw new Error(res.error?.message || `Erro ao atualizar P${i}`);
              venda[nomeColuna] = desejado;
          }
      }, []);

      const aplicarEstornoDaProximaParcela = useCallback(async (vendaOriginal) => {
          const venda = { ...vendaOriginal };
          const mesAtual = dayjs().format('YYYY-MM');
          let primeiraParcelaNaoPaga = null;

          for (let i = 2; i <= 5; i++) {
              const st = venda[`status_parcela_${i}`] || 'PENDENTE';
              if (st !== 'PAGO') {
                  primeiraParcelaNaoPaga = i;
                  break;
              }
          }

          if (!primeiraParcelaNaoPaga) return;

          for (let i = primeiraParcelaNaoPaga; i <= 5; i++) {
              const nomeColuna = `status_parcela_${i}`;
              const antigo = venda[nomeColuna] || 'PENDENTE';
              const mesConf = venda[`mes_conferencia_parcela_${i}`] || '';
              if (antigo === 'ESTORNO' && mesConf === mesAtual) continue;
              if (antigo === 'ESTORNO') continue; // evita duplicar estorno antigo
              if (antigo === 'CANCELADO') continue;

              const res = await persistirMudancaStatusParcela(supabase, venda, i, 'ESTORNO', antigo);
              if (!res.ok) throw new Error(res.error?.message || `Erro ao estornar P${i}`);
              venda[nomeColuna] = 'ESTORNO';
              venda[`mes_conferencia_parcela_${i}`] = mesAtual;
          }
      }, []);

      const aplicarAtualizacaoParcelasNoPainel = useCallback(async (resultados) => {
          const itens = Array.isArray(resultados) ? resultados : [];
          const validos = itens.filter((r) => r && r.grupo != null && r.cota != null && r.mesReferencia != null);
          if (validos.length === 0) return { atualizadas: 0, naoEncontradas: 0, erros: 0, logs: 0 };

          let atualizadas = 0;
          let naoEncontradas = 0;
          let erros = 0;
          let logs = 0;

          const resolvidos = [];
          for (const r of validos) {
              const grupo = String(r.grupo || '').trim();
              const cota = String(r.cota || '').trim();
              const mesRef = String(r.mesReferencia || '').trim();
              if (!grupo || !cota || !mesRef) continue;

              const venda = (vendasTodas || []).find((v) => {
                  if (!v) return false;
                  if (String(v.administradora || '').toUpperCase().trim() !== 'GAZIN') return false;
                  if (String(v.grupo ?? '').trim() !== grupo) return false;
                  if (String(v.cota ?? '').trim() !== cota) return false;
                  return normalizarMesVenda(v.mes) === mesRef;
              });

              if (!venda) {
                  naoEncontradas++;
                  continue;
              }

              resolvidos.push({ r, venda, grupo, cota, mesRef });
          }

          if (resolvidos.length === 0) {
              if (typeof recarregarVendas === 'function') await recarregarVendas();
              if (typeof recarregarPagamentos === 'function') await recarregarPagamentos(filtros.mes);
              return { atualizadas, naoEncontradas, erros, logs };
          }

          // Confirmações anteriores: OK com parcelas >= 1
          const vendaIds = Array.from(new Set(resolvidos.map(({ venda }) => venda.id).filter(Boolean)));
          const confirmadas = new Set();
          try {
              const chunkSize = 200;
              for (let i = 0; i < vendaIds.length; i += chunkSize) {
                  const chunk = vendaIds.slice(i, i + chunkSize);
                  const { data, error } = await supabase
                      .from('gazin_verificacoes')
                      .select('venda_id')
                      .in('venda_id', chunk)
                      .eq('resultado_tipo', 'OK')
                      .gte('parcelas_pagas', 1);
                  if (error) throw error;
                  (data || []).forEach((row) => confirmadas.add(row.venda_id));
              }
          } catch (e) {
              console.error(e);
          }

          // Log desta execução
          try {
              const payload = resolvidos.map(({ r, venda, grupo, cota, mesRef }) => ({
                  venda_id: venda.id,
                  grupo,
                  cota,
                  mes_referencia: mesRef,
                  parcelas_pagas: typeof r.parcelasPagas === 'number' ? r.parcelasPagas : null,
                  resultado_tipo: String(r.resultadoTipo || (r.status === 'SUCESSO' ? 'OK' : 'ERRO')),
                  status: String(r.status || 'ERRO'),
                  motivo: String(r.motivo || ''),
              }));
              const batchSize = 200;
              for (let i = 0; i < payload.length; i += batchSize) {
                  const slice = payload.slice(i, i + batchSize);
                  const { error } = await supabase.from('gazin_verificacoes').insert(slice);
                  if (error) throw error;
                  logs += slice.length;
              }
          } catch (e) {
              console.error(e);
          }

          for (const { r, venda } of resolvidos) {
              try {
                  const tipo = String(r.resultadoTipo || '').toUpperCase().trim();
                  const isOk = tipo === 'OK';
                  const isConfirmada = confirmadas.has(venda.id);

                  if (isOk && typeof r.parcelasPagas === 'number') {
                      await aplicarStatusParcelasPorQuantidade(venda, r.parcelasPagas);
                      atualizadas++;
                      continue;
                  }

                  if (isConfirmada) {
                      await aplicarEstornoDaProximaParcela(venda);
                      atualizadas++;
                  } else {
                      await aplicarStatusParcelasPorQuantidade(venda, 0);
                      atualizadas++;
                  }
              } catch (e) {
                  console.error(e);
                  erros++;
              }
          }

          if (typeof recarregarVendas === 'function') await recarregarVendas();
          if (typeof recarregarPagamentos === 'function') await recarregarPagamentos(filtros.mes);

          return { atualizadas, naoEncontradas, erros, logs };
      }, [vendasTodas, filtros.mes, aplicarStatusParcelasPorQuantidade, aplicarEstornoDaProximaParcela, recarregarVendas, recarregarPagamentos]);

      const executarBuscaGazinQuantidade = useCallback(async () => {
          const filtro = filtrarVendasVendedoresUltimos8Meses({
              vendasTodas,
              usuarios,
              filialId: filtros.filial,
          });
          if (filtro.erro) {
              window.alert(filtro.erro);
              return;
          }
          const { linhas, mesInicio, mesFim } = filtro;
          const clientes = montarClientesGazinUnicos8Meses({ linhas, nomeVendedorFn: nomeVendedor });
          if (clientes.length === 0) {
              window.alert(
                  `Não há vendas GAZIN com grupo e cota preenchidos no período ${mesInicio} a ${mesFim} para o filtro atual.`
              );
              return;
          }

          const base = (process.env.REACT_APP_GAZIN_AUTOMATION_URL || 'http://127.0.0.1:3847').replace(/\/$/, '');
          const escritorioIndex = parseInt(process.env.REACT_APP_GAZIN_ESCRITORIO_INDEX || '1', 10) || 1;
          setBuscandoGazin(true);
          try {
              const headers = { 'Content-Type': 'application/json' };
              const token = process.env.REACT_APP_GAZIN_AUTOMATION_TOKEN;
              if (token) headers['X-Automation-Token'] = token;
              const res = await fetch(`${base}/api/busca-gazin-quantidade`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                      escritorioIndex,
                      mesInicio,
                      mesFim,
                      clientes,
                  }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                  window.alert(
                      data.error ||
                          `Erro (${res.status}). Inicie o servidor na raiz do projeto com: npm run server:gazin`
                  );
                  return;
              }
              const resumoAtualizacao = await aplicarAtualizacaoParcelasNoPainel(data?.resultados);
              const sucesso = data?.resumo?.SUCESSO ?? 0;
              const erro = data?.resumo?.ERRO ?? 0;
              try {
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `gazin_busca_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
                  a.rel = 'noopener';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(a.href);
              } catch (dlErr) {
                  console.error(dlErr);
              }
              window.alert(
                  `Busca Gazin concluída (${data.escritorioNome || 'escritório'}).\nSucesso: ${sucesso} · Erro: ${erro}\nTotal de cotas únicas (GAZIN): ${clientes.length}\n\nAtualização no painel:\n- Atualizadas: ${resumoAtualizacao?.atualizadas ?? 0}\n- Não encontradas (venda não localizada): ${resumoAtualizacao?.naoEncontradas ?? 0}\n- Erros ao atualizar: ${resumoAtualizacao?.erros ?? 0}\n- Logs gravados: ${resumoAtualizacao?.logs ?? 0}\n\nFoi baixado o arquivo JSON com o detalhe por cliente.`
              );
          } catch (e) {
              console.error(e);
              window.alert(
                  'Não foi possível contatar o servidor de automação. Em um terminal separado, execute: npm run server:gazin'
              );
          } finally {
              setBuscandoGazin(false);
          }
      }, [vendasTodas, usuarios, filtros.filial, nomeVendedor, aplicarAtualizacaoParcelasNoPainel]);

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

      const vendedoresFiltradosParaDropdown = useMemo(() => {
          if (!filtros.filial) {
              return usuarios; 
          }
          return usuarios.filter((u) => String(u.id_filial) === String(filtros.filial));
      }, [usuarios, filtros.filial]);
  
      return (
      <div className="animate-fade-in space-y-8">
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
              <StatCard icon={<FaDollarSign size={24} />} label={`Total Vendido em ${mesSelecionadoLabel}`} value={totalMesTodos} color="bg-green-500/20 text-green-400" />
              <StatCard
                icon={<FaBullseye size={24} />}
                label={`Valor faltante para atingir a meta de ${mesLabel}`}
                value={faltaParaMetaClamped}
                color={faltaParaMetaClamped > 0 ? "bg-red-500/20 text-red-400" : "bg-green-500/20"}
              />
              <StatCard
                icon={<FaDollarSign size={24} />}
                label={`Total Vendido GAZIN em ${mesSelecionadoLabel}`}
                value={totalVendidoGAZIN}
                color="bg-indigo-500/20 text-indigo-300"
              />
              <StatCard
                icon={<FaDollarSign size={24} />}
                label={`Total Vendido HS em ${mesSelecionadoLabel}`}
                value={totalVendidoHS}
                color="bg-purple-500/20 text-purple-300"
              />
          </div>

          <div className="print:hidden">
              <h2 className="text-xl font-bold text-white">Relatório por Vendedor</h2>
              {vendedorSelecionadoId ? (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
                          <p className="text-sm text-gray-400 font-semibold"><FaDollarSign className="inline-block mr-2" />{`TOTAL VENDIDO MÊS DE ${mesNomeUpper}`}</p>
                          <p className="text-2xl font-extrabold text-white mt-1">{formatarMoeda(totaisVendedorParaPrint.totalVendidoMes)}</p>
                      </div>
                      <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
                          <p className="text-sm text-gray-400 font-semibold"><FaFileInvoiceDollar className="inline-block mr-2" />TOTAL DE COMISSÃO P1</p>
                          <p className="text-2xl font-extrabold text-white mt-1">{formatarMoeda(totaisVendedorParaPrint.totalComissaoP1)}</p>
                          <p className="text-[11px] text-gray-400 mt-2 leading-snug">{subtituloComissaoP1}</p>
                      </div>
                      <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
                          <p className="text-sm text-gray-400 font-semibold"><FaChartLine className="inline-block mr-2" />TOTAL DE COMISSÃO LIBERADA EM P2</p>
                          <p className="text-2xl font-extrabold text-white mt-1">{formatarMoeda(totaisVendedorParaPrint.totalComissaoP2Liberada)}</p>
                          <p className="text-[11px] text-gray-400 mt-2 leading-snug">Esse valor é sua comissão de clientes que pagaram a 2º parcela das vendas anteriores</p>
                      </div>
                      <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
                          <p className="text-sm text-gray-400 font-semibold"><FaChartLine className="inline-block mr-2" />TOTAL DE COMISSÃO LIBERADA EM P3</p>
                          <p className="text-2xl font-extrabold text-white mt-1">{formatarMoeda(totaisVendedorParaPrint.totalComissaoP3Liberada)}</p>
                          <p className="text-[11px] text-gray-400 mt-2 leading-snug">Esse valor é sua comissão de clientes que pagaram a 3º parcela das vendas anteriores</p>
                      </div>
                      <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
                          <p className="text-sm text-gray-400 font-semibold flex items-center gap-2 flex-wrap">
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
                          <p className="text-2xl font-extrabold text-white mt-1">{formatarMoeda(totaisVendedorParaPrint.totalEstorno)}</p>
                          <p className="text-[11px] text-gray-400 mt-2 leading-snug">{subtituloEstornoCard}</p>
                      </div>
                      <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-4">
                          <p className="text-sm text-gray-400 font-semibold"><FaUserTie className="inline-block mr-2" />TOTAL À RECEBER</p>
                          <p className="text-2xl font-extrabold text-white mt-1">{formatarMoeda(totaisVendedorParaPrint.totalAPagar)}</p>
                          <p className="text-[11px] text-gray-400 mt-2 leading-snug">{subtituloTotalReceber}</p>
                      </div>
                  </div>
              ) : (
                  <p className="text-sm text-gray-400 mt-3">Selecione um vendedor nos filtros acima para ver o relatório.</p>
              )}
          </div>

          {modalEstornoAberto && vendedorSelecionadoId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 print:hidden">
              <div className="bg-gray-800 border border-gray-600 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
                  <h3 className="text-lg font-bold text-white">Estornos em {mesLabel}</h3>
                  <button type="button" onClick={() => setModalEstornoAberto(false)} className="text-gray-400 hover:text-white text-xl px-2">&times;</button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh] text-sm">
                  {(totaisVendedorParaPrint.itensEstorno || []).length === 0 ? (
                    <p className="text-gray-400">Nenhum estorno (P2–P5) conferido neste mês para este vendedor.</p>
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
          
          <main className="bg-gray-800/50 rounded-xl shadow-2xl p-6 print:hidden"> 
  
              {/* --- DIV DE FILTROS E BOTÕES (LAYOUT CORRIGIDO) --- */}
              <div className="print-hidden mb-6 pb-6 border-b border-gray-700">
                  
                  {/* Agrupador para Filtros */}
                  <div className="flex flex-wrap items-center gap-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2 whitespace-nowrap"><FaFilter /> Filtros</h2>
                      
                      <input type="month" value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
  
                      <select 
                          value={filtros.filial} 
                          onChange={(e) => setFiltros({ ...filtros, filial: e.target.value, vendedor: "" })} 
                          className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                      >
                          <option value="">Todas as Filiais</option>
                          {listaFiliais.map((filial) => (
                              <option key={filial.id} value={filial.id}>{filial.nome}</option>
                          ))}
                      </select>
  
                      <select 
                          value={filtros.vendedor} 
                          onChange={(e) => setFiltros({ ...filtros, vendedor: e.target.value })} 
                          className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                      >
                          <option value="">Todos os Vendedores</option>
                          {vendedoresFiltradosParaDropdown.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
  
                      <select value={filtros.administradora} onChange={(e) => setFiltros({ ...filtros, administradora: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500">
                          <option value="">Todas Administradoras</option>
                          <option value="HS">HS</option><option value="GAZIN">GAZIN</option>
                      </select>
                  </div>
  
                  {/* Agrupador para Botões (separado, para quebrar a linha) */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 justify-start">
                      <button 
                          onClick={onAbrirModalRelatorioHS}
                          className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                      >
                          <FaChartLine /> RANK HS
                      </button>
                      <button 
                          onClick={onAbrirModalRelatorioGeral} 
                          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                      >
                          <FaPrint /> Gerar Relatório de Comissão Mensal
                      </button>
                      <button
                          type="button"
                          disabled={exportandoLista8Meses}
                          onClick={exportarExcelVendasVendedores8Meses}
                          title="Últimos 8 meses fechados (exclui o mês corrente). Apenas vendas de usuários com cargo Vendedor. Respeita o filtro de filial, se houver."
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                      >
                          <FaFileExcel /> {exportandoLista8Meses ? "Gerando…" : "Lista Excel — vendas (8 meses)"}
                      </button>
                      <button
                          type="button"
                          disabled={buscandoGazin}
                          onClick={executarBuscaGazinQuantidade}
                          title="Usa a mesma lista do Excel 8 meses (vendas GAZIN de vendedores, cotas únicas). Abre 4 navegadores (Playwright), login + 2FA em cada um e localiza cada grupo/cota na intranet. Gera um JSON com sucesso ou erro por cliente. Requer npm run server:gazin."
                          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                      >
                          <FaSearch /> {buscandoGazin ? "Abrindo Gazin…" : "Busca Gazin Quantidade"}
                      </button>
                  </div>
              </div>
              {/* --- FIM DA DIV DE FILTROS E BOTÕES --- */}
              
              {/* Tabela de Lançamentos */}
              <div>
                  <h3 className="text-xl font-bold mb-4 text-white">Lançamentos de Vendas</h3>
                  <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-left">
                          <thead className="border-b border-gray-700"><tr className="text-gray-400 uppercase">
                              <th className="px-4 py-3">Cliente</th>
                              <th className="px-4 py-3">Produto</th>
                              <th className="px-4 py-3">Valor</th>
                              <th className="px-4 py-3">Vendedor</th>
                              <th className="px-4 py-3 text-center">Comissões</th>
                              <th className="px-4 py-3 text-center">Ações</th>
                          </tr></thead>
                          <tbody>
                              {vendasFiltradas.length > 0 ? vendasFiltradas.map((venda) => (
                                  <tr key={venda.id} className="border-b border-gray-700/50 hover:bg-gray-700/50 transition-colors">
                                      {editandoId === venda.id ? (
                                          <>
                                              <td className="p-2"><input value={vendaEditada.cliente || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, cliente: e.target.value.toUpperCase() })} className="bg-gray-600 p-2 rounded w-full"/></td>
                                              <td className="p-2 space-y-2">
                                                  <input placeholder="Admin" value={vendaEditada.administradora || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, administradora: e.target.value })} className="bg-gray-600 p-2 rounded w-full"/>
                                                  <input placeholder="Grupo" value={vendaEditada.grupo || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, grupo: e.target.value })} className="bg-gray-600 p-2 rounded w-full"/>
                                                  <input placeholder="Cota" value={vendaEditada.cota || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, cota: e.target.value })} className="bg-gray-600 p-2 rounded w-full"/>
                                                  <select value={vendaEditada.parcela || 'cheia'} onChange={(e) => setVendaEditada({...vendaEditada, parcela: e.target.value})} className="bg-gray-600 p-2 rounded w-full">
                                                      <option value="cheia">Parcela Cheia</option>
                                                      <option value="meia">Parcela Meia</option>
                                                  </select>
                                              </td>
                                              <td className="p-2"><input type="number" value={vendaEditada.valor || ''} onChange={(e) => setVendaEditada({ ...vendaEditada, valor: e.target.value })} className="bg-gray-600 p-2 rounded w-full"/></td>
                                              <td className="p-2">{nomeVendedor(venda.usuario_id)}</td>
                                              <td className="p-2 text-center">-</td>
                                              <td className="p-2">
                                                  <div className="flex gap-2 justify-center">
                                                      <button onClick={salvarEdicao} className="p-2 text-green-400 hover:text-green-300"><FaSave size={18} /></button>
                                                      <button onClick={() => setEditandoId(null)} className="p-2 text-gray-400 hover:text-gray-200"><FaTimes size={18} /></button>
                                                  </div>
                                              </td>
                                          </>
                                      ) : (
                                          <>
                                              <td className="px-4 py-3 font-medium">{venda.cliente.toUpperCase()}</td>
                                              <td className="px-4 py-3">
                                                  <div className="flex flex-col">
                                                      <div><span className="font-semibold">{venda.administradora}</span><span className="text-xs text-gray-400 ml-2">G: {venda.grupo} / C: {venda.cota}</span></div>
                                                      <div className="mt-1.5"><span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${isParcelaCheia(venda) ? 'bg-blue-900/70 text-blue-300' : 'bg-yellow-900/70 text-yellow-300'}`}>{isParcelaCheia(venda) ? 'Parcela Cheia' : 'Parcela Meia'}</span></div>
                                                  </div>
                                              </td>
                                              <td className="px-4 py-3 text-green-400 font-semibold">{parseFloat(venda.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                                              <td className="px-4 py-3">{nomeVendedor(venda.usuario_id)}</td>
                                              <td className="px-4 py-3">
                                                  <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
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
                                                                  className={`p-1 text-xs rounded-md border focus:ring-2 focus:ring-indigo-400 font-medium ${corSeletor}`}
                                                              >
                                                                  {STATUS_OPCOES.map(opt => <option key={opt} value={opt}>{`P${i}: ${opt}`}</option>)}
                                                              </select>
                                                          );
                                                      })}
                                                  </div>
                                              </td>
                                              <td className="px-4 py-3">
                                                  <div className="flex gap-3 justify-center">
                                                      <button onClick={() => editarVenda(venda)} className="p-2 text-blue-400 hover:text-blue-300"><FaEdit size={18} /></button>
                                                      <button onClick={() => excluirVenda(venda.id)} className="p-2 text-red-500 hover:text-red-400"><FaTrash size={18} /></button>
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
          </main>
      </div>
      );
  };
  
  // --- Componente da Aba de Nova Venda ---
  const AbaNovaVenda = ({ novaVenda, setNovaVenda, cadastrarVenda, usuarios, usuarioAtual }) => {
      const formatInputMoeda = (txt) => {
          if (!txt) return '';
          const valorNumerico = String(txt).replace(/\D/g, '');
          if (!valorNumerico) return '';
          return (parseFloat(valorNumerico) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      };
      
      return (
          <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6 mt-8 max-w-4xl mx-auto animate-fade-in">
              <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3"><FaPlusCircle /> Cadastrar Nova Venda</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-3">
                      <label className="block mb-1 text-sm font-medium text-gray-400">Lançar para o vendedor:</label>
                      <select className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" value={novaVenda.usuario_id} onChange={(e) => setNovaVenda({ ...novaVenda, usuario_id: e.target.value })}>
                          <option value={usuarioAtual?.id}>Lançar para mim ({usuarioAtual?.email.split('@')[0]})</option>
                          {usuarios.filter(u => u.id !== usuarioAtual?.id).map(u => (<option key={u.id} value={u.id}>{u.nome}</option>))}
                      </select>
                  </div>
                  <input placeholder="Nome do Cliente" className="bg-gray-700 p-3 rounded-lg border border-gray-600" value={novaVenda.cliente} onChange={(e) => setNovaVenda({ ...novaVenda, cliente: e.target.value.toUpperCase() })} required/>
                  <input placeholder="Valor do Crédito" type="text" className="bg-gray-700 p-3 rounded-lg border border-gray-600" value={novaVenda.valor} onChange={(e) => setNovaVenda({ ...novaVenda, valor: formatInputMoeda(e.target.value) })} required/>
                  <select className="bg-gray-700 p-3 rounded-lg border border-gray-600" value={novaVenda.parcela} onChange={(e) => setNovaVenda({ ...novaVenda, parcela: e.target.value })}><option value="cheia">Parcela Cheia</option><option value="meia">Parcela Meia</option></select>
                  <input placeholder="Grupo" className="bg-gray-700 p-3 rounded-lg border border-gray-600" value={novaVenda.grupo} onChange={(e) => setNovaVenda({ ...novaVenda, grupo: e.target.value })} required/>
                  <input placeholder="Cota" className="bg-gray-700 p-3 rounded-lg border border-gray-600" value={novaVenda.cota} onChange={(e) => setNovaVenda({ ...novaVenda, cota: e.target.value })} required/>
                  <select className="bg-gray-700 p-3 rounded-lg border border-gray-600" value={novaVenda.administradora} onChange={(e) => setNovaVenda({ ...novaVenda, administradora: e.target.value })}><option value="GAZIN">GAZIN</option><option value="HS">HS</option></select>
              </div>
              <button onClick={cadastrarVenda} className="mt-6 bg-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2"><FaSave /> Salvar Venda</button>
          </div>
      );
  };
  
  // --- Componente da Aba de Ranking (VERSÃO FINAL CORRIGIDA) ---
  const AbaRanking = ({ perfilUsuario, vendas, usuarios, filtros, setFiltros, configuracoes: initialConfig, onSave, listaFiliais, filialSelecionadaId, setFilialSelecionadaId }) => {
      const [config, setConfig] = useState(initialConfig);
      const [modalConfigVisivel, setModalConfigVisivel] = useState(false);
      const [selecaoDupla, setSelecaoDupla] = useState([]);
      const [textoRanking, setTextoRanking] = useState('');
  
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
  
      const rankingIndividual = useMemo(() => Object.values(totaisPorVendedor).filter(v => v.vendido > 0).sort((a, b) => b.vendido - a.vendido), [totaisPorVendedor]);
      const vendidoGeral = useMemo(() => rankingIndividual.reduce((acc, v) => acc + v.vendido, 0), [rankingIndividual]);
      const faltaParaMeta = useMemo(() => (config.meta_geral || 0) - vendidoGeral, [config.meta_geral, vendidoGeral]);
  
      // Componente para exibir o card de ranking
      const RankingCard = ({ posicao, nome, valor, isCurrentUser }) => {
          const medalhas = ['🥇', '🥈', '🥉'];
          const prefixo = posicao < 3 ? medalhas[posicao] : <span className="text-gray-400 font-bold">{posicao + 1}º</span>;
          return (
              <div className={`p-4 rounded-xl flex items-center justify-between transition-all ${isCurrentUser ? 'bg-indigo-600/30 ring-2 ring-indigo-500' : 'bg-gray-800'}`}>
                  <div className="flex items-center gap-4"><span className="text-2xl w-8 text-center">{prefixo}</span><span className={`font-bold ${isCurrentUser ? 'text-white' : 'text-gray-300'}`}>{nome}</span></div>
                  <span className="font-bold text-lg text-green-400">{valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
          );
      };
  
      // Funções para gerenciar as duplas
      const adicionarDupla = () => {
          if (selecaoDupla.length !== 2) return;
          const novaListaDuplas = [...(config.duplas || []), selecaoDupla];
          setConfig({ ...config, duplas: novaListaDuplas });
          setSelecaoDupla([]);
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
          <div className="animate-fade-in space-y-8">
              {/* --- SEÇÃO DE FILTROS --- */}
              <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800/50 rounded-xl">
                  <h3 className="text-xl font-bold flex items-center gap-2"><FaFilter /> Visualizar Dados de:</h3>
                  <input type="month" value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })} className="w-full md:w-auto bg-gray-700 p-3 rounded-lg border border-gray-600" />
                  {perfilUsuario?.cargo?.toLowerCase() === 'diretor' && (
                      <select value={filialSelecionadaId || ''} onChange={(e) => setFilialSelecionadaId(e.target.value)} className="w-full md:w-auto bg-gray-700 p-3 rounded-lg border border-gray-600">
                          <option value="" disabled>Selecione uma filial</option>
                          {listaFiliais.map(filial => (<option key={filial.id} value={filial.id}>{filial.nome}</option>))}
                      </select>
                  )}
              </div>
  
             {/* --- BOTÃO PARA ABRIR O MODAL DE CONFIGURAÇÕES --- */}
  <div className="flex justify-end">
      <button 
          onClick={() => setModalConfigVisivel(true)}
          className="bg-gray-700 hover:bg-gray-600 px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
      >
          <FaCogs /> Configurar Metas e Duplas
      </button>
  </div>
              
              {/* --- MODAL DE CONFIGURAÇÕES --- */}
  {modalConfigVisivel && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-700 animate-fade-in">
              <header className="p-4 flex justify-between items-center border-b border-gray-700">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><FaCogs /> Configurações de {dayjs(filtros.mes).format('MMMM')}</h3>
                  <button onClick={() => setModalConfigVisivel(false)} className="p-2 text-gray-500 hover:text-white rounded-full"><FaTimes size={20} /></button>
              </header>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                      <label className="block mb-1 text-sm font-medium text-gray-400">Meta Geral do Escritório (R$)</label>
                      <input type="number" value={config.meta_geral || ''} onChange={e => setConfig({...config, meta_geral: parseFloat(e.target.value) || 0})} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
                  </div>
                  <div>
                      <label className="block mb-1 text-sm font-medium text-gray-400">Formar Duplas para o Mês</label>
                      <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                          <div className="mb-4 space-y-2">
                              {config.duplas && config.duplas.map((dupla, index) => (
                                  <div key={index} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                                      <span>{dupla.join(' e ')}</span>
                                      <button onClick={() => removerDupla(index)} className="text-red-500 hover:text-red-400"><FaTimes /></button>
                                  </div>
                              ))}
                          </div>
                          <div className="flex items-center gap-2">
                              <select multiple value={selecaoDupla} onChange={(e) => setSelecaoDupla(Array.from(e.target.selectedOptions, option => option.value))} className="w-full bg-gray-600 p-2 rounded-lg border border-gray-500" style={{ height: '100px' }}>
                                  {usuarios.filter(u => !config.duplas?.flat().includes(u.nome)).map(user => (
                                      <option key={user.id} value={user.nome}>{user.nome}</option>
                                  ))}
                              </select>
                              <button onClick={adicionarDupla} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold h-full" disabled={selecaoDupla.length !== 2}>
                                  <FaPlusCircle />
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
              <footer className="p-4 flex justify-end gap-3 border-t border-gray-700">
                  <button onClick={() => setModalConfigVisivel(false)} type="button" className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg font-semibold">Cancelar</button>
                  <button onClick={() => { handleSalvarConfig(); setModalConfigVisivel(false); }} className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2"><FaSave /> Salvar e Fechar</button>
              </footer>
          </div>
      </div>
  )}
  
              {/* --- SEÇÃO DAS METAS --- */}
              <div>
                  <h3 className="text-xl font-semibold mb-4 text-indigo-400">METAS DO ESCRITÓRIO</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <StatCard icon={<FaBullseye size={24} />} label="Meta Geral" value={config.meta_geral} color="bg-indigo-500/20" />
                      <StatCard icon={<FaDollarSign size={24} />} label="Vendido Geral" value={vendidoGeral} color="bg-green-500/20" />
                      <StatCard icon={<FaChartLine size={24} />} label="Falta para a Meta" value={faltaParaMeta > 0 ? faltaParaMeta : 0} color={faltaParaMeta > 0 ? "bg-red-500/20" : "bg-green-500/20"} />
                  </div>
              </div>
  
              {/* --- SEÇÃO DOS RANKINGS --- */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                      <h3 className="text-xl font-semibold mb-4 text-indigo-400">RANKING INDIVIDUAL</h3>
                      <div className="space-y-3">
                          {rankingIndividual.length > 0 ? rankingIndividual.map((vendedor, index) => (
                              <RankingCard key={vendedor.id} posicao={index} nome={vendedor.nome} valor={vendedor.vendido} isCurrentUser={vendedor.id === perfilUsuario?.id} />
                          )) : <p className="text-gray-500">Ninguém vendeu ainda este mês.</p>}
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xl font-semibold mb-4 text-indigo-400">RANKING DE DUPLAS</h3>
                      <div className="space-y-3">
                          {totaisDuplas.length > 0 ? totaisDuplas.map((dupla, index) => (
                              <RankingCard key={dupla.nomes} posicao={index} nome={dupla.nomes} valor={dupla.total} isCurrentUser={dupla.membros.includes(perfilUsuario?.nome)} />
                          )) : <p className="text-gray-500">Duplas não configuradas para este mês.</p>}
                      </div>
                  </div>
              </div>
              
              {/* --- SEÇÃO DE PRÉ-VISUALIZAÇÃO E CÓPIA --- */}
              <div className="bg-gray-800/50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-4">Pré-visualização do Ranking para WhatsApp</h3>
                  <textarea readOnly value={textoRanking} className="w-full h-64 bg-gray-900/50 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap" />
                  <div className="flex gap-4 mt-4">
                      <button onClick={copiarParaClipboard} className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2">
                          <FaClipboard /> Copiar Ranking
                      </button>
                      <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(textoRanking)}`} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2">
                          <FaWhatsapp /> Enviar no WhatsApp
                      </a>
                  </div>
              </div>
              
          </div>
      );
  };