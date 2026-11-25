
import { useEffect, useState } from 'react';
import api from '../services/api';

const formularioVazio = {
    nome: '',
    preco: '',
    estoque: ''
};

function Produtos() {
    const [produtos, setProdutos] = useState([]);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [desativandoId, setDesativandoId] = useState(null);

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [produtoEditando, setProdutoEditando] = useState(null);
    const [formulario, setFormulario] = useState(formularioVazio);

    useEffect(() => {
        let ativo = true;

        async function carregarProdutos() {
            try {
                const resposta = await api.get('/produtos');

                if (ativo) {
                    setProdutos(resposta.data);
                }
            } catch (error) {
                console.error('Erro ao carregar produtos:', error);

                if (ativo) {
                    setErro('Não foi possível carregar os produtos.');
                }
            } finally {
                if (ativo) {
                    setCarregando(false);
                }
            }
        }

        carregarProdutos();

        return () => {
            ativo = false;
        };
    }, []);

    async function atualizarLista() {
        const resposta = await api.get('/produtos');
        setProdutos(resposta.data);
    }

    function atualizarCampo(evento) {
        const { name, value } = evento.target;

        setFormulario(anterior => ({
            ...anterior,
            [name]: value
        }));
    }

    function novoProduto() {
        setProdutoEditando(null);
        setFormulario({ ...formularioVazio });
        setErro('');
        setSucesso('');
        setMostrarFormulario(true);
    }

    function editarProduto(produto) {
        setProdutoEditando(produto.id);

        setFormulario({
            nome: produto.nome,
            preco: String(produto.preco),
            estoque: String(produto.estoque)
        });

        setErro('');
        setSucesso('');
        setMostrarFormulario(true);

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function cancelarFormulario() {
        if (salvando) return;

        setMostrarFormulario(false);
        setProdutoEditando(null);
        setFormulario({ ...formularioVazio });
        setErro('');
    }

    async function salvarProduto(evento) {
        evento.preventDefault();

        if (salvando || desativandoId !== null) return;

        setErro('');
        setSucesso('');

        const nome = formulario.nome.trim();
        const preco = Number(formulario.preco);
        const estoque = Number(formulario.estoque);

        if (!nome) {
            setErro('Informe o nome do produto.');
            return;
        }

        if (
            formulario.preco.trim() === '' ||
            !Number.isFinite(preco) ||
            preco < 0
        ) {
            setErro('Informe um preço válido.');
            return;
        }

        if (
            formulario.estoque.trim() === '' ||
            !Number.isInteger(estoque) ||
            estoque < 0
        ) {
            setErro('Informe uma quantidade válida de estoque.');
            return;
        }

        setSalvando(true);

        const dados = { nome, preco, estoque };
        const estavaEditando = produtoEditando !== null;

        try {
            if (estavaEditando) {
                await api.put(`/produtos/${produtoEditando}`, dados);
            } else {
                await api.post('/produtos', dados);
            }

            setMostrarFormulario(false);
            setProdutoEditando(null);
            setFormulario({ ...formularioVazio });

            try {
                await atualizarLista();

                setSucesso(
                    estavaEditando
                        ? 'Produto atualizado com sucesso!'
                        : 'Produto cadastrado com sucesso!'
                );
            } catch (error) {
                console.error('Erro ao atualizar lista:', error);
                setErro(
                    'Produto salvo, mas não foi possível atualizar a lista. Recarregue a página.'
                );
            }

        } catch (error) {
            console.error('Erro ao salvar produto:', error);

            if (error.response?.status === 403) {
                setErro('Apenas administradores podem salvar produtos.');
            } else if (error.response?.status === 401) {
                setErro('Sua sessão expirou. Faça login novamente.');
            } else if (error.response?.status === 400) {
                setErro('Dados inválidos. Confira os campos.');
            } else if (error.response?.status === 404) {
                setErro('Produto não encontrado.');
            } else {
                setErro(
                    'Não foi possível confirmar a operação. Confira a lista antes de tentar novamente.'
                );
            }
        } finally {
            setSalvando(false);
        }
    }

    async function desativarProduto(produto) {
        if (salvando || desativandoId !== null) return;

        const confirmado = window.confirm(
            `Deseja realmente desativar "${produto.nome}"?\n\n` +
            'O produto deixará de aparecer na lista, mas seu registro será mantido no banco de dados.'
        );

        if (!confirmado) return;

        setErro('');
        setSucesso('');
        setDesativandoId(produto.id);

        try {
            await api.delete(`/produtos/${produto.id}`);

            // Remove imediatamente da listagem
            setProdutos(anteriores =>
                anteriores.filter(item => item.id !== produto.id)
            );

            // Fecha a edição caso o produto desativado esteja aberto
            if (produtoEditando === produto.id) {
                setMostrarFormulario(false);
                setProdutoEditando(null);
                setFormulario({ ...formularioVazio });
            }

            setSucesso(`Produto "${produto.nome}" desativado com sucesso!`);

        } catch (error) {
            console.error('Erro ao desativar produto:', error);

            if (error.response?.status === 403) {
                setErro(
                    'Acesso negado. Apenas administradores podem desativar produtos.'
                );
            } else if (error.response?.status === 401) {
                setErro('Sua sessão expirou. Faça login novamente.');
            } else if (error.response?.status === 404) {
                setErro('Produto não encontrado.');
            } else {
                setErro(
                    'Não foi possível confirmar a desativação. Atualize a lista antes de tentar novamente.'
                );
            }
        } finally {
            setDesativandoId(null);
        }
    }

    const produtosFiltrados = produtos.filter(produto =>
        produto.nome.toLowerCase().includes(busca.toLowerCase())
    );

    function formatarMoeda(valor) {
        return Number(valor ?? 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    const estiloInput = {
        width: '100%',
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxSizing: 'border-box'
    };

    const estiloBotao = {
        background: '#2563eb',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 20px',
        fontWeight: '600',
        cursor: 'pointer'
    };

    const operacaoEmAndamento = salvando || desativandoId !== null;

    return (
        <section>

            {/* CABEÇALHO */}
            <div className="welcome">
                <h3>Gerenciamento de produtos</h3>
                <p>
                    Cadastre, edite e controle os produtos da sua empresa.
                </p>
            </div>

            {/* MENSAGENS */}
            {sucesso && (
                <p style={{ color: '#15803d', marginBottom: '16px' }}>
                    {sucesso}
                </p>
            )}

            {erro && (
                <p style={{ color: '#dc2626', marginBottom: '16px' }}>
                    {erro}
                </p>
            )}

            {/* PESQUISA E CADASTRO */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap'
            }}>
                <input
                    type="text"
                    placeholder="Buscar produto pelo nome..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    style={{
                        ...estiloInput,
                        width: 'auto',
                        flex: '1 1 240px'
                    }}
                />

                <button
                    type="button"
                    onClick={novoProduto}
                    disabled={operacaoEmAndamento}
                    style={estiloBotao}
                >
                    + Novo Produto
                </button>
            </div>

            {/* FORMULÁRIO */}
            {mostrarFormulario && (
                <div
                    className="empty-panel"
                    style={{ marginBottom: '24px' }}
                >
                    <h3 style={{ marginBottom: '18px' }}>
                        {produtoEditando !== null
                            ? 'Editar produto'
                            : 'Cadastrar novo produto'}
                    </h3>

                    <form onSubmit={salvarProduto}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '16px',
                            marginBottom: '20px'
                        }}>

                            <div>
                                <label htmlFor="produto-nome">
                                    Nome do produto
                                </label>

                                <input
                                    id="produto-nome"
                                    name="nome"
                                    type="text"
                                    value={formulario.nome}
                                    onChange={atualizarCampo}
                                    placeholder="Ex: Camiseta Chronic"
                                    required
                                    maxLength={150}
                                    disabled={salvando}
                                    style={{ ...estiloInput, marginTop: '8px' }}
                                />
                            </div>

                            <div>
                                <label htmlFor="produto-preco">
                                    Preço (R$)
                                </label>

                                <input
                                    id="produto-preco"
                                    name="preco"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formulario.preco}
                                    onChange={atualizarCampo}
                                    placeholder="89.90"
                                    required
                                    disabled={salvando}
                                    style={{ ...estiloInput, marginTop: '8px' }}
                                />
                            </div>

                            <div>
                                <label htmlFor="produto-estoque">
                                    Quantidade em estoque
                                </label>

                                <input
                                    id="produto-estoque"
                                    name="estoque"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={formulario.estoque}
                                    onChange={atualizarCampo}
                                    placeholder="10"
                                    required
                                    disabled={salvando}
                                    style={{ ...estiloInput, marginTop: '8px' }}
                                />
                            </div>

                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                type="submit"
                                disabled={operacaoEmAndamento}
                                style={{
                                    ...estiloBotao,
                                    opacity: operacaoEmAndamento ? 0.7 : 1
                                }}
                            >
                                {salvando
                                    ? 'Salvando...'
                                    : produtoEditando !== null
                                        ? 'Salvar alterações'
                                        : 'Cadastrar produto'}
                            </button>

                            <button
                                type="button"
                                onClick={cancelarFormulario}
                                disabled={operacaoEmAndamento}
                                style={{
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    padding: '12px 20px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* LISTAGEM */}
            {carregando && <p>Carregando produtos...</p>}

            {!carregando && (
                <div className="empty-panel">
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            textAlign: 'left',
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                            <tr>
                                <th style={{ padding: '12px' }}>Produto</th>
                                <th style={{ padding: '12px' }}>Preço</th>
                                <th style={{ padding: '12px' }}>Estoque</th>
                                <th style={{ padding: '12px' }}>Ações</th>
                            </tr>
                            </thead>

                            <tbody>
                            {produtosFiltrados.map(produto => (
                                <tr key={produto.id}>
                                    <td style={{ padding: '12px' }}>
                                        {produto.nome}
                                    </td>

                                    <td style={{ padding: '12px' }}>
                                        {formatarMoeda(produto.preco)}
                                    </td>

                                    <td style={{ padding: '12px' }}>
                                        {produto.estoque <= 5 ? (
                                            <span style={{
                                                color: '#d97706',
                                                fontWeight: '600'
                                            }}>
                          ⚠️ {produto.estoque} unidades
                        </span>
                                        ) : (
                                            <span>
                          {produto.estoque} unidades
                        </span>
                                        )}
                                    </td>

                                    <td style={{ padding: '12px' }}>
                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <button
                                                type="button"
                                                onClick={() => editarProduto(produto)}
                                                disabled={operacaoEmAndamento}
                                                style={{
                                                    background: '#eff6ff',
                                                    color: '#2563eb',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '7px',
                                                    padding: '8px 14px',
                                                    cursor: 'pointer',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => desativarProduto(produto)}
                                                disabled={operacaoEmAndamento}
                                                style={{
                                                    background: '#fef2f2',
                                                    color: '#dc2626',
                                                    border: '1px solid #fecaca',
                                                    borderRadius: '7px',
                                                    padding: '8px 14px',
                                                    cursor: 'pointer',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                {desativandoId === produto.id
                                                    ? 'Desativando...'
                                                    : 'Desativar'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {produtosFiltrados.length === 0 && !erro && (
                        <p style={{ marginTop: '16px' }}>
                            Nenhum produto encontrado.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}

export default Produtos;
