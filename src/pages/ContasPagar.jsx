
import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';

const campo = {
    width: '100%',
    padding: '11px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxSizing: 'border-box',
    background: '#fff'
};

const botao = {
    padding: '10px 14px',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer'
};

const painel = {
    background: '#fff',
    padding: '22px',
    borderRadius: '12px',
    marginBottom: '20px'
};

const celula = {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'left'
};

const formularioInicial = {
    descricao: '',
    valor: '',
    dataVencimento: '',
    categoria: '',
    fornecedor: ''
};

function moeda(valor) {
    return Number(valor ?? 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function hojeLocal() {
    const data = new Date();

    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, '0'),
        String(data.getDate()).padStart(2, '0')
    ].join('-');
}

function formatarData(valor) {
    if (!valor) return '—';

    const partes = String(valor).slice(0, 10).split('-');

    if (partes.length !== 3) return String(valor);

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterErro(error, mensagemPadrao) {
    const dados = error.response?.data;

    if (error.response?.status === 401) {
        return 'Sua sessão expirou. Entre novamente.';
    }

    if (typeof dados?.message === 'string') {
        return dados.message;
    }

    if (typeof dados?.erro === 'string') {
        return dados.erro;
    }

    if (typeof dados === 'string' && dados.trim()) {
        return dados;
    }

    return mensagemPadrao;
}

function situacao(conta, hoje) {
    if (
        (conta.status === 'PENDENTE' ||
            conta.status === 'VENCIDO') &&
        conta.dataVencimento &&
        String(conta.dataVencimento).slice(0, 10) < hoje
    ) {
        return 'VENCIDO';
    }

    return conta.status;
}

function contaAberta(conta) {
    return (
        conta.status === 'PENDENTE' ||
        conta.status === 'VENCIDO'
    );
}

const nomesStatus = {
    PENDENTE: 'Pendente',
    VENCIDO: 'Vencida',
    PAGO: 'Paga',
    CANCELADO: 'Cancelada'
};

const coresStatus = {
    PENDENTE: ['#fef3c7', '#92400e'],
    VENCIDO: ['#fee2e2', '#b91c1c'],
    PAGO: ['#dcfce7', '#166534'],
    CANCELADO: ['#e5e7eb', '#4b5563']
};

function ContasPagar() {
    const [contas, setContas] = useState([]);
    const [formulario, setFormulario] = useState(
        formularioInicial
    );

    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [processandoId, setProcessandoId] = useState(null);

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    const [pesquisa, setPesquisa] = useState('');
    const [filtro, setFiltro] = useState('TODAS');
    const [mostrarFormulario, setMostrarFormulario] =
        useState(false);

    const operacaoEmAndamento = useRef(false);
    const hoje = hojeLocal();

    async function buscarContas() {
        const resposta = await api.get('/contas-pagar');

        if (!Array.isArray(resposta.data)) {
            throw new Error('Resposta inválida do servidor.');
        }

        setContas(resposta.data);
    }

    useEffect(() => {
        let ativo = true;

        async function carregar() {
            try {
                const resposta = await api.get('/contas-pagar');

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
                            'Não foi possível carregar as contas a pagar.'
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
        const resultado = {
            emAberto: 0,
            vencido: 0,
            pago: 0,
            quantidadeAbertas: 0
        };

        for (const conta of contas) {
            const valor = Number(conta.valor ?? 0);
            const status = situacao(conta, hoje);

            if (contaAberta(conta)) {
                resultado.emAberto += valor;
                resultado.quantidadeAbertas++;
            }

            if (status === 'VENCIDO') {
                resultado.vencido += valor;
            }

            if (status === 'PAGO') {
                resultado.pago += valor;
            }
        }

        return resultado;
    }, [contas, hoje]);

    const contasFiltradas = useMemo(() => {
        const termo = pesquisa.trim().toLowerCase();

        return contas
            .filter(conta => {
                const status = situacao(conta, hoje);

                if (filtro !== 'TODAS' && status !== filtro) {
                    return false;
                }

                if (!termo) return true;

                return [
                    conta.id,
                    conta.descricao,
                    conta.categoria,
                    conta.fornecedor,
                    conta.valor
                ]
                    .filter(valor => valor != null)
                    .join(' ')
                    .toLowerCase()
                    .includes(termo);
            })
            .sort((a, b) => {
                const aAberta = contaAberta(a);
                const bAberta = contaAberta(b);

                if (aAberta && !bAberta) return -1;
                if (!aAberta && bAberta) return 1;

                return String(a.dataVencimento ?? '')
                    .localeCompare(String(b.dataVencimento ?? ''));
            });
    }, [contas, pesquisa, filtro, hoje]);

    function alterarCampo(nome, valor) {
        setFormulario(anterior => ({
            ...anterior,
            [nome]: valor
        }));
    }

    async function atualizar() {
        if (
            operacaoEmAndamento.current ||
            carregando
        ) {
            return;
        }

        setCarregando(true);
        setErro('');
        setSucesso('');

        try {
            await buscarContas();
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

    async function cadastrar(evento) {
        evento.preventDefault();

        if (operacaoEmAndamento.current) return;

        const descricao = formulario.descricao.trim();
        const valorTexto = formulario.valor.trim();
        const valor = Number(valorTexto.replace(',', '.'));

        if (!descricao || descricao.length > 255) {
            setErro(
                'Informe uma descrição com até 255 caracteres.'
            );
            return;
        }

        if (
            !/^\d+([.,]\d{1,2})?$/.test(valorTexto) ||
            !Number.isFinite(valor) ||
            valor <= 0 ||
            valor > 9999999999999.99
        ) {
            setErro(
                'Informe um valor positivo com até duas casas decimais.'
            );
            return;
        }

        if (!formulario.dataVencimento) {
            setErro('Informe a data de vencimento.');
            return;
        }

        operacaoEmAndamento.current = true;
        setSalvando(true);
        setErro('');
        setSucesso('');

        try {
            await api.post('/contas-pagar', {
                descricao,
                valor,
                dataVencimento: formulario.dataVencimento,
                categoria: formulario.categoria.trim() || null,
                fornecedor: formulario.fornecedor.trim() || null
            });

            setFormulario(formularioInicial);
            setMostrarFormulario(false);

            setSucesso('Conta a pagar cadastrada com sucesso!');

            try {
                await buscarContas();
            } catch (error) {
                console.error(error);
                setErro(
                    'Conta cadastrada, mas não foi possível ' +
                    'atualizar a lista. Clique em Atualizar.'
                );
            }
        } catch (error) {
            console.error(error);

            setErro(
                obterErro(
                    error,
                    'Não foi possível cadastrar a conta.'
                )
            );
        } finally {
            setSalvando(false);
            operacaoEmAndamento.current = false;
        }
    }

    async function executarAcao(conta, acao) {
        if (
            operacaoEmAndamento.current ||
            !contaAberta(conta)
        ) {
            return;
        }

        const pagando = acao === 'pagar';

        const mensagem = pagando
            ? `Confirmar pagamento da conta #${conta.id}?\n\n` +
            `${conta.descricao}\n` +
            `Valor: ${moeda(conta.valor)}\n\n` +
            'O valor será registrado como SAÍDA no caixa. ' +
            'É necessário ter um caixa aberto.'
            : `Cancelar a conta #${conta.id}?\n\n` +
            `${conta.descricao}\n` +
            `Valor: ${moeda(conta.valor)}\n\n` +
            'A conta continuará no histórico como cancelada.';

        if (!window.confirm(mensagem)) return;

        operacaoEmAndamento.current = true;
        setProcessandoId(conta.id);
        setErro('');
        setSucesso('');

        try {
            await api.post(
                `/contas-pagar/${conta.id}/${acao}`
            );

            setSucesso(
                pagando
                    ? `Conta #${conta.id} paga com sucesso!`
                    : `Conta #${conta.id} cancelada com sucesso!`
            );

            try {
                await buscarContas();
            } catch (error) {
                console.error(error);
                setErro(
                    'Operação registrada, mas a lista não foi ' +
                    'atualizada. Clique em Atualizar.'
                );
            }
        } catch (error) {
            console.error(error);

            setErro(
                obterErro(
                    error,
                    'Não foi possível concluir a operação. ' +
                    'Confira o status antes de tentar novamente.'
                )
            );
        } finally {
            setProcessandoId(null);
            operacaoEmAndamento.current = false;
        }
    }

    return (
        <section>
            <div className="welcome">
                <h3>Contas a pagar</h3>
                <p>
                    Organize despesas, fornecedores, vencimentos
                    e pagamentos da empresa.
                </p>
            </div>

            {erro && (
                <p style={{ color: '#dc2626', marginBottom: 16 }}>
                    {erro}
                </p>
            )}

            {sucesso && (
                <p style={{ color: '#15803d', marginBottom: 16 }}>
                    {sucesso}
                </p>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns:
                    'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 16,
                marginBottom: 24
            }}>
                <div style={painel}>
                    <p style={{ color: '#6b7280' }}>
                        Total em aberto
                    </p>
                    <h2>{moeda(resumo.emAberto)}</h2>
                    <small>
                        {resumo.quantidadeAbertas} contas
                    </small>
                </div>

                <div style={painel}>
                    <p style={{ color: '#6b7280' }}>
                        Total vencido
                    </p>
                    <h2 style={{ color: '#dc2626' }}>
                        {moeda(resumo.vencido)}
                    </h2>
                    <small>
                        Incluído no total em aberto
                    </small>
                </div>

                <div style={painel}>
                    <p style={{ color: '#6b7280' }}>
                        Total pago
                    </p>
                    <h2 style={{ color: '#15803d' }}>
                        {moeda(resumo.pago)}
                    </h2>
                    <small>
                        Contas registradas como pagas
                    </small>
                </div>
            </div>

            <div style={{
                ...painel,
                background: '#eff6ff',
                border: '1px solid #bfdbfe'
            }}>
                <strong style={{ color: '#1d4ed8' }}>
                    Atenção aos pagamentos
                </strong>
                <p style={{
                    color: '#1e40af',
                    marginTop: 8
                }}>
                    Atualmente, os pagamentos são registrados
                    como saídas do caixa. Abra o caixa antes de
                    pagar uma despesa. Pagamentos bancários
                    ainda não estão disponíveis neste módulo.
                </p>
            </div>

            <div style={painel}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 18
                }}>
                    <h3>Despesas cadastradas</h3>

                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10
                    }}>
                        <button
                            type="button"
                            style={{
                                ...botao,
                                background: '#e5e7eb'
                            }}
                            onClick={atualizar}
                            disabled={
                                carregando ||
                                salvando ||
                                processandoId !== null
                            }
                        >
                            Atualizar
                        </button>

                        <button
                            type="button"
                            style={{
                                ...botao,
                                background: '#2563eb',
                                color: '#fff'
                            }}
                            onClick={() => {
                                setMostrarFormulario(!mostrarFormulario);
                                setErro('');
                            }}
                            disabled={
                                salvando ||
                                processandoId !== null
                            }
                        >
                            {mostrarFormulario
                                ? 'Fechar cadastro'
                                : '+ Nova despesa'}
                        </button>
                    </div>
                </div>

                {mostrarFormulario && (
                    <form
                        onSubmit={cadastrar}
                        style={{
                            padding: 18,
                            border: '1px solid #e5e7eb',
                            borderRadius: 10,
                            marginBottom: 24
                        }}
                    >
                        <h4 style={{ marginBottom: 18 }}>
                            Cadastrar conta a pagar
                        </h4>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: 16
                        }}>
                            <label>
                                Descrição *
                                <input
                                    style={campo}
                                    maxLength={255}
                                    required
                                    value={formulario.descricao}
                                    onChange={e =>
                                        alterarCampo(
                                            'descricao',
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ex.: Aluguel da loja"
                                />
                            </label>

                            <label>
                                Valor (R$) *
                                <input
                                    style={campo}
                                    required
                                    inputMode="decimal"
                                    value={formulario.valor}
                                    onChange={e =>
                                        alterarCampo('valor', e.target.value)
                                    }
                                    placeholder="Ex.: 850,00"
                                />
                            </label>

                            <label>
                                Vencimento *
                                <input
                                    style={campo}
                                    type="date"
                                    required
                                    value={formulario.dataVencimento}
                                    onChange={e =>
                                        alterarCampo(
                                            'dataVencimento',
                                            e.target.value
                                        )
                                    }
                                />
                            </label>

                            <label>
                                Categoria
                                <input
                                    style={campo}
                                    value={formulario.categoria}
                                    onChange={e =>
                                        alterarCampo(
                                            'categoria',
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ex.: Despesas fixas"
                                />
                            </label>

                            <label>
                                Fornecedor
                                <input
                                    style={campo}
                                    value={formulario.fornecedor}
                                    onChange={e =>
                                        alterarCampo(
                                            'fornecedor',
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ex.: Imobiliária"
                                />
                            </label>
                        </div>

                        <div style={{ marginTop: 20 }}>
                            <button
                                type="submit"
                                disabled={salvando}
                                style={{
                                    ...botao,
                                    background: '#16a34a',
                                    color: '#fff'
                                }}
                            >
                                {salvando
                                    ? 'Salvando...'
                                    : 'Cadastrar despesa'}
                            </button>
                        </div>
                    </form>
                )}

                <div style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                    marginBottom: 20
                }}>
                    <input
                        type="search"
                        style={campo}
                        placeholder="Buscar despesa ou fornecedor..."
                        value={pesquisa}
                        onChange={e => setPesquisa(e.target.value)}
                    />

                    <select
                        style={campo}
                        value={filtro}
                        onChange={e => setFiltro(e.target.value)}
                    >
                        <option value="TODAS">Todas</option>
                        <option value="PENDENTE">Pendentes</option>
                        <option value="VENCIDO">Vencidas</option>
                        <option value="PAGO">Pagas</option>
                        <option value="CANCELADO">Canceladas</option>
                    </select>
                </div>

                {carregando ? (
                    <p>Carregando despesas...</p>
                ) : contasFiltradas.length === 0 ? (
                    <p>Nenhuma despesa encontrada.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                            <tr>
                                <th style={celula}>Descrição</th>
                                <th style={celula}>Fornecedor</th>
                                <th style={celula}>Categoria</th>
                                <th style={celula}>Valor</th>
                                <th style={celula}>Vencimento</th>
                                <th style={celula}>Status</th>
                                <th style={celula}>Ações</th>
                            </tr>
                            </thead>

                            <tbody>
                            {contasFiltradas.map(conta => {
                                const status = situacao(conta, hoje);
                                const cores = coresStatus[status] ||
                                    ['#e5e7eb', '#374151'];

                                return (
                                    <tr key={conta.id}>
                                        <td style={celula}>
                                            <strong>{conta.descricao}</strong>
                                            <div style={{
                                                color: '#9ca3af',
                                                fontSize: 12
                                            }}>
                                                Conta #{conta.id}
                                            </div>
                                        </td>

                                        <td style={celula}>
                                            {conta.fornecedor || '—'}
                                        </td>

                                        <td style={celula}>
                                            {conta.categoria || '—'}
                                        </td>

                                        <td style={celula}>
                                            {moeda(conta.valor)}
                                        </td>

                                        <td style={celula}>
                                            {formatarData(
                                                conta.dataVencimento
                                            )}
                                        </td>

                                        <td style={celula}>
                        <span style={{
                            display: 'inline-block',
                            background: cores[0],
                            color: cores[1],
                            padding: '5px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700
                        }}>
                          {nomesStatus[status] || status}
                        </span>
                                        </td>

                                        <td style={celula}>
                                            {contaAberta(conta) ? (
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: 8
                                                }}>
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            processandoId !== null ||
                                                            salvando ||
                                                            carregando
                                                        }
                                                        onClick={() =>
                                                            executarAcao(
                                                                conta,
                                                                'pagar'
                                                            )
                                                        }
                                                        style={{
                                                            ...botao,
                                                            background: '#16a34a',
                                                            color: '#fff'
                                                        }}
                                                    >
                                                        {processandoId === conta.id
                                                            ? 'Processando...'
                                                            : 'Pagar'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            processandoId !== null ||
                                                            salvando ||
                                                            carregando
                                                        }
                                                        onClick={() =>
                                                            executarAcao(
                                                                conta,
                                                                'cancelar'
                                                            )
                                                        }
                                                        style={{
                                                            ...botao,
                                                            background: '#fee2e2',
                                                            color: '#b91c1c'
                                                        }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{
                                                    color: '#6b7280',
                                                    fontSize: 13
                                                }}>
                            {status === 'PAGO'
                                ? `Pago em ${formatarData(
                                    conta.dataPagamento
                                )}`
                                : 'Cancelada'}
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

export default ContasPagar;
