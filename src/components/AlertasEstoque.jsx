
import { useMemo, useState } from 'react';

const estilos = {
    painel: {
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24
    },
    grade: {
        display: 'grid',
        gridTemplateColumns:
            'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 14,
        marginBottom: 20
    },
    indicador: {
        padding: 16,
        background: '#f8fafc',
        borderRadius: 10,
        border: '1px solid #e2e8f0'
    },
    botao: {
        background: '#2563eb',
        color: '#ffffff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 16px',
        fontWeight: 600,
        cursor: 'pointer'
    }
};

function numero(valor) {
    return Number(valor ?? 0).toLocaleString('pt-BR');
}

function Indicador({ titulo, valor, cor }) {
    return (
        <div style={estilos.indicador}>
            <p style={{
                margin: '0 0 8px',
                color: '#64748b',
                fontSize: 13
            }}>
                {titulo}
            </p>

            <strong style={{
                fontSize: 28,
                color: cor || '#0f172a'
            }}>
                {numero(valor)}
            </strong>
        </div>
    );
}

export default function AlertasEstoque({
                                           produtos,
                                           carregando = false,
                                           onVerProdutos
                                       }) {
    const [mostrarTodos, setMostrarTodos] = useState(false);

    const resumo = useMemo(() => {
        if (!Array.isArray(produtos)) {
            return null;
        }

        // Produtos explicitamente desativados são ignorados.
        const ativos = produtos.filter(
            produto => produto.ativo === true
        );

        const esgotados = ativos.filter(
            produto => Number(produto.estoque) === 0
        );

        const baixos = ativos.filter(produto => {
            const estoque = Number(produto.estoque);

            return estoque >= 1 && estoque <= 5;
        });

        const alertas = [...esgotados, ...baixos].sort(
            (a, b) => {
                const diferenca =
                    Number(a.estoque) - Number(b.estoque);

                if (diferenca !== 0) return diferenca;

                return String(a.nome ?? '').localeCompare(
                    String(b.nome ?? ''),
                    'pt-BR'
                );
            }
        );

        return {
            ativos: ativos.length,
            esgotados: esgotados.length,
            baixos: baixos.length,
            alertas
        };
    }, [produtos]);

    if (carregando) {
        return (
            <div style={estilos.painel}>
                <h3>Alertas de Estoque</h3>
                <p style={{ color: '#64748b' }}>
                    Verificando estoque dos produtos...
                </p>
            </div>
        );
    }

    if (!resumo) {
        return (
            <div style={estilos.painel}>
                <h3>Alertas de Estoque</h3>
                <p style={{ color: '#b91c1c' }}>
                    Não foi possível consultar o estoque.
                </p>
            </div>
        );
    }

    const produtosVisiveis = mostrarTodos
        ? resumo.alertas
        : resumo.alertas.slice(0, 5);

    return (
        <section style={estilos.painel}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 18
            }}>
                <div>
                    <h3 style={{ margin: '0 0 6px' }}>
                        Alertas de Estoque
                    </h3>

                    <p style={{
                        color: '#64748b',
                        fontSize: 14,
                        margin: 0
                    }}>
                        Produtos ativos que precisam de reposição.
                    </p>
                </div>

                {typeof onVerProdutos === 'function' && (
                    <button
                        type="button"
                        style={estilos.botao}
                        onClick={onVerProdutos}
                    >
                        Gerenciar produtos
                    </button>
                )}
            </div>

            <div style={estilos.grade}>
                <Indicador
                    titulo="Produtos ativos"
                    valor={resumo.ativos}
                />

                <Indicador
                    titulo="Esgotados"
                    valor={resumo.esgotados}
                    cor="#dc2626"
                />

                <Indicador
                    titulo="Estoque baixo"
                    valor={resumo.baixos}
                    cor="#b45309"
                />
            </div>

            {resumo.alertas.length === 0 ? (
                <div style={{
                    padding: 18,
                    borderRadius: 10,
                    background: '#f0fdf4',
                    color: '#166534'
                }}>
                    Nenhum produto ativo precisa de reposição
                    pelos critérios atuais.
                </div>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            minWidth: 420,
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                            <tr>
                                {[
                                    'Produto',
                                    'Estoque',
                                    'Situação'
                                ].map(titulo => (
                                    <th
                                        key={titulo}
                                        style={{
                                            textAlign: 'left',
                                            padding: 12,
                                            color: '#64748b',
                                            fontSize: 13,
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
                            {produtosVisiveis.map(produto => {
                                const esgotado =
                                    Number(produto.estoque) === 0;

                                return (
                                    <tr key={produto.id}>
                                        <td style={{
                                            padding: 12,
                                            borderBottom:
                                                '1px solid #f1f5f9'
                                        }}>
                                            <strong>
                                                {produto.nome}
                                            </strong>
                                        </td>

                                        <td style={{
                                            padding: 12,
                                            borderBottom:
                                                '1px solid #f1f5f9'
                                        }}>
                                            {numero(produto.estoque)}
                                        </td>

                                        <td style={{
                                            padding: 12,
                                            borderBottom:
                                                '1px solid #f1f5f9'
                                        }}>
                        <span style={{
                            color: esgotado
                                ? '#b91c1c'
                                : '#92400e',
                            background: esgotado
                                ? '#fef2f2'
                                : '#fffbeb',
                            padding: '5px 9px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600
                        }}>
                          {esgotado
                              ? 'Esgotado'
                              : 'Estoque baixo'}
                        </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    {resumo.alertas.length > 5 && (
                        <button
                            type="button"
                            onClick={() =>
                                setMostrarTodos(valor => !valor)
                            }
                            style={{
                                background: 'transparent',
                                color: '#2563eb',
                                border: 'none',
                                padding: '14px 0 0',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {mostrarTodos
                                ? 'Mostrar menos'
                                : `Ver todos os ${resumo.alertas.length} alertas`}
                        </button>
                    )}
                </>
            )}

            <p style={{
                color: '#64748b',
                fontSize: 12,
                marginTop: 18,
                marginBottom: 0
            }}>
                Critérios: esgotado = 0 unidades;
                estoque baixo = 1 a 5 unidades.
                Produtos desativados não entram nos alertas.
            </p>
        </section>
    );
}
