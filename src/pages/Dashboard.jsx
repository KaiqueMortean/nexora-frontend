
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import AlertasEstoque from '../components/AlertasEstoque';

const estilos = {
    painel: {
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 20
    },
    grade: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16
    },
    botao: {
        background: '#2563eb',
        color: '#fff',
        border: 0,
        borderRadius: 8,
        padding: '11px 18px',
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

function numero(valor) {
    return Number(valor ?? 0).toLocaleString('pt-BR');
}

function dataLocal(data = new Date()) {
    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, '0'),
        String(data.getDate()).padStart(2, '0')
    ].join('-');
}

function inicioMes() {
    const hoje = new Date();

    return dataLocal(
        new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    );
}

function formatarData(valor) {
    if (!valor) return '—';

    const partes = String(valor).slice(0, 10).split('-');

    if (partes.length !== 3) return String(valor);

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function mensagemErro(error) {
    if (error.response?.status === 401) {
        return 'Sua sessão expirou. Faça login novamente.';
    }

    return (
        error.response?.data?.message ||
        error.response?.data?.erro ||
        'Não foi possível carregar o Dashboard.'
    );
}

function Indicador({ titulo, valor, detalhe, cor }) {
    return (
        <div style={estilos.painel}>
            <p style={{
                color: '#64748b',
                fontSize: 14,
                marginBottom: 10
            }}>
                {titulo}
            </p>

            <h2 style={{
                color: cor || '#0f172a',
                margin: '0 0 8px',
                fontSize: 26
            }}>
                {valor}
            </h2>

            <small style={{ color: '#64748b' }}>
                {detalhe}
            </small>
        </div>
    );
}

function GraficoFaturamento({ dados }) {
    const pontos = useMemo(() => {
        if (!Array.isArray(dados)) return [];

        return dados
            .map(item => ({
                data: item.data,
                faturamento: Number(item.faturamento ?? 0),
                quantidadeVendas: Number(item.quantidadeVendas ?? 0)
            }))
            .filter(item =>
                item.data &&
                Number.isFinite(item.faturamento)
            )
            .sort((a, b) =>
                String(a.data).localeCompare(String(b.data))
            );
    }, [dados]);

    if (pontos.length === 0) {
        return (
            <p style={{ color: '#64748b' }}>
                Nenhum dado de faturamento encontrado.
            </p>
        );
    }

    const largura = 800;
    const altura = 260;
    const margem = 45;

    const maior = Math.max(
        1,
        ...pontos.map(item => item.faturamento)
    );

    const larguraUtil = largura - margem * 2;
    const alturaUtil = altura - margem * 2;

    const coordenadas = pontos.map((item, indice) => {
        const x = pontos.length === 1
            ? largura / 2
            : margem +
            (indice / (pontos.length - 1)) * larguraUtil;

        const y = altura - margem -
            (item.faturamento / maior) * alturaUtil;

        return { ...item, x, y };
    });

    const linha = coordenadas
        .map(item => `${item.x},${item.y}`)
        .join(' ');

    return (
        <>
            <div style={{ overflowX: 'auto' }}>
                <svg
                    viewBox={`0 0 ${largura} ${altura}`}
                    style={{
                        width: '100%',
                        minWidth: 420,
                        height: 'auto'
                    }}
                    role="img"
                    aria-label="Gráfico de faturamento diário"
                >
                    {[0, 0.25, 0.5, 0.75, 1].map(fator => {
                        const y = altura - margem -
                            fator * alturaUtil;

                        return (
                            <g key={fator}>
                                <line
                                    x1={margem}
                                    y1={y}
                                    x2={largura - margem}
                                    y2={y}
                                    stroke="#e5e7eb"
                                    strokeDasharray="4 4"
                                />

                                <text
                                    x={5}
                                    y={y + 4}
                                    fontSize={11}
                                    fill="#64748b"
                                >
                                    {numero(Math.round(maior * fator))}
                                </text>
                            </g>
                        );
                    })}

                    <polyline
                        points={linha}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth={3}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    {coordenadas.map((item, indice) => (
                        <circle
                            key={`${item.data}-${indice}`}
                            cx={item.x}
                            cy={item.y}
                            r={5}
                            fill="#2563eb"
                        >
                            <title>
                                {`${formatarData(item.data)}
Faturamento: ${moeda(item.faturamento)}
Vendas: ${numero(item.quantidadeVendas)}`}
                            </title>
                        </circle>
                    ))}
                </svg>
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#64748b',
                fontSize: 12
            }}>
                <span>{formatarData(pontos[0].data)}</span>
                <span>
          {formatarData(pontos[pontos.length - 1].data)}
        </span>
            </div>
        </>
    );
}

