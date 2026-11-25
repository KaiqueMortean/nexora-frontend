import { useEffect, useState } from 'react';

function Fornecedores() {

    const [fornecedores, setFornecedores] = useState([]);

    const [editando, setEditando] = useState(null);

    const [formulario, setFormulario] = useState({
        nome: '',
        cnpj: '',
        telefone: '',
        email: '',
        endereco: '',
        observacoes: ''
    });


    const token = sessionStorage.getItem(
        'nexora_token'
    );


    async function carregarFornecedores() {

        const resposta = await fetch(
            'http://localhost:5000/fornecedores',
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const dados = await resposta.json();

        setFornecedores(dados);
    }


    useEffect(() => {
        carregarFornecedores();
    }, []);


    function alterarCampo(e) {

        setFormulario({
            ...formulario,
            [e.target.name]: e.target.value
        });

    }


    async function salvarFornecedor(e) {

        e.preventDefault();


        const url = editando
            ? `http://localhost:5000/fornecedores/${editando}`
            : 'http://localhost:5000/fornecedores';


        const metodo = editando
            ? 'PUT'
            : 'POST';


        await fetch(
            url,
            {
                method: metodo,

                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify(formulario)
            }
        );


        limparFormulario();

        carregarFornecedores();
    }


    function editarFornecedor(fornecedor) {

        setEditando(fornecedor.id);

        setFormulario({
            nome: fornecedor.nome,
            cnpj: fornecedor.cnpj || '',
            telefone: fornecedor.telefone || '',
            email: fornecedor.email || '',
            endereco: fornecedor.endereco || '',
            observacoes: fornecedor.observacoes || ''
        });

    }


    async function excluirFornecedor(id) {

        const confirmar = window.confirm(
            'Deseja excluir este fornecedor?'
        );


        if (!confirmar) return;


        await fetch(
            `http://localhost:5000/fornecedores/${id}`,
            {
                method: 'DELETE',

                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );


        carregarFornecedores();
    }


    function limparFormulario() {

        setFormulario({
            nome: '',
            cnpj: '',
            telefone: '',
            email: '',
            endereco: '',
            observacoes: ''
        });

        setEditando(null);

    }


    return (

        <div>

            <h2>
                {editando
                    ? 'Editar fornecedor'
                    : 'Novo fornecedor'}
            </h2>


            <form onSubmit={salvarFornecedor}>


                <input
                    name="nome"
                    placeholder="Nome"
                    value={formulario.nome}
                    onChange={alterarCampo}
                />


                <input
                    name="cnpj"
                    placeholder="CNPJ"
                    value={formulario.cnpj}
                    onChange={alterarCampo}
                />


                <input
                    name="telefone"
                    placeholder="Telefone"
                    value={formulario.telefone}
                    onChange={alterarCampo}
                />


                <input
                    name="email"
                    placeholder="Email"
                    value={formulario.email}
                    onChange={alterarCampo}
                />


                <input
                    name="endereco"
                    placeholder="Endereço"
                    value={formulario.endereco}
                    onChange={alterarCampo}
                />


                <textarea
                    name="observacoes"
                    placeholder="Observações"
                    value={formulario.observacoes}
                    onChange={alterarCampo}
                />


                <button>
                    {editando
                        ? 'Atualizar'
                        : 'Salvar fornecedor'}
                </button>


                {editando && (

                    <button
                        type="button"
                        onClick={limparFormulario}
                    >
                        Cancelar
                    </button>

                )}


            </form>


            <hr />


            <table>

                <thead>

                <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Email</th>
                    <th>Ações</th>
                </tr>

                </thead>


                <tbody>

                {fornecedores.map(fornecedor => (

                    <tr key={fornecedor.id}>

                        <td>
                            {fornecedor.nome}
                        </td>

                        <td>
                            {fornecedor.telefone}
                        </td>

                        <td>
                            {fornecedor.email}
                        </td>


                        <td>

                            <button
                                onClick={() =>
                                    editarFornecedor(fornecedor)
                                }
                            >
                                Editar
                            </button>


                            <button
                                onClick={() =>
                                    excluirFornecedor(
                                        fornecedor.id
                                    )
                                }
                            >
                                Excluir
                            </button>

                        </td>

                    </tr>

                ))}

                </tbody>

            </table>


        </div>

    );

}

export default Fornecedores;