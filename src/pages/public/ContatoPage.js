import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import ListaVendedores from './ListaVendedores';
import ProfileCard from './ProfileCard'; // Apenas importa, não declara de novo

export default function ContatoPage() {
    const [equipeLider, setEquipeLider] = useState([]);

    useEffect(() => {
        const buscarLideres = async () => {
            const { data, error } = await supabase
                .from('usuarios_custom')
                .select('id, nome, cargo, email, telefone, foto_url')
                .in('cargo', ['diretor', 'gerente']);

            if (data) {
                setEquipeLider(data);
            }
        };
        buscarLideres();
    }, []);

    const socios = useMemo(() => 
        equipeLider.filter(p => p.nome.toUpperCase() === 'RODRIGO CÉSAR DE LIMA' || p.nome.toUpperCase() === 'GLEDSON FERREIRA DE SOUZA' || p.nome.toUpperCase() === 'ANILTON APARECIDO NOVAIS JUNIOR'),
    [equipeLider]);

    const diretorAdm = useMemo(() =>
        equipeLider.find(p => p.nome.toUpperCase() === 'GABRIEL COSTA CARRARA'),
    [equipeLider]);

    const gerenteInv = useMemo(() =>
        equipeLider.find(p => p.nome.toUpperCase() === 'LUCAS DOS SANTOS RIBEIRO'),
    [equipeLider]);

    return (
      
        <div 
            className="bg-slate-50 text-slate-800 w-full max-w-[100vw] overflow-x-hidden min-h-[100dvh] min-h-screen" 
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
        >
            <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 max-w-6xl w-full">
                <section className="bg-white pt-16 pb-12 text-center border-b border-slate-200">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 text-fenix-purple px-2">Conheça a Nossa Equipe</h1>
                    <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                        Somos um time de especialistas dedicados a encontrar a melhor solução para o seu futuro. Conheça os rostos por trás da Fênix Consórcios.
                    </p>
                </section>
            
                <div className="py-16">
                    <section className="mb-20">
                        <h2 className="text-3xl font-bold text-center mb-2">Sócios-Diretores</h2>
                        <div className="w-24 h-1 bg-fenix-orange mx-auto mb-10"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            {/* --- ALTERAÇÃO AQUI: adicionada a prop "whatsapp" --- */}
                            {socios.map(socio => <ProfileCard key={socio.id} {...socio} cargo="Sócio-Diretor" whatsapp={socio.telefone} />)}
                        </div>
                        <div className="text-center text-slate-600 mt-10 bg-slate-200/70 max-w-2xl mx-auto p-4 rounded-lg border border-slate-300">
                            <p className="font-semibold">Contato principal para parcerias e assuntos administrativos:</p>
                            <p className="text-slate-800">(65) 9 8127-8212 | fenixconsorciospl@hotmail.com</p>
                        </div>
                    </section>

                    <section className="mb-20">
                         <h2 className="text-3xl font-bold text-center mb-2">Gestão</h2>
                         <div className="w-24 h-1 bg-fenix-orange mx-auto mb-10"></div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                            {/* --- ALTERAÇÃO AQUI: adicionada a prop "whatsapp" --- */}
                            {diretorAdm && <ProfileCard {...diretorAdm} cargo="Diretor Administrativo" whatsapp={diretorAdm.telefone} />}
                            {gerenteInv && <ProfileCard {...gerenteInv} cargo="Gerente de Investimentos" whatsapp={gerenteInv.telefone} />}
                         </div>
                    </section>

                    <section className="bg-white p-8 md:p-12 rounded-xl shadow-lg">
                        <h2 className="text-3xl font-bold text-center mb-2">Nossos Consultores</h2>
                        <p className="text-center text-slate-600 mb-8">Equipe de Pontes e Lacerda</p>
                        <div className="w-24 h-1 bg-fenix-orange mx-auto mb-10"></div>
                        <ListaVendedores filialId="1" />
                    </section>
                </div>
            </div>
        </div>
    );
}