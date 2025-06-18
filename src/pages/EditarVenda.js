import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/formatCurrency';

export default function EditarVenda() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [venda, setVenda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    buscarVenda();
    buscarUsuarios();
  }, []);

  async function buscarVenda() {
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar venda:', error);
    } else {
      setVenda(data);
    }
    setLoading(false);
  }

  async function buscarUsuarios() {
    const { data } = await supabase.from('usuarios').select('id, nome');
    setUsuarios(data);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setVenda(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function salvarEdicao(e) {
    e.preventDefault();

    const { error } = await supabase
      .from('vendas')
      .update(venda)
      .eq('id', id);

    if (error) {
      alert('Erro ao salvar alterações.');
      console.error(error);
    } else {
      alert('Venda atualizada com sucesso!');
      navigate('/paineladm');
    }
  }

  if (loading || !venda) return <div className="p-6 text-white">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Editar Venda</h1>

      <form onSubmit={salvarEdicao} className="max-w-2xl space-y-4">
        <div>
          <label className="block mb-1">Vendedor</label>
          <select
            name="usuario_id"
            value={venda.usuario_id}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 text-white"
          >
            {usuarios.map(user => (
              <option key={user.id} value={user.id}>
                {user.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Cliente</label>
          <input
            name="cliente"
            value={venda.cliente}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800"
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block mb-1">Grupo</label>
            <input
              name="grupo"
              value={venda.grupo}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800"
            />
          </div>

          <div className="flex-1">
            <label className="block mb-1">Cota</label>
            <input
              name="cota"
              value={venda.cota}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1">Administradora</label>
          <input
            name="administradora"
            value={venda.administradora}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800"
          />
        </div>

        <div>
          <label className="block mb-1">Valor</label>
          <input
            name="valor"
            value={venda.valor}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Parcela</label>
          <select
            name="parcela"
            value={venda.parcela}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800"
          >
            <option value="cheia">Cheia</option>
            <option value="meia">Meia</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Mês</label>
          <input
            type="month"
            name="mes"
            value={venda.mes}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800"
            required
          />
        </div>

        <div className="pt-4 flex gap-4">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => navigate('/paineladm')}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
