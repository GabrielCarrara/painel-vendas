// src/pages/PainelContempladas.js
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  FaCar, FaHome, FaBlender, FaPlus, FaTimes, FaEdit, FaTrash, FaSave,
  FaExclamationTriangle, FaSpinner, FaLandmark, FaFilter, FaCalculator,
  FaClipboard, FaWhatsapp, FaPlusCircle,
} from 'react-icons/fa';

const formatarParaReal = (valor) => {
  if (!valor && valor !== 0) return 'R$ 0,00';
  const numero = typeof valor === 'number'
    ? valor
    : parseFloat(String(valor).replace(/\D/g, '')) / 100;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const desformatarReal = (valorFormatado) => {
  if (!valorFormatado) return 0;
  const valorNumerico = String(valorFormatado)
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  return parseFloat(valorNumerico) || 0;
};

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
  <div className="flex justify-center items-center py-16">
    <FaSpinner className="animate-spin text-indigo-400" size={32} />
  </div>
);

const EmptyState = ({ message = 'Nenhuma carta encontrada para o filtro selecionado.' }) => (
  <div className="text-center py-12 bg-gray-800/50 rounded-xl col-span-full border border-gray-700/50">
    <FaExclamationTriangle className="mx-auto text-gray-500" size={32} />
    <p className="mt-3 text-sm font-semibold text-gray-300">Nenhum resultado</p>
    <p className="text-gray-500 text-xs mt-1">{message}</p>
  </div>
);

