import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import 'dayjs/locale/pt-br';
import LembretesLeads from '../components/LembretesLeads'; // <-- ADICIONE ESTA LINHA
import { useNavigate } from 'react-router-dom'; // <-- ADICIONE
import { FaSignOutAlt, FaUserCircle } from 'react-icons/fa'; // <-- ADICIONE
import MinhaContaModal from '../components/MinhaContaModal';
import { 
    FaChartBar, FaUsers, FaPlusCircle, FaTrophy, FaFilter, FaEdit, FaTrash, FaSave, FaTimes, 
    FaDollarSign, FaUserTie, FaExclamationTriangle, FaClipboard, FaWhatsapp, FaChartLine, FaCogs,
    FaFileInvoiceDollar, // <-- ÍCONE ADICIONADO AQUI
    FaTh,
    FaBullseye, 
    FaUserPlus
} from "react-icons/fa"; // <--- CORRIGIDO

import PainelCRM from "./PainelCRM";
import { FaPrint } from 'react-icons/fa'; // <-- ADICIONE
import RelatorioHSModal from '../components/RelatorioHSModal'; // <-- ADICIONE
import RelatorioGeralModal from '../components/RelatorioGeralModal'; // <-- ADICIONE ESTA LINHA
import PainelContempladas from "./PainelContempladas";
import AbaGerenciarUsuarios from './AbaGerenciarUsuarios';
import HSCotas from './HSCotas'; // Verifique se o caminho está correto
const PERCENT_CHEIA = [0.006, 0.003, 0.003, 0]; // Comissão: 1.2% total (0.6, 0.3, 0.3). Parcela 4 não tem comissão.
const PERCENT_MEIA = [0.003, 0.0015, 0.0015, 0]; // Comissão: 0.6% total (0.3, 0.15, 0.15). Parcela 4 não tem comissão.
const STATUS_OPCOES = ['PENDENTE', 'PAGO', 'VENCIDO', 'ESTORNO'];

// --- Componentes de UI Reutilizáveis ---
const StatCard = ({ icon, label, value, color }) => ( // Note que a prop se chama 'label'
  <div className="bg-gray-800 p-5 rounded-xl shadow-lg flex items-center space-x-4 transition-transform hover:scale-105">
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-400">{label}</p> {/* <-- LINHA ADICIONADA/CORRIGIDA */}
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
const [filtros, setFiltros] = useState({ vendedor: "", mes: dayjs().format("YYYY-MM"), administradora: "", filial: "" });  const [editandoId, setEditandoId] = useState(null);
  const [vendaEditada, setVendaEditada] = useState({});
  const [novaVenda, setNovaVenda] = useState({ cliente: "", grupo: "", cota: "", administradora: "GAZIN", valor: "", parcela: "cheia", mes: dayjs().format("YYYY-MM"), usuario_id: "" });
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configuracoes, setConfiguracoes] = useState({ meta_geral: 0, duplas: [] });
  const [comissoesLiberadasMes, setComissoesLiberadasMes] = useState(0);
const [perfilUsuario, setPerfilUsuario] = useState(null);
const [listaFiliais, setListaFiliais] = useState([]); // <-- ADICIONE ESTA LINHA
const [filialSelecionadaId, setFilialSelecionadaId] = useState(null);
const navigate = useNavigate(); // <-- ADICIONE
const [modalContaVisivel, setModalContaVisivel] = useState(false); // <-- ADICIONE
const [modalRelatorioHS, setModalRelatorioHS] = useState(false); // <-- ADICIONE
const [modalRelatorioGeral, setModalRelatorioGeral] = useState(false); // <-- ADICIONE

