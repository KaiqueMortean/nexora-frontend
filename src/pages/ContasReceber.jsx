
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const estilos = {
    painel: {
        padding: '22px',
        borderRadius: '12px',
        background: '#fff',
        marginBottom: '20px'
    },
    input: {
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        width: '100%',
        boxSizing: 'border-box'
    },
    celula: {
        padding: '13px',
        borderBottom: '1px solid #e5e7eb',
        textAlign: 'left'
    },
    botao: {
        padding: '10px 14px',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 600,
        cursor: 'pointer'
    }
};

function moeda(valor) {
    return Number(valor ?? 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function dataHoje() {
    const hoje = new Date();

    return [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, '0'),
        String(hoje.getDate()).padStart(2, '0')
    ].join('-');
}

function formatarData(valor) {
    if (!valor) return '—';

    const texto = String(valor);
    const partes = texto.slice(0, 10).split('-');

    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return texto;
}

function obterErro(error, padrao) {
    if (error.response?.status === 401) {
        return 'Sessão expirada. Faça login novamente.';
    }

    const dados = error.response?.data;

    if (typeof dados?.message === 'string') {
        return dados.message;
    }

    if (typeof dados?.erro === 'string') {
        return dados.erro;
    }

    if (typeof dados === 'string' && dados.trim()) {
        return dados;
    }

    return padrao;
}

function podeReceber(conta) {
    return (
        conta.status === 'PENDENTE' ||
        conta.status === 'VENCIDO'
    );
}

function situacaoConta(conta, hoje) {
    if (
        podeReceber(conta) &&
        conta.vencimento &&
        String(conta.vencimento).slice(0, 10) < hoje
    ) {
        return 'VENCIDO';
    }

    return conta.status;
}

function nomeSituacao(status) {
    const nomes = {
        PENDENTE: 'Pendente',
        VENCIDO: 'Vencida',
        PAGO: 'Paga',
        CANCELADO: 'Cancelada'
    };

    return nomes[status] || status;
}

const coresStatus = {
    PENDENTE: {
        fundo: '#fef3c7',
        texto: '#92400e'
    },
    VENCIDO: {
        fundo: '#fee2e2',
        texto: '#b91c1c'
    },
    PAGO: {
        fundo: '#dcfce7',
        texto: '#166534'
    },
    CANCELADO: {
        fundo: '#e5e7eb',
        texto: '#4b5563'
    }
};

function ContasReceber() {
    const [contas, setContas] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [processandoId, setProcessandoId] = useState(null);

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    const [pesquisa, setPesquisa] = useState('');
    const [filtro, setFiltro] = useState('TODAS');

    const hoje = dataHoje();

    async function carregarContas() {
        const resposta = await api.get('/contas-receber');

        if (!Array.isArray(resposta.data)) {
            throw new Error('Resposta inválida ao listar contas.');
        }

        setContas(resposta.data);
    }

    useEffect(() => {
        let ativo = true;

        async function carregar() {
            try {
                const resposta = await api.get('/contas-receber');

                if (!Array.isArray(resposta.data)) {
                    throw new Error('Resposta inválida.');
                }

                if (ativo) {
                    setContas(resposta.data);
                }
            } catch (error) {
                console.error(error);

                if (ativo) {
                    setErro(
                        obterErro(
                            error,
                            'Não foi possível carregar as contas a receber.'
                        )
                    );
                }
            } finally {
                if (ativo) {
                    setCarregando(false);
                }
            }
        }

        carregar();

        return () => {
            ativo = false;
        };
    }, []);

    const resumo = useMemo(() => {
        let emAberto = 0;
        let vencido = 0;
        let recebido = 0;
        let quantidadeAbertas = 0;

        for (const conta of contas) {
            const valor = Number(conta.valor ?? 0);
            const situacao = situacaoConta(conta, hoje);

            if (podeReceber(conta)) {
                emAberto += valor;
                quantidadeAbertas += 1;
            }

            if (situacao === 'VENCIDO') {
                vencido += valor;
            }

            if (conta.status === 'PAGO') {
                recebido += valor;
            }
        }

        return {
            emAberto,
            vencido,
            recebido,
            quantidadeAbertas
        };
    }, [contas, hoje]);

    const contasFiltradas = useMemo(() => {
        const termo = pesquisa.trim().toLowerCase();

        return contas
            .filter(conta => {
                const situacao = situacaoConta(conta, hoje);

                if (
                    filtro !== 'TODAS' &&
                    situacao !== filtro
                ) {
                    return false;
                }

                if (!termo) return true;

                const texto = [
                    conta.id,
                    conta.vendaId,
                    conta.clienteId,
                    conta.cliente,
                    conta.valor
                ]
                    .filter(valor => valor != null)
                    .join(' ')
                    .toLowerCase();

                return texto.includes(termo);
            })
            .sort((a, b) => {
                const aAberta = podeReceber(a);
                const bAberta = podeReceber(b);

                if (aAberta && !bAberta) return -1;
                if (!aAberta && bAberta) return 1;

                return String(a.vencimento ?? '').localeCompare(
                    String(b.vencimento ?? '')
                );
            });
    }, [contas, pesquisa, filtro, hoje]);

    async function atualizar() {
        if (processandoId !== null || carregando) return;

        setErro('');
        setSucesso('');
        setCarregando(true);

        try {
            await carregarContas();
        } catch (error) {
            console.error(error);

            setErro(
                obterErro(
                    error,
                    'Não foi possível atualizar as contas.'
                )
            );
        } finally {
            setCarregando(false);
        }
    }

    async function registrarPagamento(conta) {
        if (
            processandoId !== null ||
            carregando ||
            !podeReceber(conta)
        ) {
            return;
        }

        const confirmado = window.confirm(
            `Confirmar recebimento da conta #${conta.id}?\n\n` +
            `Cliente: ${conta.cliente}\n` +
            `Valor: ${moeda(conta.valor)}\n\n` +
            'ATENÇÃO: O pagamento será registrado como ' +
            'entrada no caixa físico.\n\n' +
            'O caixa precisa estar aberto.'
        );

        if (!confirmado) return;

        setErro('');
        setSucesso('');
        setProcessandoId(conta.id);

        try {
            await api.put(`/contas-receber/${conta.id}/pagar`);

            setSucesso(
                `Pagamento da conta #${conta.id} registrado com sucesso!`
            );

            try {
                await carregarContas();
            } catch (error) {
                console.error(error);

                setErro(
                    'Pagamento registrado, mas não foi possível ' +
                    'atualizar a lista. Recarregue a página.'
                );
            }
        } catch (error) {
            console.error(error);

            setErro(
                obterErro(
                    error,
                    'Não foi possível confirmar o pagamento. ' +
                    'Confira o status da conta antes de tentar novamente.'
                )
            );
        } finally {
            setProcessandoId(null);
        }
    }

    return (
        <section>
            <div className="welcome">
                <h3>Contas a receber</h3>
                <p>
                    Controle vendas fiadas, vencimentos e recebimentos
                    da sua empresa.
                </p>
            </div>

            {erro && (
                <p style={{
                    color: '#dc2626',
                    marginBottom: '16px'
                }}>
                    {erro}
                </p>
            )}

            {sucesso && (
                <p style={{
                    color: '#15803d',
                    marginBottom: '16px'
                }}>
                    {sucesso}
                </p>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns:
                    'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={estilos.painel}>
                    <p style={{ color: '#6b7280' }}>
                        Total em aberto
                    </p>

                    <h2>{moeda(resumo.emAberto)}</h2>

                    <small>
                        {resumo.quantidadeAbertas} contas em aberto
                    </small>
                </div>

                <div style={estilos.painel}>
                    <p style={{ color: '#6b7280' }}>
                        Total vencido
                    </p>

                    <h2 style={{ color: '#dc2626' }}>
                        {moeda(resumo.vencido)}
                    </h2>

                    <small>
                        Valor já incluído no total em aberto
                    </small>
                </div>

                <div style={estilos.painel}>
                    <p style={{ color: '#6b7280' }}>
                        Total recebido
                    </p>

                    <h2 style={{ color: '#15803d' }}>
                        {moeda(resumo.recebido)}
                    </h2>

                    <small>
                        Contas marcadas como pagas
                    </small>
                </div>
            </div>

            <div style={{
                ...estilos.painel,
                background: '#eff6ff',
                border: '1px solid #bfdbfe'
            }}>
                <strong style={{ color: '#1d4ed8' }}>
                    Informações sobre recebimentos
                </strong>

                <p style={{
                    marginTop: '8px',
                    color: '#1e40af'
                }}>
                    Atualmente, a Nexora registra o recebimento
                    de contas fiadas diretamente no caixa físico.
                    Antes de confirmar um pagamento, abra o caixa
                    na seção Caixa.
                </p>
            </div>

            <div style={estilos.painel}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '20px'
                }}>
                    <h3>Gerenciar recebimentos</h3>

                    <button
                        type="button"
                        onClick={atualizar}
                        disabled={
                            carregando || processandoId !== null
                        }
                        style={{
                            ...estilos.botao,
                            background: '#e0e7ff',
                            color: '#1d4ed8'
                        }}
                    >
                        {carregando ? 'Atualizando...' : 'Atualizar'}
                    </button>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    marginBottom: '24px'
                }}>
                    <input
                        type="search"
                        placeholder="Buscar cliente ou venda..."
                        value={pesquisa}
                        onChange={e => setPesquisa(e.target.value)}
                        style={estilos.input}
                    />

                    <select
                        value={filtro}
                        onChange={e => setFiltro(e.target.value)}
                        style={estilos.input}
                    >
                        <option value="TODAS">
                            Todas as contas
                        </option>

                        <option value="PENDENTE">
                            Pendentes
                        </option>

                        <option value="VENCIDO">
                            Vencidas
                        </option>

                        <option value="PAGO">
                            Pagas
                        </option>

                        <option value="CANCELADO">
                            Canceladas
                        </option>
                    </select>
                </div>

                {carregando ? (
                    <p>Carregando contas...</p>
                ) : contasFiltradas.length === 0 ? (
                    <p>Nenhuma conta encontrada.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                            <tr>
                                <th style={estilos.celula}>Conta</th>
                                <th style={estilos.celula}>Cliente</th>
                                <th style={estilos.celula}>Venda</th>
                                <th style={estilos.celula}>Valor</th>
                                <th style={estilos.celula}>Vencimento</th>
                                <th style={estilos.celula}>Situação</th>
                                <th style={estilos.celula}>Ações</th>
                            </tr>
                            </thead>

                            <tbody>
                            {contasFiltradas.map(conta => {
                                const situacao =
                                    situacaoConta(conta, hoje);

                                const cor = coresStatus[situacao] || {
                                    fundo: '#e5e7eb',
                                    texto: '#374151'
                                };

                                return (
                                    <tr key={conta.id}>
                                        <td style={estilos.celula}>
                                            #{conta.id}
                                        </td>

                                        <td style={estilos.celula}>
                                            {conta.cliente || '—'}
                                        </td>

                                        <td style={estilos.celula}>
                                            #{conta.vendaId}
                                        </td>

                                        <td style={estilos.celula}>
                                            {moeda(conta.valor)}
                                        </td>

                                        <td style={estilos.celula}>
                                            {formatarData(conta.vencimento)}
                                        </td>

                                        <td style={estilos.celula}>
                        <span style={{
                            display: 'inline-block',
                            padding: '5px 10px',
                            borderRadius: '20px',
                            background: cor.fundo,
                            color: cor.texto,
                            fontSize: '12px',
                            fontWeight: 700
                        }}>
                          {nomeSituacao(situacao)}
                        </span>
                                        </td>

                                        <td style={estilos.celula}>
                                            {podeReceber(conta) ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        registrarPagamento(conta)
                                                    }
                                                    disabled={
                                                        processandoId !== null ||
                                                        carregando
                                                    }
                                                    style={{
                                                        ...estilos.botao,
                                                        background: '#16a34a',
                                                        color: '#fff'
                                                    }}
                                                >
                                                    {processandoId === conta.id
                                                        ? 'Registrando...'
                                                        : 'Registrar pagamento'}
                                                </button>
                                            ) : (
                                                <span style={{
                                                    color: '#6b7280'
                                                }}>
                            {conta.status === 'PAGO'
                                ? `Pago em ${formatarData(
                                    conta.dataPagamento
                                )}`
                                : '—'}
                          </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}

export default ContasReceber;
