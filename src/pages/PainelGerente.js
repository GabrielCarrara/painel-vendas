// src/pages/PainelGerente.js (Versão com Filtro de Mês na Aba Ranking)
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import 'dayjs/locale/pt-br';
import { 
    FaChartBar, FaUsers, FaPlusCircle, FaTrophy, FaFilter, FaEdit, FaTrash, FaSave, FaTimes, 
    FaDollarSign, FaUserTie, FaExclamationTriangle, FaClipboard, FaWhatsapp, FaChartLine, FaCogs,
    FaFileInvoiceDollar, // <-- ÍCONE ADICIONADO AQUI
    FaTh
} from "react-icons/fa";

// Componentes importados (verifique os caminhos)
import PainelCRM from "./PainelCRM";
import PainelContempladas from "./PainelContempladas";
import HSCotas from './HSCotas'; // Verifique se o caminho está correto
const PERCENT_CHEIA = [0.006, 0.003, 0.003, 0]; // Comissão: 1.2% total (0.6, 0.3, 0.3). Parcela 4 não tem comissão.
const PERCENT_MEIA = [0.003, 0.0015, 0.0015, 0]; // Comissão: 0.6% total (0.3, 0.15, 0.15). Parcela 4 não tem comissão.
const STATUS_OPCOES = ['PENDENTE', 'PAGO', 'VENCIDO', 'ESTORNO'];
// --- Componentes de UI Reutilizáveis ---
const StatCard = ({ icon, title, value, color }) => (
  <div className="bg-gray-800 p-5 rounded-xl shadow-lg flex items-center space-x-4 transition-transform hover:scale-105">
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-400">{title}</p>
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
export default function PainelGerenteAprimorado() {
  dayjs.locale('pt-br'); 

  const [aba, setAba] = useState("vendas");
  const [vendas, setVendas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState({ vendedor: "", mes: dayjs().format("YYYY-MM"), administradora: "" });
  const [editandoId, setEditandoId] = useState(null);
  const [vendaEditada, setVendaEditada] = useState({});
  const [novaVenda, setNovaVenda] = useState({ cliente: "", grupo: "", cota: "", administradora: "GAZIN", valor: "", parcela: "cheia", mes: dayjs().format("YYYY-MM"), usuario_id: "" });
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configuracoes, setConfiguracoes] = useState({ meta_geral: 0, duplas: [] });
  const [comissoesLiberadasMes, setComissoesLiberadasMes] = useState(0);
  const buscarUsuarios = async () => {
    const { data } = await supabase.from("usuarios_custom").select("id, nome").order('nome', { ascending: true });
    if (data) setUsuarios(data);
  };
  const buscarVendas = async () => {
    const { data } = await supabase.from("vendas").select("*").order("created_at", { ascending: false });
    if (data) setVendas(data);
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
  
  const fetchConfiguracoes = useCallback(async (mes) => {
    const { data } = await supabase.from('configuracoes_mensais').select('*').eq('mes', mes).single();
    if (data) setConfiguracoes(data);
    else setConfiguracoes({ mes, meta_geral: 10000000, duplas: [] });
  }, []);

  // PainelGerente.js
  
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      setLoading(true);
      const userRes = await supabase.auth.getUser();
      if(userRes.data?.user) {
        const user = userRes.data.user;
        setUsuarioAtual(user);
        setNovaVenda(prev => ({ ...prev, usuario_id: user.id }));
        
        await Promise.all([
          buscarUsuarios(),
          buscarVendas(),
          fetchConfiguracoes(filtros.mes), buscarComissoesLiberadas()
        ]);
      }
      setLoading(false);
    };
    carregarDadosIniciais();
  }, [fetchConfiguracoes, buscarComissoesLiberadas]);
  
  useEffect(() => { 
    if(filtros.mes) {
        fetchConfiguracoes(filtros.mes);
    }
  }, [filtros.mes, fetchConfiguracoes]);
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
    const vendasFiltradas = vendas.filter((v) => {
        const matchVendedor = !filtros.vendedor || v.usuario_id === filtros.vendedor;
        const matchMes = !filtros.mes || v.mes === filtros.mes;
        const matchAdm = !filtros.administradora || v.administradora === filtros.administradora;
        return matchVendedor && matchMes && matchAdm;
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
      
      // Lógica de cálculo da comissão P1
      if (filtros.vendedor && venda.usuario_id === filtros.vendedor && venda.mes === mesBase) {
        const percentuais = venda.parcela === 'cheia' ? PERCENT_CHEIA : PERCENT_MEIA;
        // Linha corrigida para calcular APENAS a P1
        const comissaoP1DaVenda = valor * percentuais[0];
        totalComissaoVendedor += comissaoP1DaVenda;
      }
    });

    return { vendasFiltradas, totaisPorVendedor, totalMesTodos, totalComissaoVendedor };
  }, [vendas, usuarios, filtros]);


  // CAMINHO DE ABAS
  const abas = [
    { id: 'vendas', label: 'Dashboard de Vendas', icon: <FaChartBar /> },
    { id: 'ranking', label: 'Ranking', icon: <FaTrophy /> },
    { id: 'nova_venda', label: 'Nova Venda', icon: <FaPlusCircle /> },
    { id: 'contempladas', label: 'Contempladas', icon: <FaChartLine /> },
    { id: 'crm', label: 'CRM', icon: <FaUsers /> },
    { id: 'hs_cotas', label: 'Cotas HS', icon: <FaTh /> }, // Ícone FaTh precisa ser importado
  ];
  
  const renderContent = () => {
    switch (aba) {
     case 'vendas': return <AbaVendas 
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
  />;
        // CASES PARA ROTAS
      case 'ranking': return <AbaRanking vendas={vendas} usuarios={usuarios} filtros={filtros} setFiltros={setFiltros} configuracoes={configuracoes} onSave={fetchConfiguracoes} />;
      case 'nova_venda': return <AbaNovaVenda novaVenda={novaVenda} setNovaVenda={setNovaVenda} cadastrarVenda={cadastrarVenda} usuarios={usuarios} usuarioAtual={usuarioAtual} />;
      case 'crm': return <PainelCRM />; 
      case 'contempladas': return <PainelContempladas usuario={usuarioAtual} />;
      case 'hs_cotas': return <HSCotas usuario={usuarioAtual} />;     
      default: return null;
    }
  };
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen p-4 md:p-8">
      <div className="container mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">Painel do Gerente</h1>
          <p className="text-gray-400 mt-1">Gerencie vendas, comissões, rankings e sua equipe.</p>
          <nav className="mt-6 flex flex-wrap gap-2 border-b border-gray-700 pb-2">
            {abas.map((item) => (
              <button key={item.id} onClick={() => setAba(item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold transition-all ${aba === item.id ? 'bg-gray-800/50 text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </header>
        <div className="mt-6">{renderContent()}</div>
      </div>
    </div>
  );
}

// --- Componente da Aba de Vendas (Dashboard) ---
const AbaVendas = ({ vendasFiltradas, totalMesTodos, totalComissaoVendedor, usuarios, filtros, setFiltros, nomeVendedor, editandoId, setEditandoId, vendaEditada, setVendaEditada, editarVenda, salvarEdicao, excluirVenda, handleStatusChange, comissoesLiberadasMes }) => {    const mesSelecionadoLabel = dayjs(filtros.mes).format("MMMM [de] YYYY");
    return (
    <div className="animate-fade-in space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard icon={<FaDollarSign size={24} />} title={`Total Vendido em ${mesSelecionadoLabel}`} value={totalMesTodos} color="bg-green-500/20 text-green-400" />
            {filtros.vendedor && (
<StatCard icon={<FaUserTie size={24} />} title={`Comissão P1 (Vendas de ${mesSelecionadoLabel})`} value={totalComissaoVendedor} color="bg-yellow-500/20 text-yellow-400" />)}    
<StatCard icon={<FaFileInvoiceDollar size={24} />} title={`Comissões Anteriores Liberadas em ${dayjs().format('MMMM')}`} value={comissoesLiberadasMes} color="bg-blue-500/20 text-blue-400" />        </div>
        
        <main className="bg-gray-800/50 rounded-xl shadow-2xl p-6">
            <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold flex items-center gap-2 whitespace-nowrap"><FaFilter /> Filtros</h2>
                <select value={filtros.vendedor} onChange={(e) => setFiltros({ ...filtros, vendedor: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500">
                    <option value="">Todos os Vendedores</option>
                    {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <input type="month" value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
                <select value={filtros.administradora} onChange={(e) => setFiltros({ ...filtros, administradora: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500">
                    <option value="">Todas Administradoras</option>
                    <option value="HS">HS</option><option value="GAZIN">GAZIN</option>
                </select>
            </div>
            
            <div>
                <h3 className="text-xl font-bold mb-4 text-white">Lançamentos de Vendas</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="border-b border-gray-700"><tr className="text-gray-400 uppercase">
                            <th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Vendedor</th><th className="px-4 py-3 text-center">Comissões</th><th className="px-4 py-3 text-center">Ações</th>
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
        {/* Parcela 1 é apenas informativa, não editável aqui */}
        <span className={`px-2 py-1 text-xs rounded-md font-medium whitespace-nowrap ${venda.status_parcela_1 === 'PAGO' ? 'bg-green-500/20 text-green-300' : 'bg-gray-700'}`}>
            P1: {venda.status_parcela_1 || 'PENDENTE'}
        </span>

        {/* Parcelas 2, 3 e 4 são editáveis pelo gerente */}
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
onChange={(e) => handleStatusChange(venda, i, e.target.value)}                    className={`p-1 text-xs rounded-md border focus:ring-2 focus:ring-indigo-400 font-medium ${corSeletor}`}
                >
                    {STATUS_OPCOES.map(opt => <option key={opt} value={opt}>{`P${i}: ${opt}`}</option>)}
                </select>
            );
        })}
    </div>
</td>                                            <td className="px-4 py-3"><div className="flex gap-3 justify-center"><button onClick={() => editarVenda(venda)} className="p-2 text-blue-400 hover:text-blue-300"><FaEdit size={18} /></button><button onClick={() => excluirVenda(venda.id)} className="p-2 text-red-500 hover:text-red-400"><FaTrash size={18} /></button></div></td>
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

// --- Componente da Aba de Ranking ---
const AbaRanking = ({ vendas, usuarios, filtros, setFiltros, configuracoes: initialConfig, onSave }) => {
    const [config, setConfig] = useState(initialConfig);
    const [duplasTexto, setDuplasTexto] = useState('');
    const [textoRanking, setTextoRanking] = useState('');

    const totaisPorVendedor = useMemo(() => {
        const totais = {};
        const vendasDoMes = vendas.filter(v => v.mes === filtros.mes);
        usuarios.forEach(u => { totais[u.id] = { nome: u.nome, vendido: 0 }; });
        vendasDoMes.forEach((venda) => {
          if (totais[venda.usuario_id]) { totais[venda.usuario_id].vendido += parseFloat(venda.valor) || 0; }
        });
        return totais;
    }, [vendas, filtros.mes, usuarios]);

    useEffect(() => {
        setConfig(initialConfig);
        const duplasFormatadas = (initialConfig.duplas || []).map(d => d.join(', ')).join('\n');
        setDuplasTexto(duplasFormatadas);
    }, [initialConfig]);

    const handleSalvarConfig = async () => {
        const duplasParseadas = duplasTexto.split('\n').filter(line => line.trim() !== '').map(line => line.split(',').map(name => name.trim()));
        const payload = { ...config, duplas: duplasParseadas, mes: filtros.mes };
        
        const { error } = await supabase.from('configuracoes_mensais').upsert(payload, { onConflict: 'mes' });
        if (error) { alert('Erro ao salvar configurações: ' + error.message); }
        else { alert('Configurações salvas com sucesso!'); onSave(filtros.mes); }
    };
    
    const calcularDiasUteisRestantes = useCallback(() => {
        let count = 0;
        const hoje = dayjs();
        const fimDoMes = dayjs(filtros.mes).endOf('month');
        if (hoje.isAfter(fimDoMes) || hoje.format('YYYY-MM') !== dayjs(filtros.mes).format('YYYY-MM')) return 0;
        
        let diaAtual = hoje;
        while(diaAtual.isBefore(fimDoMes) || diaAtual.isSame(fimDoMes, 'day')) {
            if (diaAtual.day() !== 0) count++;
            diaAtual = diaAtual.add(1, 'day');
        }
        return count;
    }, [filtros.mes]);

    const gerarTextoRanking = useCallback(() => {
        const mesFormatado = dayjs(filtros.mes).format("MMMM");
        const f = (n) => (n || 0).toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
        const medalhas = ['🥇', '🥈', '🥉'];
        const rankingIndividual = Object.values(totaisPorVendedor).filter(v => v.vendido > 0).sort((a, b) => b.vendido - a.vendido);
        let textoIndividual = rankingIndividual.map((v, i) => `${i < 3 ? medalhas[i] : `${i + 1}️⃣`} ${v.nome}: ${f(v.vendido)}`).join('\n');
        const duplasParaCalculo = config.duplas || [];
        const totaisDuplas = duplasParaCalculo.map(dupla => {
            const total = dupla.reduce((acc, nome) => {
                const vendedor = Object.values(totaisPorVendedor).find(v => v.nome === nome);
                return acc + (vendedor ? vendedor.vendido : 0);
            }, 0);
            return { nomes: dupla.join(' e '), total };
        }).sort((a, b) => b.total - a.total);
        const medalhasDuplas = ['🏆', '🥇', '🥈', '🥉'];
        let textoDuplas = totaisDuplas.map((d, i) => `${i < 4 ? medalhasDuplas[i] : `${i + 1}️⃣`} ${d.nomes}: ${f(d.total)}`).join('\n');
        const vendidoGeral = rankingIndividual.reduce((acc, v) => acc + v.vendido, 0);
        const faltaParaMeta = (config.meta_geral || 0) - vendidoGeral;
        const diasRestantes = calcularDiasUteisRestantes();
        const divisaoDias = diasRestantes > 0 ? faltaParaMeta / diasRestantes : 0;
        setTextoRanking(`Muito bom dia!\nSegue o rank mensal de ${mesFormatado} para acompanhamento.\n\n` + `VENDEDORES INDIVIDUAIS:\n\n${textoIndividual}\n\n` + `RANK DUPLAS:\n\n${textoDuplas}\n\n` + `ESCRITÓRIO:\n\nMETA GERAL: ${f(config.meta_geral || 0)}\n` + `VENDIDO GERAL: ${f(vendidoGeral)}\n` + `FALTA PARA META: ${f(faltaParaMeta)}\n` + `DIVISÃO POR ${diasRestantes} DIAS DE VENDAS: ${f(divisaoDias)}`);
    }, [totaisPorVendedor, filtros.mes, config, calcularDiasUteisRestantes]);

    useEffect(() => { gerarTextoRanking(); }, [gerarTextoRanking]);

    const copiarParaClipboard = () => { navigator.clipboard.writeText(textoRanking); alert('Ranking copiado!'); };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800/50 rounded-xl">
                <h3 className="text-xl font-bold flex items-center gap-2"><FaFilter /> Visualizar Ranking de:</h3>
                <input type="month" value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })} className="w-full md:w-auto bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><FaCogs /> Configurações de {dayjs(filtros.mes).format('MMMM')}</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div><label className="block mb-1 text-sm font-medium text-gray-400">Meta Geral do Escritório (R$)</label><input type="number" value={config.meta_geral || ''} onChange={e => setConfig({...config, meta_geral: parseFloat(e.target.value) || 0})} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" /></div>
                        <div><label className="block mb-1 text-sm font-medium text-gray-400">Duplas do Mês (um par por linha, separado por vírgula)</label><textarea value={duplasTexto} onChange={e => setDuplasTexto(e.target.value)} rows="4" className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" placeholder="Ex: Vendedor A, Vendedor B&#10;Vendedor C, Vendedor D"></textarea></div>
                    </div>
                    <button onClick={handleSalvarConfig} className="mt-4 bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2"><FaSave /> Salvar Configurações</button>
                </div>
                <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-4">Pré-visualização do Ranking</h3>
                    <textarea readOnly value={textoRanking} className="w-full h-96 bg-gray-900/80 p-4 rounded-lg font-mono text-sm border border-gray-700 whitespace-pre-wrap"/>
                    <div className="mt-4 flex gap-4">
                        <button onClick={copiarParaClipboard} className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2"><FaClipboard /> Copiar Texto</button>
                        <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(textoRanking)}`} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2"><FaWhatsapp /> Enviar no WhatsApp</a>
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                     <StatCard icon={<FaDollarSign />} title="Vendido no Mês" value={Object.values(totaisPorVendedor).reduce((acc, v) => acc + v.vendido, 0)} color="bg-green-500/20" />
                    <StatCard icon={<FaTrophy />} title="Meta do Mês" value={config.meta_geral || 0} color="bg-indigo-500/20" />
                    <StatCard icon={<FaChartLine />} title="Falta para Meta" value={(config.meta_geral || 0) - Object.values(totaisPorVendedor).reduce((acc, v) => acc + v.vendido, 0)} color="bg-red-500/20" />
                </div>
            </div>
        </div>
    );
};