const handleLogout = async () => { // <-- ADICIONE ESTA FUNÇÃO
    await supabase.auth.signOut();
    navigate('/login');
};
const buscarUsuarios = async () => {
    const { data } = await supabase
      .from("usuarios_custom")
      // ADICIONE os campos: email, cargo, telefone
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
// PainelGerente.js
  const buscarComissoesLiberadas = useCallback(async () => {
    const mesAtual = dayjs().format('YYYY-MM');
    
    // A query agora busca apenas pagamentos de parcelas que NÃO SÃO a primeira (neq = not equal to).
    let query = supabase
      .from('pagamentos_comissao')
      .select('valor_comissao')
      .eq('mes_pagamento', mesAtual)
      .neq('parcela_index', 1); // <-- MUDANÇA PRINCIPAL AQUI

    if (filtros.vendedor) {
      query = query.eq('usuario_id', filtros.vendedor);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar comissões liberadas:", error);
      return;
    }

    if (data) {
      const totalLiberado = data.reduce((acc, item) => acc + item.valor_comissao, 0);
      setComissoesLiberadasMes(totalLiberado);
    } else {
      setComissoesLiberadasMes(0);
    }
  }, [filtros.vendedor]);
  
  const fetchConfiguracoes = useCallback(async (mes, id_filial) => {
  if (!id_filial) return; // Não busca se não souber a filial
  const { data } = await supabase
    .from('configuracoes_mensais')
    .select('*')
    .eq('mes', mes)
    .eq('id_filial', id_filial) // <-- FILTRO ADICIONADO
    .single();

  if (data) {
    setConfiguracoes(data);
  } else {
    // Se não achar, cria uma configuração padrão vazia para aquela filial
    setConfiguracoes({ mes, id_filial, meta_geral: 10000000, duplas: [] });
  }
}, []);

  // PainelGerente.js
  
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
    buscarUsuarios(), // <-- Altere aqui (sem parâmetro)
    buscarVendas(),   // <-- Altere aqui (sem parâmetro)
    fetchConfiguracoes(filtros.mes, perfilData.id_filial),
    buscarComissoesLiberadas(),
    buscarTodasFiliais()
  ]);
}
      }
      setLoading(false);
    };

    carregarDadosIniciais();
  }, []);
 
    
  useEffect(() => { 
    if (filtros.mes && filialSelecionadaId) {
        fetchConfiguracoes(filtros.mes, filialSelecionadaId);
      }
}, [filtros.mes, filialSelecionadaId, fetchConfiguracoes]);

useEffect(() => {
    buscarComissoesLiberadas();
  }, [filtros.vendedor, buscarComissoesLiberadas]);

  

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
        status_parcela_1: 'PAGO',
        status_parcela_2: 'PENDENTE',
        status_parcela_3: 'PENDENTE',
        status_parcela_4: 'PENDENTE',
    };

    // Insere a venda e recupera o registro inserido
    const { data: vendaInserida, error } = await supabase.from('vendas').insert([dadosParaSalvar]).select().single();
    
    if (error) {
        alert('Erro ao criar venda: ' + error.message);
        return;
    }

    // REGISTRA O PAGAMENTO DA 1ª COMISSÃO IMEDIATAMENTE
    const percentuais = vendaInserida.parcela === 'cheia' ? PERCENT_CHEIA : PERCENT_MEIA;
    const valorComissao1 = vendaInserida.valor * percentuais[0];

    if (valorComissao1 > 0) {
        await supabase.from('pagamentos_comissao').insert({
            venda_id: vendaInserida.id,
            usuario_id: vendaInserida.usuario_id,
            parcela_index: 1,
            valor_comissao: valorComissao1,
            mes_pagamento: dayjs().format('YYYY-MM')
        });
    }

    // Recarrega os dados, limpa o formulário e volta para a aba de vendas
    await buscarVendas();
    setNovaVenda({ cliente: "", grupo: "", cota: "", administradora: "GAZIN", valor: "", parcela: "cheia", mes: dayjs().format("YYYY-MM"), usuario_id: "" });
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
 // Substitua sua função handleStatusChange atual por esta
  const handleStatusChange = async (venda, parcelaIndex, novoStatus) => {
    const nomeColuna = `status_parcela_${parcelaIndex}`;
    const statusAntigo = venda[nomeColuna];

    if (statusAntigo === novoStatus) {
        console.log(`O status da Parcela ${parcelaIndex} já é ${novoStatus}.`);
        return;
    }

    // 1. ATUALIZA O STATUS NA TABELA DE VENDAS
    const { error: updateError } = await supabase
        .from("vendas")
        .update({ [nomeColuna]: novoStatus })
        .eq("id", venda.id);

    if (updateError) {
        alert('Erro ao atualizar status da venda: ' + updateError.message);
        return;
    }

    // 2. LÓGICA PARA ADICIONAR OU REMOVER PAGAMENTO
    if (novoStatus === 'PAGO') {
        // Se o novo status é PAGO, INSERE o registro de pagamento
        const percentuais = venda.parcela === 'cheia' ? PERCENT_CHEIA : PERCENT_MEIA;
        const valorComissao = venda.valor * percentuais[parcelaIndex - 1];

        if (valorComissao > 0) {
            await supabase.from('pagamentos_comissao').insert({
                venda_id: venda.id,
                usuario_id: venda.usuario_id,
                parcela_index: parcelaIndex,
                valor_comissao: valorComissao,
                mes_pagamento: dayjs().format('YYYY-MM')
            });
        }
    } else if (statusAntigo === 'PAGO') {
        // Se o status ANTIGO era PAGO e o novo NÃO É, REMOVE o registro de pagamento
        await supabase
          .from('pagamentos_comissao')
          .delete()
          .eq('venda_id', venda.id)
          .eq('parcela_index', parcelaIndex);
    }
    
    // 3. RECARREGA OS DADOS PARA ATUALIZAR A INTERFACE
    buscarVendas(); 
    buscarComissoesLiberadas();
  };

