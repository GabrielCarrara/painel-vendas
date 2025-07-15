// src/pages/PainelContempladas.js (Versão Aprimorada com Cards e Modal)
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { FaCar, FaHome, FaBlender, FaPlus, FaTimes, FaEdit, FaTrash, FaSave, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';

// --- Componentes de UI Reutilizáveis ---

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full py-20">
        <FaSpinner className="animate-spin text-indigo-400" size={48} />
    </div>
);

const EmptyState = () => (
    <div className="text-center py-20 bg-gray-800/50 rounded-xl">
        <FaExclamationTriangle className="mx-auto text-gray-500" size={48} />
        <h3 className="mt-4 text-xl font-semibold text-white">Nenhuma Carta Encontrada</h3>
        <p className="text-gray-400 mt-1">Quando uma nova carta contemplada for adicionada, ela aparecerá aqui.</p>
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
        case 'AUTOMÓVEL': return <FaCar />;
        case 'IMÓVEL': return <FaHome />;
        case 'ELETRO': return <FaBlender />;
        default: return null;
    }
};

const CartaCard = ({ item, onEdit, onDelete, podeEditar }) => (
    <div className="bg-gray-800/70 rounded-xl shadow-lg flex flex-col transition-all duration-300 hover:shadow-indigo-500/20 hover:border-gray-600 border border-transparent">
        <header className={`p-4 rounded-t-xl flex justify-between items-center border-b border-gray-700 ${getStatusStyle(item.status)} bg-opacity-30`}>
            <div>
                <p className="text-xs font-bold uppercase flex items-center gap-2">{getTypeIcon(item.tipo)} {item.tipo}</p>
                <p className="text-2xl font-bold text-white">{item.valor_credito}</p>
            </div>
            <div className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(item.status)}`}>
                {item.status}
            </div>
        </header>
        <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-grow">
            <div><p className="text-gray-400">Entrada</p><p className="font-semibold">{item.entrada}</p></div>
            <div><p className="text-gray-400">Parcela</p><p className="font-semibold">{item.parcela} x {item.meses}</p></div>
            <div><p className="text-gray-400">Grupo/Cota</p><p className="font-semibold">{item.grupo}/{item.cota}</p></div>
            <div><p className="text-gray-400">Taxa Transf.</p><p className="font-semibold">{item.taxa_transferencia}</p></div>
        </div>
        <footer className="px-4 py-3 border-t border-gray-700/50 flex justify-between items-center text-xs">
            <p className="text-gray-400">Responsável: <span className="text-gray-300 font-medium">{item.responsavel}</span></p>
            {podeEditar && (
                <div className="flex gap-2">
                    <button onClick={() => onEdit(item)} className="p-2 text-blue-400 hover:text-blue-300"><FaEdit size={16} /></button>
                    <button onClick={() => onDelete(item.id)} className="p-2 text-red-500 hover:text-red-400"><FaTrash size={16} /></button>
                </div>
            )}
        </footer>
    </div>
);

const FormModal = ({ formulario, handleInput, salvar, onClose, editandoId }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700">
            <header className="p-4 flex justify-between items-center border-b border-gray-700">
                <h3 className="text-lg font-semibold">{editandoId ? 'Editar Carta' : 'Nova Carta Contemplada'}</h3>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-white"><FaTimes size={20} /></button>
            </header>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto">
                <input name="valor_credito" value={formulario.valor_credito} onChange={handleInput} placeholder="Valor do Crédito" className="p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
                <select name="tipo" value={formulario.tipo} onChange={handleInput} className="p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500">
                    {['AUTOMÓVEL', 'IMÓVEL', 'ELETRO'].map((t) => <option key={t}>{t}</option>)}
                </select>
                <input name="entrada" value={formulario.entrada} onChange={handleInput} placeholder="Valor de Entrada" className="p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
                <input name="parcela" value={formulario.parcela} onChange={handleInput} placeholder="Valor da Parcela" className="p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
                <input name="meses" value={formulario.meses} onChange={handleInput} placeholder="Qtd. de Meses" className="p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
                <input name="taxa_transferencia" value={formulario.taxa_transferencia} onChange={handleInput} placeholder="Taxa de Transferência" className="p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
                <input name="grupo" value={formulario.grupo} onChange={handleInput} placeholder="Grupo" className="p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
                <input name="cota" value={formulario.cota} onChange={handleInput} placeholder="Cota" className="p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
                <input name="responsavel" value={formulario.responsavel} onChange={handleInput} placeholder="Responsável" className="p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500" />
                <select name="status" value={formulario.status} onChange={handleInput} className="p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500">
                    {['DISPONÍVEL', 'RESERVADO', 'EM ANÁLISE', 'VENDIDO'].map((s) => <option key={s}>{s}</option>)}
                </select>
            </div>
            <footer className="p-4 flex justify-end border-t border-gray-700">
                <button onClick={salvar} className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                    <FaSave /> {editandoId ? 'Atualizar' : 'Salvar'}
                </button>
            </footer>
        </div>
    </div>
);

// --- Componente Principal ---

export default function PainelContempladasAprimorado({ usuario }) {
  const [contempladas, setContempladas] = useState([]);
  const [formulario, setFormulario] = useState({
    valor_credito: '', tipo: 'AUTOMÓVEL', entrada: '', parcela: '', meses: '', taxa_transferencia: '', grupo: '', cota: '', responsavel: '', status: 'DISPONÍVEL',
  });
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(true);

  const podeEditar = usuario?.user_metadata?.cargo === 'admin' || usuario?.user_metadata?.cargo === 'gerente';

  useEffect(() => {
    buscarContempladas();
  }, []);

  const buscarContempladas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contempladas')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setContempladas(data.map(item => ({ ...item, valor_credito: formatarParaReal(item.valor_credito), entrada: formatarParaReal(item.entrada), parcela: formatarParaReal(item.parcela), taxa_transferencia: formatarParaReal(item.taxa_transferencia) })));
    setLoading(false);
  };

  const formatarParaReal = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor.toString().replace(/\D/g, '')) / 100;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const desformatarReal = (valorFormatado) => {
    if (!valorFormatado) return 0;
    const valorNumerico = valorFormatado.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(valorNumerico) || 0;
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
    if (item) { // Editando
        setEditandoId(item.id);
        setFormulario({ ...item });
    } else { // Criando
        setEditandoId(null);
        setFormulario({ valor_credito: '', tipo: 'AUTOMÓVEL', entrada: '', parcela: '', meses: '', taxa_transferencia: '', grupo: '', cota: '', responsavel: usuario?.email || '', status: 'DISPONÍVEL' });
    }
    setMostrarFormulario(true);
  };

  const salvar = async () => {
    const dados = {
      valor_credito: desformatarReal(formulario.valor_credito), tipo: formulario.tipo, entrada: desformatarReal(formulario.entrada), parcela: desformatarReal(formulario.parcela), meses: parseInt(formulario.meses) || null, taxa_transferencia: desformatarReal(formulario.taxa_transferencia), grupo: formulario.grupo, cota: formulario.cota, responsavel: formulario.responsavel, status: formulario.status,
    };
    const { error } = editandoId ? await supabase.from('contempladas').update(dados).eq('id', editandoId) : await supabase.from('contempladas').insert([dados]);

    if (error) alert("Erro ao salvar: " + error.message);
    else {
      buscarContempladas();
      setMostrarFormulario(false);
    }
  };
  
  const excluir = async (id) => {
    if (window.confirm('Deseja realmente excluir esta carta?')) {
      await supabase.from('contempladas').delete().eq('id', id);
      buscarContempladas();
    }
  };

  return (
    <div className="text-white relative animate-fade-in">
      <h2 className="text-3xl font-bold mb-6">Cartas Contempladas</h2>

      {podeEditar && (
        <button onClick={() => abrirFormulario()} className="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-full shadow-lg z-40 flex items-center gap-2 transition-transform hover:scale-110">
          <FaPlus /> NOVA CARTA
        </button>
      )}

      {mostrarFormulario && (
          <FormModal 
              formulario={formulario} 
              handleInput={handleInput} 
              salvar={salvar} 
              onClose={() => setMostrarFormulario(false)}
              editandoId={editandoId}
          />
      )}
      
      {loading ? <LoadingSpinner /> : (
          contempladas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {contempladas.map((item) => (
                      <CartaCard key={item.id} item={item} onEdit={abrirFormulario} onDelete={excluir} podeEditar={podeEditar} />
                  ))}
              </div>
          ) : <EmptyState />
      )}
    </div>
  );
}