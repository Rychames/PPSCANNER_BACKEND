const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuração do banco de dados
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Ray8181@",
  database: "ppscanner",
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
    return;
  }
  console.log("Conectado ao banco de dados!");
});

// Rotas

// 1. Adicionar um item ao inventário
app.post("/api/inventory", (req, res) => {
  const { name, category, description, quantity } = req.body;

  if (!name || !category || !description || !quantity) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  const qrCode = `${name}-${Date.now()}`;
  const sql =
    "INSERT INTO inventory (name, category, description, quantity, qr_code) VALUES (?, ?, ?, ?, ?)";

  db.query(sql, [name, category, description, quantity, qrCode], (err, result) => {
    if (err) {
      console.error("Erro ao inserir item:", err);
      res.status(500).json({ error: "Erro ao inserir item no inventário" });
    } else {
      res.status(201).json({ message: "Item adicionado com sucesso!", qrCode });
    }
  });
});

// 2. Listar todos os itens do inventário
app.get("/api/inventory", (req, res) => {
  const sql = "SELECT * FROM inventory";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar itens:", err);
      res.status(500).json({ error: "Erro ao buscar itens do inventário" });
    } else {
      res.json(results);
    }
  });
});

// 3. Buscar um item por QR Code ou ID
app.get("/api/inventory/detail/:identifier", (req, res) => {
  const { identifier } = req.params;
  const sql = isNaN(identifier)
    ? "SELECT * FROM inventory WHERE qr_code = ?"
    : "SELECT * FROM inventory WHERE id = ?";
  db.query(sql, [identifier], (err, results) => {
    if (err) {
      console.error("Erro ao buscar item:", err);
      res.status(500).json({ error: "Erro ao buscar item no inventário" });
    } else if (results.length === 0) {
      res.status(404).json({ error: "Item não encontrado" });
    } else {
      res.json(results[0]);
    }
  });
});

// Iniciar o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
