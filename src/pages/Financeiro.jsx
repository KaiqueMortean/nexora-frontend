
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const card = {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #e5e7eb'
};

const moeda = valor =>
    Number(valor ?? 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

function dataLocal() {
    const agora = new Date();

    return [
        agora.getFullYear(),
        String(agora.getMonth() + 1).padStart(2, '0'),
        String(agora.getDate()).padStart(2, '0')
    ].join('-');
}

function formatarData(valor) {
    if (!valor) return '—';

    const data = String(valor).slice(0, 10);
    const partes = data.split('-');

    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarDataHora(valor) {
    if (!valor) return '—';

    const data = String(valor);

    return (
        formatarData(data) +
        (data.length >= 16
            ? ` ${data.slice(11, 16)}`
            : '')
    );
}

function erroApi(error, padrao) {
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

    return padrao;
}

function statusEfetivo(conta, tipo, hoje) {
    const vencimento =
        tipo === 'receber'
            ? conta.vencimento
            : conta.dataVencimento;

    if (
        (conta.status === 'PENDENTE' ||
            conta.status === 'VENCIDO') &&
        vencimento &&
        String(vencimento).slice(0, 10) < hoje
    ) {
        return 'VENCIDO';
    }

    return conta.status;
}

function aberta(conta) {
    return (
        conta.status === 'PENDENTE' ||
        conta.status === 'VENCIDO'
    );
}

function indicador(titulo, valor, detalhe, cor) {
    return (
        <div style={card}>
            <p style={{
                color: '#64748b',
                fontSize: 14,
                marginBottom: 10
            }}>
                {titulo}
            </p>

            <h2 style={{
                color: cor || '#0f172a',
                margin: '0 0 8px'
            }}>
                {valor}
            </h2>

            <small style={{ color: '#64748b' }}>
                {detalhe}
            </small>
        </div>
    );
}

export default function Financeiro() {
    const [receber, setReceber] = useState([]);
    const [pagar, setPagar] = useState([]);
    const [movimentacoes, setMovimentacoes] =
        useState([]);

    const [caixa, setCaixa] = useState(null);
    const [saldoCaixa, setSaldoCaixa] = useState(null);

    const [carregando, setCarregando] = useState(true);
    const [atualizacao, setAtualizacao] = useState(0);
    const [erros, setErros] = useState([]);

    const [filtro, setFiltro] = useState('TODAS');

    const hoje = dataLocal();

    useEffect(() => {
        let ativo = true;

        async function carregar() {
            setCarregando(true);

            const resultados = await Promise.allSettled([
                api.get('/contas-receber'),
                api.get('/contas-pagar'),
                api.get('/caixas/aberto')
            ]);

            if (!ativo) return;

            const mensagens = [];

            const [resultadoReceber, resultadoPagar, resultadoCaixa] =
                resultados;

            if (
                resultadoReceber.status === 'fulfilled' &&
                Array.isArray(resultadoReceber.value.data)
            ) {
                setReceber(resultadoReceber.value.data);
            } else {
                setReceber([]);
                mensagens.push('Falha ao carregar contas a receber.');
            }

            if (
                resultadoPagar.status === 'fulfilled' &&
                Array.isArray(resultadoPagar.value.data)
            ) {
                setPagar(resultadoPagar.value.data);
            } else {
                setPagar([]);
                mensagens.push('Falha ao carregar contas a pagar.');
            }

            if (resultadoCaixa.status === 'fulfilled') {
                const caixaAtual = resultadoCaixa.value.data;

                setCaixa(caixaAtual);

                const dadosCaixa = await Promise.allSettled([
                    api.get('/caixas/saldo'),
                    api.get('/caixas/movimentacoes')
                ]);

                if (!ativo) return;

                if (dadosCaixa[0].status === 'fulfilled') {
                    const valor = Number(dadosCaixa[0].value.data);

                    if (Number.isFinite(valor)) {
                        setSaldoCaixa(valor);
                    } else {
                        setSaldoCaixa(null);
                        mensagens.push('Saldo do caixa inválido.');
                    }
                } else {
                    setSaldoCaixa(null);
                    mensagens.push('Falha ao consultar saldo do caixa.');
                }

                if (
                    dadosCaixa[1].status === 'fulfilled' &&
                    Array.isArray(dadosCaixa[1].value.data)
                ) {
                    setMovimentacoes(dadosCaixa[1].value.data);
                } else {
                    setMovimentacoes([]);
                    mensagens.push(
                        'Falha ao carregar movimentações do caixa.'
                    );
                }
            } else {
                setCaixa(null);
                setSaldoCaixa(null);
                setMovimentacoes([]);

                const falha = resultadoCaixa.reason;

                if (falha.response?.status !== 404) {
                    mensagens.push(
                        erroApi(
                            falha,
                            'Não foi possível consultar o caixa.'
                        )
                    );
                }
            }

            if (ativo) {
                setErros(mensagens);
                setCarregando(false);
            }
        }

        carregar();

        return () => {
            ativo = false;
        };
    }, [atualizacao]);

    const resumo = useMemo(() => {
        const resultado = {
            receber: 0,
            pagar: 0,
            receberVencido: 0,
            pagarVencido: 0,
            recebido: 0,
            pago: 0,
            quantidadeReceber: 0,
            quantidadePagar: 0
        };

        for (const conta of receber) {
            const valor = Number(conta.valor ?? 0);
            const status = statusEfetivo(
                conta,
                'receber',
                hoje
            );

            if (aberta(conta)) {
                resultado.receber += valor;
                resultado.quantidadeReceber++;
            }

            if (status === 'VENCIDO') {
                resultado.receberVencido += valor;
            }

            if (status === 'PAGO') {
                resultado.recebido += valor;
            }
        }

        for (const conta of pagar) {
            const valor = Number(conta.valor ?? 0);
            const status = statusEfetivo(
                conta,
                'pagar',
                hoje
            );

            if (aberta(conta)) {
                resultado.pagar += valor;
                resultado.quantidadePagar++;
            }

            if (status === 'VENCIDO') {
                resultado.pagarVencido += valor;
            }

            if (status === 'PAGO') {
                resultado.pago += valor;
            }
        }

        return resultado;
    }, [receber, pagar, hoje]);

    const projecao =
        saldoCaixa === null
            ? null
            : saldoCaixa + resumo.receber - resumo.pagar;

    const compromissos = useMemo(() => {
        const lista = [
            ...receber
                .filter(aberta)
                .map(conta => ({
                    id: `R-${conta.id}`,
                    tipo: 'RECEBER',
                    descricao: conta.cliente ||
                        `Venda #${conta.vendaId ?? conta.id}`,
                    valor: Number(conta.valor ?? 0),
                    vencimento: conta.vencimento,
                    status: statusEfetivo(
                        conta,
                        'receber',
                        hoje
                    )
                })),

            ...pagar
                .filter(aberta)
                .map(conta => ({
                    id: `P-${conta.id}`,
                    tipo: 'PAGAR',
                    descricao: conta.descricao,
                    valor: Number(conta.valor ?? 0),
                    vencimento: conta.dataVencimento,
                    status: statusEfetivo(
                        conta,
                        'pagar',
                        hoje
                    )
                }))
        ];

        return lista
            .filter(item =>
                filtro === 'TODAS' ||
                item.tipo === filtro
            )
            .sort((a, b) =>
                String(a.vencimento ?? '').localeCompare(
                    String(b.vencimento ?? '')
                )
            )
            .slice(0, 10);
    }, [receber, pagar, hoje, filtro]);

    const recentes = useMemo(() => {
        return [...movimentacoes]
            .sort((a, b) =>
                String(b.data ?? '').localeCompare(
                    String(a.data ?? '')
                )
            )
            .slice(0, 8);
    }, [movimentacoes]);

    return (
        <section>
            <div className="welcome">
                <h3>Visão financeira geral</h3>
                <p>
                    Acompanhe as obrigações financeiras,
                    recebimentos e movimentações do caixa.
                </p>
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 20
            }}>
        <span style={{ color: '#64748b' }}>
          {caixa
              ? `Caixa #${caixa.id} aberto`
              : 'Nenhum caixa aberto identificado'}
        </span>

                <button
                    type="button"
                    disabled={carregando}
                    onClick={() =>
                        setAtualizacao(valor => valor + 1)
                    }
                    style={{
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 16px',
                        cursor: 'pointer'
                    }}
                >
                    {carregando ? 'Atualizando...' : 'Atualizar'}
                </button>
            </div>

            {erros.length > 0 && (
                <div style={{
                    ...card,
                    marginBottom: 20,
                    borderColor: '#fca5a5',
                    color: '#b91c1c'
                }}>
                    <strong>
                        Algumas informações não foram carregadas:
                    </strong>

                    {erros.map((erro, indice) => (
                        <p key={indice}>{erro}</p>
                    ))}

                    <small>
                        Indicadores de fontes indisponíveis podem
                        estar incompletos. Atualize para tentar
                        novamente.
                    </small>
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns:
                    'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 16,
                marginBottom: 24
            }}>
                {indicador(
                    'Contas a receber',
                    carregando ? '...' : moeda(resumo.receber),
                    `${resumo.quantidadeReceber} contas em aberto`,
                    '#15803d'
                )}

                {indicador(
                    'Contas a pagar',
                    carregando ? '...' : moeda(resumo.pagar),
                    `${resumo.quantidadePagar} contas em aberto`,
                    '#dc2626'
                )}

                {indicador(
                    'Saldo do caixa',
                    carregando
                        ? '...'
                        : saldoCaixa === null
                            ? 'Indisponível'
                            : moeda(saldoCaixa),
                    caixa
                        ? 'Saldo do caixa aberto'
                        : 'Não há caixa aberto',
                    '#0f172a'
                )}

                {indicador(
                    'Saldo projetado',
                    carregando
                        ? '...'
                        : projecao === null
                            ? 'Indisponível'
                            : moeda(projecao),
                    'Caixa + recebíveis - contas a pagar',
                    projecao !== null && projecao < 0
                        ? '#dc2626'
                        : '#2563eb'
                )}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 24
            }}>
                {indicador(
                    'Recebimentos vencidos',
                    carregando
                        ? '...'
                        : moeda(resumo.receberVencido),
                    'Valores em atraso',
                    '#b45309'
                )}

                {indicador(
                    'Pagamentos vencidos',
                    carregando
                        ? '...'
                        : moeda(resumo.pagarVencido),
                    'Obrigações atrasadas',
                    '#dc2626'
                )}

                {indicador(
                    'Contas recebidas',
                    carregando
                        ? '...'
                        : moeda(resumo.recebido),
                    'Total histórico de contas pagas por clientes',
                    '#15803d'
                )}

                {indicador(
                    'Despesas pagas',
                    carregando
                        ? '...'
                        : moeda(resumo.pago),
                    'Total histórico de despesas pagas',
                    '#475569'
                )}
            </div>

            <div style={{
                ...card,
                marginBottom: 24
            }}>
                <h3 style={{ marginBottom: 8 }}>
                    Próximos compromissos
                </h3>

                <p style={{
                    color: '#64748b',
                    fontSize: 14,
                    marginBottom: 18
                }}>
                    As 10 contas abertas com vencimentos mais
                    próximos, incluindo contas atrasadas.
                </p>

                <select
                    value={filtro}
                    onChange={e => setFiltro(e.target.value)}
                    style={{
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        marginBottom: 18
                    }}
                >
                    <option value="TODAS">
                        Todos os compromissos
                    </option>
                    <option value="RECEBER">
                        Apenas a receber
                    </option>
                    <option value="PAGAR">
                        Apenas a pagar
                    </option>
                </select>

                {carregando ? (
                    <p>Carregando compromissos...</p>
                ) : compromissos.length === 0 ? (
                    <p>Nenhum compromisso encontrado.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                            <tr>
                                {[
                                    'Tipo',
                                    'Descrição',
                                    'Valor',
                                    'Vencimento',
                                    'Status'
                                ].map(titulo => (
                                    <th
                                        key={titulo}
                                        style={{
                                            padding: 12,
                                            textAlign: 'left',
                                            borderBottom:
                                                '1px solid #e5e7eb'
                                        }}
                                    >
                                        {titulo}
                                    </th>
                                ))}
                            </tr>
                            </thead>

                            <tbody>
                            {compromissos.map(item => (
                                <tr key={item.id}>
                                    <td style={{ padding: 12 }}>
                                        <strong style={{
                                            color:
                                                item.tipo === 'RECEBER'
                                                    ? '#15803d'
                                                    : '#dc2626'
                                        }}>
                                            {item.tipo === 'RECEBER'
                                                ? 'Entrada'
                                                : 'Saída'}
                                        </strong>
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        {item.descricao}
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        {moeda(item.valor)}
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        {formatarData(item.vencimento)}
                                    </td>

                                    <td style={{ padding: 12 }}>
                      <span style={{
                          color:
                              item.status === 'VENCIDO'
                                  ? '#dc2626'
                                  : '#92400e',
                          fontWeight: 600
                      }}>
                        {item.status === 'VENCIDO'
                            ? 'Vencido'
                            : 'Pendente'}
                      </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={card}>
                <h3 style={{ marginBottom: 8 }}>
                    Últimas movimentações do caixa
                </h3>

                <p style={{
                    color: '#64748b',
                    fontSize: 14,
                    marginBottom: 18
                }}>
                    Histórico das últimas 8 movimentações
                    do caixa atualmente aberto.
                </p>

                {carregando ? (
                    <p>Carregando movimentações...</p>
                ) : !caixa ? (
                    <p>
                        Abra um caixa para visualizar suas
                        movimentações atuais.
                    </p>
                ) : recentes.length === 0 ? (
                    <p>Nenhuma movimentação encontrada.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                            <tr>
                                {[
                                    'Data',
                                    'Descrição',
                                    'Tipo',
                                    'Valor'
                                ].map(titulo => (
                                    <th
                                        key={titulo}
                                        style={{
                                            padding: 12,
                                            textAlign: 'left',
                                            borderBottom:
                                                '1px solid #e5e7eb'
                                        }}
                                    >
                                        {titulo}
                                    </th>
                                ))}
                            </tr>
                            </thead>

                            <tbody>
                            {recentes.map(movimentacao => (
                                <tr key={movimentacao.id}>
                                    <td style={{ padding: 12 }}>
                                        {formatarDataHora(
                                            movimentacao.data
                                        )}
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        {movimentacao.descricao || '—'}
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        {movimentacao.tipo}
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        {moeda(movimentacao.valor)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <p style={{
                color: '#64748b',
                fontSize: 12,
                marginTop: 18
            }}>
                O saldo projetado é uma estimativa baseada
                no caixa aberto e nas contas pendentes.
                Não inclui saldos bancários, novas vendas,
                despesas futuras não cadastradas ou
                recebimentos incertos.
            </p>
        </section>
    );
}
