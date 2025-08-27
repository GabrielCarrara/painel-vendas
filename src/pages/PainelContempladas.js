// src/pages/PainelContempladas.js (Versão com Calculadora de Junção de Cartas)
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { FaCar, FaHome, FaBlender, FaPlus, FaTimes, FaEdit, FaTrash, FaSave, FaExclamationTriangle, FaSpinner, FaLandmark, FaFilter, FaCalculator, FaClipboard, FaWhatsapp } from 'react-icons/fa';

// --- Funções de Formatação (movidas para fora para serem reutilizáveis) ---
const formatarParaReal = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/\D/g, '')) / 100;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const desformatarReal = (valorFormatado) => {
    if (!valorFormatado) return 0;
    const valorNumerico = String(valorFormatado).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(valorNumerico) || 0;
};


// --- Componentes de UI Reutilizáveis ---
const StatCard = ({ icon, title, value, color }) => ( <div className="bg-gray-800 p-5 rounded-xl shadow-lg flex items-center space-x-4"><div className={`p-3 rounded-full ${color}`}>{icon}</div><div><p className="text-sm text-gray-400">{title}</p><p className={`text-2xl font-bold text-white`}>{(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div></div> );
const LoadingSpinner = () => ( <div className="flex justify-center items-center h-full py-20"><FaSpinner className="animate-spin text-indigo-400" size={48} /></div> );
const EmptyState = ({ message = "Nenhuma carta encontrada para o filtro selecionado." }) => ( <div className="text-center py-20 bg-gray-800/50 rounded-xl col-span-1 md:col-span-2 xl:col-span-3"><FaExclamationTriangle className="mx-auto text-gray-500" size={48} /><h3 className="mt-4 text-xl font-semibold text-white">Nenhum Resultado</h3><p className="text-gray-400 mt-1">{message}</p></div> );
const getStatusStyle = (status) => { switch (status) { case 'DISPONÍVEL': return 'bg-green-500/20 text-green-400'; case 'RESERVADO': return 'bg-yellow-500/20 text-yellow-400'; case 'EM ANÁLISE': return 'bg-blue-500/20 text-blue-400'; case 'VENDIDO': return 'bg-red-500/20 text-red-400'; default: return 'bg-gray-500/20 text-gray-400'; } };
const getTypeIcon = (tipo) => { switch (tipo) { case 'AUTOMÓVEL': return <FaCar />; case 'IMÓVEL': return <FaHome />; case 'ELETRO': return <FaBlender />; default: return null; } };

const CartaCard = ({ item, onEdit, onDelete, podeEditar, onSelect, isSelected }) => {
    const isSelectable = item.status === 'DISPONÍVEL';
    return (
    <div 
        onClick={isSelectable ? () => onSelect(item.id) : undefined}
        className={`bg-gray-800/70 rounded-xl shadow-lg flex flex-col transition-all duration-300 border ${isSelectable ? 'cursor-pointer hover:shadow-indigo-500/20' : ''} ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-transparent'}`}
    >
        <header className={`p-4 rounded-t-xl flex justify-between items-center border-b border-gray-700 ${getStatusStyle(item.status)} bg-opacity-30`}>
            <div><p className="text-xs font-bold uppercase flex items-center gap-2">{getTypeIcon(item.tipo)} {item.tipo}</p><p className="text-2xl font-bold text-white">{formatarParaReal(item.valor_credito)}</p></div>
            <div className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(item.status)}`}>{item.status}</div>
        </header>
        <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-grow">
            <div><p className="text-gray-400">Entrada</p><p className="font-semibold">{formatarParaReal(item.entrada)}</p></div>
            <div><p className="text-gray-400">Parcela</p><p className="font-semibold">{formatarParaReal(item.parcela)} x {item.meses}</p></div>
            <div><p className="text-gray-400">Grupo/Cota</p><p className="font-semibold">{item.grupo}/{item.cota}</p></div>
            <div><p className="text-gray-400">Taxa Transf.</p><p className="font-semibold">{formatarParaReal(item.taxa_transferencia)}</p></div>
        </div>
        <footer className="px-4 py-3 border-t border-gray-700/50 flex justify-between items-center text-xs">
            <p className="text-gray-400">Responsável: <span className="text-gray-300 font-medium">{item.responsavel}</span></p>
            {podeEditar && (
                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 text-blue-400 hover:text-blue-300"><FaEdit size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-2 text-red-500 hover:text-red-400"><FaTrash size={16} /></button>
                </div>
            )}
        </footer>
    </div>
)};

const FormModal = ({ formulario, handleInput, salvar, onClose, editandoId }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700">
            <header className="p-4 flex justify-between items-center border-b border-gray-700">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FaEdit /> {editandoId ? 'Editar Carta Contemplada' : 'Adicionar Nova Carta'}
                </h3>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full">
                    <FaTimes size={20} />
                </button>
            </header>
            <form onSubmit={(e) => { e.preventDefault(); salvar(); }}>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto">
                    
                    {/* Linha 1 */}
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-400 block mb-1">Tipo de Carta</label>
                        <select name="tipo" value={formulario.tipo} onChange={handleInput} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600">
                            <option value="AUTOMÓVEL">AUTOMÓVEL</option>
                            <option value="IMÓVEL">IMÓVEL</option>
                            <option value="ELETRO">ELETRO</option>
                        </select>
                    </div>

                    {/* Linha 2 */}
                    <div>
                        <label className="text-sm font-medium text-gray-400 block mb-1">Valor do Crédito</label>
                        <input type="text" name="valor_credito" value={formulario.valor_credito} onChange={handleInput} placeholder="R$ 0,00" className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-400 block mb-1">Valor de Entrada</label>
                        <input type="text" name="entrada" value={formulario.entrada} onChange={handleInput} placeholder="R$ 0,00" className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" />
                    </div>

                    {/* Linha 3 */}
                    <div>
                        <label className="text-sm font-medium text-gray-400 block mb-1">Valor da Parcela</label>
                        <input type="text" name="parcela" value={formulario.parcela} onChange={handleInput} placeholder="R$ 0,00" className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-400 block mb-1">Meses Restantes</label>
                        <input type="number" name="meses" value={formulario.meses} onChange={handleInput} placeholder="Ex: 60" className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" />
                    </div>
                    
                    {/* Linha 4 */}
                    <div>
                        <label className="text-sm font-medium text-gray-400 block mb-1">Grupo</label>
                        <input type="text" name="grupo" value={formulario.grupo} onChange={handleInput} placeholder="Ex: 0123" className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-400 block mb-1">Cota</label>
                        <input type="text" name="cota" value={formulario.cota} onChange={handleInput} placeholder="Ex: 456" className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" />
                    </div>

                    {/* Linha 5 */}
                     <div>
                        <label className="text-sm font-medium text-gray-400 block mb-1">Taxa de Transferência</label>
                        <input type="text" name="taxa_transferencia" value={formulario.taxa_transferencia} onChange={handleInput} placeholder="R$ 0,00" className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-400 block mb-1">Status</label>
                        <select name="status" value={formulario.status} onChange={handleInput} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600">
                            <option value="DISPONÍVEL">DISPONÍVEL</option>
                            <option value="RESERVADO">RESERVADO</option>
                            <option value="EM ANÁLISE">EM ANÁLISE</option>
                            <option value="VENDIDO">VENDIDO</option>
                        </select>
                    </div>

                    {/* Linha 6 */}
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-400 block mb-1">Responsável</label>
                        <input type="text" name="responsavel" value={formulario.responsavel} onChange={handleInput} placeholder="Nome do responsável" className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" />
                    </div>
                </div>
                <footer className="p-4 flex justify-end gap-3 border-t border-gray-700">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg font-semibold">
                        Cancelar
                    </button>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2">
                        <FaSave /> {editandoId ? 'Salvar Alterações' : 'Criar Carta'}
                    </button>
                </footer>
            </form>
        </div>
    </div>
);

// --- NOVO Componente do Modal de Cálculo ---
const CalculoModal = ({ resultado, onClose }) => {
    if (!resultado) return null;

    const textoWhatsApp = `
*📄 RESUMO DA JUNÇÃO DE CARTAS 📄*

*Cartas Selecionadas:*
${resultado.cartas.map(c => ` > Gr/Cota: *${c.grupo}/${c.cota}*`).join('\n')}

-----------------------------------

*💰 VALORES TOTAIS:*
*Crédito Total:* *${formatarParaReal(resultado.creditoTotal)}*
*Entrada Total:* *${formatarParaReal(resultado.entradaTotal)}*
*Taxa de Transf.:* *${formatarParaReal(resultado.taxaTotal)}*

-----------------------------------

*💸 PARCELAMENTO:*
${resultado.estruturaParcelas.map(p => ` > *${p.duracao}x* de *${formatarParaReal(p.valor)}*`).join('\n')}

-----------------------------------

*📉 SALDO DEVEDOR TOTAL:*
*${formatarParaReal(resultado.saldoDevedor)}*
    `;

    const copiarParaClipboard = () => {
        navigator.clipboard.writeText(textoWhatsApp);
        alert("Resumo copiado para a área de transferência!");
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700">
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><FaCalculator /> Resultado da Junção</h3>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white"><FaTimes size={20} /></button>
                </header>
                <div className="p-6 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
                    <div><p className="text-gray-400">Cartas Selecionadas:</p><p className="font-semibold">{resultado.cartas.map(c => `${c.grupo}/${c.cota}`).join(' + ')}</p></div>
                    <div><p className="text-gray-400">Crédito Total:</p><p className="font-semibold text-green-400 text-xl">{formatarParaReal(resultado.creditoTotal)}</p></div>
                    <div><p className="text-gray-400">Entrada Total:</p><p className="font-semibold">{formatarParaReal(resultado.entradaTotal)}</p></div>
                    <div><p className="text-gray-400">Taxa de Transferência Total:</p><p className="font-semibold">{formatarParaReal(resultado.taxaTotal)}</p></div>
                    <div>
                        <p className="text-gray-400">Estrutura das Parcelas:</p>
                        {resultado.estruturaParcelas.map((p, i) => (
                            <p key={i} className="font-semibold">{p.duracao}x de {formatarParaReal(p.valor)}</p>
                        ))}
                    </div>
                    <div className="pt-2 border-t border-gray-700"><p className="text-gray-400">Saldo Devedor Total:</p><p className="font-semibold text-xl">{formatarParaReal(resultado.saldoDevedor)}</p></div>
                </div>
                <footer className="p-4 flex justify-end gap-3 border-t border-gray-700">
                    <button onClick={copiarParaClipboard} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"><FaClipboard /> Copiar</button>
                    <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(textoWhatsApp)}`} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"><FaWhatsapp /> WhatsApp</a>
                </footer>
            </div>
        </div>
    );
};

