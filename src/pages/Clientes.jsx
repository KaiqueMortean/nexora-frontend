
import { useEffect, useState } from 'react';
import api from '../services/api';

const formularioVazio = {
    nome: '',
    cpfCnpj: '',
    telefone: '',
    email: ''
};

const estiloCampo = {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxSizing: 'border-box',
    fontSize: '14px'
};

const estiloBotao = {
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: 600
};

function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);

    const [pesquisa, setPesquisa] = useState('');
    const [mostrarFormulario, setMostrarFormulario] =
        useState(false);

    const [clienteEditando, setClienteEditando] = useState(null);
    const [formulario, setFormulario] =
        useState({ ...formularioVazio });

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    useEffect(() => {
        let ativo = true;

        async function carregarClientes() {
            try {
                const resposta = await api.get('/clientes');

                if (ativo) {
                    setClientes(resposta.data);
                }
            } catch (error) {
                console.error('Erro ao carregar clientes:', error);

                if (ativo) {
                    setErro('Não foi possível carregar os clientes.');
                }
            } finally {
                if (ativo) {
                    setCarregando(false);
                }
            }
        }

        carregarClientes();

        return () => {
            ativo = false;
        };
    }, []);

    function obterErro(error, mensagemPadrao) {
        if (error.response?.status === 401) {
            return 'Sessão expirada. Faça login novamente.';
        }

        const dados = error.response?.data;

        if (typeof dados?.message === 'string') {
            return dados.message;
        }

        if (typeof dados === 'string' && dados.trim()) {
            return dados;
        }

        if (dados?.errors && Array.isArray(dados.errors)) {
            return dados.errors
                .map(item => item.defaultMessage || item.message)
                .filter(Boolean)
                .join(', ') || mensagemPadrao;
        }

        return mensagemPadrao;
    }

    async function atualizarClientes() {
        const resposta = await api.get('/clientes');
        setClientes(resposta.data);
    }

    function novoCliente() {
        setErro('');
        setSucesso('');
        setClienteEditando(null);
        setFormulario({ ...formularioVazio });
        setMostrarFormulario(true);
    }

    function editarCliente(cliente) {
        setErro('');
        setSucesso('');

        setClienteEditando(cliente.id);

        setFormulario({
            nome: cliente.nome || '',
            cpfCnpj: cliente.cpfCnpj || '',
            telefone: cliente.telefone || '',
            email: cliente.email || ''
        });

        setMostrarFormulario(true);
    }

    function alterarCampo(campo, valor) {
        setFormulario(anterior => ({
            ...anterior,
            [campo]: valor
        }));
    }

    function fecharFormulario() {
        if (salvando) return;

        setMostrarFormulario(false);
        setClienteEditando(null);
        setFormulario({ ...formularioVazio });
    }

    async function salvarCliente(evento) {
        evento.preventDefault();

        if (salvando) return;

        if (!formulario.nome.trim()) {
            setErro('O nome do cliente é obrigatório.');
            return;
        }

        setErro('');
        setSucesso('');
        setSalvando(true);

        const dados = {
            nome: formulario.nome.trim(),
            cpfCnpj: formulario.cpfCnpj.trim() || null,
            telefone: formulario.telefone.trim() || null,
            email: formulario.email.trim() || null
        };

        try {
            if (clienteEditando !== null) {
                await api.put(
                    `/clientes/${clienteEditando}`,
                    dados
                );

                setSucesso('Cliente atualizado com sucesso!');
            } else {
                await api.post('/clientes', dados);

                setSucesso('Cliente cadastrado com sucesso!');
            }

            setMostrarFormulario(false);
            setClienteEditando(null);
            setFormulario({ ...formularioVazio });

            try {
                await atualizarClientes();
            } catch (error) {
                console.error('Erro ao atualizar lista:', error);

                setErro(
                    'Cliente salvo, mas a listagem não foi atualizada. ' +
                    'Recarregue a página.'
                );
            }
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);

            setErro(
                obterErro(
                    error,
                    'Não foi possível salvar o cliente.'
                )
            );
        } finally {
            setSalvando(false);
        }
    }

    async function excluirCliente(cliente) {
        if (salvando) return;

        const confirmado = window.confirm(
            `Deseja realmente excluir o cliente "${cliente.nome}"?\n\n` +
            'Essa operação pode afetar o acesso ao cadastro ' +
            'em outras funcionalidades.'
        );

        if (!confirmado) return;

        setErro('');
        setSucesso('');
        setSalvando(true);

        try {
            await api.delete(`/clientes/${cliente.id}`);

            setSucesso(
                `Cliente "${cliente.nome}" excluído com sucesso!`
            );

            if (clienteEditando === cliente.id) {
                setMostrarFormulario(false);
                setClienteEditando(null);
                setFormulario({ ...formularioVazio });
            }

            try {
                await atualizarClientes();
            } catch (error) {
                console.error('Erro ao atualizar lista:', error);

                setErro(
                    'Exclusão realizada, mas a listagem não foi ' +
                    'atualizada. Recarregue a página.'
                );
            }
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);

            setErro(
                obterErro(
                    error,
                    'Não foi possível excluir o cliente.'
                )
            );
        } finally {
            setSalvando(false);
        }
    }

    const termo = pesquisa.toLocaleLowerCase('pt-BR').trim();

    const clientesFiltrados = clientes.filter(cliente => {
        const conteudo = [
            cliente.nome,
            cliente.cpfCnpj,
            cliente.telefone,
            cliente.email
        ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('pt-BR');

        return conteudo.includes(termo);
    });

    return (
        <section>
            <div className="welcome">
                <h3>Gerenciamento de clientes</h3>
                <p>
                    Cadastre, organize e consulte os clientes
                    da sua empresa.
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

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '20px'
            }}>
                <div>
                    <h3>Clientes cadastrados</h3>
                    <p>
                        {clientesFiltrados.length} cliente(s)
                        encontrado(s)
                    </p>
                </div>

                <button
                    type="button"
                    onClick={novoCliente}
                    disabled={salvando}
                    style={{
                        ...estiloBotao,
                        background: '#2563eb',
                        color: '#fff'
                    }}
                >
                    + Novo Cliente
                </button>
            </div>

            {mostrarFormulario && (
                <div
                    className="empty-panel"
                    style={{ marginBottom: '24px' }}
                >
                    <h3>
                        {clienteEditando !== null
                            ? 'Editar cliente'
                            : 'Cadastrar cliente'}
                    </h3>

                    <form onSubmit={salvarCliente}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '16px',
                            marginTop: '20px'
                        }}>
                            <div>
                                <label htmlFor="cliente-nome">
                                    Nome *
                                </label>

                                <input
                                    id="cliente-nome"
                                    type="text"
                                    required
                                    maxLength={255}
                                    value={formulario.nome}
                                    onChange={e =>
                                        alterarCampo('nome', e.target.value)
                                    }
                                    disabled={salvando}
                                    placeholder="Nome completo"
                                    style={estiloCampo}
                                />
                            </div>

                            <div>
                                <label htmlFor="cliente-documento">
                                    CPF / CNPJ
                                </label>

                                <input
                                    id="cliente-documento"
                                    type="text"
                                    value={formulario.cpfCnpj}
                                    onChange={e =>
                                        alterarCampo('cpfCnpj', e.target.value)
                                    }
                                    disabled={salvando}
                                    placeholder="CPF ou CNPJ"
                                    style={estiloCampo}
                                />
                            </div>

                            <div>
                                <label htmlFor="cliente-telefone">
                                    Telefone
                                </label>

                                <input
                                    id="cliente-telefone"
                                    type="tel"
                                    value={formulario.telefone}
                                    onChange={e =>
                                        alterarCampo('telefone', e.target.value)
                                    }
                                    disabled={salvando}
                                    placeholder="(44) 99999-9999"
                                    style={estiloCampo}
                                />
                            </div>

                            <div>
                                <label htmlFor="cliente-email">
                                    E-mail
                                </label>

                                <input
                                    id="cliente-email"
                                    type="email"
                                    value={formulario.email}
                                    onChange={e =>
                                        alterarCampo('email', e.target.value)
                                    }
                                    disabled={salvando}
                                    placeholder="cliente@email.com"
                                    style={estiloCampo}
                                />
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginTop: '24px',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                type="submit"
                                disabled={salvando}
                                style={{
                                    ...estiloBotao,
                                    background: '#2563eb',
                                    color: '#fff'
                                }}
                            >
                                {salvando
                                    ? 'Salvando...'
                                    : clienteEditando !== null
                                        ? 'Salvar alterações'
                                        : 'Cadastrar cliente'}
                            </button>

                            <button
                                type="button"
                                onClick={fecharFormulario}
                                disabled={salvando}
                                style={{
                                    ...estiloBotao,
                                    background: '#e5e7eb',
                                    color: '#374151'
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="empty-panel">
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                    marginBottom: '20px'
                }}>
                    <h3>Lista de clientes</h3>

                    <input
                        type="search"
                        value={pesquisa}
                        onChange={e => setPesquisa(e.target.value)}
                        placeholder="Pesquisar cliente..."
                        style={{
                            ...estiloCampo,
                            maxWidth: '320px'
                        }}
                    />
                </div>

                {carregando ? (
                    <p>Carregando clientes...</p>
                ) : clientesFiltrados.length === 0 ? (
                    <p>
                        {pesquisa
                            ? 'Nenhum cliente encontrado.'
                            : 'Nenhum cliente cadastrado.'}
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            textAlign: 'left'
                        }}>
                            <thead>
                            <tr>
                                <th style={{ padding: '12px' }}>
                                    Nome
                                </th>
                                <th style={{ padding: '12px' }}>
                                    CPF / CNPJ
                                </th>
                                <th style={{ padding: '12px' }}>
                                    Telefone
                                </th>
                                <th style={{ padding: '12px' }}>
                                    E-mail
                                </th>
                                <th style={{ padding: '12px' }}>
                                    Ações
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            {clientesFiltrados.map(cliente => (
                                <tr key={cliente.id}>
                                    <td style={{
                                        padding: '12px',
                                        borderTop: '1px solid #e5e7eb'
                                    }}>
                                        <strong>{cliente.nome}</strong>
                                    </td>

                                    <td style={{
                                        padding: '12px',
                                        borderTop: '1px solid #e5e7eb'
                                    }}>
                                        {cliente.cpfCnpj || '—'}
                                    </td>

                                    <td style={{
                                        padding: '12px',
                                        borderTop: '1px solid #e5e7eb'
                                    }}>
                                        {cliente.telefone || '—'}
                                    </td>

                                    <td style={{
                                        padding: '12px',
                                        borderTop: '1px solid #e5e7eb'
                                    }}>
                                        {cliente.email || '—'}
                                    </td>

                                    <td style={{
                                        padding: '12px',
                                        borderTop: '1px solid #e5e7eb'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <button
                                                type="button"
                                                onClick={() => editarCliente(cliente)}
                                                disabled={salvando}
                                                style={{
                                                    ...estiloBotao,
                                                    background: '#e0e7ff',
                                                    color: '#1d4ed8'
                                                }}
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => excluirCliente(cliente)}
                                                disabled={salvando}
                                                style={{
                                                    ...estiloBotao,
                                                    background: '#fee2e2',
                                                    color: '#b91c1c'
                                                }}
                                            >
                                                Excluir
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}

export default Clientes;