// COLE ESTE BLOCO CORRIGIDO NO LUGAR DO SEU calculosDoMes ATUAL
const calculosDoMes = useMemo(() => {
    // Primeiro, filtramos os usuários com base na filial selecionada no filtro.
    const usuariosDaFilialFiltrada = filtros.filial
        ? usuarios.filter(u => u.id_filial == filtros.filial)
        : usuarios;

    // Criamos uma lista de IDs desses usuários para usar no filtro de vendas.
    const idsUsuariosDaFilial = usuariosDaFilialFiltrada.map(u => u.id);

    const vendasFiltradas = vendas.filter((v) => {
        // Nova condição: a venda pertence a um usuário da filial selecionada?
        const matchFilial = !filtros.filial || idsUsuariosDaFilial.includes(v.usuario_id);

        const matchVendedor = !filtros.vendedor || v.usuario_id === filtros.vendedor;
        const matchMes = !filtros.mes || v.mes === filtros.mes;
        const matchAdm = !filtros.administradora || v.administradora === filtros.administradora;

        return matchFilial && matchVendedor && matchMes && matchAdm;
    });

    const totaisPorVendedor = {};
    usuarios.forEach(u => { totaisPorVendedor[u.id] = { nome: u.nome, vendido: 0 }; });

    let totalMesTodos = 0;
    let totalComissaoVendedor = 0;
    const mesBase = filtros.mes;

    vendasFiltradas.forEach((venda) => {
      const id = venda.usuario_id;
      const valor = parseFloat(venda.valor) || 0;

      if(venda.mes === mesBase && totaisPorVendedor[id]) {
          totaisPorVendedor[id].vendido += valor;
      }

      if (venda.mes === mesBase) {
        totalMesTodos += valor;
      }

      if (filtros.vendedor && venda.usuario_id === filtros.vendedor && venda.mes === mesBase) {
        const percentuais = venda.parcela === 'cheia' ? PERCENT_CHEIA : PERCENT_MEIA;
        const comissaoP1DaVenda = valor * percentuais[0];
        totalComissaoVendedor += comissaoP1DaVenda;
      }
    });

    return { vendasFiltradas, totaisPorVendedor, totalMesTodos, totalComissaoVendedor };
}, [vendas, usuarios, filtros]); // A dependência 'filtros' já inclui a filial


  // CAMINHO DE ABAS
  const abas = [
    { id: 'vendas', label: 'Dashboard de Vendas', icon: <FaChartBar /> },
    { id: 'ranking', label: 'Ranking', icon: <FaTrophy /> },
    { id: 'nova_venda', label: 'Nova Venda', icon: <FaPlusCircle /> },
    { id: 'contempladas', label: 'Contempladas', icon: <FaChartLine /> },
    { id: 'crm', label: 'CRM', icon: <FaUsers /> },
    { id: 'hs_cotas', label: 'Cotas HS', icon: <FaTh /> },
    { id: 'usuarios', label: 'Gerenciar Usuários', icon: <FaUserPlus /> } // Ícone FaTh precisa ser importado
  ];
  
  const renderContent = () => {
    switch (aba) {
     case 'vendas': return <AbaVendas 
     listaFiliais={listaFiliais} 
  vendasFiltradas={calculosDoMes.vendasFiltradas}
  totalMesTodos={calculosDoMes.totalMesTodos}
  totalComissaoVendedor={calculosDoMes.totalComissaoVendedor}
  usuarios={usuarios}
  filtros={filtros} setFiltros={setFiltros} 
  nomeVendedor={nomeVendedor} 
  editandoId={editandoId} setEditandoId={setEditandoId} 
  vendaEditada={vendaEditada} setVendaEditada={setVendaEditada}
  editarVenda={editarVenda} salvarEdicao={salvarEdicao} 
  excluirVenda={excluirVenda} 
  handleStatusChange={handleStatusChange} // <-- CORRIGIDO para a nova função
  comissoesLiberadasMes={comissoesLiberadasMes}
  onAbrirModalRelatorioGeral={() => setModalRelatorioGeral(true)}
  onAbrirModalRelatorioHS={() => setModalRelatorioHS(true)} // <-- ADICIONE ESTA LINHA
  />;
        // CASES PARA ROTAS
case 'ranking': {
    // 1. Filtra os usuários com base na filial selecionada no dropdown
    const usuariosParaRanking = filialSelecionadaId
        ? usuarios.filter(u => u.id_filial == filialSelecionadaId)
        : usuarios; // Se nenhuma filial for selecionada, usa todos (fallback)

    // Pega os IDs dos usuários filtrados para usar no filtro de vendas
    const idsDosUsuariosParaRanking = usuariosParaRanking.map(u => u.id);

    // 2. Filtra as vendas para incluir apenas as dos usuários da filial selecionada
    const vendasParaRanking = filialSelecionadaId
        ? vendas.filter(v => idsDosUsuariosParaRanking.includes(v.usuario_id))
        : vendas; // Se nenhuma filial for selecionada, usa todas (fallback)

    return (
        <AbaRanking 
            perfilUsuario={perfilUsuario} 
            vendas={vendasParaRanking}   // <-- Passa a lista de vendas JÁ FILTRADA
            usuarios={usuariosParaRanking} // <-- Passa a lista de usuários JÁ FILTRADA
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
      case 'crm': return <PainelCRM />; 
      case 'contempladas': return <PainelContempladas usuario={perfilUsuario} />;
      case 'hs_cotas': return <HSCotas usuario={perfilUsuario} />;  
case 'usuarios': 
  return <AbaGerenciarUsuarios 
    listaFiliais={listaFiliais} 
    listaUsuarios={usuarios} // <-- PASSE A LISTA DE USUÁRIOS
    onRefreshUsuarios={buscarUsuarios} // <-- PASSE A FUNÇÃO DE RECARREGAR
  />;      default: return null;
    }
  };
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen p-4 md:p-8">
      <div className="container mx-auto">
        <header className="mb-8">
            <div className="flex justify-between items-center mb-6"> {/* <-- Wrapper Flex */}
                <div>
                    <h1 className="text-4xl font-bold text-white">Painel do Diretor</h1>
                    <p className="text-gray-400 mt-1">Gerencie vendas, comissões, rankings e sua equipe.</p>
                </div>
                {/* --- BOTÕES ADICIONADOS --- */}
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
                {/* --- FIM DOS BOTÕES --- */}
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
        <div className="mt-6">{renderContent()}</div>

        {/* --- LOCAL CORRETO PARA O MODAL --- */}
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
                              .select('*') // Pega tudo para garantir
                              .eq('id', user.id)
                              .single();
                            if (perfilData) setPerfilUsuario(perfilData);
                        }
                    };
                    reFetchProfile();
                    buscarUsuarios(); // Recarrega a lista de usuários tbm (caso mude o telefone)
                }}
            />
        )}
        {/* --- FIM DO MODAL --- */}
        {/* --- MODAL DO RELATÓRIO HS ADICIONADO --- */}
    {modalRelatorioHS && (
        <RelatorioHSModal
            vendas={vendas}
            usuarios={usuarios}
            onClose={() => setModalRelatorioHS(false)}
        />
    )}
    {/* --- FIM DO MODAL --- */}
    {/* --- MODAL DO RELATÓRIO GERAL ADICIONADO --- */}
{modalRelatorioGeral && (
    <RelatorioGeralModal
        vendas={vendas}
        usuarios={usuarios}
        filtros={filtros}
        listaFiliais={listaFiliais}
        onClose={() => setModalRelatorioGeral(false)}
    />
)}
{/* --- FIM DO MODAL --- */}

      </div>
    </div>
  );
} // <-- FIM DO COMPONENTE PainelDiretor


