import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import PainelCRM from './PainelCRM';

/* porcentagens de comissão */
const PERCENT_CHEIA = [0.006, 0.003, 0.003];
const PERCENT_MEIA = [0.003, 0.0015, 0.0015];

export default function PainelVendedor() {
  const [aba, setAba] = useState('vendas');

  const [cliente, setCliente] = useState('');
  const [grupo, setGrupo] = useState('');
  const [cota, setCota] = useState('');
  const [valor, setValor] = useState('');
  const [parcela, setParcela] = useState('cheia');
  const [administradora, setAdministradora] = useState('GAZIN');

  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuarioId, setUsuarioId] = useState('');
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [editandoId, setEditandoId] = useState(null);

  const [contempladas, setContempladas] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      setUsuarioId(user.id);
    })();
  }, [navigate]);

  useEffect(() => {
    if (usuarioId) {
      carregarVendas();
      carregarContempladas();
    }
  }, [usuarioId, mesFiltro]);

  const carregarVendas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('mes', mesFiltro)
      .order('created_at', { ascending: false });

    if (!error) setVendas(data);
    setLoading(false);
  };

  const carregarContempladas = async () => {
    const { data, error } = await supabase
      .from('contempladas')
      .select('*')
      .in('status', ['DISPONÍVEL', 'RESERVADO', 'EM ANÁLISE', 'VENDIDO']);

    if (!error) {
      const ordenadas = data.sort((a, b) => {
        const peso = { 'DISPONÍVEL': 0, 'RESERVADO': 1, 'EM ANÁLISE': 2, 'VENDIDO': 3 };
        return peso[a.status] - peso[b.status];
      });
      setContempladas(ordenadas);
    }
  };

  const moedaPt = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const formatInputMoeda = (txt) => {
    let n = txt.replace(/\D/g, '');
    n = (parseFloat(n) / 100).toFixed(2) + '';
    n = n.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return n;
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    const valorNumero = parseFloat(valor.replace(/\./g, '').replace(',', '.'));

    const nova = {
      usuario_id: usuarioId,
      cliente, grupo, cota, administradora,
      valor: valorNumero,
      parcela,
      confirmada: true,
      comissao_1: true,
      comissao_2: false,
      comissao_3: false,
      mes: new Date().toISOString().slice(0, 7),
    };

    const { data, error } = await supabase.from('vendas').insert([nova]).select();
    if (error) return alert('Erro ao cadastrar: ' + error.message);

    setVendas([data[0], ...vendas]);
    limparFormulario();
  };

  const iniciarEdicao = (venda) => {
    setEditandoId(venda.id);
    setCliente(venda.cliente);
    setGrupo(venda.grupo);
    setCota(venda.cota);
    setValor(formatInputMoeda(String(venda.valor.toFixed(2))));
    setParcela(venda.parcela);
    setAdministradora(venda.administradora);
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    const valorNumero = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    const atualizada = { cliente, grupo, cota, valor: valorNumero, parcela, administradora };

    const { error } = await supabase
      .from('vendas')
      .update(atualizada)
      .eq('id', editandoId);

    if (error) return alert('Erro ao salvar edição: ' + error.message);

    await carregarVendas();
    limparFormulario();
  };

  const excluirVenda = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta venda?')) return;
    await supabase.from('vendas').delete().eq('id', id);
    setVendas(vendas.filter(v => v.id !== id));
  };

  const limparFormulario = () => {
    setCliente(''); setGrupo(''); setCota(''); setValor('');
    setParcela('cheia'); setAdministradora('GAZIN'); setEditandoId(null);
  };

  const totalMes = vendas.reduce((s, v) => s + Number(v.valor), 0);
  const comissaoRecebida = vendas.reduce((s, v) => {
    const base = Number(v.valor);
    const pc = v.parcela === 'cheia' ? PERCENT_CHEIA : PERCENT_MEIA;
    if (v.comissao_1) s += base * pc[0];
    if (v.comissao_2) s += base * pc[1];
    if (v.comissao_3) s += base * pc[2];
    return s;
  }, 0);

  if (loading) return <div className="text-white p-4">Carregando…</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Painel do Vendedor</h1>

      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${aba === 'vendas' ? 'bg-green-600' : 'bg-gray-700'}`}
          onClick={() => setAba('vendas')}
        >
          Vendas
        </button>
        <button
          className={`px-4 py-2 rounded ${aba === 'crm' ? 'bg-green-600' : 'bg-gray-700'}`}
          onClick={() => setAba('crm')}
        >
          CRM
        </button>
        <button
          className={`px-4 py-2 rounded ${aba === 'contempladas' ? 'bg-green-600' : 'bg-gray-700'}`}
          onClick={() => setAba('contempladas')}
        >
          Contempladas
        </button>
      </div>

      {aba === 'vendas' ? (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <Resumo label="Total de Vendas do Mês" valor={totalMes} cor="text-green-400" />
            <Resumo label="Comissão Recebida" valor={comissaoRecebida} cor="text-yellow-400" />
          </div>

          <div className="mb-6">
            <label className="mr-2">Selecionar mês:</label>
            <input
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="bg-gray-700 p-2 rounded text-white"
            />
          </div>

          <form
            onSubmit={editandoId ? salvarEdicao : handleCadastro}
            className="bg-gray-800 p-4 rounded shadow mb-8 space-y-4"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <Input value={cliente} onChange={setCliente} placeholder="Nome do cliente" />
              <Input value={grupo} onChange={setGrupo} placeholder="Grupo" />
              <Input value={cota} onChange={setCota} placeholder="Cota" />
              <Input
                value={valor}
                onChange={(txt) => setValor(formatInputMoeda(txt))}
                placeholder="Valor da venda"
              />
              <Select value={parcela} onChange={setParcela}>
                <option value="cheia">Parcela Cheia</option>
                <option value="meia">Parcela Meia</option>
              </Select>
              <Select value={administradora} onChange={setAdministradora}>
                <option value="GAZIN">GAZIN</option>
                <option value="HS">HS</option>
              </Select>
            </div>

            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
            >
              {editandoId ? 'Salvar Alterações' : 'Cadastrar Venda'}
            </button>
          </form>

          {vendas.length === 0 ? (
            <p>Nenhuma venda cadastrada neste mês.</p>
          ) : (
            vendas.map((v) => (
              <CardVenda
                key={v.id}
                v={v}
                moeda={moedaPt}
                onEditar={() => iniciarEdicao(v)}
                onExcluir={() => excluirVenda(v.id)}
              />
            ))
          )}
        </>
      ) : aba === 'crm' ? (
        <PainelCRM usuarioId={usuarioId} />
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-4">Cartas Contempladas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-gray-800 rounded overflow-hidden">
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
                </tr>
              </thead>
              <tbody>
                {contempladas.map((item) => (
                  <tr key={item.id} className="text-center border-t border-gray-700">
                    <td>R$ {moedaPt(Number(item.valor_credito))}</td>
                    <td>{item.tipo}</td>
                    <td>R$ {moedaPt(Number(item.entrada))}</td>
                    <td>R$ {moedaPt(Number(item.parcela))}</td>
                    <td>{item.meses}</td>
                    <td>R$ {moedaPt(Number(item.taxa_transferencia))}</td>
                    <td>{item.grupo}</td>
                    <td>{item.cota}</td>
                    <td>{item.responsavel}</td>
                    <td>
                      <span className={`font-bold ${item.status === 'DISPONÍVEL' ? 'text-green-400' : item.status === 'VENDIDO' ? 'text-red-400' : 'text-yellow-300'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const Resumo = ({ label, valor, cor }) => (
  <div className="bg-gray-800 p-4 rounded shadow">
    <p className="text-gray-400">{label}</p>
    <p className={`text-xl font-bold ${cor}`}>R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
  </div>
);

const Input = ({ value, onChange, placeholder }) => (
  <input
    className="p-2 rounded bg-gray-700 text-white"
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    required
  />
);

const Select = ({ value, onChange, children }) => (
  <select
    className="p-2 rounded bg-gray-700 text-white"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    required
  >
    {children}
  </select>
);

const CardVenda = ({ v, moeda, onEditar, onExcluir }) => (
  <div className="bg-gray-800 p-4 rounded shadow mb-4">
    <p><strong>Cliente:</strong> {v.cliente}</p>
    <p><strong>Grupo / Cota:</strong> {v.grupo} / {v.cota}</p>
    <p><strong>Administradora:</strong> {v.administradora}</p>
    <p><strong>Valor:</strong> R$ {moeda(Number(v.valor))}</p>
    <p><strong>Parcela:</strong> {v.parcela}</p>
    <div className="mt-2 flex gap-3 flex-wrap">
      <Caixa checked={v.confirmada} label="Venda confirmada" />
      <Caixa checked={v.comissao_1} label="Comissão 1" />
      <Caixa checked={v.comissao_2} label="Comissão 2" />
      <Caixa checked={v.comissao_3} label="Comissão 3" />
    </div>
    <div className="mt-4 flex gap-3">
      <button
        onClick={onEditar}
        className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1 rounded"
      >
        Editar
      </button>
      <button
        onClick={onExcluir}
        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
      >
        Excluir
      </button>
    </div>
  </div>
);

const Caixa = ({ checked, label }) => (
  <label className="flex items-center gap-1 cursor-not-allowed select-none">
    <input type="checkbox" checked={checked} readOnly />
    {label}
  </label>
);
