
import { useEffect, useState } from 'react';
import api from '../services/api';

function gerarChave() {
    return crypto.randomUUID();
}

function formatarMoeda(valor) {
    return Number(valor ?? 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarData(data) {
    if (!data) return '—';

    const valor = new Date(data);

    return Number.isNaN(valor.getTime())
        ? String(data)
        : valor.toLocaleString('pt-BR');
}

function dataLocalHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

function mensagemErro(error, padrao) {
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

const estiloCelula = {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb'
};

const estiloInput = {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    width: '100%',
    boxSizing: 'border-box'
};

const estiloBotao = {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600
};

function Vendas() {
    const [vendas, setVendas] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [contasBancarias, setContasBancarias] = useState([]);

    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    const [mostrarFormulario, setMostrarFormulario] =
        useState(false);

    const [clienteSelecionado, setClienteSelecionado] =
        useState('');

    const [formaPagamento, setFormaPagamento] =
        useState('DINHEIRO');

    const [contaBancariaSelecionada, setContaBancariaSelecionada] =
        useState('');

    const [vencimento, setVencimento] = useState('');

    const [produtoSelecionado, setProdutoSelecionado] =
        useState('');

    const [quantidade, setQuantidade] = useState(1);
    const [carrinho, setCarrinho] = useState([]);

    const [chaveIdempotencia, setChaveIdempotencia] =
        useState(gerarChave);

    const [vendaDetalhada, setVendaDetalhada] =
        useState(null);

    const [carregandoDetalhes, setCarregandoDetalhes] =
        useState(false);

    useEffect(() => {
        let ativo = true;

        async function carregar() {
            try {
                const [
                    respostaVendas,
                    respostaProdutos,
                    respostaClientes,
                    respostaContas
                ] = await Promise.all([
                    api.get('/vendas'),
                    api.get('/produtos'),
                    api.get('/clientes'),
                    api.get('/contas-bancarias')
                ]);

                if (ativo) {
                    setVendas(respostaVendas.data);
                    setProdutos(respostaProdutos.data);
                    setClientes(respostaClientes.data);
                    setContasBancarias(respostaContas.data);
                }
            } catch (error) {
                console.error('Erro ao carregar vendas:', error);

                if (ativo) {
                    setErro(
                        'Não foi possível carregar os dados de vendas.'
                    );
                }
            } finally {
                if (ativo) setCarregando(false);
            }
        }

        carregar();

        return () => {
            ativo = false;
        };
    }, []);

    async function atualizarDados() {
        const [
            respostaVendas,
            respostaProdutos,
            respostaClientes,
            respostaContas
        ] = await Promise.all([
            api.get('/vendas'),
            api.get('/produtos'),
            api.get('/clientes'),
            api.get('/contas-bancarias')
        ]);

        setVendas(respostaVendas.data);
        setProdutos(respostaProdutos.data);
        setClientes(respostaClientes.data);
        setContasBancarias(respostaContas.data);
    }

    function adicionarProduto() {
        setErro('');

        const produto = produtos.find(
            item => String(item.id) === produtoSelecionado
        );

        const qtd = Number(quantidade);

        if (!produto) {
            setErro('Selecione um produto.');
            return;
        }

        if (!Number.isInteger(qtd) || qtd <= 0) {
            setErro('Informe uma quantidade válida.');
            return;
        }

        const existente = carrinho.find(
            item => item.id === produto.id
        );

        const quantidadeTotal =
            qtd + (existente?.quantidade ?? 0);

        if (quantidadeTotal > Number(produto.estoque)) {
            setErro('Quantidade maior que o estoque disponível.');
            return;
        }

        if (existente) {
            setCarrinho(anterior =>
                anterior.map(item =>
                    item.id === produto.id
                        ? { ...item, quantidade: quantidadeTotal }
                        : item
                )
            );
        } else {
            setCarrinho(anterior => [
                ...anterior,
                {
                    id: produto.id,
                    nome: produto.nome,
                    preco: Number(produto.preco),
                    quantidade: qtd
                }
            ]);
        }

        setProdutoSelecionado('');
        setQuantidade(1);
    }

    function removerProduto(id) {
        setCarrinho(anterior =>
            anterior.filter(item => item.id !== id)
        );
    }

    const total = carrinho.reduce(
        (soma, item) =>
            soma + item.preco * item.quantidade,
        0
    );

    const contasAtivas = contasBancarias.filter(
        conta => conta.ativa === true
    );

    function novaVenda() {
        if (salvando) return;

        setErro('');
        setSucesso('');
        setCarrinho([]);
        setClienteSelecionado('');
        setFormaPagamento('DINHEIRO');
        setContaBancariaSelecionada('');
        setVencimento('');
        setProdutoSelecionado('');
        setQuantidade(1);
        setChaveIdempotencia(gerarChave());
        setMostrarFormulario(true);
    }

    function alterarFormaPagamento(valor) {
        setFormaPagamento(valor);
        setContaBancariaSelecionada('');
        setVencimento('');
        setErro('');
    }

    async function registrarVenda() {
        if (salvando) return;

        if (carrinho.length === 0) {
            setErro('Adicione pelo menos um produto à venda.');
            return;
        }

        if (
            formaPagamento === 'PIX' &&
            !contaBancariaSelecionada
        ) {
            setErro('Selecione uma conta bancária para o PIX.');
            return;
        }

        if (formaPagamento === 'FIADO') {
            if (!clienteSelecionado) {
                setErro(
                    'Selecione um cliente para registrar a venda fiada.'
                );
                return;
            }

            if (!vencimento) {
                setErro('Informe a data de vencimento do fiado.');
                return;
            }

            if (vencimento < dataLocalHoje()) {
                setErro(
                    'O vencimento não pode ser anterior à data atual.'
                );
                return;
            }
        }

        setErro('');
        setSucesso('');
        setSalvando(true);

        const dados = {
            clienteId: clienteSelecionado
                ? Number(clienteSelecionado)
                : null,

            formaPagamento,

            contaBancariaId:
                formaPagamento === 'PIX'
                    ? Number(contaBancariaSelecionada)
                    : null,

            vencimento:
                formaPagamento === 'FIADO'
                    ? vencimento
                    : null,

            chaveIdempotencia,

            itens: carrinho.map(item => ({
                produtoId: item.id,
                quantidade: item.quantidade
            }))
        };

        try {
            await api.post('/vendas', dados);

            setCarrinho([]);
            setClienteSelecionado('');
            setFormaPagamento('DINHEIRO');
            setContaBancariaSelecionada('');
            setVencimento('');
            setMostrarFormulario(false);
            setChaveIdempotencia(gerarChave());

            setSucesso('Venda registrada com sucesso!');

            try {
                await atualizarDados();
            } catch (error) {
                console.error(error);

                setErro(
                    'Venda registrada, mas não foi possível atualizar ' +
                    'o histórico. Recarregue a página.'
                );
            }
        } catch (error) {
            console.error('Erro ao registrar venda:', error);

            setErro(
                mensagemErro(
                    error,
                    'Não foi possível confirmar a venda. ' +
                    'Confira o histórico antes de tentar novamente.'
                )
            );
        } finally {
            setSalvando(false);
        }
    }

    async function cancelarVenda(venda) {
        if (salvando || venda.status !== 'ATIVA') return;

        const confirmado = window.confirm(
            `Deseja cancelar a venda #${venda.id}?\n\n` +
            `Valor: ${formatarMoeda(venda.total)}\n\n` +
            'O sistema realizará o estorno correspondente ' +
            'e devolverá os produtos ao estoque.'
        );

        if (!confirmado) return;

        setErro('');
        setSucesso('');
        setSalvando(true);

        try {
            await api.post(`/vendas/${venda.id}/cancelar`);

            setSucesso(
                `Venda #${venda.id} cancelada com sucesso!`
            );

            setVendaDetalhada(null);

            try {
                await atualizarDados();
            } catch (error) {
                console.error(error);

                setErro(
                    'Cancelamento realizado, mas não foi possível ' +
                    'atualizar o histórico. Recarregue a página.'
                );
            }
        } catch (error) {
            console.error(error);

            setErro(
                mensagemErro(
                    error,
                    'Não foi possível confirmar o cancelamento. ' +
                    'Confira o histórico antes de tentar novamente.'
                )
            );
        } finally {
            setSalvando(false);
        }
    }

    async function visualizarVenda(id) {
        if (carregandoDetalhes) return;

        setErro('');
        setVendaDetalhada(null);
        setCarregandoDetalhes(true);

        try {
            const resposta = await api.get(`/vendas/${id}`);
            setVendaDetalhada(resposta.data);
        } catch (error) {
            console.error(error);

            setErro(
                mensagemErro(
                    error,
                    'Não foi possível carregar os detalhes da venda.'
                )
            );
        } finally {
            setCarregandoDetalhes(false);
        }
    }

    return (
        <section>
            <div className="welcome">
                <h3>Gerenciamento de vendas</h3>
                <p>
                    Registre vendas, selecione pagamentos e acompanhe
                    as movimentações da sua empresa.
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

            <div style={{ marginBottom: '20px' }}>
                <button
                    type="button"
                    onClick={novaVenda}
                    disabled={salvando || carregando}
                    style={{
                        ...estiloBotao,
                        background: '#2563eb',
                        color: '#fff'
                    }}
                >
                    + Nova Venda
                </button>
            </div>

            {mostrarFormulario && (
                <div
                    className="empty-panel"
                    style={{ marginBottom: '24px' }}
                >
                    <h3>Nova venda</h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '16px',
                        marginTop: '20px',
                        marginBottom: '20px'
                    }}>
                        <div>
                            <label
                                htmlFor="cliente-venda"
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 600
                                }}
                            >
                                Cliente
                            </label>

                            <select
                                id="cliente-venda"
                                value={clienteSelecionado}
                                onChange={e =>
                                    setClienteSelecionado(e.target.value)
                                }
                                disabled={salvando}
                                style={estiloInput}
                            >
                                <option value="">
                                    Consumidor não identificado
                                </option>

                                {clientes.map(cliente => (
                                    <option
                                        key={cliente.id}
                                        value={cliente.id}
                                    >
                                        {cliente.nome}
                                        {cliente.cpfCnpj
                                            ? ` — ${cliente.cpfCnpj}`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="forma-pagamento"
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 600
                                }}
                            >
                                Forma de pagamento
                            </label>

                            <select
                                id="forma-pagamento"
                                value={formaPagamento}
                                onChange={e =>
                                    alterarFormaPagamento(e.target.value)
                                }
                                disabled={salvando}
                                style={estiloInput}
                            >
                                <option value="DINHEIRO">
                                    Dinheiro
                                </option>

                                <option value="PIX">
                                    PIX
                                </option>

                                <option value="FIADO">
                                    Fiado
                                </option>

                                <option value="CARTAO_DEBITO" disabled>
                                    Cartão de débito — em breve
                                </option>

                                <option value="CARTAO_CREDITO" disabled>
                                    Cartão de crédito — em breve
                                </option>
                            </select>
                        </div>
                    </div>

                    {formaPagamento === 'DINHEIRO' && (
                        <p style={{
                            marginBottom: '20px',
                            color: '#6b7280'
                        }}>
                            O recebimento será registrado no caixa físico.
                            É necessário manter o caixa aberto.
                        </p>
                    )}

                    {formaPagamento === 'PIX' && (
                        <div style={{ marginBottom: '20px' }}>
                            <label
                                htmlFor="conta-bancaria"
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 600
                                }}
                            >
                                Conta bancária para receber o PIX *
                            </label>

                            <select
                                id="conta-bancaria"
                                value={contaBancariaSelecionada}
                                onChange={e =>
                                    setContaBancariaSelecionada(e.target.value)
                                }
                                disabled={salvando}
                                style={{
                                    ...estiloInput,
                                    maxWidth: '450px'
                                }}
                            >
                                <option value="">
                                    Selecione uma conta bancária
                                </option>

                                {contasAtivas.map(conta => (
                                    <option
                                        key={conta.id}
                                        value={conta.id}
                                    >
                                        {conta.nome ||
                                            conta.banco ||
                                            `Conta #${conta.id}`}
                                    </option>
                                ))}
                            </select>

                            {contasAtivas.length === 0 && (
                                <p style={{
                                    color: '#dc2626',
                                    marginTop: '8px'
                                }}>
                                    Nenhuma conta bancária ativa encontrada.
                                    Cadastre uma conta antes de receber via PIX.
                                </p>
                            )}
                        </div>
                    )}

                    {formaPagamento === 'FIADO' && (
                        <div style={{ marginBottom: '20px' }}>
                            <label
                                htmlFor="vencimento-fiado"
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 600
                                }}
                            >
                                Data de vencimento *
                            </label>

                            <input
                                id="vencimento-fiado"
                                type="date"
                                min={dataLocalHoje()}
                                value={vencimento}
                                onChange={e =>
                                    setVencimento(e.target.value)
                                }
                                disabled={salvando}
                                style={{
                                    ...estiloInput,
                                    maxWidth: '250px'
                                }}
                            />

                            <p style={{
                                marginTop: '8px',
                                color: '#6b7280'
                            }}>
                                Selecione também um cliente cadastrado.
                                A venda criará uma conta a receber pendente.
                            </p>
                        </div>
                    )}

                    <h4 style={{ marginBottom: '12px' }}>
                        Adicionar produtos
                    </h4>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <select
                            value={produtoSelecionado}
                            onChange={e =>
                                setProdutoSelecionado(e.target.value)
                            }
                            disabled={salvando}
                            style={estiloInput}
                        >
                            <option value="">
                                Selecione um produto
                            </option>

                            {produtos
                                .filter(produto => produto.estoque > 0)
                                .map(produto => (
                                    <option
                                        key={produto.id}
                                        value={produto.id}
                                    >
                                        {produto.nome} — {formatarMoeda(produto.preco)}
                                        {' '}({produto.estoque} disponíveis)
                                    </option>
                                ))}
                        </select>

                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={quantidade}
                            onChange={e =>
                                setQuantidade(e.target.value)
                            }
                            disabled={salvando}
                            style={estiloInput}
                        />

                        <button
                            type="button"
                            onClick={adicionarProduto}
                            disabled={salvando}
                            style={{
                                ...estiloBotao,
                                background: '#e0e7ff',
                                color: '#1d4ed8'
                            }}
                        >
                            Adicionar
                        </button>
                    </div>

                    <h4>Itens da venda</h4>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            textAlign: 'left'
                        }}>
                            <thead>
                            <tr>
                                <th style={estiloCelula}>Produto</th>
                                <th style={estiloCelula}>Qtd.</th>
                                <th style={estiloCelula}>Subtotal</th>
                                <th style={estiloCelula}>Ação</th>
                            </tr>
                            </thead>

                            <tbody>
                            {carrinho.map(item => (
                                <tr key={item.id}>
                                    <td style={estiloCelula}>
                                        {item.nome}
                                    </td>

                                    <td style={estiloCelula}>
                                        {item.quantidade}
                                    </td>

                                    <td style={estiloCelula}>
                                        {formatarMoeda(
                                            item.preco * item.quantidade
                                        )}
                                    </td>

                                    <td style={estiloCelula}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removerProduto(item.id)
                                            }
                                            disabled={salvando}
                                        >
                                            Remover
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {carrinho.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        style={{
                                            ...estiloCelula,
                                            color: '#6b7280'
                                        }}
                                    >
                                        Nenhum produto adicionado.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    <h3 style={{ marginTop: '20px' }}>
                        Total: {formatarMoeda(total)}
                    </h3>

                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '20px',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            type="button"
                            onClick={registrarVenda}
                            disabled={
                                salvando ||
                                carrinho.length === 0 ||
                                (formaPagamento === 'PIX' &&
                                    !contaBancariaSelecionada) ||
                                (formaPagamento === 'FIADO' &&
                                    (!clienteSelecionado ||
                                        !vencimento ||
                                        vencimento < dataLocalHoje()))
                            }
                            style={{
                                ...estiloBotao,
                                background: '#2563eb',
                                color: '#fff',
                                opacity: salvando ? 0.6 : 1
                            }}
                        >
                            {salvando
                                ? 'Registrando...'
                                : 'Finalizar venda'}
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setMostrarFormulario(false)
                            }
                            disabled={salvando}
                            style={{
                                ...estiloBotao,
                                background: '#e5e7eb',
                                color: '#374151'
                            }}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            <div className="empty-panel">
                <h3>Histórico de vendas</h3>

                {carregando ? (
                    <p>Carregando vendas...</p>
                ) : vendas.length === 0 ? (
                    <p>Nenhuma venda registrada.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            textAlign: 'left'
                        }}>
                            <thead>
                            <tr>
                                <th style={estiloCelula}>Venda</th>
                                <th style={estiloCelula}>Data</th>
                                <th style={estiloCelula}>Cliente</th>
                                <th style={estiloCelula}>Pagamento</th>
                                <th style={estiloCelula}>Total</th>
                                <th style={estiloCelula}>Status</th>
                                <th style={estiloCelula}>Ações</th>
                            </tr>
                            </thead>

                            <tbody>
                            {vendas.map(venda => (
                                <tr key={venda.id}>
                                    <td style={estiloCelula}>
                                        #{venda.id}
                                    </td>

                                    <td style={estiloCelula}>
                                        {formatarData(venda.data)}
                                    </td>

                                    <td style={estiloCelula}>
                                        {venda.cliente || 'Não identificado'}
                                    </td>

                                    <td style={estiloCelula}>
                                        {venda.formaPagamento}
                                    </td>

                                    <td style={estiloCelula}>
                                        {formatarMoeda(venda.total)}
                                    </td>

                                    <td style={estiloCelula}>
                      <span style={{
                          color:
                              venda.status === 'ATIVA'
                                  ? '#15803d'
                                  : '#6b7280',
                          fontWeight: 600
                      }}>
                        {venda.status}
                      </span>
                                    </td>

                                    <td style={estiloCelula}>
                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    visualizarVenda(venda.id)
                                                }
                                                disabled={carregandoDetalhes}
                                                style={{
                                                    ...estiloBotao,
                                                    background: '#e0e7ff',
                                                    color: '#1d4ed8'
                                                }}
                                            >
                                                Visualizar
                                            </button>

                                            {venda.status === 'ATIVA' && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        cancelarVenda(venda)
                                                    }
                                                    disabled={salvando}
                                                    style={{
                                                        ...estiloBotao,
                                                        background: '#dc2626',
                                                        color: '#fff'
                                                    }}
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {carregandoDetalhes && (
                <div
                    className="empty-panel"
                    style={{ marginTop: '24px' }}
                >
                    <p>Carregando detalhes da venda...</p>
                </div>
            )}

            {vendaDetalhada && (
                <div
                    className="empty-panel"
                    style={{ marginTop: '24px' }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginBottom: '20px'
                    }}>
                        <h3>
                            Detalhes da venda #{vendaDetalhada.id}
                        </h3>

                        <button
                            type="button"
                            onClick={() =>
                                setVendaDetalhada(null)
                            }
                            style={estiloBotao}
                        >
                            Fechar detalhes
                        </button>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px'
                    }}>
                        <div>
                            <p>Data</p>
                            <strong>
                                {formatarData(vendaDetalhada.data)}
                            </strong>
                        </div>

                        <div>
                            <p>Status</p>
                            <strong>
                                {vendaDetalhada.status}
                            </strong>
                        </div>

                        <div>
                            <p>Pagamento</p>
                            <strong>
                                {vendaDetalhada.formaPagamento}
                            </strong>
                        </div>

                        <div>
                            <p>Cliente</p>
                            <strong>
                                {vendaDetalhada.cliente ||
                                    'Não identificado'}
                            </strong>
                        </div>
                    </div>

                    <h4 style={{ marginBottom: '12px' }}>
                        Produtos da venda
                    </h4>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            textAlign: 'left'
                        }}>
                            <thead>
                            <tr>
                                <th style={estiloCelula}>Produto</th>
                                <th style={estiloCelula}>Quantidade</th>
                                <th style={estiloCelula}>Preço unitário</th>
                                <th style={estiloCelula}>Subtotal</th>
                            </tr>
                            </thead>

                            <tbody>
                            {(vendaDetalhada.itens || []).map(
                                (item, indice) => (
                                    <tr key={item.id ?? indice}>
                                        <td style={estiloCelula}>
                                            {item.nomeProduto ??
                                                item.nome ??
                                                'Produto'}
                                        </td>

                                        <td style={estiloCelula}>
                                            {item.quantidade}
                                        </td>

                                        <td style={estiloCelula}>
                                            {formatarMoeda(item.precoUnitario)}
                                        </td>

                                        <td style={estiloCelula}>
                                            {formatarMoeda(item.subtotal)}
                                        </td>
                                    </tr>
                                )
                            )}

                            {(!vendaDetalhada.itens ||
                                vendaDetalhada.itens.length === 0) && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        style={estiloCelula}
                                    >
                                        Nenhum item encontrado.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{
                        textAlign: 'right',
                        marginTop: '24px'
                    }}>
                        <p>Valor total</p>
                        <h2>
                            {formatarMoeda(vendaDetalhada.total)}
                        </h2>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Vendas;
