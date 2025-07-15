// src/pages/PainelVendedor.js (Versão Final com TODAS as correções)
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import PainelCRM from './PainelCRM';
import {
  FaDollarSign, FaHandHoldingUsd, FaPlus, FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaSave, FaTimes,
  FaFileInvoiceDollar, FaUsers, FaTrophy, FaCar, FaHome, FaBlender, FaSpinner, FaExclamationTriangle,
  FaBullseye, FaChartLine
} from 'react-icons/fa';
import dayjs from 'dayjs';

// --- Constantes de Comissão ---
const PERCENT_CHEIA = [0.006, 0.003, 0.003];
const PERCENT_MEIA = [0.003, 0.0015, 0.0015];

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

const SaleCard = ({ venda, onEdit, onDelete }) => (
  <div className="bg-gray-800/70 rounded-xl shadow-lg flex flex-col border border-gray-700/50">
    <header className="p-4 flex justify-between items-center border-b border-gray-700">
      <h4 className="font-bold text-lg text-white">{venda.cliente.toUpperCase()}</h4>
      <span className={`px-3 py-1 text-xs font-bold rounded-full ${venda.parcela === 'cheia' ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-400'}`}>
        {venda.parcela === 'cheia' ? 'PARCELA CHEIA' : 'PARCELA MEIA'}
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
        <div className="flex gap-3 flex-wrap">
            <span className={`font-medium ${venda.comissao_1 ? 'text-green-400' : 'text-gray-500'}`}>1ª Parcela</span>
            <span className={`font-medium ${venda.comissao_2 ? 'text-green-400' : 'text-gray-500'}`}>2ª Parcela</span>
            <span className={`font-medium ${venda.comissao_3 ? 'text-green-400' : 'text-gray-500'}`}>3ª Parcela</span>
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
        </div>
    </div>
);

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
  const navigate = useNavigate();

  const carregarTodosDados = useCallback(async () => {
    setLoading(true);
    const [vendasRes, usersRes, contempladasRes, configRes] = await Promise.all([
        supabase.from('vendas').select('*').order('created_at', { ascending: false }),
        supabase.from('usuarios_custom').select('id, nome'),
        supabase.from('contempladas').select('*'),
        supabase.from('configuracoes_mensais').select('*').eq('mes', mesFiltro).single()
    ]);
    
    if (vendasRes.data) setAllVendas(vendasRes.data);
    if (usersRes.data) setAllUsers(usersRes.data);
    if (contempladasRes.data) {
        const peso = { 'DISPONÍVEL': 0, 'RESERVADO': 1, 'EM ANÁLISE': 2, 'VENDIDO': 3 };
        setContempladas(contempladasRes.data.sort((a, b) => peso[a.status] - peso[b.status]));
    }
    if (configRes.data) setConfiguracoes(configRes.data);
    else setConfiguracoes({ mes: mesFiltro, meta_geral: 10000000, duplas: [] });
    setLoading(false);
  }, [mesFiltro]);
  
  useEffect(() => {
    const getUserAndData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/login');
            return;
        }
        setUsuario(user);
    }
    getUserAndData();
  }, [navigate]);

  useEffect(() => {
    if (usuario) {
        carregarTodosDados();
    }
  }, [usuario, carregarTodosDados]);
  
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
    const dados = {
      ...formulario,
      valor: desformatarMoeda(formulario.valor),
      mes: editandoId ? formulario.mes : dayjs(mesFiltro).format('YYYY-MM'),
      usuario_id: usuario.id,
      cliente: formulario.cliente.toUpperCase()
    };
    if(!editandoId) { dados.comissao_1 = true; }
    const { error } = editandoId ? await supabase.from('vendas').update(dados).eq('id', editandoId) : await supabase.from('vendas').insert([dados]);
    if (error) alert('Erro: ' + error.message);
    else { await carregarTodosDados(); limparFormulario(); }
  };
  
  const iniciarEdicao = (venda) => {
    setEditandoId(venda.id);
    setFormulario({ ...venda, valor: formatInputMoeda(String(venda.valor * 100)) });
    setFormVisivel(true);
  };

  const excluirVenda = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta venda?')) return;
    setLoading(true);
    const { error } = await supabase.from('vendas').delete().eq('id', id);
    if(error) {
        alert('Erro ao excluir: ' + error.message);
        setLoading(false);
    } else {
        await carregarTodosDados();
        alert('Venda excluída com sucesso!');
    }
  };
  
  const limparFormulario = () => {
      setFormulario({ cliente: '', grupo: '', cota: '', valor: '', parcela: 'cheia', administradora: 'GAZIN' });
      setEditandoId(null);
      setFormVisivel(false);
  };

  const minhasVendasDoMes = useMemo(() => allVendas.filter(v => v.usuario_id === usuario?.id && v.mes === mesFiltro), [allVendas, usuario, mesFiltro]);

  const totaisPessoais = useMemo(() => {
    const totalMes = minhasVendasDoMes.reduce((s, v) => s + Number(v.valor), 0);
    const comissaoRecebida = minhasVendasDoMes.reduce((s, v) => {
        const base = Number(v.valor); const pc = v.parcela === 'cheia' ? PERCENT_CHEIA : PERCENT_MEIA;
        if (v.comissao_1) s += base * pc[0]; if (v.comissao_2) s += base * pc[1]; if (v.comissao_3) s += base * pc[2];
        return s;
    }, 0);
    return { totalMes, comissaoRecebida };
  }, [minhasVendasDoMes]);

  const abas = [
    { id: 'vendas', label: 'Minhas Vendas', icon: <FaFileInvoiceDollar /> },
    { id: 'ranking', label: 'Ranking', icon: <FaTrophy /> },
    { id: 'crm', label: 'CRM', icon: <FaUsers /> },
    { id: 'contempladas', label: 'Contempladas', icon: <FaChartLine /> },
  ];
  
  const renderContent = () => {
      if (loading) return <LoadingSpinner />;
      switch(aba) {
          case 'vendas': return <AbaMinhasVendas totais={totaisPessoais} mesFiltro={mesFiltro} setMesFiltro={setMesFiltro} formVisivel={formVisivel} setFormVisivel={setFormVisivel} formulario={formulario} setFormulario={setFormulario} handleSave={handleSave} editandoId={editandoId} limparFormulario={limparFormulario} minhasVendas={minhasVendasDoMes} iniciarEdicao={iniciarEdicao} excluirVenda={excluirVenda} formatInputMoeda={formatInputMoeda}/>;
          case 'ranking': return <AbaRankingVendedor vendas={allVendas} usuarios={allUsers} mes={mesFiltro} configuracoes={configuracoes} usuarioAtual={usuario} />;
          case 'crm': return <PainelCRM usuarioId={usuario?.id} />;
          case 'contempladas': return <AbaContempladas contempladas={contempladas} />;
          default: return null;
      }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 animate-fade-in">
        <header className="mb-8">
            <h1 className="text-4xl font-bold text-white">Painel do Vendedor</h1>
            <p className="text-gray-400 mt-1">Bem-vindo(a) de volta, {(usuario?.user_metadata?.nome || usuario?.email.split('@')[0] || '').split(' ')[0]}!</p>
            <nav className="mt-6 flex flex-wrap gap-2 border-b border-gray-700 pb-2">
                {abas.map((item) => (
                    <button key={item.id} onClick={() => setAba(item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold transition-all ${aba === item.id ? 'bg-gray-800/50 text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                        {item.icon} {item.label}
                    </button>
                ))}
            </nav>
        </header>
        <main>{renderContent()}</main>
    </div>
  );
}

// --- Componente da Aba Minhas Vendas ---
const AbaMinhasVendas = ({ totais, mesFiltro, setMesFiltro, formVisivel, setFormVisivel, formulario, setFormulario, handleSave, editandoId, limparFormulario, minhasVendas, iniciarEdicao, excluirVenda, formatInputMoeda }) => (
    <div className="animate-fade-in">
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <StatCard icon={<FaDollarSign size={24} />} label="Minhas Vendas no Mês" value={totais.totalMes} color="bg-green-500/20" />
            <StatCard icon={<FaHandHoldingUsd size={24} />} label="Minha Comissão Prevista" value={totais.comissaoRecebida} color="bg-yellow-500/20" />
        </div>
        <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Lançamentos de {dayjs(mesFiltro).format('MMMM/YYYY')}</h3>
                <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="bg-gray-700 p-2 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="border-b border-gray-700 mb-4">
                <button onClick={() => setFormVisivel(!formVisivel)} className="w-full flex justify-between items-center py-3 text-lg font-semibold text-indigo-400">
                    <span>{editandoId ? 'Editando Venda' : 'Adicionar Nova Venda'}</span>{formVisivel ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {formVisivel && (
                    <form onSubmit={handleSave} className="pb-4 space-y-4 animate-fade-in">
                        <div className="grid md:grid-cols-3 gap-4">
                            <input name="cliente" value={formulario.cliente} onChange={(e) => setFormulario(prev => ({...prev, cliente: e.target.value}))} placeholder="Nome do cliente" className="p-3 bg-gray-700 rounded-lg border border-gray-600" required />
                            <input name="valor" value={formulario.valor} onChange={(e) => setFormulario(prev => ({...prev, valor: formatInputMoeda(e.target.value)}))} placeholder="Valor da venda" className="p-3 bg-gray-700 rounded-lg border border-gray-600" required />
                            <select name="administradora" value={formulario.administradora} onChange={(e) => setFormulario(prev => ({...prev, administradora: e.target.value}))} className="p-3 bg-gray-700 rounded-lg border border-gray-600"><option>GAZIN</option><option>HS</option></select>
                            <input name="grupo" value={formulario.grupo} onChange={(e) => setFormulario(prev => ({...prev, grupo: e.target.value}))} placeholder="Grupo" className="p-3 bg-gray-700 rounded-lg border border-gray-600" required />
                            <input name="cota" value={formulario.cota} onChange={(e) => setFormulario(prev => ({...prev, cota: e.target.value}))} placeholder="Cota" className="p-3 bg-gray-700 rounded-lg border border-gray-600" required />
                            <select name="parcela" value={formulario.parcela} onChange={(e) => setFormulario(prev => ({...prev, parcela: e.target.value}))} className="p-3 bg-gray-700 rounded-lg border border-gray-600"><option value="cheia">Parcela Cheia</option><option value="meia">Parcela Meia</option></select>
                        </div>
                        <div className="flex gap-4"><button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2"><FaSave /> {editandoId ? 'Salvar' : 'Cadastrar'}</button><button type="button" onClick={limparFormulario} className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg">Cancelar</button></div>
                    </form>
                )}
            </div>
            {minhasVendas.length > 0 ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{minhasVendas.map((v) => <SaleCard key={v.id} venda={v} onEdit={() => iniciarEdicao(v)} onDelete={() => excluirVenda(v.id)} />)}</div> : <EmptyState title="Nenhuma Venda no Mês" message="Você ainda não lançou vendas para este período." />}
        </div>
    </div>
);

// --- Componente da Aba Ranking para Vendedor ---
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

const AbaRankingVendedor = ({ vendas, usuarios, mes, configuracoes, usuarioAtual }) => {
    
    const totaisPorVendedor = useMemo(() => {
        const totais = {};
        const vendasDoMes = vendas.filter(v => v.mes === mes);
        usuarios.forEach(u => { totais[u.id] = { id: u.id, nome: u.nome, vendido: 0 }; });
        vendasDoMes.forEach((venda) => {
          if (totais[venda.usuario_id]) { totais[venda.usuario_id].vendido += parseFloat(venda.valor) || 0; }
        });
        return totais;
    }, [vendas, mes, usuarios]);

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

    return (
        <div className="animate-fade-in space-y-8">
            <h2 className="text-3xl font-bold">Ranking de {dayjs(mes).format('MMMM')}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-indigo-400">RANKING INDIVIDUAL</h3>
                    <div className="space-y-3">
                        {rankingIndividual.length > 0 ? rankingIndividual.map((vendedor, index) => (
                            <RankingCard key={vendedor.id} posicao={index} nome={vendedor.nome} valor={vendedor.vendido} isCurrentUser={vendedor.id === usuarioAtual.id} />
                        )) : <p className="text-gray-500">Ninguém vendeu ainda este mês.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-indigo-400">RANKING DE DUPLAS</h3>
                    <div className="space-y-3">
                        {totaisDuplas.length > 0 ? totaisDuplas.map((dupla, index) => (
                            <RankingCard key={dupla.nomes} posicao={index} nome={dupla.nomes} valor={dupla.total} isCurrentUser={dupla.membros.includes(usuarioAtual?.user_metadata?.nome)} />
                        )) : <p className="text-gray-500">Duplas não configuradas para este mês.</p>}
                    </div>
                </div>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-4 text-indigo-400">METAS DO ESCRITÓRIO</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon={<FaBullseye size={24} />} label="Meta Geral" value={configuracoes.meta_geral} color="bg-indigo-500/20" />
                    <StatCard icon={<FaDollarSign size={24} />} label="Vendido Geral" value={vendidoGeral} color="bg-green-500/20" />
                    <StatCard icon={<FaChartLine size={24} />} label="Falta para a Meta" value={faltaParaMeta} color="bg-red-500/20" />
                </div>
            </div>
        </div>
    );
};

// --- Componente da Aba Contempladas ---
const AbaContempladas = ({ contempladas }) => (
    <div className="animate-fade-in">
        <h2 className="text-3xl font-bold mb-6">Cartas Contempladas Disponíveis</h2>
        {contempladas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {contempladas.map((item) => <CartaCard key={item.id} item={item} />)}
            </div>
        ) : <EmptyState title="Nenhuma Carta Disponível" message="No momento não há cartas contempladas para exibir." />}
    </div>
);