// --- Componente Principal ---
export default function PainelContempladasAprimorado({ usuario }) {
  const [contempladas, setContempladas] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [formulario, setFormulario] = useState({ valor_credito: '', tipo: 'AUTOMÓVEL', entrada: '', parcela: '', meses: '', taxa_transferencia: '', grupo: '', cota: '', responsavel: '', status: 'DISPONÍVEL' });
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [selecionadas, setSelecionadas] = useState([]);
  const [mostrarModalCalculo, setMostrarModalCalculo] = useState(false);
  const [resultadoCalculo, setResultadoCalculo] = useState(null);

const podeEditar = usuario?.cargo?.toLowerCase() === 'diretor';
const statusOpcoes = ['TODOS', 'DISPONÍVEL', 'RESERVADO', 'EM ANÁLISE', 'VENDIDO'];

  useEffect(() => { buscarContempladas(); }, []);
  const buscarContempladas = async () => { setLoading(true); const { data, error } = await supabase.from('contempladas').select('*').order('created_at', { ascending: false }); if (!error) setContempladas(data); setLoading(false); };
  const handleInput = (e) => { const { name, value } = e.target; if (['valor_credito', 'entrada', 'parcela', 'taxa_transferencia'].includes(name)) { setFormulario((prev) => ({ ...prev, [name]: formatarParaReal(value) })); } else { setFormulario((prev) => ({ ...prev, [name]: value })); } };
  const abrirFormulario = (item = null) => { if (item) { setEditandoId(item.id); setFormulario({ ...item, valor_credito: formatarParaReal(item.valor_credito), entrada: formatarParaReal(item.entrada), parcela: formatarParaReal(item.parcela), taxa_transferencia: formatarParaReal(item.taxa_transferencia), }); } else { setEditandoId(null); setFormulario({ valor_credito: '', tipo: 'AUTOMÓVEL', entrada: '', parcela: '', meses: '', taxa_transferencia: '', grupo: '', cota: '', responsavel: usuario?.email || '', status: 'DISPONÍVEL' }); } setMostrarFormulario(true); };
  const salvar = async () => { const dados = { valor_credito: desformatarReal(formulario.valor_credito), tipo: formulario.tipo, entrada: desformatarReal(formulario.entrada), parcela: desformatarReal(formulario.parcela), meses: parseInt(formulario.meses) || null, taxa_transferencia: desformatarReal(formulario.taxa_transferencia), grupo: formulario.grupo, cota: formulario.cota, responsavel: formulario.responsavel, status: formulario.status, }; const { error } = editandoId ? await supabase.from('contempladas').update(dados).eq('id', editandoId) : await supabase.from('contempladas').insert([dados]); if (error) alert("Erro ao salvar: " + error.message); else { buscarContempladas(); setMostrarFormulario(false); } };
  const excluir = async (id) => { if (window.confirm('Deseja realmente excluir esta carta?')) { await supabase.from('contempladas').delete().eq('id', id); buscarContempladas(); } };
  
  const handleSelectCarta = (id) => {
    setSelecionadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const handleCalcular = () => {
    const cartasParaCalcular = contempladas.filter(c => selecionadas.includes(c.id));
    if (cartasParaCalcular.length === 0) return;

    // Cálculos simples
    const creditoTotal = cartasParaCalcular.reduce((acc, c) => acc + c.valor_credito, 0);
    const entradaTotal = cartasParaCalcular.reduce((acc, c) => acc + c.entrada, 0);
    const taxaTotal = cartasParaCalcular.reduce((acc, c) => acc + c.taxa_transferencia, 0);

    // Lógica generalizada para parcelas e saldo devedor
    const sortedCartas = [...cartasParaCalcular].sort((a, b) => a.meses - b.meses);
    const tiers = [...new Set(sortedCartas.map(c => c.meses))].sort((a, b) => a - b);
    
    let estruturaParcelas = [];
    let saldoDevedor = 0;
    let mesesAnteriores = 0;

    tiers.forEach(tierMeses => {
        const duracaoTier = tierMeses - mesesAnteriores;
        const valorParcelaTier = sortedCartas
            .filter(c => c.meses >= tierMeses)
            .reduce((acc, c) => acc + c.parcela, 0);
        
        estruturaParcelas.push({ duracao: duracaoTier, valor: valorParcelaTier });
        saldoDevedor += duracaoTier * valorParcelaTier;
        mesesAnteriores = tierMeses;
    });

    setResultadoCalculo({
        creditoTotal, entradaTotal, taxaTotal, saldoDevedor, estruturaParcelas,
        cartas: cartasParaCalcular.map(c => ({ grupo: c.grupo, cota: c.cota }))
    });
    setMostrarModalCalculo(true);
  };
  
  const contempladasFiltradas = useMemo(() => {
    if (filtroStatus === 'TODOS') return contempladas;
    return contempladas.filter(c => c.status === filtroStatus);
  }, [contempladas, filtroStatus]);
  const totalDisponivel = useMemo(() => contempladas.filter(c => c.status === 'DISPONÍVEL').reduce((acc, c) => acc + (Number(c.valor_credito) || 0), 0), [contempladas]);

  return (
    <div className="text-white relative animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold">Cartas Contempladas</h2>
        <div className="flex items-center gap-2 w-full md:w-auto"><label htmlFor="filtro-status" className="text-sm font-medium text-gray-300"><FaFilter /></label><select id="filtro-status" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="bg-gray-700 p-3 rounded-lg border border-gray-600 w-full">{statusOpcoes.map(s => <option key={s} value={s}>{s === 'TODOS' ? 'MOSTRAR TODOS' : s}</option>)}</select></div>
      </div>
      <div className="mb-6"><StatCard icon={<FaLandmark size={24} />} title="Total em Créditos Disponíveis" value={totalDisponivel} color="bg-green-500/20"/></div>

      {podeEditar && ( <button onClick={() => abrirFormulario()} className="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-full shadow-lg z-40 flex items-center gap-2 transition-transform hover:scale-110"><FaPlus /> NOVA CARTA</button> )}
      {selecionadas.length > 0 && (
          <button onClick={handleCalcular} className="fixed bottom-28 right-8 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-full shadow-lg z-40 flex items-center gap-2 transition-transform hover:scale-110">
            <FaCalculator /> CALCULAR ({selecionadas.length})
          </button>
      )}

      {mostrarFormulario && ( <FormModal formulario={formulario} handleInput={handleInput} salvar={salvar} onClose={() => setMostrarFormulario(false)} editandoId={editandoId} /> )}
      {mostrarModalCalculo && ( <CalculoModal resultado={resultadoCalculo} onClose={() => setMostrarModalCalculo(false)} /> )}
      
      {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {contempladasFiltradas.length > 0 ? (
                  contempladasFiltradas.map((item) => (
                      <CartaCard key={item.id} item={item} onEdit={abrirFormulario} onDelete={excluir} podeEditar={podeEditar} onSelect={handleSelectCarta} isSelected={selecionadas.includes(item.id)} />
                  ))
              ) : <EmptyState />}
          </div>
      )}
    </div>
  );
}