// src/components/MinhaContaModal.js
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { FaTimes, FaCamera, FaSpinner, FaSave, FaLock, FaPhone, FaUserCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function MinhaContaModal({ usuario, onClose, onUpdate }) {
  const [aba, setAba] = useState('perfil'); // 'perfil' ou 'seguranca'
  
  // Estados do Formulário
  const [telefone, setTelefone] = useState(usuario.telefone || '');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  
  // Estados de UI
  const [loadingFoto, setLoadingFoto] = useState(false);
  const [loadingTelefone, setLoadingTelefone] = useState(false);
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const limparAlertas = () => {
    setError('');
    setSuccess('');
  };

  // --- LÓGICA DE FOTO ---
  const handlePhotoUpload = async (e) => {
    limparAlertas();
    const file = e.target.files[0];
    if (!file) return;

    setLoadingFoto(true);
    try {
      // 1. Define um nome de arquivo único
      const fileExt = file.name.split('.').pop();
      const filePath = `public/${usuario.id}/${Date.now()}.${fileExt}`;

      // 2. Faz o upload
      const { error: uploadError } = await supabase.storage
        .from('fotos-equipe')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Pega a URL pública
      const { data: urlData } = supabase.storage
        .from('fotos-equipe')
        .getPublicUrl(filePath);
      
      const newPhotoUrl = urlData.publicUrl;

      // 4. Salva a URL no perfil do usuário
      const { error: updateError } = await supabase
        .from('usuarios_custom')
        .update({ foto_url: newPhotoUrl })
        .eq('id', usuario.id);
      
      if (updateError) throw updateError;

      // 5. Se o usuário tinha uma foto antiga (e ela não é a default), remove
      if (usuario.foto_url) {
        try {
          const oldFilePath = usuario.foto_url.split('/fotos-equipe/')[1];
          if (oldFilePath) {
            await supabase.storage.from('fotos-equipe').remove([oldFilePath]);
          }
        } catch (removeError) {
          console.warn("Não foi possível remover a foto antiga:", removeError.message);
        }
      }

      setSuccess('Foto atualizada com sucesso!');
      onUpdate(); // Atualiza o perfil no painel pai
    
    } catch (err) {
      setError(err.message || 'Erro ao fazer upload da foto.');
    } finally {
      setLoadingFoto(false);
    }
  };

  // --- LÓGICA DE TELEFONE ---
  const handleTelefoneUpdate = async (e) => {
    e.preventDefault();
    limparAlertas();
    setLoadingTelefone(true);

    const { error } = await supabase
      .from('usuarios_custom')
      .update({ telefone: telefone })
      .eq('id', usuario.id);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Telefone atualizado com sucesso!');
      onUpdate();
    }
    setLoadingTelefone(false);
  };

  // --- LÓGICA DE SENHA ---
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
    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Senha alterada com sucesso!');
      setNovaSenha('');
      setConfirmarSenha('');
    }
    setLoadingSenha(false);
  };


  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Minha Conta</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full"><FaTimes size={20} /></button>
        </header>

        {/* Abas */}
        <div className="flex border-b border-gray-700">
          <button 
            onClick={() => { setAba('perfil'); limparAlertas(); }}
            className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 ${aba === 'perfil' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}
          >
            <FaUserCircle /> Perfil
          </button>
          <button 
            onClick={() => { setAba('seguranca'); limparAlertas(); }}
            className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 ${aba === 'seguranca' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}
          >
            <FaLock /> Segurança
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 space-y-4">
          
          {/* Alertas */}
          {error && (
            <div className="bg-red-500/20 text-red-300 p-3 rounded-lg flex items-center gap-2">
              <FaExclamationTriangle /> {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/20 text-green-300 p-3 rounded-lg">
              {success}
            </div>
          )}

          {/* ABA PERFIL (Foto e Telefone) */}
          {aba === 'perfil' && (
            <div className="space-y-6">
              {/* Seção da Foto */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-600">
                  {loadingFoto ? (
                    <FaSpinner className="animate-spin" size={40} />
                  ) : (
                    usuario.foto_url ? (
                      <img src={usuario.foto_url} alt="Foto do Perfil" className="w-full h-full object-cover" />
                    ) : (
                      <FaUserCircle size={80} className="text-gray-500" />
                    )
                  )}
                </div>
                <label htmlFor="upload-foto" className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <FaCamera /> {usuario.foto_url ? 'Alterar Foto' : 'Adicionar Foto'}
                </label>
                <input id="upload-foto" type="file" accept="image/png, image/jpeg" onChange={handlePhotoUpload} className="hidden" />
              </div>

              {/* Seção do Telefone */}
              <form onSubmit={handleTelefoneUpdate} className="space-y-3">
                <label className="block mb-1 text-sm font-medium text-gray-400">Telefone / Contato</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(XX) XXXXX-XXXX" 
                    className="flex-1 w-full bg-gray-700 p-3 rounded-lg border border-gray-600" 
                  />
                  <button type="submit" disabled={loadingTelefone} className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:bg-gray-500">
                    {loadingTelefone ? <FaSpinner className="animate-spin" /> : <FaSave />} Salvar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ABA SEGURANÇA (Senha) */}
          {aba === 'seguranca' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-400">Nova Senha</label>
                <input 
                  type="password" 
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo de 6 caracteres" 
                  className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" 
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-400">Confirmar Nova Senha</label>
                <input 
                  type="password" 
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha" 
                  className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" 
                />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={loadingSenha} className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:bg-gray-500">
                  {loadingSenha ? <FaSpinner className="animate-spin" /> : <FaLock />} Alterar Senha
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}