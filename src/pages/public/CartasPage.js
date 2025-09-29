import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { FaCar, FaHome, FaBlender, FaCalculator, FaTimes, FaClipboard, FaWhatsapp, FaInfoCircle } from 'react-icons/fa';

const formatarParaReal = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getStatusStyle = (status) => {
    return status === 'DISPONÍVEL' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
};

const getTypeIcon = (tipo) => {
    switch (tipo) {
        case 'AUTOMÓVEL': return <FaCar />;
        case 'IMÓVEL': return <FaHome />;
        case 'ELETRO': return <FaBlender />;
        default: return null;
    }
};

// --- Componentes de UI ---
const CartaCard = ({ item, onSelect, isSelected }) => (
    <div 
        onClick={() => onSelect(item.id)}
        className={`bg-white rounded-xl shadow-lg flex flex-col transition-all duration-300 border-2 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${isSelected ? 'border-fenix-orange bg-orange-50' : 'border-transparent'}`}
    >
        <header className="p-4 flex justify-between items-center border-b border-slate-200">
            <div><p className="text-xs font-bold uppercase flex items-center gap-2 text-slate-500">{getTypeIcon(item.tipo)} {item.tipo}</p><p className="text-2xl font-bold text-slate-900">{formatarParaReal(item.valor_credito)}</p></div>
            <div className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(item.status)}`}>{item.status}</div>
        </header>
        <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-grow text-slate-700">
            <div><p className="text-slate-500">Entrada</p><p className="font-semibold">{formatarParaReal(item.entrada)}</p></div>
            <div><p className="text-slate-500">Parcela</p><p className="font-semibold">{formatarParaReal(item.parcela)} x {item.meses}</p></div>
            <div><p className="text-slate-500">Grupo/Cota</p><p className="font-semibold">{item.grupo}/{item.cota}</p></div>
            <div><p className="text-slate-500">Taxa Transf.</p><p className="font-semibold">{formatarParaReal(item.taxa_transferencia)}</p></div>
        </div>
    </div>
);

const CalculoModal = ({ resultado, onClose }) => {
    if (!resultado) return null;
    const textoWhatsApp = `Olá! Gostaria de mais informações sobre esta junção de cartas contempladas:\n\n*📄 RESUMO DA JUNÇÃO 📄*\n\n*Crédito Total:* *${formatarParaReal(resultado.creditoTotal)}*\n*Entrada Total:* *${formatarParaReal(resultado.entradaTotal)}*\n\n*💸 PARCELAMENTO:*\n${resultado.estruturaParcelas.map(p => ` > *${p.duracao}x* de *${formatarParaReal(p.valor)}*`).join('\n')}`;
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border text-slate-800">
                <header className="p-4 flex justify-between items-center border-b border-slate-200">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><FaCalculator /> Simulação da Junção</h3>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800"><FaTimes size={20} /></button>
                </header>
                <div className="p-6 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
                    <div><p className="text-slate-500">Crédito Total:</p><p className="font-semibold text-green-600 text-xl">{formatarParaReal(resultado.creditoTotal)}</p></div>
                    <div><p className="text-slate-500">Entrada Total:</p><p className="font-semibold">{formatarParaReal(resultado.entradaTotal)}</p></div>
                    <div><p className="text-slate-500">Taxa de Transferência Total:</p><p className="font-semibold">{formatarParaReal(resultado.taxaTotal)}</p></div>
                    <div><p className="text-slate-500">Estrutura das Parcelas:</p>{resultado.estruturaParcelas.map((p, i) => (<p key={i} className="font-semibold">{p.duracao}x de {formatarParaReal(p.valor)}</p>))}</div>
                    <div className="pt-2 border-t border-slate-200"><p className="text-slate-500">Saldo Devedor Total:</p><p className="font-semibold text-xl">{formatarParaReal(resultado.saldoDevedor)}</p></div>
                </div>
                <footer className="p-4 flex justify-end gap-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    <button onClick={() => { navigator.clipboard.writeText(textoWhatsApp); alert("Resumo copiado!"); }} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><FaClipboard /> Copiar</button>
                    <a href={`https://wa.me/5565981278212?text=${encodeURIComponent(textoWhatsApp)}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><FaWhatsapp /> Tenho Interesse</a>
                </footer>
            </div>
        </div>
    );
};

