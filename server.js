const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Configurar o banco de dados SQLite local
const db = new sqlite3.Database('./chamados.db', (err) => {
    if (err) console.error('Erro ao abrir o banco de dados', err.message);
    else console.log('Conectado ao banco de dados SQLite.');
});

// Criar tabela de chamados com todas as colunas necessárias
db.run(`CREATE TABLE IF NOT EXISTS chamados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT,
    nome TEXT,
    setor TEXT,
    problema TEXT,
    status TEXT DEFAULT 'Aberto',
    tecnico TEXT DEFAULT 'Não atribuído',
    solucao TEXT DEFAULT ''
)`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para abrir um chamado (com horário local certinho)
app.post('/api/chamados', (req, res) => {
    const { nome, setor, problema } = req.body;
    
    if (!nome || !setor || !problema) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    const dataLocal = new Date().toISOString();
    const query = `INSERT INTO chamados (data, nome, setor, problema, status, tecnico, solucao) VALUES (?, ?, ?, ?, 'Aberto', 'Não atribuído', '')`;
    
    db.run(query, [dataLocal, nome, setor, problema], function(err) {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ id: this.lastID, mensagem: 'Chamado aberto com sucesso!' });
    });
});

// Rota para listar chamados (para o painel de TI)
app.get('/api/chamados', (req, res) => {
    db.all(`SELECT * FROM chamados ORDER BY data DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// Rota para estatísticas dos cards da página inicial
app.get('/api/estatisticas', (req, res) => {
    db.all(`SELECT status, COUNT(*) as total FROM chamados GROUP BY status`, [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        
        let stats = { Aberto: 0, 'Em Andamento': 0, Fechado: 0, Cancelado: 0 };
        rows.forEach(row => {
            if (stats.hasOwnProperty(row.status)) {
                stats[row.status] = row.total;
            }
        });
        res.json(stats);
    });
});

// Rota para atualizar status, técnico e solução
app.put('/api/chamados/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, tecnico, solucao } = req.body;
    
    const query = `UPDATE chamados SET status = ?, tecnico = ?, solucao = ? WHERE id = ?`;
    db.run(query, [status, tecnico, solucao || '', id], function(err) {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ mensagem: 'Chamado atualizado com sucesso!' });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando! Acesse via rede em: http://localhost:${PORT}`);
});

// Defina a senha do administrador da TI
const SENHA_ADMIN = "seed@parana"; // Altere para a senha que desejar

// Rota para validar o login do painel técnico
app.post('/api/login', express.json(), (req, res) => {
    const { senha } = req.body;
    
    if (senha === SENHA_ADMIN) {
        res.json({ sucesso: true, mensagem: "Autenticado com sucesso!" });
    } else {
        res.status(401).json({ sucesso: false, mensagem: "Senha incorreta." });
    }
});
