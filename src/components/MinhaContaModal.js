import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { FaTimes, FaCamera, FaSpinner, FaSave, FaLock, FaUserCircle, FaExclamationTriangle } from 'react-icons/fa';

const campoClass =
  'w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide';

export default function MinhaContaModal({ usuario, onClose, onUpdate }) {
  const [aba, setAba] = useState('perfil');

  const [telefone, setTelefone] = useState(usuario.telefone || '');
  const [senhaIntranetGazin, setSenhaIntranetGazin] = useState(usuario.senha_intranet_gazin || '');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [loadingFoto, setLoadingFoto] = useState(false);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const limparAlertas = () => {
    setError('');
    setSuccess('');
  };

  const handlePhotoUpload = async (e) => {
    limparAlertas();
    const file = e.target.files[0];
    if (!file) return;

    setLoadingFoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `public/${usuario.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos-equipe')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('fotos-equipe')
        .getPublicUrl(filePath);

      const newPhotoUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('usuarios_custom')
        .update({ foto_url: newPhotoUrl })
        .eq('id', usuario.id);

      if (updateError) throw updateError;

      if (usuario.foto_url) {
        try {
          const oldFilePath = usuario.foto_url.split('/fotos-equipe/')[1];
          if (oldFilePath) {
            await supabase.storage.from('fotos-equipe').remove([oldFilePath]);
          }
        } catch (removeError) {
          console.warn('Não foi possível remover a foto antiga:', removeError.message);
        }
      }

      setSuccess('Foto atualizada com sucesso!');
      onUpdate();
    } catch (err) {
      setError(err.message || 'Erro ao fazer upload da foto.');
    } finally {
      setLoadingFoto(false);
    }
  };

  const handlePerfilUpdate = async (e) => {
    e.preventDefault();
    limparAlertas();
    setLoadingPerfil(true);

    const { error: updateError } = await supabase
      .from('usuarios_custom')
      .update({
        telefone: telefone,
        senha_intranet_gazin: senhaIntranetGazin,
      })
      .eq('id', usuario.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Perfil atualizado com sucesso!');
      onUpdate();
    }
    setLoadingPerfil(false);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    limparAlertas();

    if (novaSenha.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoadingSenha(true);
    const { error: authError } = await supabase.auth.updateUser({ password: novaSenha });

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess('Senha alterada com sucesso!');
      setNovaSenha('');
      setConfirmarSenha('');
    }
    setLoadingSenha(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 animate-fade-in flex flex-col max-h-[85vh]">
        <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-base font-semibold text-white">Minha Conta</h3>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-full">
            <FaTimes size={16} />
          </button>
        </header>

        <div className="flex border-b border-gray-700">
          <button
            type="button"
            onClick={() => { setAba('perfil'); limparAlertas(); }}
            className={`flex-1 py-2.5 px-3 text-sm font-semibold flex items-center justify-center gap-1.5 ${
              aba === 'perfil' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'
            }`}
          >
            <FaUserCircle size={14} /> Perfil
          </button>
          <button
            type="button"
            onClick={() => { setAba('seguranca'); limparAlertas(); }}
            className={`flex-1 py-2.5 px-3 text-sm font-semibold flex items-center justify-center gap-1.5 ${
              aba === 'seguranca' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'
            }`}
          >
            <FaLock size={14} /> Segurança
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {error && (
            <div className="bg-red-500/15 text-red-300 px-3 py-2 rounded-md text-sm flex items-center gap-2">
              <FaExclamationTriangle size={12} /> {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/15 text-green-300 px-3 py-2 rounded-md text-sm border border-green-500/30">
              {success}
            </div>
          )}

          {aba === 'perfil' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-600">
                  {loadingFoto ? (
                    <FaSpinner className="animate-spin text-indigo-400" size={28} />
                  ) : usuario.foto_url ? (
                    <img src={usuario.foto_url} alt="Foto do Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <FaUserCircle size={56} className="text-gray-500" />
                  )}
                </div>
                <label
                  htmlFor="upload-foto"
                  className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-white"
                >
                  <FaCamera size={12} /> {usuario.foto_url ? 'Alterar Foto' : 'Adicionar Foto'}
                </label>
                <input id="upload-foto" type="file" accept="image/png, image/jpeg" onChange={handlePhotoUpload} className="hidden" />
              </div>

              <form onSubmit={handlePerfilUpdate} className="space-y-3">
                <div>
                  <label className={labelClass}>Telefone / Contato</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(XX) XXXXX-XXXX"
                    className={campoClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Senha Intranet Gazin</label>
                  <input
                    type="text"
                    value={senhaIntranetGazin}
                    onChange={(e) => setSenhaIntranetGazin(e.target.value)}
                    placeholder="Controle interno — pode alterar quando quiser"
                    className={campoClass}
                    autoComplete="off"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Uso interno da equipe. Não é a senha de login do painel.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loadingPerfil}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingPerfil ? <FaSpinner className="animate-spin" size={14} /> : <FaSave size={14} />}
                  Salvar perfil
                </button>
              </form>
            </div>
          )}

          {aba === 'seguranca' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-3">
              <div>
                <label className={labelClass}>Nova senha do painel</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className={campoClass}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className={labelClass}>Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  className={campoClass}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={loadingSenha}
                className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingSenha ? <FaSpinner className="animate-spin" size={14} /> : <FaLock size={14} />}
                Alterar senha
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
