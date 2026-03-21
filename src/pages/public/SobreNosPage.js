import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import ProfileCard from './ProfileCard';
import { FaEye, FaHandshake, FaStar } from 'react-icons/fa';

const historiaBgUrl = 'https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';

export default function SobreNosPage() {
    // --- ESTADOS PARA OS DADOS DINÂMICOS ---
    const [lideranca, setLideranca] = useState([]);
    const [fotosGaleria, setFotosGaleria] = useState([]); // <-- LINHA QUE ESTAVA FALTANDO

    // --- USEEFFECT PARA BUSCAR LÍDERES E FOTOS ---
    useEffect(() => {
        const buscarLideres = async () => {
            const { data } = await supabase
                .from('usuarios_custom')
                .select('*')
                .in('cargo', ['diretor', 'sócio-diretor']);
            if (data) setLideranca(data);
        };

        const buscarFotos = async () => {
            const { data } = await supabase
                .from('galeria')
                .select('image_url, caption')
                .order('created_at', { ascending: false });
            if (data) setFotosGaleria(data);
        };

        buscarLideres();
        buscarFotos();
    }, []);

    // --- FILTRA OS SÓCIOS DA LISTA DE LÍDERES ---
    const socios = useMemo(() => 
        lideranca.filter(p => 
            p.nome.toUpperCase() === 'RODRIGO CÉSAR DE LIMA' || 
            p.nome.toUpperCase() === 'GLEDSON FERREIRA DE SOUZA' || 
            p.nome.toUpperCase() === 'ANILTON APARECIDO NOVAIS JUNIOR'
        ),
    [lideranca]);

    return (
        
            <div className="bg-slate-50 text-slate-800 w-full max-w-[100vw] overflow-x-hidden min-h-[100dvh] min-h-screen">
            {/* --- SEÇÃO 1: NOSSA HISTÓRIA --- */}
            <section className="relative py-24 text-white bg-cover bg-center" style={{ backgroundImage: `url(${historiaBgUrl})` }}>
                <div className="absolute inset-0 bg-black/70"></div>
                <div className="relative z-10 container mx-auto px-6 text-center animate-fade-in-up">
                    <h1 className="text-5xl font-extrabold mb-4">A Jornada da Fênix</h1>
                    <p className="text-lg text-slate-200 max-w-3xl mx-auto">
                        A Fênix Consórcios nasceu de um propósito: reinventar a maneira como as pessoas planejam suas maiores conquistas. Vimos um mercado financeiro muitas vezes distante e complicado, e sonhamos em criar uma consultoria baseada em confiança, transparência e parceria real. Assim como a mítica Fênix, nosso objetivo é ajudar seus sonhos a renascerem dos planos e se tornarem realidade.
                    </p>
                </div>
            </section>

            {/* --- SEÇÃO 2: NOSSOS VALORES --- */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-4xl font-bold mb-12 text-fenix-purple">No Que Acreditamos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
                        <div className="p-6">
                            <FaHandshake className="text-5xl text-fenix-orange mb-4 mx-auto" />
                            <h3 className="text-2xl font-semibold mb-3">Comprometimento</h3>
                            <p className="text-slate-600">O seu objetivo é o nosso objetivo. Estamos juntos em cada etapa do processo.</p>
                        </div>
                        <div className="p-6">
                            <FaEye className="text-5xl text-fenix-orange mb-4 mx-auto" />
                            <h3 className="text-2xl font-semibold mb-3">Transparência</h3>
                            <p className="text-slate-600">Clareza e honestidade em cada contrato, em cada conversa.</p>
                        </div>
                        <div className="p-6">
                            <FaStar className="text-5xl text-fenix-orange mb-4 mx-auto" />
                            <h3 className="text-2xl font-semibold mb-3">Excelência</h3>
                            <p className="text-slate-600">Buscamos as melhores soluções do mercado para garantir sua satisfação.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SEÇÃO 3: LIDERANÇA --- */}
            <section className="py-20 bg-slate-50">
                 <div className="container mx-auto px-6">
                    <h2 className="text-4xl font-bold text-center mb-2 text-fenix-purple">Nossa Liderança</h2>
                    <div className="w-24 h-1 bg-fenix-orange mx-auto mb-12"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {socios.map(socio => <ProfileCard key={socio.id} {...socio} cargo="Sócio-Diretor" />)}
                    </div>
                 </div>
            </section>

            {/* --- SEÇÃO 4: GALERIA DE FOTOS --- */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-4xl font-bold mb-12 text-fenix-purple">Nossos Momentos</h2>
                    {fotosGaleria.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {fotosGaleria.map((foto, index) => (
                                <div key={index} className="group relative overflow-hidden rounded-lg shadow-lg">
                                    <img 
                                        src={foto.image_url} 
                                        alt={foto.caption || `Galeria Fênix ${index + 1}`} 
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                    {foto.caption && (
                                        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/70 to-transparent">
                                            <p className="text-white text-sm font-semibold">{foto.caption}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-600">Nossa galeria de momentos será atualizada em breve!</p>
                    )}
                </div>
            </section>
        </div>
    );
}