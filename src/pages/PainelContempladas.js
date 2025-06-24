import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function PainelContempladas({ usuario }) {
  const [contempladas, setContempladas] = useState([]);
  const [formulario, setFormulario] = useState({
    valor_credito: '',
    tipo: 'AUTOMÓVEL',
    entrada: '',
    parcela: '',
    meses: '',
    taxa_transferencia: '',
    grupo: '',
    cota: '',
    responsavel: '',
    status: 'DISPONÍVEL',
  });
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const tipos = ['AUTOMÓVEL', 'IMÓVEL', 'ELETRO'];
  const statusOpcoes = ['DISPONÍVEL', 'RESERVADO', 'EM ANÁLISE', 'VENDIDO'];

  const podeEditar = usuario?.user_metadata?.cargo === 'admin' || usuario?.user_metadata?.cargo === 'gerente';

  useEffect(() => {
    buscarContempladas();
  }, []);

  const buscarContempladas = async () => {
    const { data, error } = await supabase
      .from('contempladas')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setContempladas(data);
  };

  const formatarParaReal = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    const numero = typeof valor === 'number' ? valor : parseFloat(valor.toString().replace(/\D/g, '')) / 100;
    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const desformatarReal = (valorFormatado) => {
  if (!valorFormatado) return 0;
  const valorNumerico = valorFormatado
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(valorNumerico) || 0;
};


  const handleInput = (e) => {
    const { name, value } = e.target;

    if (['valor_credito', 'entrada', 'parcela', 'taxa_transferencia'].includes(name)) {
      const apenasNumeros = value.replace(/\D/g, '');
      const formatado = formatarParaReal(apenasNumeros);
      setFormulario((prev) => ({ ...prev, [name]: formatado }));
    } else {
      setFormulario((prev) => ({ ...prev, [name]: value }));
    }
  };

  const limparFormulario = () => {
    setFormulario({
      valor_credito: '',
      tipo: 'AUTOMÓVEL',
      entrada: '',
      parcela: '',
      meses: '',
      taxa_transferencia: '',
      grupo: '',
      cota: '',
      responsavel: '',
      status: 'DISPONÍVEL',
    });
    setEditandoId(null);
    setMostrarFormulario(true);
  };

  const salvar = async () => {
    const dados = {
      valor_credito: desformatarReal(formulario.valor_credito),
      tipo: formulario.tipo,
      entrada: desformatarReal(formulario.entrada),
      parcela: desformatarReal(formulario.parcela),
      meses: parseInt(formulario.meses),
      taxa_transferencia: desformatarReal(formulario.taxa_transferencia),
      grupo: formulario.grupo,
      cota: formulario.cota,
      responsavel: formulario.responsavel || usuario?.email || '---',
      status: formulario.status,
    };

    let resultado;
    if (editandoId) {
      resultado = await supabase.from('contempladas').update(dados).eq('id', editandoId);
    } else {
      resultado = await supabase.from('contempladas').insert([dados]);
    }

    if (resultado.error) {
      console.error("Erro ao salvar:", resultado.error);
      alert("Erro ao salvar: " + resultado.error.message);
    } else {
      limparFormulario();
      buscarContempladas();
      setMostrarFormulario(false);
    }
  };

  const editar = (item) => {
    setFormulario({
      ...item,
      valor_credito: formatarParaReal(item.valor_credito),
      entrada: formatarParaReal(item.entrada),
      parcela: formatarParaReal(item.parcela),
      taxa_transferencia: formatarParaReal(item.taxa_transferencia),
      meses: item.meses,
      grupo: item.grupo,
      cota: item.cota,
      responsavel: item.responsavel,
      tipo: item.tipo,
      status: item.status,
    });
    setEditandoId(item.id);
    setMostrarFormulario(true);
  };

  const excluir = async (id) => {
    if (window.confirm('Deseja excluir?')) {
      await supabase.from('contempladas').delete().eq('id', id);
      buscarContempladas();
    }
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen relative">
      <h2 className="text-2xl font-bold mb-4">Produtos Contemplados</h2>

      {podeEditar && (
        <button
          onClick={limparFormulario}
          className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg z-50"
        >
          NOVA CARTA
        </button>
      )}

      {podeEditar && mostrarFormulario && (
        <div className="bg-gray-800 p-4 rounded mb-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">{editandoId ? 'Editar Carta' : 'Nova Carta Contemplada'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input name="valor_credito" value={formulario.valor_credito} onChange={handleInput} placeholder="Valor do Crédito" className="p-2 bg-gray-700 rounded" />
            <select name="tipo" value={formulario.tipo} onChange={handleInput} className="p-2 bg-gray-700 rounded">
              {tipos.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input name="entrada" value={formulario.entrada} onChange={handleInput} placeholder="Valor de Entrada" className="p-2 bg-gray-700 rounded" />
            <input name="parcela" value={formulario.parcela} onChange={handleInput} placeholder="Valor da Parcela" className="p-2 bg-gray-700 rounded" />
            <input name="meses" value={formulario.meses} onChange={handleInput} placeholder="Qtd. de Meses" className="p-2 bg-gray-700 rounded" />
            <input name="taxa_transferencia" value={formulario.taxa_transferencia} onChange={handleInput} placeholder="Taxa de Transferência" className="p-2 bg-gray-700 rounded" />
            <input name="grupo" value={formulario.grupo} onChange={handleInput} placeholder="Grupo" className="p-2 bg-gray-700 rounded" />
            <input name="cota" value={formulario.cota} onChange={handleInput} placeholder="Cota" className="p-2 bg-gray-700 rounded" />
            <input name="responsavel" value={formulario.responsavel} onChange={handleInput} placeholder="Responsável" className="p-2 bg-gray-700 rounded" />
            <select name="status" value={formulario.status} onChange={handleInput} className="p-2 bg-gray-700 rounded">
              {statusOpcoes.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={salvar} className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
            {editandoId ? 'Atualizar' : 'Cadastrar'}
          </button>
        </div>
      )}

      <table className="w-full bg-gray-800 rounded overflow-hidden text-sm">
        <thead className="bg-gray-700">
          <tr>
            <th className="p-2">Crédito</th>
            <th>Tipo</th>
            <th>Entrada</th>
            <th>Parcela</th>
            <th>Meses</th>
            <th>Taxa</th>
            <th>Grupo</th>
            <th>Cota</th>
            <th>Responsável</th>
            <th>Status</th>
            {podeEditar && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {contempladas.map((item) => (
            <tr key={item.id} className="text-center border-t border-gray-700">
              <td>{formatarParaReal(item.valor_credito)}</td>
              <td>{item.tipo}</td>
              <td>{formatarParaReal(item.entrada)}</td>
              <td>{formatarParaReal(item.parcela)}</td>
              <td>{item.meses}</td>
              <td>{formatarParaReal(item.taxa_transferencia)}</td>
              <td>{item.grupo}</td>
              <td>{item.cota}</td>
              <td>{item.responsavel}</td>
              <td>{item.status}</td>
              {podeEditar && (
                <td>
                  <button onClick={() => editar(item)} className="text-blue-400 mr-2">Editar</button>
                  <button onClick={() => excluir(item.id)} className="text-red-400">Excluir</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
