import React, { useState, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { FaSave, FaSpinner, FaExclamationTriangle, FaEdit, FaTimes, FaTrash, FaUserPlus, FaUsers } from 'react-icons/fa';

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function mensagemErroInvoke(data, invokeError) {
  if (data && typeof data === 'object' && data.error) return String(data.error);
  if (data && typeof data === 'object' && data.warning) return String(data.warning);
  return invokeError?.message || 'Ocorreu um erro.';
}

const campoClass =
  'w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 autofill:bg-gray-900 autofill:shadow-[inset_0_0_0_1000px_rgb(17,24,39)] autofill:[-webkit-text-fill-color:white]';
const labelClass = 'block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide';

const TITULO_CARGO = {
  diretor: 'Diretores',
  gerente: 'Gerentes',
  vendedor: 'Vendedores',
};

const ModalEditarUsuario = ({ usuario, filiais, onClose, onSave }) => {
  const estadoAtivoInicial = usuario.ativo === false ? false : true;

  const [formData, setFormData] = useState({
    nome: usuario.nome || '',
    email: usuario.email || '',
    telefone: usuario.telefone || '',
    senha_intranet_gazin: usuario.senha_intranet_gazin || '',
    cargo: usuario.cargo || 'vendedor',
    id_filial: usuario.id_filial || '',
    ativo: estadoAtivoInicial,
  });
  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExcluir, setLoadingExcluir] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'ativo') {
      setFormData((prev) => ({ ...prev, ativo: value === 'true' }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSalvar = async () => {
    setLoading(true);
    setError('');

    const payload = {};
    const emailForm = normalizeEmail(formData.email);
    const emailDb = normalizeEmail(usuario.email);
    if (formData.nome !== usuario.nome) payload.nome = formData.nome;
    if (emailForm !== emailDb) payload.email = emailForm;
    if (formData.telefone !== usuario.telefone) payload.telefone = formData.telefone;
    if ((formData.senha_intranet_gazin || '') !== (usuario.senha_intranet_gazin || '')) {
      payload.senha_intranet_gazin = formData.senha_intranet_gazin;
    }
    if (formData.cargo !== usuario.cargo) payload.cargo = formData.cargo;
    if (String(formData.id_filial ?? '') !== String(usuario.id_filial ?? '')) {
      payload.id_filial = formData.id_filial;
    }
    if (novaSenha) payload.password = novaSenha;
    if (formData.ativo !== estadoAtivoInicial) payload.ativo = formData.ativo;

    if (Object.keys(payload).length === 0) {
      setError('Nenhuma alteração foi feita.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('atualizar-usuario-admin', {
        body: { userIdToUpdate: usuario.id, payload },
      });

      if (invokeError) throw new Error(mensagemErroInvoke(data, invokeError));
      if (data?.error) throw new Error(String(data.error));

      if (data?.warning) {
        window.alert(`Alterações salvas.\n\nAviso: ${data.warning}`);
      }
      setLoading(false);
      onSave();
    } catch (err) {
      setError(err.message || 'Ocorreu um erro.');
      setLoading(false);
    }
  };

  const handleExcluir = async () => {
    const confirmado = window.confirm(
      `Excluir definitivamente "${usuario.nome}"?\n\nEssa ação removerá o acesso, o perfil e eventuais perfis duplicados. Não poderá ser desfeita.`
    );
    if (!confirmado) return;

    setLoadingExcluir(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('atualizar-usuario-admin', {
        body: { action: 'delete', userIdToUpdate: usuario.id },
      });

      if (invokeError) throw new Error(mensagemErroInvoke(data, invokeError));
      if (data?.error) throw new Error(String(data.error));
      onSave();
    } catch (err) {
      setError(err.message || 'Não foi possível excluir o usuário.');
      setLoadingExcluir(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in flex flex-col max-h-[85vh]">
        <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-base font-semibold text-white truncate pr-2">Editar: {usuario.nome}</h3>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-full shrink-0">
            <FaTimes size={16} />
          </button>
        </header>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
          {error && (
            <div className="sm:col-span-2 bg-red-500/15 text-red-300 px-3 py-2 rounded-md text-sm flex items-center gap-2">
              <FaExclamationTriangle size={12} /> {error}
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={labelClass}>Nome completo</label>
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} className={campoClass} />
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className={campoClass} autoComplete="off" />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} className={campoClass} />
          </div>
          <div>
            <label className={labelClass}>Senha Intranet Gazin</label>
            <input
              type="text"
              name="senha_intranet_gazin"
              value={formData.senha_intranet_gazin}
              onChange={handleChange}
              placeholder="Controle interno"
              className={campoClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label className={labelClass}>Nova senha do painel</label>
            <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Deixe em branco" className={campoClass} autoComplete="new-password" />
          </div>
          <div>
            <label className={labelClass}>Cargo</label>
            <select name="cargo" value={formData.cargo} onChange={handleChange} className={campoClass}>
              <option value="vendedor">Vendedor</option>
              <option value="gerente">Gerente</option>
              <option value="diretor">Diretor</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Filial</label>
            <select name="id_filial" value={formData.id_filial} onChange={handleChange} className={campoClass}>
              {filiais.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select name="ativo" value={formData.ativo.toString()} onChange={handleChange} className={campoClass}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        </div>

        <footer className="px-4 py-3 flex items-center gap-2 border-t border-gray-700">
          <button
            type="button"
            onClick={handleExcluir}
            disabled={loading || loadingExcluir}
            className="mr-auto bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 px-3 py-2 rounded-md text-sm font-semibold text-red-300 flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingExcluir ? <FaSpinner className="animate-spin" size={13} /> : <FaTrash size={13} />}
            Excluir definitivamente
          </button>
          <button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-semibold text-white">
            Cancelar
          </button>
          <button type="button" onClick={handleSalvar} disabled={loading || loadingExcluir} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50">
            {loading ? <FaSpinner className="animate-spin" size={14} /> : <FaSave size={14} />} Salvar
          </button>
        </footer>
      </div>
    </div>
  );
};

const ModalNovoUsuario = ({ filiais, listaUsuarios, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    telefone: '',
    cargo: 'vendedor',
    id_filial: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const criandoUsuarioRef = useRef(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (criandoUsuarioRef.current) return;
    setLoading(true);
    setError('');

    const emailNorm = normalizeEmail(formData.email);

    if (!formData.nome || !emailNorm || !formData.password || !formData.cargo || !formData.id_filial) {
      setError('Todos os campos, exceto telefone, são obrigatórios.');
      setLoading(false);
      return;
    }

    if (listaUsuarios.some((u) => u.email && normalizeEmail(u.email) === emailNorm)) {
      setError('Já existe um usuário com este e-mail.');
      setLoading(false);
      return;
    }

    criandoUsuarioRef.current = true;
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('criar-usuario', {
        body: {
          nome: formData.nome.trim(),
          email: emailNorm,
          password: formData.password,
          telefone: formData.telefone,
          cargo: formData.cargo,
          id_filial: formData.id_filial,
        },
      });

      if (invokeError) throw new Error(mensagemErroInvoke(data, invokeError));
      if (data?.error) throw new Error(String(data.error));

      onSuccess(data.message || 'Usuário criado com sucesso!');
    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
      setLoading(false);
    } finally {
      criandoUsuarioRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in flex flex-col max-h-[85vh]">
        <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FaUserPlus className="text-indigo-400" /> Novo usuário
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-full">
            <FaTimes size={16} />
          </button>
        </header>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
          {error && (
            <div className="sm:col-span-2 bg-red-500/15 text-red-300 px-3 py-2 rounded-md text-sm flex items-center gap-2">
              <FaExclamationTriangle size={12} /> {error}
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={labelClass}>Nome completo *</label>
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome completo" className={campoClass} autoComplete="off" />
          </div>
          <div>
            <label className={labelClass}>E-mail *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@exemplo.com" className={campoClass} autoComplete="off" />
          </div>
          <div>
            <label className={labelClass}>Senha provisória *</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Senha" className={campoClass} autoComplete="new-password" />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} placeholder="Opcional" className={campoClass} />
          </div>
          <div>
            <label className={labelClass}>Cargo *</label>
            <select name="cargo" value={formData.cargo} onChange={handleChange} className={campoClass}>
              <option value="vendedor">Vendedor</option>
              <option value="gerente">Gerente</option>
              <option value="diretor">Diretor</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Filial *</label>
            <select name="id_filial" value={formData.id_filial} onChange={handleChange} className={campoClass}>
              <option value="" disabled>Selecione uma filial</option>
              {filiais.map((filial) => (
                <option key={filial.id} value={filial.id}>{filial.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <footer className="px-4 py-3 flex justify-end gap-2 border-t border-gray-700">
          <button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-semibold text-white">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50">
            {loading ? <FaSpinner className="animate-spin" size={14} /> : <FaSave size={14} />}
            {loading ? 'Cadastrando…' : 'Cadastrar'}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default function AbaGerenciarUsuarios({ listaFiliais, listaUsuarios = [], onRefreshUsuarios }) {
  const [success, setSuccess] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const usuariosAgrupados = useMemo(() => {
    const grupos = { diretor: [], gerente: [], vendedor: [] };
    const usuariosVisiveis = mostrarInativos
      ? listaUsuarios
      : listaUsuarios.filter((user) => user.ativo !== false);

    usuariosVisiveis.forEach((user) => {
      const cargo = user.cargo?.toLowerCase() || 'vendedor';
      if (grupos[cargo]) grupos[cargo].push(user);
    });
    return grupos;
  }, [listaUsuarios, mostrarInativos]);

  const totalAtivos = useMemo(
    () => listaUsuarios.filter((user) => user.ativo !== false).length,
    [listaUsuarios]
  );

  const nomeFilial = (id) => listaFiliais.find((f) => String(f.id) === String(id))?.nome || 'Sem filial';

  const abrirModalEdicao = (usuario) => {
    setUsuarioEditando(usuario);
    setModalVisivel(true);
  };

  const fecharEAtualizar = () => {
    setModalVisivel(false);
    setUsuarioEditando(null);
    onRefreshUsuarios();
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-800/50 rounded-xl">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-300">
            <FaUsers size={12} /> Gerenciamento de Usuários
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalAtivos} usuário{totalAtivos !== 1 ? 's' : ''} ativo{totalAtivos !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarInativos}
              onChange={(e) => setMostrarInativos(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar inativos
          </label>
          <button
            type="button"
            onClick={() => { setSuccess(''); setModalNovo(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-white shrink-0"
          >
            <FaUserPlus size={12} /> Novo Usuário
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-green-500/15 text-green-300 px-3 py-2 rounded-md text-sm border border-green-500/30">
          {success}
        </div>
      )}

      <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-3 space-y-4">
        {Object.entries(usuariosAgrupados).map(([cargo, usuarios]) => (
          <div key={cargo}>
            <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wide border-b border-gray-700/60 pb-1.5 mb-2">
              {TITULO_CARGO[cargo] || cargo} ({usuarios.length})
            </h4>
            {usuarios.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Nome</th>
                      <th className="px-2 py-1.5 font-medium">E-mail / Tel</th>
                      <th className="px-2 py-1.5 font-medium">Filial</th>
                      <th className="px-2 py-1.5 font-medium">Intranet Gazin</th>
                      <th className="px-2 py-1.5 font-medium">Status</th>
                      <th className="px-2 py-1.5 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((user) => {
                      const isAtivo = user.ativo !== false;
                      return (
                        <tr key={user.id} className="border-t border-gray-700/40 hover:bg-gray-700/30">
                          <td className="px-2 py-2 font-medium text-white whitespace-nowrap">{user.nome}</td>
                          <td className="px-2 py-2">
                            <div className="text-gray-200">{user.email}</div>
                            <div className="text-[11px] text-gray-500">{user.telefone || 'Sem telefone'}</div>
                          </td>
                          <td className="px-2 py-2 text-gray-300 whitespace-nowrap">{nomeFilial(user.id_filial)}</td>
                          <td className="px-2 py-2 font-mono text-amber-200/90 whitespace-nowrap">
                            {user.senha_intranet_gazin?.trim() || <span className="text-gray-500 font-sans">—</span>}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                isAtivo
                                  ? 'bg-green-500/15 text-green-300 border border-green-500/30'
                                  : 'bg-gray-600/40 text-gray-400 border border-gray-600'
                              }`}
                            >
                              {isAtivo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => abrirModalEdicao(user)}
                              className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded"
                              title="Editar"
                            >
                              <FaEdit size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-xs px-1 py-1">Nenhum usuário neste cargo.</p>
            )}
          </div>
        ))}
      </div>

      {modalNovo && (
        <ModalNovoUsuario
          filiais={listaFiliais}
          listaUsuarios={listaUsuarios}
          onClose={() => setModalNovo(false)}
          onSuccess={(msg) => {
            setModalNovo(false);
            setSuccess(msg);
            onRefreshUsuarios();
          }}
        />
      )}

      {modalVisivel && (
        <ModalEditarUsuario
          usuario={usuarioEditando}
          filiais={listaFiliais}
          onClose={() => setModalVisivel(false)}
          onSave={fecharEAtualizar}
        />
      )}
    </div>
  );
}
