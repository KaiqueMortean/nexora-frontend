
import { useEffect, useState } from 'react';
import api from '../services/api';

function Caixa() {
    const [caixa, setCaixa] = useState(null);
    const [saldo, setSaldo] = useState(null);
    const [saldoInicial, setSaldoInicial] = useState('0');

    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(false);

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    function formatarMoeda(valor) {
        return Number(valor ?? 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    function mensagemErro(error, padrao) {
        if (error.response?.status === 401) {
            return 'Sua sessão expirou. Faça login novamente.';
        }

        const dados = error.response?.data;

        if (typeof dados === 'string' && dados.trim()) {
            return dados;
        }

        if (typeof dados?.message === 'string') {
            return dados.message;
        }

        return padrao;
    }

    async function consultarCaixa() {
        setCarregando(true);
        setErro('');

        try {
            const resposta = await api.get('/caixas/aberto');

            setCaixa(resposta.data);

            try {
                const respostaSaldo = await api.get('/caixas/saldo');
                setSaldo(respostaSaldo.data);
            } catch (error) {
                console.error('Erro ao consultar saldo:', error);
                setSaldo(null);
                setErro(
                    mensagemErro(
                        error,
                        'Caixa encontrado, mas não foi possível consultar o saldo.'
                    )
                );
            }

        } catch (error) {
            if (error.response?.status === 404) {
                setCaixa(null);
                setSaldo(null);
            } else {
                console.error('Erro ao consultar caixa:', error);

                setCaixa(null);
                setSaldo(null);

                setErro(
                    mensagemErro(
                        error,
                        'Não foi possível consultar o caixa.'
                    )
                );
            }
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        consultarCaixa();
    }, []);

    async function abrirCaixa(evento) {
        evento.preventDefault();

        if (processando) return;

        setErro('');
        setSucesso('');

        const valor = Number(saldoInicial);

        if (
            saldoInicial.trim() === '' ||
            !Number.isFinite(valor) ||
            valor < 0
        ) {
            setErro('Informe um saldo inicial válido.');
            return;
        }

        setProcessando(true);

        try {
            await api.post('/caixas/abrir', {
                saldoInicial: valor
            });

            setSucesso('Caixa aberto com sucesso!');
            setSaldoInicial('0');

            await consultarCaixa();

        } catch (error) {
            console.error('Erro ao abrir caixa:', error);

            setErro(
                mensagemErro(
                    error,
                    'Não foi possível confirmar a abertura do caixa.'
                )
            );
        } finally {
            setProcessando(false);
        }
    }

    async function fecharCaixa() {
        if (processando) return;

        const confirmado = window.confirm(
            'Deseja realmente fechar o caixa atual?'
        );

        if (!confirmado) return;

        setErro('');
        setSucesso('');
        setProcessando(true);

        try {
            const resposta = await api.post('/caixas/fechar');

            setCaixa(null);
            setSaldo(null);

            setSucesso(
                'Caixa fechado com sucesso! Saldo final: ' +
                formatarMoeda(resposta.data.saldoFinal)
            );

        } catch (error) {
            console.error('Erro ao fechar caixa:', error);

            setErro(
                mensagemErro(
                    error,
                    'Não foi possível confirmar o fechamento do caixa.'
                )
            );
        } finally {
            setProcessando(false);
        }
    }

    const estiloBotao = {
        background: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 20px',
        fontWeight: '600',
        cursor: 'pointer'
    };

    return (
        <section>
            <div className="welcome">
                <h3>Controle de caixa</h3>
                <p>
                    Abra, consulte e feche o caixa da sua empresa.
                </p>
            </div>

            {sucesso && (
                <p style={{
                    color: '#15803d',
                    marginBottom: '16px'
                }}>
                    {sucesso}
                </p>
            )}

            {erro && (
                <p style={{
                    color: '#dc2626',
                    marginBottom: '16px'
                }}>
                    {erro}
                </p>
            )}

            {carregando ? (
                <div className="empty-panel">
                    <p>Consultando caixa...</p>
                </div>
            ) : caixa ? (
                <div className="empty-panel">
                    <h3>Caixa aberto</h3>

                    <p style={{ marginTop: '12px' }}>
                        <strong>Caixa:</strong> #{caixa.id}
                    </p>

                    <p>
                        <strong>Status:</strong> {caixa.status}
                    </p>

                    <p>
                        <strong>Saldo inicial:</strong>{' '}
                        {formatarMoeda(caixa.saldoInicial)}
                    </p>

                    <p>
                        <strong>Saldo atual:</strong>{' '}
                        {saldo === null
                            ? 'Indisponível'
                            : formatarMoeda(saldo)}
                    </p>

                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginTop: '20px'
                    }}>
                        <button
                            type="button"
                            onClick={consultarCaixa}
                            disabled={processando}
                            style={estiloBotao}
                        >
                            Atualizar saldo
                        </button>

                        <button
                            type="button"
                            onClick={fecharCaixa}
                            disabled={processando}
                            style={{
                                ...estiloBotao,
                                background: '#dc2626'
                            }}
                        >
                            {processando
                                ? 'Processando...'
                                : 'Fechar caixa'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="empty-panel">
                    <h3>Abrir caixa</h3>

                    <p style={{ margin: '12px 0 20px' }}>
                        Nenhum caixa aberto foi encontrado.
                    </p>

                    <form onSubmit={abrirCaixa}>
                        <label htmlFor="saldo-inicial">
                            Saldo inicial (R$)
                        </label>

                        <input
                            id="saldo-inicial"
                            type="number"
                            min="0"
                            step="0.01"
                            value={saldoInicial}
                            onChange={e => setSaldoInicial(e.target.value)}
                            disabled={processando}
                            required
                            style={{
                                display: 'block',
                                width: '100%',
                                maxWidth: '300px',
                                padding: '12px',
                                marginTop: '8px',
                                marginBottom: '20px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                boxSizing: 'border-box'
                            }}
                        />

                        <button
                            type="submit"
                            disabled={processando}
                            style={estiloBotao}
                        >
                            {processando
                                ? 'Abrindo...'
                                : 'Abrir caixa'}
                        </button>
                    </form>
                </div>
            )}
        </section>
    );
}

export default Caixa;
