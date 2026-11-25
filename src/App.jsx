
import { useState } from 'react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Vendas from './pages/Vendas';
import Caixa from './pages/Caixa';
import Clientes from './pages/Clientes';
import Financeiro from './pages/Financeiro';
import ContasReceber from './pages/ContasReceber';
import ContasPagar from './pages/ContasPagar';
import Fornecedores from './pages/Fornecedores';
import Compras from './pages/Compras';

import './App.css';

const itensMenu = [
  { id: 'dashboard', icone: '▦', nome: 'Dashboard' },
  { id: 'produtos', icone: '▣', nome: 'Produtos' },
  { id: 'fornecedores', icone: '▤', nome: 'Fornecedores'},
  {
    id: 'compras',
    icone: '🛒',
    nome: 'Compras'
  },
  { id: 'vendas', icone: '◈', nome: 'Vendas' },
  { id: 'caixa', icone: '◉', nome: 'Caixa' },
  { id: 'clientes', icone: '♧', nome: 'Clientes' },
  {
    id: 'financeiro',
    icone: '◫',
    nome: 'Painel Financeiro'
  },
  {
    id: 'contas-receber',
    icone: '↙',
    nome: 'Contas a Receber'
  },
  {
    id: 'contas-pagar',
    icone: '↗',
    nome: 'Contas a Pagar'
  }
];

const titulos = {
  dashboard: 'Dashboard',
  produtos: 'Produtos',
  vendas: 'Vendas',
  caixa: 'Caixa',
  clientes: 'Clientes',
  financeiro: 'Painel Financeiro',
  'contas-receber': 'Contas a Receber',
  'contas-pagar': 'Contas a Pagar',
  fornecedores: 'Fornecedores',
  compras: 'Compras',
};

function App() {
  const [token, setToken] = useState(() =>
      sessionStorage.getItem('nexora_token')
  );

  const [paginaAtual, setPaginaAtual] = useState('dashboard');

  function sair() {
    sessionStorage.removeItem('nexora_token');

    setToken(null);
    setPaginaAtual('dashboard');
  }

  function navegar(pagina) {
    setPaginaAtual(pagina);
  }

  if (!token) {
    return <Login onLogin={setToken} />;
  }

  function renderizarPagina() {
    switch (paginaAtual) {
      case 'dashboard':
        return (
            <Dashboard
                onVerProdutos={() => navegar('produtos')}
            />
        );

      case 'produtos':
        return <Produtos />;

      case 'fornecedores':
        return <Fornecedores />;

      case 'compras':
        return <Compras />;

      case 'vendas':
        return <Vendas />;

      case 'caixa':
        return <Caixa />;

      case 'clientes':
        return <Clientes />;

      case 'financeiro':
        return <Financeiro />;

      case 'contas-receber':
        return <ContasReceber />;

      case 'contas-pagar':
        return <ContasPagar />;

      default:
        return (
            <Dashboard
                onVerProdutos={() => navegar('produtos')}
            />
        );
    }
  }

  return (
      <div className="layout">
        <aside className="sidebar">
          <h1 className="logo">
            NEXORA<span>.</span>
          </h1>

          <p className="sidebar-label">
            MENU PRINCIPAL
          </p>

          <nav>
            {itensMenu.map(item => (
                <a
                    key={item.id}
                    href="#"
                    className={
                      paginaAtual === item.id ? 'active' : ''
                    }
                    onClick={evento => {
                      evento.preventDefault();
                      navegar(item.id);
                    }}
                >
                  {item.icone} {item.nome}
                </a>
            ))}
          </nav>

          <div className="sidebar-footer">
            Nexora ERP • v1.0
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <p className="subtitle">
                {paginaAtual === 'dashboard'
                    ? 'VISÃO GERAL'
                    : 'GERENCIAMENTO'}
              </p>

              <h2>
                {titulos[paginaAtual] || 'Nexora'}
              </h2>
            </div>

            <div className="topbar-actions">
              <button
                  type="button"
                  className="logout-button"
                  onClick={sair}
              >
                Sair
              </button>

              <div className="avatar">
                N
              </div>
            </div>
          </header>

          {renderizarPagina()}
        </main>
      </div>
  );
}

export default App;
