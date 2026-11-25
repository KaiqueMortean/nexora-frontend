import './Login.css';
import { useState } from 'react';
import api from '../services/api';

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');

    async function entrar(event) {
        event.preventDefault();
        setErro('');
        setCarregando(true);

        try {
            const resposta = await api.post('/usuarios/login', {
                email,
                senha
            });

            const token = resposta.data.token;

            if (!token) {
                throw new Error('Token não recebido do servidor.');
            }

            sessionStorage.setItem('nexora_token', token);

            onLogin(token);
        } catch (error) {
            setErro(
                error.response?.status === 401 ||
                error.response?.status === 403
                    ? 'E-mail ou senha incorretos.'
                    : 'Não foi possível entrar. Verifique a conexão com o servidor.'
            );
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">
                    NEXORA<span>.</span>
                </div>

                <h1>Bem-vindo de volta</h1>
                <p className="login-description">
                    Entre na sua conta para gerenciar seu negócio.
                </p>

                <form onSubmit={entrar}>
                    <label htmlFor="email">E-mail</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="seuemail@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label htmlFor="senha">Senha</label>
                    <input
                        id="senha"
                        type="password"
                        placeholder="Digite sua senha"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                    />

                    {erro && <p className="login-error">{erro}</p>}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={carregando}
                    >
                        {carregando ? 'Entrando...' : 'Entrar na Nexora'}
                    </button>
                </form>

                <p className="login-footer">
                    © 2026 Nexora ERP. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
