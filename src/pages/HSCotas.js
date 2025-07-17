// src/pages/HSCotas.js (Versão com correção definitiva do Realtime Subscription)
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { FaSpinner, FaCar, FaHome, FaBlender, FaExclamationTriangle, FaSearch, FaSyncAlt, FaEraser } from 'react-icons/fa';

// --- Componente de UI Adicionado ---
const EmptyState = ({ title, message }) => (
    <div className="col-span-full text-center py-20 bg-gray-800/50 rounded-xl">
        <FaExclamationTriangle className="mx-auto text-gray-500" size={48} />
        <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
        <p className="text-gray-400 mt-1">{message}</p>
    </div>
);


// --- Componente do Painel de Cotas HS ---
export default function HSCotas({ usuario }) {
  const [cotas, setCotas] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedCota, setHighlightedCota] = useState(null);
  const [filtroVendas, setFiltroVendas] = useState('todos');
  const [cotaParaZerar, setCotaParaZerar] = useState('');

  const gridRef = useRef(null);

  const podeGerenciar = usuario?.user_metadata?.cargo === 'admin' || usuario?.user_metadata?.cargo === 'gerente';

  const getEstiloCota = (count, isHighlighted) => {
    let style = '';
    switch (count) {
      case 1: style = 'bg-green-500 text-white'; break;
      case 2: style = 'bg-blue-500 text-white'; break;
      case 3: style = 'bg-yellow-500 text-white'; break;
      case 4: style = 'bg-red-600 text-white cursor-not-allowed'; break;
      default: style = 'bg-gray-200 hover:bg-gray-400 text-gray-800';
    }
    if (isHighlighted) {
      style += ' ring-4 ring-pink-500 ring-offset-2 ring-offset-gray-900';
    }
    return style;
  };
  
  // CORREÇÃO APLICADA AQUI
  useEffect(() => {
    // 1. Define uma função assíncrona para buscar os dados iniciais
    const carregarDadosIniciais = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('hs_cotas').select('*');
      if (error) {
        console.error("Erro ao buscar cotas:", error);
      } else {
        const cotasMap = data.reduce((acc, cota) => { acc[cota.cota_numero] = cota; return acc; }, {});
        setCotas(cotasMap);
      }
      setLoading(false);
    };
    carregarDadosIniciais();

    // 2. Cria o canal de comunicação em tempo real
    const channel = supabase.channel(`hs_cotas_realtime_channel_${Math.random()}`);

    const subscription = channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hs_cotas' }, 
        (payload) => {
          console.log('Mudança em tempo real recebida!', payload);
          if (payload.eventType === 'DELETE') {
            const cotaDeletada = payload.old.cota_numero;
            setCotas(prevCotas => {
              const novasCotas = { ...prevCotas };
              delete novasCotas[cotaDeletada];
              return novasCotas;
            });
          } else {
            const cotaAtualizada = payload.new;
            setCotas(prevCotas => ({ ...prevCotas, [cotaAtualizada.cota_numero]: cotaAtualizada }));
          }
        }
      )
      .subscribe();

    // 3. Retorna a função de limpeza.
    // Esta é a parte mais importante para evitar o erro.
    return () => {
      // Primeiro, remove a inscrição do canal específico.
      supabase.removeChannel(subscription);
    };
  }, []); // O array vazio garante que isso rode apenas uma vez.

  const handleCotaClick = useCallback(async (cotaNumero) => {
    if (!usuario) return alert("Você não está logado.");
    const contagemAtual = cotas[cotaNumero]?.vendas_count || 0;
    if (contagemAtual >= 4) return;
    const novaContagem = contagemAtual + 1;

    setCotas(prev => ({ ...prev, [cotaNumero]: { ...prev[cotaNumero], cota_numero: cotaNumero, vendas_count: novaContagem } }));

    const { error } = await supabase.from('hs_cotas').upsert({ cota_numero: cotaNumero, vendas_count: novaContagem, last_updated_by: usuario.id }, { onConflict: 'cota_numero' });
    if (error) {
      alert(`Erro ao salvar a cota ${cotaNumero}: ${error.message}`);
      setCotas(prev => ({ ...prev, [cotaNumero]: { ...prev[cotaNumero], vendas_count: contagemAtual } }));
    }
  }, [cotas, usuario]);

  const handleSearch = () => {
    if (!searchTerm) return;
    const cotaElement = gridRef.current.querySelector(`#cota-${searchTerm}`);
    if (cotaElement) {
        cotaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedCota(parseInt(searchTerm));
        setTimeout(() => setHighlightedCota(null), 2500);
    } else {
        alert(`Cota número ${searchTerm} não encontrada (pode estar oculta pelo filtro atual).`);
    }
  };

  const handleZerarQuadro = async () => {
    const senha = prompt("Para zerar TODO o quadro, digite a senha de segurança:");
    if (senha !== 'G4br13l@') {
        if (senha !== null) alert("Senha incorreta. Ação cancelada.");
        return;
    }
    setLoading(true);
    const { error } = await supabase.from('hs_cotas').delete().neq('cota_numero', -1);
    if(error) alert("Erro ao zerar o quadro: " + error.message);
    else { setCotas({}); alert("Quadro de cotas zerado com sucesso!"); }
    setLoading(false);
  };

  const handleZerarCotaEspecifica = async () => {
    if (!cotaParaZerar || isNaN(cotaParaZerar)) return alert("Por favor, digite um número de cota válido.");
    if(!window.confirm(`Tem certeza que deseja ZERAR a cota #${cotaParaZerar}?`)) return;
    setLoading(true);
    const { error } = await supabase.from('hs_cotas').delete().eq('cota_numero', cotaParaZerar);
    if (error) alert(`Erro ao zerar a cota #${cotaParaZerar}: ${error.message}`);
    else { setCotas(prev => { const novas = {...prev}; delete novas[cotaParaZerar]; return novas; }); alert(`Cota #${cotaParaZerar} zerada com sucesso!`); setCotaParaZerar(''); }
    setLoading(false);
  };

  const numerosParaExibir = useMemo(() => {
    const todosNumeros = Array.from({ length: 3000 }, (_, i) => i + 1);
    if (filtroVendas === 'todos') return todosNumeros;
    const contagemFiltro = parseInt(filtroVendas, 10);
    return todosNumeros.filter(numero => (cotas[numero]?.vendas_count || 0) === contagemFiltro);
  }, [cotas, filtroVendas]);

  if (loading) {
    return ( <div className="text-white min-h-[80vh] flex flex-col items-center justify-center"><FaSpinner className="animate-spin text-indigo-400" size={48} /><p className="mt-4 text-lg">Carregando quadro de cotas...</p></div> );
  }

  return (
    <div className="p-4 md:p-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <h1 className="text-3xl font-bold text-white whitespace-nowrap">Quadro de Cotas HS</h1>
            <div className="flex items-center gap-2 w-full md:w-auto">
                <input type="number" placeholder="Buscar cota..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="bg-gray-700 p-2 rounded-lg border border-gray-600 w-full" />
                <button onClick={handleSearch} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg"><FaSearch /></button>
            </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-200"></div><span className="text-xs text-gray-300">Disponível</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500"></div><span className="text-xs text-gray-300">1 Venda</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500"></div><span className="text-xs text-gray-300">2 Vendas</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-500"></div><span className="text-xs text-gray-300">3 Vendas</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-600"></div><span className="text-xs text-gray-300">Indisponível</span></div>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
                <label htmlFor="filtro-vendas" className="text-sm text-gray-300 whitespace-nowrap">Filtrar por:</label>
                <select id="filtro-vendas" value={filtroVendas} onChange={(e) => setFiltroVendas(e.target.value)} className="bg-gray-700 p-2 rounded-lg border border-gray-600 w-full">
                    <option value="todos">Mostrar Todas</option>
                    <option value="0">Disponíveis (0 vendas)</option>
                    <option value="1">Com 1 venda</option>
                    <option value="2">Com 2 vendas</option>
                    <option value="3">Com 3 vendas</option>
                    <option value="4">Indisponíveis (4 vendas)</option>
                </select>
            </div>
        </div>

        {podeGerenciar && (
            <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-amber-400 mb-3">Área do Gerente</h3>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-grow">
                        <label className="text-sm font-medium text-gray-300 mb-1 block">Zerar Cota Específica</label>
                        <div className="flex items-center gap-2">
                           <input type="number" placeholder="Nº da cota" value={cotaParaZerar} onChange={(e) => setCotaParaZerar(e.target.value)} className="bg-gray-700 p-2 rounded-lg border border-gray-600 w-full"/>
                           <button onClick={handleZerarCotaEspecifica} className="bg-amber-600 hover:bg-amber-700 text-white font-bold p-2 rounded-lg"><FaEraser /></button>
                        </div>
                    </div>
                    <button onClick={handleZerarQuadro} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <FaSyncAlt /> Zerar Quadro Completo
                    </button>
                </div>
            </div>
        )}

        <div ref={gridRef} className="grid grid-cols-12 sm:grid-cols-20 md:grid-cols-25 lg:grid-cols-30 xl:grid-cols-40 2xl:grid-cols-50 gap-1">
            {numerosParaExibir.length > 0 ? (
                numerosParaExibir.map((numero) => {
                    const contagem = cotas[numero]?.vendas_count || 0;
                    const estilo = getEstiloCota(contagem, highlightedCota === numero);
                    const desabilitado = contagem >= 4;
                    return ( <button key={numero} id={`cota-${numero}`} disabled={desabilitado} onClick={() => handleCotaClick(numero)} className={`h-8 w-full flex items-center justify-center text-[10px] font-bold rounded transition-all duration-300 ${estilo}`}>{numero}</button> );
                })
            ) : ( <EmptyState title="Nenhuma cota encontrada" message="Não há cotas que correspondam ao filtro selecionado." /> )}
        </div>
    </div>
  );
}