function TabelaProdutos({ produtos }) {
    if (!Array.isArray(produtos) || produtos.length === 0) {
        return (
            <p style={{ color: '#64748b' }}>
                Nenhuma venda de produto encontrada no período.
            </p>
        );
    }

    const ordenados = [...produtos].sort(
        (a, b) =>
            Number(b.quantidadeVendida ?? 0) -
            Number(a.quantidadeVendida ?? 0)
    );

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 500
            }}>
                <thead>
                <tr>
                    {[
                        'Produto',
                        'Unidades vendidas',
                        'Faturamento'
                    ].map(titulo => (
                        <th
                            key={titulo}
                            style={{
                                textAlign: 'left',
                                padding: 12,
                                color: '#64748b',
                                fontSize: 13
                            }}
                        >
                            {titulo}
                        </th>
                    ))}
                </tr>
                </thead>

                <tbody>
                {ordenados.map((produto, indice) => (
                    <tr key={produto.produtoId ?? indice}>
                        <td style={{
                            padding: 12,
                            borderTop: '1px solid #e5e7eb'
                        }}>
                            <strong>
                                {produto.nomeProduto || 'Produto sem nome'}
                            </strong>
                        </td>

                        <td style={{
                            padding: 12,
                            borderTop: '1px solid #e5e7eb'
                        }}>
                            {numero(produto.quantidadeVendida)}
                        </td>

                        <td style={{
                            padding: 12,
                            borderTop: '1px solid #e5e7eb',
                            color: '#15803d',
                            fontWeight: 600
                        }}>
                            {moeda(produto.faturamentoTotal)}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default function Dashboard({ onVerProdutos }) {
    const [inicio, setInicio] = useState(inicioMes);
    const [fim, setFim] = useState(dataLocal);

    const [dados, setDados] = useState(null);
    const [produtos, setProdutos] = useState(null);
    const [receber, setReceber] = useState(null);

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [atualizacao, setAtualizacao] = useState(0);

    useEffect(() => {
        let ativo = true;

        async function carregar() {
            if (!inicio || !fim || inicio > fim) {
                setDados(null);
                setProdutos(null);
                setReceber(null);
                setErro('Informe um período válido.');
                setCarregando(false);
                return;
            }

            setCarregando(true);
            setErro('');

            const resultados = await Promise.allSettled([
                api.get('/dashboard', {
                    params: { inicio, fim }
                }),
                api.get('/produtos'),
                api.get('/contas-receber')
            ]);

            if (!ativo) return;

            const falhas = [];

            if (resultados[0].status === 'fulfilled') {
                setDados(resultados[0].value.data);
            } else {
                setDados(null);
                falhas.push(mensagemErro(resultados[0].reason));
            }

            if (
                resultados[1].status === 'fulfilled' &&
                Array.isArray(resultados[1].value.data)
            ) {
                setProdutos(resultados[1].value.data);
            } else {
                setProdutos(null);
                falhas.push('Falha ao consultar produtos.');
            }

            if (
                resultados[2].status === 'fulfilled' &&
                Array.isArray(resultados[2].value.data)
            ) {
                setReceber(resultados[2].value.data);
            } else {
                setReceber(null);
                falhas.push('Falha ao consultar contas a receber.');
            }

            setErro(falhas.join(' '));
            setCarregando(false);
        }

        carregar();

        return () => {
            ativo = false;
        };
    }, [inicio, fim, atualizacao]);

    const resumoEstoque = useMemo(() => {
        if (!produtos) return null;

        return {
            total: produtos.length,
            baixo: produtos.filter(
                item => Number(item.estoque ?? 0) <= 5
            ).length
        };
    }, [produtos]);

    const resumoReceber = useMemo(() => {
        if (!receber) return null;

        const hoje = dataLocal();

        let aberto = 0;
        let vencido = 0;

        for (const conta of receber) {
            if (
                conta.status !== 'PENDENTE' &&
                conta.status !== 'VENCIDO'
            ) {
                continue;
            }

            const valor = Number(conta.valor ?? 0);

            aberto += valor;

            if (
                conta.status === 'VENCIDO' ||
                (
                    conta.vencimento &&
                    String(conta.vencimento).slice(0, 10) < hoje
                )
            ) {
                vencido += valor;
            }
        }

        return { aberto, vencido };
    }, [receber]);

    const contasPagar = dados?.contasPagar;

    const formasPagamento = [
        { nome: 'Dinheiro', valor: dados?.totalDinheiro },
        { nome: 'PIX', valor: dados?.totalPix },
        {
            nome: 'Cartão de débito',
            valor: dados?.totalCartaoDebito
        },
        {
            nome: 'Cartão de crédito',
            valor: dados?.totalCartaoCredito
        },
        { nome: 'Fiado', valor: dados?.totalFiado }
    ];

    const maiorForma = Math.max(
        1,
        ...formasPagamento.map(
            item => Number(item.valor ?? 0)
        )
    );

    function valorOuIndisponivel(valor, tipo = 'moeda') {
        if (carregando) return '...';
        if (valor === null || valor === undefined) {
            return 'Indisponível';
        }

        return tipo === 'numero' ? numero(valor) : moeda(valor);
    }

    return (
        <section>
            <div className="welcome">
                <h3>Dashboard Empresarial</h3>
                <p>
                    Acompanhe o desempenho comercial e a
                    situação financeira da sua empresa.
                </p>
            </div>

            <div style={{
                ...estilos.painel,
                marginBottom: 20
            }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'end',
                    gap: 14
                }}>
                    <label>
                        Data inicial
                        <input
                            type="date"
                            value={inicio}
                            onChange={e => setInicio(e.target.value)}
                            style={{
                                display: 'block',
                                padding: 10,
                                marginTop: 5,
                                border: '1px solid #cbd5e1',
                                borderRadius: 8
                            }}
                        />
                    </label>

                    <label>
                        Data final
                        <input
                            type="date"
                            value={fim}
                            onChange={e => setFim(e.target.value)}
                            style={{
                                display: 'block',
                                padding: 10,
                                marginTop: 5,
                                border: '1px solid #cbd5e1',
                                borderRadius: 8
                            }}
                        />
                    </label>

                    <button
                        type="button"
                        disabled={carregando}
                        onClick={() =>
                            setAtualizacao(valor => valor + 1)
                        }
                        style={{
                            ...estilos.botao,
                            opacity: carregando ? 0.6 : 1
                        }}
                    >
                        {carregando ? 'Carregando...' : 'Atualizar'}
                    </button>
                </div>
            </div>

            {erro && (
                <p style={{
                    color: '#b91c1c',
                    marginBottom: 20
                }}>
                    {erro}
                </p>
            )}

            <h3>Desempenho comercial</h3>

            <div style={{
                ...estilos.grade,
                marginBottom: 24
            }}>
                <Indicador
                    titulo="Faturamento"
                    valor={valorOuIndisponivel(dados?.faturamentoTotal)}
                    detalhe="Vendas no período selecionado"
                    cor="#15803d"
                />

                <Indicador
                    titulo="Vendas realizadas"
                    valor={valorOuIndisponivel(
                        dados?.quantidadeVendas,
                        'numero'
                    )}
                    detalhe="Quantidade de vendas no período"
                />

                <Indicador
                    titulo="Ticket médio"
                    valor={valorOuIndisponivel(dados?.ticketMedio)}
                    detalhe="Valor médio por venda"
                />

                <Indicador
                    titulo="Unidades vendidas"
                    valor={valorOuIndisponivel(
                        dados?.unidadesVendidas,
                        'numero'
                    )}
                    detalhe="Quantidade de itens vendidos"
                />
            </div>

            <div style={{
                ...estilos.painel,
                marginBottom: 24
            }}>
                <h3>Faturamento diário</h3>

                <p style={{
                    color: '#64748b',
                    marginBottom: 20
                }}>
                    Evolução do faturamento no período selecionado.
                    Passe o mouse sobre os pontos para visualizar
                    o valor e a quantidade de vendas.
                </p>

                {carregando ? (
                    <p>Carregando gráfico...</p>
                ) : dados ? (
                    <GraficoFaturamento
                        dados={dados.faturamentoDiario}
                    />
                ) : (
                    <p>Dados indisponíveis.</p>
                )}
            </div>

            <div style={{
                ...estilos.painel,
                marginBottom: 24
            }}>
                <h3>Vendas por forma de pagamento</h3>

                <p style={{
                    color: '#64748b',
                    marginBottom: 20
                }}>
                    Distribuição das vendas no período.
                    Fiado representa vendas a prazo,
                    não necessariamente dinheiro recebido.
                </p>

                {carregando || !dados ? (
                    <p>
                        {carregando
                            ? 'Carregando...'
                            : 'Dados indisponíveis.'}
                    </p>
                ) : (
                    formasPagamento.map(item => {
                        const valor = Number(item.valor ?? 0);

                        return (
                            <div
                                key={item.nome}
                                style={{ marginBottom: 18 }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    marginBottom: 7
                                }}>
                                    <strong>{item.nome}</strong>
                                    <span>{moeda(valor)}</span>
                                </div>

                                <div style={{
                                    height: 10,
                                    background: '#e5e7eb',
                                    borderRadius: 10,
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(valor / maiorForma) * 100}%`,
                                        background: '#2563eb',
                                        borderRadius: 10
                                    }} />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div style={{
                ...estilos.painel,
                marginBottom: 24
            }}>
                <h3>Produtos mais vendidos</h3>

                <p style={{
                    color: '#64748b',
                    marginBottom: 20
                }}>
                    Ranking dos produtos por quantidade vendida
                    no período selecionado.
                </p>

                {carregando ? (
                    <p>Carregando produtos...</p>
                ) : !dados ? (
                    <p>Dados indisponíveis.</p>
                ) : (
                    <TabelaProdutos
                        produtos={dados.produtosMaisVendidos}
                    />
                )}
            </div>

            <AlertasEstoque
                produtos={produtos}
                carregando={carregando}
                onVerProdutos={onVerProdutos}
            />
            <h3>Situação atual da empresa</h3>

            <p style={{
                color: '#64748b',
                marginBottom: 16
            }}>
                Os indicadores abaixo representam a situação
                geral atual, independentemente do período
                selecionado.
            </p>

            <div style={{
                ...estilos.grade,
                marginBottom: 24
            }}>
                <Indicador
                    titulo="Produtos cadastrados"
                    valor={valorOuIndisponivel(
                        resumoEstoque?.total,
                        'numero'
                    )}
                    detalhe="Total de produtos"
                />

                <Indicador
                    titulo="Estoque baixo"
                    valor={valorOuIndisponivel(
                        resumoEstoque?.baixo,
                        'numero'
                    )}
                    detalhe="Produtos com até 5 unidades"
                    cor="#b45309"
                />

                <Indicador
                    titulo="Contas a receber"
                    valor={valorOuIndisponivel(
                        resumoReceber?.aberto
                    )}
                    detalhe="Total em aberto"
                    cor="#15803d"
                />

                <Indicador
                    titulo="Contas a pagar"
                    valor={valorOuIndisponivel(
                        contasPagar?.totalEmAberto
                    )}
                    detalhe="Total em aberto"
                    cor="#dc2626"
                />

                <Indicador
                    titulo="Recebimentos vencidos"
                    valor={valorOuIndisponivel(
                        resumoReceber?.vencido
                    )}
                    detalhe="Contas de clientes em atraso"
                    cor="#b45309"
                />

                <Indicador
                    titulo="Despesas vencidas"
                    valor={valorOuIndisponivel(
                        contasPagar?.totalVencido
                    )}
                    detalhe="Contas a pagar em atraso"
                    cor="#dc2626"
                />
            </div>

            <p style={{
                color: '#64748b',
                fontSize: 12,
                marginTop: 16
            }}>
                O faturamento representa vendas registradas,
                não o lucro líquido nem o saldo disponível
                em caixa. Os indicadores financeiros em aberto
                não são filtrados pelo período selecionado.
            </p>
        </section>
    );
}
