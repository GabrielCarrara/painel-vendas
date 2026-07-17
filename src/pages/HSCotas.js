// src/pages/HSCotas.js
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { FaSpinner, FaExclamationTriangle, FaSearch, FaSyncAlt, FaEraser, FaFilter, FaTh } from 'react-icons/fa';

const EmptyState = ({ title, message }) => (
  <div className="col-span-full text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700/50">
    <FaExclamationTriangle className="mx-auto text-gray-500" size={28} />
    <p className="mt-3 text-sm font-semibold text-gray-300">{title}</p>
    <p className="text-gray-500 text-xs mt-1">{message}</p>
  </div>
);

const LEGENDA = [
  { cor: 'bg-gray-300', label: 'Disponível' },
  { cor: 'bg-green-500', label: '1 venda' },
  { cor: 'bg-blue-500', label: '2 vendas' },
  { cor: 'bg-yellow-500', label: '3 vendas' },
  { cor: 'bg-red-600', label: 'Indisponível' },
];

export default function HSCotas({ usuario, onAviso } = {}) {
  const onAvisoRef = useRef(onAviso);
  useEffect(() => {
    onAvisoRef.current = onAviso;
  }, [onAviso]);

  const aviso = useCallback((titulo, texto, variant = 'erro') => {
    const fn = onAvisoRef.current;
    if (typeof fn === 'function') fn({ titulo, texto, variant });
    else if (titulo) window.alert(`${titulo}\n\n${texto}`);
    else window.alert(texto);
  }, []);

  const [cotas, setCotas] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedCota, setHighlightedCota] = useState(null);
  const [filtroVendas, setFiltroVendas] = useState('todos');
  const [cotaParaZerar, setCotaParaZerar] = useState('');
  const [mostrarGerenciar, setMostrarGerenciar] = useState(false);
  const gridRef = useRef(null);

  const podeGerenciar = usuario?.cargo?.toLowerCase() === 'diretor';

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
      style += ' ring-2 ring-pink-500 ring-offset-1 ring-offset-gray-900';
    }
    return style;
  };

  useEffect(() => {
    const carregarDadosIniciais = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('hs_cotas').select('*');
      if (error) {
        console.error('Erro ao buscar cotas:', error);
      } else {
        const cotasMap = data.reduce((acc, cota) => {
          acc[cota.cota_numero] = cota;
          return acc;
        }, {});
        setCotas(cotasMap);
      }
      setLoading(false);
    };
    carregarDadosIniciais();

    const channel = supabase.channel(`hs_cotas_realtime_channel_${Math.random()}`);
    const subscription = channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hs_cotas' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const cotaDeletada = payload.old.cota_numero;
          setCotas((prevCotas) => {
            const novasCotas = { ...prevCotas };
            delete novasCotas[cotaDeletada];
            return novasCotas;
          });
        } else {
          const cotaAtualizada = payload.new;
          setCotas((prevCotas) => ({ ...prevCotas, [cotaAtualizada.cota_numero]: cotaAtualizada }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleCotaClick = useCallback(async (cotaNumero) => {
    if (!usuario) return aviso('Sessão', 'Você não está logado.');
    const contagemAtual = cotas[cotaNumero]?.vendas_count || 0;
    if (contagemAtual >= 4) return;
    const novaContagem = contagemAtual + 1;

    setCotas((prev) => ({
      ...prev,
      [cotaNumero]: { ...prev[cotaNumero], cota_numero: cotaNumero, vendas_count: novaContagem },
    }));

    const { error } = await supabase.from('hs_cotas').upsert(
      { cota_numero: cotaNumero, vendas_count: novaContagem, last_updated_by: usuario.id },
      { onConflict: 'cota_numero' }
    );
    if (error) {
      aviso('Erro ao salvar cota', `${cotaNumero}: ${error.message}`);
      setCotas((prev) => ({
        ...prev,
        [cotaNumero]: { ...prev[cotaNumero], vendas_count: contagemAtual },
      }));
    }
  }, [cotas, usuario, aviso]);

  const handleSearch = () => {
    if (!searchTerm) return;
    const cotaElement = gridRef.current?.querySelector(`#cota-${searchTerm}`);
    if (cotaElement) {
      cotaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedCota(parseInt(searchTerm, 10));
      setTimeout(() => setHighlightedCota(null), 2500);
    } else {
      aviso('Busca', `Cota número ${searchTerm} não encontrada (pode estar oculta pelo filtro atual).`, 'info');
    }
  };

  const handleZerarQuadro = async () => {
    const senha = prompt('Para zerar TODO o quadro, digite a senha de segurança:');
    if (senha !== 'G4br13l@') {
      if (senha !== null) aviso('Senha', 'Senha incorreta. Ação cancelada.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('hs_cotas').delete().neq('cota_numero', -1);
    if (error) aviso('Erro ao zerar o quadro', error.message);
    else {
      setCotas({});
      aviso('Quadro zerado', 'Quadro de cotas zerado com sucesso.', 'sucesso');
    }
    setLoading(false);
  };

  const handleZerarCotaEspecifica = async () => {
    if (!cotaParaZerar || isNaN(cotaParaZerar)) return aviso('Cota inválida', 'Digite um número de cota válido.', 'info');
    if (!window.confirm(`Tem certeza que deseja ZERAR a cota #${cotaParaZerar}?`)) return;
    setLoading(true);
    const { error } = await supabase.from('hs_cotas').delete().eq('cota_numero', cotaParaZerar);
    if (error) aviso('Erro ao zerar cota', `#${cotaParaZerar}: ${error.message}`);
    else {
      setCotas((prev) => {
        const novas = { ...prev };
        delete novas[cotaParaZerar];
        return novas;
      });
      aviso('Cota zerada', `Cota #${cotaParaZerar} zerada com sucesso.`, 'sucesso');
      setCotaParaZerar('');
    }
    setLoading(false);
  };

  const numerosParaExibir = useMemo(() => {
    const todosNumeros = Array.from({ length: 3000 }, (_, i) => i + 1);
    if (filtroVendas === 'todos') return todosNumeros;
    const contagemFiltro = parseInt(filtroVendas, 10);
    return todosNumeros.filter((numero) => (cotas[numero]?.vendas_count || 0) === contagemFiltro);
  }, [cotas, filtroVendas]);

  const resumo = useMemo(() => {
    let disponivel = 0;
    let uma = 0;
    let duas = 0;
    let tres = 0;
    let cheia = 0;
    for (let i = 1; i <= 3000; i++) {
      const c = cotas[i]?.vendas_count || 0;
      if (c === 0) disponivel++;
      else if (c === 1) uma++;
      else if (c === 2) duas++;
      else if (c === 3) tres++;
      else cheia++;
    }
    return { disponivel, uma, duas, tres, cheia };
  }, [cotas]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white">
        <FaSpinner className="animate-spin text-indigo-400" size={32} />
        <p className="mt-3 text-sm text-gray-400">Carregando quadro de cotas...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3 bg-gray-800/50 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-300">
            <FaFilter size={12} /> Filtros
          </h3>
          <select
            value={filtroVendas}
            onChange={(e) => setFiltroVendas(e.target.value)}
            className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
            aria-label="Filtrar cotas"
          >
            <option value="todos">Todas as cotas</option>
            <option value="0">Disponíveis (0)</option>
            <option value="1">Com 1 venda</option>
            <option value="2">Com 2 vendas</option>
            <option value="3">Com 3 vendas</option>
            <option value="4">Indisponíveis (4)</option>
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Buscar cota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 w-28"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="bg-indigo-600 hover:bg-indigo-700 p-1.5 rounded-md"
              title="Buscar"
            >
              <FaSearch size={12} />
            </button>
          </div>
        </div>

        {podeGerenciar && (
          <button
            type="button"
            onClick={() => setMostrarGerenciar((v) => !v)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
              mostrarGerenciar
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <FaTh size={12} /> Gerenciar
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {LEGENDA.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${item.cor}`} />
            <span className="text-[11px] text-gray-400">{item.label}</span>
          </div>
        ))}
        <span className="text-[11px] text-gray-500 ml-auto tabular-nums">
          Disp. {resumo.disponivel} · 1v {resumo.uma} · 2v {resumo.duas} · 3v {resumo.tres} · Cheia {resumo.cheia}
        </span>
      </div>

      {podeGerenciar && mostrarGerenciar && (
        <div className="bg-gray-800/50 rounded-xl p-3 border border-amber-500/20">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <div className="flex-1 min-w-0">
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                Zerar cota específica
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Nº da cota"
                  value={cotaParaZerar}
                  onChange={(e) => setCotaParaZerar(e.target.value)}
                  className="bg-gray-900/60 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 w-full"
                />
                <button
                  type="button"
                  onClick={handleZerarCotaEspecifica}
                  className="bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <FaEraser size={12} /> Zerar
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleZerarQuadro}
              className="bg-red-600 hover:bg-red-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 justify-center shrink-0"
            >
              <FaSyncAlt size={12} /> Zerar quadro completo
            </button>
          </div>
        </div>
      )}

      <div
        ref={gridRef}
        className="grid grid-cols-12 sm:grid-cols-20 md:grid-cols-25 lg:grid-cols-30 xl:grid-cols-40 2xl:grid-cols-50 gap-1"
      >
        {numerosParaExibir.length > 0 ? (
          numerosParaExibir.map((numero) => {
            const contagem = cotas[numero]?.vendas_count || 0;
            const estilo = getEstiloCota(contagem, highlightedCota === numero);
            const desabilitado = contagem >= 4;
            return (
              <button
                key={numero}
                id={`cota-${numero}`}
                type="button"
                disabled={desabilitado}
                onClick={() => handleCotaClick(numero)}
                title={`Cota ${numero} — ${contagem} venda${contagem === 1 ? '' : 's'}`}
                className={`h-7 w-full flex items-center justify-center text-[10px] font-bold rounded transition-all ${estilo}`}
              >
                {numero}
              </button>
            );
          })
        ) : (
          <EmptyState
            title="Nenhuma cota encontrada"
            message="Não há cotas que correspondam ao filtro selecionado."
          />
        )}
      </div>
    </div>
  );
}