export default function CartasPage() {
    const [cartas, setCartas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selecionadas, setSelecionadas] = useState([]);
    const [resultadoCalculo, setResultadoCalculo] = useState(null);
    const [mostrarModalCalculo, setMostrarModalCalculo] = useState(false);

    // --- NOVOS ESTADOS PARA OS FILTROS ---
    const [filtroTipo, setFiltroTipo] = useState('TODOS');
    const [ordenacao, setOrdenacao] = useState('');

    useEffect(() => {
        const buscarCartas = async () => {
            setLoading(true);
            const { data } = await supabase.from('contempladas').select('*').eq('status', 'DISPONÍVEL');
            if (data) setCartas(data);
            setLoading(false);
        };
        buscarCartas();
    }, []);

    // --- NOVA LÓGICA PARA FILTRAR E ORDENAR AS CARTAS ---
    const cartasFiltradasEOrdenadas = useMemo(() => {
        let cartasProcessadas = [...cartas];

        // 1. Aplica o filtro de tipo
        if (filtroTipo !== 'TODOS') {
            cartasProcessadas = cartasProcessadas.filter(c => c.tipo === filtroTipo);
        }

        // 2. Aplica a ordenação
        switch (ordenacao) {
            case 'maior_credito':
                cartasProcessadas.sort((a, b) => b.valor_credito - a.valor_credito);
                break;
            case 'menor_entrada':
                cartasProcessadas.sort((a, b) => a.entrada - b.entrada);
                break;
            case 'menor_parcela':
                cartasProcessadas.sort((a, b) => a.parcela - b.parcela);
                break;
            default:
                break;
        }

        return cartasProcessadas;
    }, [cartas, filtroTipo, ordenacao]);


    const handleSelectCarta = (id) => setSelecionadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    const handleCalcular = () => {
        const cartasParaCalcular = cartas.filter(c => selecionadas.includes(c.id));
        if (cartasParaCalcular.length === 0) return;
        const creditoTotal = cartasParaCalcular.reduce((acc, c) => acc + c.valor_credito, 0);
        const entradaTotal = cartasParaCalcular.reduce((acc, c) => acc + c.entrada, 0);
        const taxaTotal = cartasParaCalcular.reduce((acc, c) => acc + c.taxa_transferencia, 0);
        const sortedCartas = [...cartasParaCalcular].sort((a, b) => a.meses - b.meses);
        const tiers = [...new Set(sortedCartas.map(c => c.meses))].sort((a, b) => a - b);
        let estruturaParcelas = [], saldoDevedor = 0, mesesAnteriores = 0;
        tiers.forEach(tierMeses => {
            const duracaoTier = tierMeses - mesesAnteriores;
            const valorParcelaTier = sortedCartas.filter(c => c.meses >= tierMeses).reduce((acc, c) => acc + c.parcela, 0);
            estruturaParcelas.push({ duracao: duracaoTier, valor: valorParcelaTier });
            saldoDevedor += duracaoTier * valorParcelaTier;
            mesesAnteriores = tierMeses;
        });
        setResultadoCalculo({ creditoTotal, entradaTotal, taxaTotal, saldoDevedor, estruturaParcelas });
        setMostrarModalCalculo(true);
    };

    if (loading) return <div className="text-slate-800 text-center p-20">Carregando cartas...</div>;

    const tiposDeCarta = ['TODOS', 'AUTOMÓVEL', 'IMÓVEL', 'ELETRO'];

    return (
      
        <div>
            {/* Seção de Introdução */}
            <section className="bg-white">
                <div className="container mx-auto px-6 py-12 text-center">
                    <h1 className="text-4xl font-bold mb-4 text-fenix-purple">Cartas de Crédito Contempladas</h1>
                    <p className="text-slate-600 max-w-2xl mx-auto">A oportunidade que você esperava. Filtre, ordene e simule a junção de cartas para realizar seu sonho mais rápido.</p>
                </div>
            </section>

            {/* --- NOVA SEÇÃO DE FILTROS --- */}
            <section className="bg-slate-100 py-6 sticky top-[88px] z-30 shadow-sm">
                <div className="container mx-auto px-6 flex flex-col md:flex-row gap-6 justify-between items-center">
                    {/* Filtro por Tipo */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700">Filtrar por:</span>
                        {tiposDeCarta.map(tipo => (
                            <button 
                                key={tipo} 
                                onClick={() => setFiltroTipo(tipo)}
                                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${filtroTipo === tipo ? 'bg-fenix-purple text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}`}
                            >
                                {tipo}
                            </button>
                        ))}
                    </div>
                    {/* Ordenação */}
                    <div>
                        <select 
                            value={ordenacao} 
                            onChange={(e) => setOrdenacao(e.target.value)}
                            className="bg-white text-slate-700 font-semibold p-3 rounded-lg border border-slate-300"
                        >
                            <option value="">Ordenar por...</option>
                            <option value="maior_credito">Maior Crédito</option>
                            <option value="menor_entrada">Menor Entrada</option>
                            <option value="menor_parcela">Menor Parcela</option>
                        </select>
                    </div>
                </div>
            </section>
            
            {/* Corpo da página com as cartas */}
            <div className="container mx-auto px-6 py-12">
                {/* --- NOVO GUIA DE "COMO USAR" --- */}
                <div className="bg-blue-100 border border-blue-300 text-blue-800 p-4 rounded-lg flex items-center gap-4 mb-8">
                    <FaInfoCircle className="text-2xl" />
                    <div>
                        <h4 className="font-bold">Como Simular</h4>
                        <p className="text-sm"><b>Passo 1:</b> Clique nos cards para selecionar uma ou mais cartas. <b>Passo 2:</b> Clique no botão "Simular Junção" que aparecerá no canto da tela.</p>
                    </div>
                </div>

                {selecionadas.length > 0 && (
                    <div className="fixed bottom-8 right-8 z-40">
                        <button onClick={handleCalcular} className="bg-fenix-orange hover:bg-fenix-purple text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
                            <FaCalculator /> Simular Junção ({selecionadas.length})
                        </button>
                    </div>
                )}
                
                {mostrarModalCalculo && <CalculoModal resultado={resultadoCalculo} onClose={() => setMostrarModalCalculo(false)} />}
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {cartasFiltradasEOrdenadas.length > 0 ? (
                        cartasFiltradasEOrdenadas.map(item => (
                            <CartaCard key={item.id} item={item} isSelected={selecionadas.includes(item.id)} onSelect={handleSelectCarta} />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-16 text-slate-500">
                            <h3 className="text-2xl font-semibold">Nenhuma carta encontrada</h3>
                            <p>Tente ajustar os filtros para ver outros resultados.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}