const getStatusStyle = (status) => {
  switch (status) {
    case 'DISPONÍVEL': return 'bg-green-500/20 text-green-400';
    case 'RESERVADO': return 'bg-yellow-500/20 text-yellow-400';
    case 'EM ANÁLISE': return 'bg-blue-500/20 text-blue-400';
    case 'VENDIDO': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

const getTypeIcon = (tipo) => {
  switch (tipo) {
    case 'AUTOMÓVEL': return <FaCar size={12} />;
    case 'IMÓVEL': return <FaHome size={12} />;
    case 'ELETRO': return <FaBlender size={12} />;
    default: return null;
  }
};

const CartaCard = ({ item, onEdit, onDelete, podeEditar, onSelect, isSelected }) => {
  const isSelectable = item.status === 'DISPONÍVEL';

  return (
    <div
      onClick={isSelectable ? () => onSelect(item.id) : undefined}
      className={`bg-gray-800/70 rounded-lg border flex flex-col transition-all ${
        isSelectable ? 'cursor-pointer hover:border-indigo-500/40' : ''
      } ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-700/80'}`}
    >
      <header className="px-3 py-2.5 border-b border-gray-700/50 flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1.5">
            {getTypeIcon(item.tipo)} {item.tipo}
          </p>
          <p className="text-lg font-bold text-white tabular-nums mt-0.5">
            {formatarParaReal(item.valor_credito)}
          </p>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${getStatusStyle(item.status)}`}>
          {item.status}
        </span>
      </header>

      <div className="px-3 py-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs flex-grow">
        <div>
          <p className="text-gray-500">Entrada</p>
          <p className="font-semibold text-gray-200 tabular-nums">{formatarParaReal(item.entrada)}</p>
        </div>
        <div>
          <p className="text-gray-500">Parcela</p>
          <p className="font-semibold text-gray-200 tabular-nums">
            {formatarParaReal(item.parcela)} × {item.meses}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Grupo/Cota</p>
          <p className="font-semibold text-gray-200">{item.grupo}/{item.cota}</p>
        </div>
        <div>
          <p className="text-gray-500">Taxa Transf.</p>
          <p className="font-semibold text-gray-200 tabular-nums">{formatarParaReal(item.taxa_transferencia)}</p>
        </div>
      </div>

      <footer className="px-3 py-2 border-t border-gray-700/50 flex justify-between items-center gap-2">
        <p className="text-[11px] text-gray-500 truncate">
          Resp.: <span className="text-gray-300">{item.responsavel || '—'}</span>
        </p>
        {podeEditar && (
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              className="p-1 text-blue-400 hover:text-blue-300"
              title="Editar"
            >
              <FaEdit size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="p-1 text-red-500 hover:text-red-400"
              title="Excluir"
            >
              <FaTrash size={13} />
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};

const campoClass = 'w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide';

const FormModal = ({ formulario, handleInput, salvar, onClose, editandoId }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in">
      <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <FaPlusCircle className="text-indigo-400" />
          {editandoId ? 'Editar carta' : 'Nova carta contemplada'}
        </h3>
        <button type="button" onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-full">
          <FaTimes size={16} />
        </button>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); salvar(); }}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
          <div className="sm:col-span-2">
            <label className={labelClass}>Tipo</label>
            <select name="tipo" value={formulario.tipo} onChange={handleInput} className={campoClass}>
              <option value="AUTOMÓVEL">Automóvel</option>
              <option value="IMÓVEL">Imóvel</option>
              <option value="ELETRO">Eletro</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Valor do crédito</label>
            <input type="text" name="valor_credito" value={formulario.valor_credito} onChange={handleInput} placeholder="0,00" className={`${campoClass} tabular-nums`} />
          </div>
          <div>
            <label className={labelClass}>Entrada</label>
            <input type="text" name="entrada" value={formulario.entrada} onChange={handleInput} placeholder="0,00" className={`${campoClass} tabular-nums`} />
          </div>
          <div>
            <label className={labelClass}>Parcela</label>
            <input type="text" name="parcela" value={formulario.parcela} onChange={handleInput} placeholder="0,00" className={`${campoClass} tabular-nums`} />
          </div>
          <div>
            <label className={labelClass}>Meses restantes</label>
            <input type="number" name="meses" value={formulario.meses} onChange={handleInput} placeholder="Ex: 60" className={campoClass} />
          </div>
          <div>
            <label className={labelClass}>Grupo</label>
            <input type="text" name="grupo" value={formulario.grupo} onChange={handleInput} placeholder="Ex: 0123" className={campoClass} />
          </div>
          <div>
            <label className={labelClass}>Cota</label>
            <input type="text" name="cota" value={formulario.cota} onChange={handleInput} placeholder="Ex: 456" className={campoClass} />
          </div>
          <div>
            <label className={labelClass}>Taxa de transferência</label>
            <input type="text" name="taxa_transferencia" value={formulario.taxa_transferencia} onChange={handleInput} placeholder="0,00" className={`${campoClass} tabular-nums`} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" value={formulario.status} onChange={handleInput} className={campoClass}>
              <option value="DISPONÍVEL">Disponível</option>
              <option value="RESERVADO">Reservado</option>
              <option value="EM ANÁLISE">Em análise</option>
              <option value="VENDIDO">Vendido</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Responsável</label>
            <input type="text" name="responsavel" value={formulario.responsavel} onChange={handleInput} placeholder="Nome do responsável" className={campoClass} />
          </div>
        </div>

        <footer className="px-4 py-3 flex justify-end gap-2 border-t border-gray-700">
          <button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-semibold">
            Cancelar
          </button>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
            <FaSave size={14} /> {editandoId ? 'Salvar' : 'Criar carta'}
          </button>
        </footer>
      </form>
    </div>
  </div>
);

const CalculoModal = ({ resultado, onClose }) => {
  if (!resultado) return null;

  const textoWhatsApp = `
*📄 RESUMO DA JUNÇÃO DE CARTAS 📄*

*Cartas Selecionadas:*
${resultado.cartas.map((c) => ` > Gr/Cota: *${c.grupo}/${c.cota}*`).join('\n')}

-----------------------------------

*💰 VALORES TOTAIS:*
*Crédito Total:* *${formatarParaReal(resultado.creditoTotal)}*
*Entrada Total:* *${formatarParaReal(resultado.entradaTotal)}*
*Taxa de Transf.:* *${formatarParaReal(resultado.taxaTotal)}*

-----------------------------------

*💸 PARCELAMENTO:*
${resultado.estruturaParcelas.map((p) => ` > *${p.duracao}x* de *${formatarParaReal(p.valor)}*`).join('\n')}

-----------------------------------

*📉 SALDO DEVEDOR TOTAL:*
*${formatarParaReal(resultado.saldoDevedor)}*
  `;

  const copiarParaClipboard = () => {
    navigator.clipboard.writeText(textoWhatsApp);
    alert('Resumo copiado!');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in">
        <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <FaCalculator className="text-green-400" /> Junção de cartas
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-full">
            <FaTimes size={16} />
          </button>
        </header>
        <div className="p-4 space-y-3 text-sm max-h-[60vh] overflow-y-auto">
          <div>
            <p className="text-xs text-gray-500 uppercase">Cartas</p>
            <p className="font-semibold">{resultado.cartas.map((c) => `${c.grupo}/${c.cota}`).join(' + ')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 uppercase">Crédito total</p>
              <p className="font-bold text-green-400 tabular-nums">{formatarParaReal(resultado.creditoTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Entrada total</p>
              <p className="font-semibold tabular-nums">{formatarParaReal(resultado.entradaTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Taxa transf.</p>
              <p className="font-semibold tabular-nums">{formatarParaReal(resultado.taxaTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Saldo devedor</p>
              <p className="font-semibold tabular-nums">{formatarParaReal(resultado.saldoDevedor)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">Parcelas</p>
            {resultado.estruturaParcelas.map((p, i) => (
              <p key={i} className="font-semibold tabular-nums">{p.duracao}× de {formatarParaReal(p.valor)}</p>
            ))}
          </div>
        </div>
        <footer className="px-4 py-3 flex justify-end gap-2 border-t border-gray-700">
          <button type="button" onClick={copiarParaClipboard} className="bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5">
            <FaClipboard size={12} /> Copiar
          </button>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(textoWhatsApp)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 hover:bg-green-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5"
          >
            <FaWhatsapp size={12} /> WhatsApp
          </a>
        </footer>
      </div>
    </div>
  );
};

const formularioVazio = (usuario) => ({
  valor_credito: '',
  tipo: 'AUTOMÓVEL',
  entrada: '',
  parcela: '',
  meses: '',
  taxa_transferencia: '',
  grupo: '',
  cota: '',
  responsavel: usuario?.nome || usuario?.email || '',
  status: 'DISPONÍVEL',
});

export default function PainelContempladasAprimorado({ usuario }) {
  const [contempladas, setContempladas] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [formulario, setFormulario] = useState(formularioVazio(usuario));
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selecionadas, setSelecionadas] = useState([]);
  const [mostrarModalCalculo, setMostrarModalCalculo] = useState(false);
  const [resultadoCalculo, setResultadoCalculo] = useState(null);

  const podeEditar = usuario?.cargo?.toLowerCase() === 'diretor';
  const statusOpcoes = ['TODOS', 'DISPONÍVEL', 'RESERVADO', 'EM ANÁLISE', 'VENDIDO'];

  useEffect(() => { buscarContempladas(); }, []);

  const buscarContempladas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contempladas')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setContempladas(data);
    setLoading(false);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    if (['valor_credito', 'entrada', 'parcela', 'taxa_transferencia'].includes(name)) {
      setFormulario((prev) => ({ ...prev, [name]: formatarParaReal(value) }));
    } else {
      setFormulario((prev) => ({ ...prev, [name]: value }));
    }
  };

  const abrirFormulario = (item = null) => {
    if (item) {
      setEditandoId(item.id);
      setFormulario({
        ...item,
        valor_credito: formatarParaReal(item.valor_credito),
        entrada: formatarParaReal(item.entrada),
        parcela: formatarParaReal(item.parcela),
        taxa_transferencia: formatarParaReal(item.taxa_transferencia),
      });
    } else {
      setEditandoId(null);
      setFormulario(formularioVazio(usuario));
    }
    setMostrarFormulario(true);
  };

  const salvar = async () => {
    const dados = {
      valor_credito: desformatarReal(formulario.valor_credito),
      tipo: formulario.tipo,
      entrada: desformatarReal(formulario.entrada),
      parcela: desformatarReal(formulario.parcela),
      meses: parseInt(formulario.meses, 10) || null,
      taxa_transferencia: desformatarReal(formulario.taxa_transferencia),
      grupo: formulario.grupo,
      cota: formulario.cota,
      responsavel: formulario.responsavel,
      status: formulario.status,
    };

    const { error } = editandoId
      ? await supabase.from('contempladas').update(dados).eq('id', editandoId)
      : await supabase.from('contempladas').insert([dados]);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      buscarContempladas();
      setMostrarFormulario(false);
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta carta?')) return;
    await supabase.from('contempladas').delete().eq('id', id);
    setSelecionadas((prev) => prev.filter((i) => i !== id));
    buscarContempladas();
  };

  const handleSelectCarta = (id) => {
    setSelecionadas((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleCalcular = () => {
    const cartasParaCalcular = contempladas.filter((c) => selecionadas.includes(c.id));
    if (cartasParaCalcular.length === 0) return;

    const creditoTotal = cartasParaCalcular.reduce((acc, c) => acc + c.valor_credito, 0);
    const entradaTotal = cartasParaCalcular.reduce((acc, c) => acc + c.entrada, 0);
    const taxaTotal = cartasParaCalcular.reduce((acc, c) => acc + c.taxa_transferencia, 0);

    const sortedCartas = [...cartasParaCalcular].sort((a, b) => a.meses - b.meses);
    const tiers = [...new Set(sortedCartas.map((c) => c.meses))].sort((a, b) => a - b);

    const estruturaParcelas = [];
    let saldoDevedor = 0;
    let mesesAnteriores = 0;

    tiers.forEach((tierMeses) => {
      const duracaoTier = tierMeses - mesesAnteriores;
      const valorParcelaTier = sortedCartas
        .filter((c) => c.meses >= tierMeses)
        .reduce((acc, c) => acc + c.parcela, 0);

      estruturaParcelas.push({ duracao: duracaoTier, valor: valorParcelaTier });
      saldoDevedor += duracaoTier * valorParcelaTier;
      mesesAnteriores = tierMeses;
    });

    setResultadoCalculo({
      creditoTotal,
      entradaTotal,
      taxaTotal,
      saldoDevedor,
      estruturaParcelas,
      cartas: cartasParaCalcular.map((c) => ({ grupo: c.grupo, cota: c.cota })),
    });
    setMostrarModalCalculo(true);
  };

  const contempladasFiltradas = useMemo(() => {
    if (filtroStatus === 'TODOS') return contempladas;
    return contempladas.filter((c) => c.status === filtroStatus);
  }, [contempladas, filtroStatus]);

  const totalDisponivel = useMemo(
    () => contempladas
      .filter((c) => c.status === 'DISPONÍVEL')
      .reduce((acc, c) => acc + (Number(c.valor_credito) || 0), 0),
    [contempladas]
  );

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3 bg-gray-800/50 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-300">
            <FaFilter size={12} /> Filtros
          </h3>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
            aria-label="Filtrar por status"
          >
            {statusOpcoes.map((s) => (
              <option key={s} value={s}>{s === 'TODOS' ? 'Todos os status' : s}</option>
            ))}
          </select>
          {selecionadas.length > 0 && (
            <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md">
              {selecionadas.length} selecionada{selecionadas.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selecionadas.length > 0 && (
            <button
              type="button"
              onClick={handleCalcular}
              className="bg-green-600 hover:bg-green-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5"
            >
              <FaCalculator size={12} /> Calcular ({selecionadas.length})
            </button>
          )}
          {podeEditar && (
            <button
              type="button"
              onClick={() => abrirFormulario()}
              className="bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5"
            >
              <FaPlus size={12} /> Nova Carta
            </button>
          )}
        </div>
      </div>

      <StatCard
        icon={<FaLandmark size={18} />}
        label="Total em créditos disponíveis"
        value={totalDisponivel}
        color="bg-green-500/20 text-green-400"
      />

      {mostrarFormulario && (
        <FormModal
          formulario={formulario}
          handleInput={handleInput}
          salvar={salvar}
          onClose={() => setMostrarFormulario(false)}
          editandoId={editandoId}
        />
      )}
      {mostrarModalCalculo && (
        <CalculoModal resultado={resultadoCalculo} onClose={() => setMostrarModalCalculo(false)} />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {contempladasFiltradas.length > 0 ? (
            contempladasFiltradas.map((item) => (
              <CartaCard
                key={item.id}
                item={item}
                onEdit={abrirFormulario}
                onDelete={excluir}
                podeEditar={podeEditar}
                onSelect={handleSelectCarta}
                isSelected={selecionadas.includes(item.id)}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      )}
    </div>
  );
}
