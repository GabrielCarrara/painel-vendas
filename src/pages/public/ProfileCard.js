// src/pages/public/ProfileCard.js - VERSÃO CORRIGIDA

import React from 'react';
import { FaWhatsapp, FaEnvelope } from 'react-icons/fa';

// A prop "fotoUrl" foi alterada para "foto_url" para bater com o nome da coluna do Supabase
export default function ProfileCard({ foto_url, nome, cargo, whatsapp, email, avatarBgColor = 'bg-fenix-purple' }) {
    return (
        <div className="bg-white p-6 rounded-xl text-center shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:shadow-fenix-purple/20">
            <div className={`w-32 h-32 rounded-full mx-auto mb-4 border-4 border-slate-200 flex items-center justify-center ${avatarBgColor}`}>
                {/* A variável aqui também foi alterada para "foto_url" */}
                {foto_url ? (
                    <img src={foto_url} alt={nome} className="w-full h-full rounded-full object-cover" />
                ) : (
                    <span className="text-5xl font-bold text-white">{nome.split(' ').map(n => n[0]).join('')}</span>
                )}
            </div>
            <h3 className="text-xl font-bold text-slate-900">{nome}</h3>
            <p className="text-fenix-orange mb-4 font-semibold">{cargo}</p>
            <div className="flex justify-center items-center gap-4">
                {whatsapp && <a href={`https://wa.me/55${whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 transition-transform hover:scale-110"><FaWhatsapp size={24} /></a>}
                {email && <a href={`mailto:${email}`} className="text-blue-500 hover:text-blue-600 transition-transform hover:scale-110"><FaEnvelope size={24} /></a>}
            </div>
        </div>
    );
};