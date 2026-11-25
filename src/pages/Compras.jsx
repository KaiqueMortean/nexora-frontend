import { useEffect, useState } from "react";

function Compras() {

    const token = sessionStorage.getItem(
        "nexora_token"
    );


    const [compras, setCompras] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [produtos, setProdutos] = useState([]);

    const [fornecedorId, setFornecedorId] = useState("");

    const [itens, setItens] = useState([]);

    const [item, setItem] = useState({
        produtoId: "",
        quantidade: "",
        valorUnitario: ""
    });



    async function carregarDados() {

        const fornecedoresResposta = await fetch(
            "http://localhost:5000/fornecedores",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );


        const produtosResposta = await fetch(
            "http://localhost:5000/produtos",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );


        const comprasResposta = await fetch(
            "http://localhost:5000/compras",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );


        setFornecedores(
            await fornecedoresResposta.json()
        );


        setProdutos(
            await produtosResposta.json()
        );


        setCompras(
            await comprasResposta.json()
        );

    }



    useEffect(() => {

        carregarDados();

    }, []);



    function adicionarItem() {


        if (
            !item.produtoId ||
            !item.quantidade ||
            !item.valorUnitario
        ) {
            alert("Preencha produto, quantidade e valor");
            return;
        }


        const novoItem = {

            produtoId: Number(item.produtoId),

            quantidade: Number(item.quantidade),

            valorUnitario: Number(item.valorUnitario)

        };


        setItens([
            ...itens,
            novoItem
        ]);


        setItem({

            produtoId: "",

            quantidade: "",

            valorUnitario: ""

        });

    }




    async function salvarCompra() {


        if (!fornecedorId) {

            alert("Selecione um fornecedor");

            return;

        }


        if (itens.length === 0) {

            alert("Adicione pelo menos um produto");

            return;

        }


        const dados = {

            fornecedorId: Number(fornecedorId),

            itens

        };


        console.log("Compra enviada:", dados);



        const resposta = await fetch(

            "http://localhost:5000/compras",

            {

                method: "POST",

                headers: {

                    "Content-Type": "application/json",

                    Authorization:
                        `Bearer ${token}`

                },


                body: JSON.stringify(dados)

            }

        );


        if (!resposta.ok) {

            const erro = await resposta.text();

            console.log(erro);

            alert("Erro ao salvar compra");

            return;

        }


        alert("Compra salva com sucesso");


        setFornecedorId("");

        setItens([]);


        carregarDados();

    }





    return (

        <div>


            <h2>
                Nova Compra
            </h2>



            <select

                value={fornecedorId}

                onChange={
                    e => setFornecedorId(e.target.value)
                }

            >

                <option value="">
                    Selecione fornecedor
                </option>


                {fornecedores.map(f => (

                    <option
                        key={f.id}
                        value={f.id}
                    >

                        {f.nome}

                    </option>

                ))}


            </select>



            <h3>
                Produto
            </h3>



            <select

                value={item.produtoId}

                onChange={
                    e =>
                        setItem({

                            ...item,

                            produtoId: e.target.value

                        })
                }

            >

                <option value="">
                    Selecione produto
                </option>


                {produtos.map(p => (

                    <option

                        key={p.id}

                        value={p.id}

                    >

                        {p.nome}

                    </option>

                ))}


            </select>



            <input

                type="number"

                placeholder="Quantidade"

                value={item.quantidade}

                onChange={
                    e =>
                        setItem({

                            ...item,

                            quantidade: e.target.value

                        })
                }

            />



            <input

                type="number"

                placeholder="Valor unitário"

                value={item.valorUnitario}

                onChange={
                    e =>
                        setItem({

                            ...item,

                            valorUnitario: e.target.value

                        })
                }

            />



            <button
                onClick={adicionarItem}
            >

                Adicionar item

            </button>



            <h3>
                Itens adicionados
            </h3>



            {itens.map((i, index) => (

                <p key={index}>

                    Produto ID: {i.produtoId}
                    |
                    Quantidade: {i.quantidade}
                    |
                    Valor: R$ {i.valorUnitario}

                </p>

            ))}



            <button
                onClick={salvarCompra}
            >

                Finalizar compra

            </button>




            <hr />



            <h2>
                Histórico
            </h2>



            <table>

                <tbody>

                {compras.map(c => (

                    <tr key={c.id}>

                        <td>
                            {c.fornecedor}
                        </td>


                        <td>
                            R$ {c.valorTotal}
                        </td>

                    </tr>

                ))}


                </tbody>

            </table>



        </div>

    );

}


export default Compras;