// --- Componente da Aba de Vendas (Dashboard) ---
const AbaVendas = ({ listaFiliais, vendasFiltradas, totalMesTodos, totalComissaoVendedor, usuarios, filtros, setFiltros, nomeVendedor, editandoId, setEditandoId, vendaEditada, setVendaEditada, editarVenda, salvarEdicao, excluirVenda, handleStatusChange, comissoesLiberadasMes, onAbrirModalRelatorioGeral, onAbrirModalRelatorioHS }) => {
    const mesSelecionadoLabel = dayjs(filtros.mes).format("MMMM [de] YYYY");

    const vendedoresFiltradosParaDropdown = useMemo(() => {
        if (!filtros.filial) {
            return usuarios; 
        }
        return usuarios.filter(u => u.id_filial == filtros.filial);
    }, [usuarios, filtros.filial]);

    return (
    <div className="animate-fade-in space-y-8">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard icon={<FaDollarSign size={24} />} label={`Total Vendido em ${mesSelecionadoLabel}`} value={totalMesTodos} color="bg-green-500/20 text-green-400" />
            {filtros.vendedor && (
                <StatCard icon={<FaUserTie size={24} />} label={`Comissão P1 (Vendas de ${mesSelecionadoLabel})`} value={totalComissaoVendedor} color="bg-yellow-500/20 text-yellow-400" />
            )}    
            <StatCard icon={<FaFileInvoiceDollar size={24} />} label={`Comissões Anteriores Liberadas em ${dayjs().format('MMMM')}`} value={comissoesLiberadasMes} color="bg-blue-500/20 text-blue-400" />
        </div>
        
        {/* Removido "printable-area" daqui */}
        <main className="bg-gray-800/50 rounded-xl shadow-2xl p-6"> 

            {/* O TÍTULO QUE ESTAVA AQUI FOI REMOVIDO (pois ele está dentro do modal) */}

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
                <div className="flex flex-wrap items-center gap-4 mt-4 justify-end">
                    <button 
                        onClick={onAbrirModalRelatorioHS}
                        className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                    >
                        <FaChartLine /> Relatório HS
                    </button>
                    <button 
                        onClick={onAbrirModalRelatorioGeral} 
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                    >
                        <FaPrint /> Imprimir Relatório Geral
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
                            {/* Removido 'print-hidden' (não é mais necessário) */}
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
                                                    <div className="mt-1.5"><span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${venda.parcela === 'cheia' ? 'bg-blue-900/70 text-blue-300' : 'bg-yellow-900/70 text-yellow-300'}`}>{venda.parcela === 'cheia' ? 'Parcela Cheia' : 'Parcela Meia'}</span></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-green-400 font-semibold">{parseFloat(venda.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                                            <td className="px-4 py-3">{nomeVendedor(venda.usuario_id)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                                                    <span className={`px-2 py-1 text-xs rounded-md font-medium whitespace-nowrap ${venda.status_parcela_1 === 'PAGO' ? 'bg-green-500/20 text-green-300' : 'bg-gray-700'}`}>
                                                        P1: {venda.status_parcela_1 || 'PENDENTE'}
                                                    </span>
                                                    {[2, 3, 4].map((i) => {
                                                        const statusAtual = venda[`status_parcela_${i}`] || 'PENDENTE';
                                                        let corSeletor = 'bg-gray-700 border-gray-600 text-gray-300';
                                                        if (statusAtual === 'PAGO') corSeletor = 'bg-green-500/20 border-green-700 text-green-300';
                                                        if (statusAtual === 'PENDENTE') corSeletor = 'bg-yellow-500/20 border-yellow-700 text-yellow-300';
                                                        if (statusAtual === 'VENCIDO' || statusAtual === 'ESTORNO') corSeletor = 'bg-red-500/20 border-red-700 text-red-300';
    
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
    const [modalConfigVisivel, setModalConfigVisivel] = useState(false); // <-- ADICIONE ESTA LINHA
    const [selecaoDupla, setSelecaoDupla] = useState([]);
    const [textoRanking, setTextoRanking] = useState('');

    useEffect(() => {
        setConfig(initialConfig);
    }, [initialConfig]);

    // Funções para calcular os totais
    const totaisPorVendedor = useMemo(() => {
        const totais = {};
        const vendasDoMes = vendas.filter(v => v.mes === filtros.mes);
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
                {/* ... cole aqui o conteúdo do antigo div de configurações ... */}
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