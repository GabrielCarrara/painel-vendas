// src/components/LembretesLeads.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import dayjs from 'dayjs';
import { FaPhone, FaExclamationTriangle } from 'react-icons/fa';

export default function LembretesLeads() {
    const [leadsParaHoje, setLeadsParaHoje] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeadsDeHoje = async () => {
            const hoje = dayjs().format('YYYY-MM-DD');
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data, error } = await supabase
                    .from('leads')
                    .select('id, nome, telefone, tipo')
                    .eq('usuario_id', user.id)
                    .eq('data_contato', hoje);

                if (error) console.error("Erro ao buscar lembretes:", error);
                else setLeadsParaHoje(data || []);
            }
            setLoading(false);
        };

        fetchLeadsDeHoje();
    }, []);

    if (loading) {
        return <div className="text-gray-400">Carregando lembretes...</div>;
    }

    if (leadsParaHoje.length === 0) {
        return null; // Não mostra nada se não houver lembretes para hoje
    }

    return (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8 animate-fade-in">
            <h3 className="text-xl font-bold text-yellow-300 flex items-center gap-3 mb-4">
                <FaExclamationTriangle /> Lembretes de Contato para Hoje
            </h3>
            <div className="space-y-3">
                {leadsParaHoje.map(lead => (
                    <div key={lead.id} className="bg-gray-800/50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-bold text-white">{lead.nome.toUpperCase()}</p>
                            <p className="text-sm text-gray-400">{lead.tipo}</p>
                        </div>
                        <a 
                            href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <FaPhone size={12} /> Contatar
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}