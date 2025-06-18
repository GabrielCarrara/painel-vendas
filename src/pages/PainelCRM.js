import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function PainelCRM({ usuarioId }) {
  const [leads, setLeads] = useState([]);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [origem, setOrigem] = useState('');
  const [tipo, setTipo] = useState('LEAD NOVO');
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroMes, setFiltroMes] = useState('');

  const tipos = ['LEAD NOVO', 'LEAD QUENTE', 'VENDIDO', 'ESQUECIDO', 'LEAD FRIO'];

  useEffect(() => {
    if (usuarioId) carregarLeads();
  }, [usuarioId, filtroTipo, filtroMes]);

  const carregarLeads = async () => {
    let query = supabase.from('leads').select('*').eq('usuario_id', usuarioId);

    if (filtroTipo) query = query.eq('tipo', filtroTipo);
    if (filtroMes) query = query.eq('mes', filtroMes);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error) setLeads(data);
  };

  const cadastrarLead = async (e) => {
    e.preventDefault();

    console.log('Usuário ID sendo usado:', usuarioId); // <-- Para depuração

    const novoLead = {
      usuario_id: usuarioId,
      nome,
      telefone,
      cpf: cpf || null,
      origem,
      tipo,
      mes,
    };

    const { error } = await supabase.from('leads').insert([novoLead]);
    if (error) {
      alert('Erro ao cadastrar lead: ' + error.message);
    } else {
      await carregarLeads();
      limparFormulario();
    }
  };

  const excluirLead = async (id) => {
    if (!window.confirm('Excluir este lead?')) return;
    await supabase.from('leads').delete().eq('id', id);
    setLeads(leads.filter((l) => l.id !== id));
  };

  const limparFormulario = () => {
    setNome('');
    setTelefone('');
    setCpf('');
    setOrigem('');
    setTipo('LEAD NOVO');
    setMes(new Date().toISOString().slice(0, 7));
  };

  const contadores = tipos.map(t => ({
    tipo: t,
    total: leads.filter(l => l.tipo === t).length
  }));

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Cadastro de Leads</h2>
      <form onSubmit={cadastrarLead} className="bg-gray-800 p-4 rounded shadow mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input value={nome} onChange={setNome} placeholder="Nome" required />
        <Input value={telefone} onChange={setTelefone} placeholder="Telefone" required />
        <Input value={cpf} onChange={setCpf} placeholder="CPF (opcional)" />
        <Input value={origem} onChange={setOrigem} placeholder="Origem" required />
        <Select value={tipo} onChange={setTipo}>
          {tipos.map(t => <option key={t}>{t}</option>)}
        </Select>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="bg-gray-700 p-2 rounded text-white"
          required
        />
        <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold col-span-full sm:col-auto">
          Cadastrar
        </button>
      </form>

      <h3 className="text-lg font-bold mb-2">Filtros</h3>
      <div className="flex gap-4 flex-wrap mb-6">
        <Select value={filtroTipo} onChange={setFiltroTipo}>
          <option value="">Todos os tipos</option>
          {tipos.map(t => <option key={t}>{t}</option>)}
        </Select>
        <input
          type="month"
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="bg-gray-700 p-2 rounded text-white"
        />
      </div>

      <h3 className="text-lg font-bold mb-2">Contadores por tipo</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {contadores.map(c => (
          <div key={c.tipo} className="bg-gray-800 p-3 rounded shadow">
            <p className="text-gray-300">{c.tipo}</p>
            <p className="text-xl font-bold text-green-400">{c.total}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold mb-2">Leads</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-800 rounded">
          <thead>
            <tr className="bg-gray-700 text-left">
              <th className="p-2">Nome</th>
              <th className="p-2">Telefone</th>
              <th className="p-2">CPF</th>
              <th className="p-2">Origem</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Mês</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id} className="border-t border-gray-700">
                <td className="p-2">{l.nome}</td>
                <td className="p-2">{l.telefone}</td>
                <td className="p-2">{l.cpf || '-'}</td>
                <td className="p-2">{l.origem}</td>
                <td className="p-2">{l.tipo}</td>
                <td className="p-2">{l.mes}</td>
                <td className="p-2">
                  <button onClick={() => excluirLead(l.id)} className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-4 text-gray-400">Nenhum lead encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Input = ({ value, onChange, placeholder, required = false }) => (
  <input
    className="p-2 rounded bg-gray-700 text-white"
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    required={required}
  />
);

const Select = ({ value, onChange, children }) => (
  <select
    className="p-2 rounded bg-gray-700 text-white"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    {children}
  </select>
);
