// src/pages/AbaGerenciarUsuarios.js (Versão com Status Ativo/Inativo)
import React, { useState, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { FaSave, FaSpinner, FaExclamationTriangle, FaEdit, FaTimes, FaUserPlus } from 'react-icons/fa';

/** E-mail único no Auth/Postgres deve ser comparado em minúsculas (evita ti@gmail.com + TI@gmail.com). */
function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function mensagemErroInvoke(data, invokeError) {
  if (data && typeof data === 'object' && data.error) return String(data.error);
  if (data && typeof data === 'object' && data.warning) return String(data.warning);
  return invokeError?.message || 'Ocorreu um erro.';
}

// COMPONENTE DO MODAL DE EDIÇÃO
const ModalEditarUsuario = ({ usuario, filiais, onClose, onSave }) => {
  
  // Define o estado inicial, tratando 'null' ou 'undefined' como 'true'
  const estadoAtivoInicial = usuario.ativo === false ? false : true;

  const [formData, setFormData] = useState({
    nome: usuario.nome || '',
    email: usuario.email || '',
    telefone: usuario.telefone || '',
    cargo: usuario.cargo || 'vendedor',
    id_filial: usuario.id_filial || '',
    ativo: estadoAtivoInicial // <-- ADICIONADO
  });
  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Converte o valor de 'ativo' de string para boolean
    if (name === 'ativo') {
      setFormData((prev) => ({ ...prev, ativo: value === 'true' }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSalvar = async () => {
    setLoading(true);
    setError('');

    // 1. Monta o payload SÓ com o que mudou
    const payload = {};
    const emailForm = normalizeEmail(formData.email);
    const emailDb = normalizeEmail(usuario.email);
    if (formData.nome !== usuario.nome) payload.nome = formData.nome;
    if (emailForm !== emailDb) payload.email = emailForm;
    if (formData.telefone !== usuario.telefone) payload.telefone = formData.telefone;
    if (formData.cargo !== usuario.cargo) payload.cargo = formData.cargo;
    if (String(formData.id_filial ?? '') !== String(usuario.id_filial ?? '')) {
      payload.id_filial = formData.id_filial;
    }
    if (novaSenha) payload.password = novaSenha;
    
    // Compara o booleano do formulário com o estado inicial
    if (formData.ativo !== estadoAtivoInicial) {
      payload.ativo = formData.ativo;
    }

    if (Object.keys(payload).length === 0) {
      setError('Nenhuma alteração foi feita.');
      setLoading(false);
      return;
    }

    try {
      // 2. Chama a Edge Function 'atualizar-usuario-admin'
      const { data, error: invokeError } = await supabase.functions.invoke('atualizar-usuario-admin', {
        body: {
          userIdToUpdate: usuario.id,
          payload: payload,
        },
      });

      if (invokeError) throw new Error(mensagemErroInvoke(data, invokeError));
      if (data?.error) throw new Error(String(data.error));

      // 3. Sucesso!
      if (data?.warning) {
        setError('');
        // Aviso não bloqueante: perfil salvo; auth pode ter falhado parcialmente
        window.alert(`Alterações salvas.\n\nAviso: ${data.warning}`);
      }
      setLoading(false);
      onSave(); // Recarrega lista e fecha o modal
      
    } catch (err) {
      setError(err.message || 'Ocorreu um erro.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700 animate-fade-in">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-lg font-semibold">Editando: {usuario.nome}</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full"><FaTimes size={20} /></button>
        </header>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-500/20 text-red-300 p-3 rounded-lg flex items-center gap-2">
              <FaExclamationTriangle /> {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome Completo" className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email de Acesso" className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
            <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} placeholder="Telefone" className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
            <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Nova Senha (deixe em branco)" className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
            <select name="cargo" value={formData.cargo} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600">
              <option value="vendedor">Vendedor</option>
              <option value="gerente">Gerente</option>
              <option value="diretor">Diretor</option>
            </select>
            <select name="id_filial" value={formData.id_filial} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600">
              {filiais.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            
            {/* --- SELETOR DE STATUS ADICIONADO --- */}
            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-400">Status</label>
              <select name="ativo" value={formData.ativo.toString()} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
            
          </div>
        </div>
        <footer className="p-4 flex justify-end gap-3 border-t border-gray-700">
          <button onClick={onClose} type="button" className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg font-semibold">Cancelar</button>
          <button onClick={handleSalvar} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:bg-gray-500">
            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />} Salvar Alterações
          </button>
        </footer>
      </div>
    </div>
  );
};


// COMPONENTE PRINCIPAL DA ABA
export default function AbaGerenciarUsuarios({ listaFiliais, listaUsuarios = [], onRefreshUsuarios }) {
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
  const [success, setSuccess] = useState('');

  // Estados para o Modal e Lista
  const [modalVisivel, setModalVisivel] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
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
    setSuccess('');

    const emailNorm = normalizeEmail(formData.email);

    if (!formData.nome || !emailNorm || !formData.password || !formData.cargo || !formData.id_filial) {
      setError('Todos os campos, exceto telefone, são obrigatórios.');
      setLoading(false);
      return;
    }

    const emailJaExiste = listaUsuarios.some(
      (u) => u.email && normalizeEmail(u.email) === emailNorm
    );
    if (emailJaExiste) {
      setError('Já existe um usuário com este e-mail (a busca ignora maiúsculas/minúsculas).');
      setLoading(false);
      return;
    }

    criandoUsuarioRef.current = true;
    try {
      // Chama a Edge Function 'criar-usuario'
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

      setSuccess(data.message || 'Usuário criado com sucesso!');
      setFormData({ nome: '', email: '', password: '', telefone: '', cargo: 'vendedor', id_filial: '' });
      onRefreshUsuarios(); // Recarrega a lista

    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      criandoUsuarioRef.current = false;
      setLoading(false);
    }
  };

  // Lógica para agrupar usuários
  const usuariosAgrupados = useMemo(() => {
    const grupos = {
      diretor: [],
      gerente: [],
      vendedor: [],
    };
    listaUsuarios.forEach((user) => {
      const cargo = user.cargo?.toLowerCase() || 'vendedor';
      if (grupos[cargo]) {
        grupos[cargo].push(user);
      }
    });
    return grupos;
  }, [listaUsuarios]);

  const nomeFilial = (id) => listaFiliais.find((f) => String(f.id) === String(id))?.nome || 'Sem Filial';

  const abrirModalEdicao = (usuario) => {
    setUsuarioEditando(usuario);
    setModalVisivel(true);
  };

  const fecharEAtualizar = () => {
    setModalVisivel(false);
    setUsuarioEditando(null);
    onRefreshUsuarios(); // Recarrega a lista
  };


  return (
    <>
      {/* --- FORMULÁRIO DE CRIAÇÃO --- */}
      <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6 max-w-4xl mx-auto animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
          <FaUserPlus /> Cadastrar Novo Usuário
        </h2>
        {error && (
          <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 flex items-center gap-2">
            <FaExclamationTriangle /> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 text-green-300 p-3 rounded-lg mb-4">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome Completo" className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email de Acesso" className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Senha Provisória" className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
            <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} placeholder="Telefone (Opcional)" className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
            <select name="cargo" value={formData.cargo} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600">
              <option value="vendedor">Vendedor</option>
              <option value="gerente">Gerente</option>
              <option value="diretor">Diretor</option>
            </select>
            <select name="id_filial" value={formData.id_filial} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600">
              <option value="" disabled>Selecione uma filial</option>
              {listaFiliais.map((filial) => (
                <option key={filial.id} value={filial.id}>{filial.nome}</option>
              ))}
            </select>
          </div>
          <div className="pt-4">
            <button type="submit" disabled={loading} className="bg-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:bg-gray-500">
              {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
              {loading ? 'Cadastrando...' : 'Cadastrar Usuário'}
            </button>
          </div>
        </form>
      </div>

      {/* --- LISTA DE USUÁRIOS --- */}
      <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6 max-w-4xl mx-auto animate-fade-in mt-8">
        <h2 className="text-2xl font-bold mb-6 text-white">Usuários Cadastrados</h2>
        {Object.entries(usuariosAgrupados).map(([cargo, usuarios]) => {
          // CORREÇÃO DO "Gerentees"
          const tituloCargo = cargo === 'gerente' ? 'Gerentes' : `${cargo}es`;
          return (
            <div key={cargo} className="mb-6">
              <h3 className="text-xl font-semibold text-indigo-400 capitalize border-b border-gray-700 pb-2 mb-3">
                {tituloCargo} ({usuarios.length})
              </h3>
              {usuarios.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-gray-400">
                      <tr>
                        <th className="p-2">Nome</th>
                        <th className="p-2">Email / Telefone</th>
                        <th className="p-2">Filial</th>
                        <th className="p-2">Status</th> {/* <-- COLUNA ADICIONADA */}
                        <th className="p-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map(user => {
                        const isAtivo = user.ativo === false ? false : true;
                        return (
                          <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/50">
                            <td className="p-3 font-medium">{user.nome}</td>
                            <td className="p-3">
                              <div>{user.email}</div>
                              <div className="text-xs text-gray-400">{user.telefone || 'Sem telefone'}</div>
                            </td>
                            <td className="p-3 text-gray-300">{nomeFilial(user.id_filial)}</td>
                            {/* --- STATUS ATIVO/INATIVO ADICIONADO --- */}
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                isAtivo
                                  ? 'bg-green-500/20 text-green-300'
                                  : 'bg-gray-600/50 text-gray-400'
                              }`}>
                                {isAtivo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button onClick={() => abrirModalEdicao(user)} className="p-2 text-blue-400 hover:text-blue-300">
                                <FaEdit />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum usuário com este cargo.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* --- MODAL DE EDIÇÃO (Renderiza se modalVisivel for true) --- */}
      {modalVisivel && (
        <ModalEditarUsuario
          usuario={usuarioEditando}
          filiais={listaFiliais}
          onClose={() => setModalVisivel(false)}
          onSave={fecharEAtualizar}
        />
      )}
    </>
  );
}