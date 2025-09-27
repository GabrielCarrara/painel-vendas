// src/pages/public/ListaVendedores.js - VERSÃO COM CARGO ADICIONADO

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { FaWhatsapp } from 'react-icons/fa';

export default function ListaVendedores({ filialId }) {
    const [vendedores, setVendedores] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const buscarVendedores = async () => {
            if (!filialId) {
                setVendedores([]);
                setLoading(false);
                return;
            }
            
            setLoading(true);
            const idFilialNumerico = parseInt(filialId, 10);

            const { data, error } = await supabase
                .from('usuarios_custom')
                .select('nome, telefone, foto_url')
                .eq('id_filial', idFilialNumerico)
                .eq('cargo', 'vendedor')
                .eq('ativo', true);

            if (error) {
                console.error("ERRO DETALHADO AO BUSCAR VENDEDORES:", error);
            }

            if (data) {
                setVendedores(data);
            }
            
            setLoading(false);
        };

        buscarVendedores();
    }, [filialId]);

    if (loading) return <div className="text-center p-4 text-slate-500">Carregando vendedores...</div>;
    
    if (vendedores.length === 0) return <div className="text-center p-4 text-slate-500">Nenhum vendedor encontrado para esta filial.</div>

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 animate-fade-in">
            {vendedores.map(vendedor => (
                <div key={vendedor.nome} className="bg-white p-4 rounded-lg text-center shadow-lg transition-transform hover:scale-105">
                    <img src={vendedor.foto_url || `https://ui-avatars.com/api/?name=${vendedor.nome}&background=F7931E&color=fff`} alt={vendedor.nome} className="w-24 h-24 rounded-full mx-auto mb-3" />
                    <h4 className="font-bold text-slate-900">{vendedor.nome}</h4>
                    {/* --- LINHA ADICIONADA --- */}
                    <p className="text-sm text-fenix-orange font-semibold mb-3">Especialista em Investimentos</p>
                    <a href={`https://wa.me/55${vendedor.telefone}`} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                        <FaWhatsapp /> Chamar
                    </a>
                </div>
            ))}
        </div>
    );
};