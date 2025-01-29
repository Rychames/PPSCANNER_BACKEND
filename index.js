const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Permite JSON grande (para imagens base64)
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configuração do Multer para armazenar imagens na memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Conexão com o banco de dados no Railway
const db = mysql.createConnection({
  host: "junction.proxy.rlwy.net",
  user: "root",
  password: "sIQQmXageViNtzbjyzdAuszNyvZHvDod",
  port: 12005,
  database: "railway",
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
    return;
  }
  console.log("Conectado ao banco de dados!");
});

// 🟢 Criar um novo item no inventário (com imagens em base64)
app.post("/api/inventory", upload.array("images", 5), (req, res) => {
  const { body, files } = req;

  const imagesBase64 = files.map((file) => file.buffer.toString("base64"));

  const {
    name,
    category,
    description,
    quantity,
    size,
    model,
    brand,
    unitOrBox,
    deliveredBy,
    receivedBy,
    deliveryTime,
  } = body;

  const qrCode = `${name}-${Date.now()}`;

  const sql = `
      INSERT INTO inventory (
          name, category, description, quantity, qr_code, size, model, brand,
          unitOrBox, deliveredBy, receivedBy, deliveryTime, images
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      name,
      category,
      description,
      quantity,
      qrCode,
      size,
      model,
      brand,
      unitOrBox,
      deliveredBy,
      receivedBy,
      deliveryTime,
      JSON.stringify(imagesBase64),
    ],
    (err, result) => {
      if (err) {
        console.error("Erro ao inserir item:", err);
        return res.status(500).json({ error: "Erro ao inserir item no inventário" });
      }
      res.status(201).json({ message: "Item adicionado com sucesso!", qrCode });
    }
  );
});

// 🟡 Obter todos os itens do inventário
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

// 🔵 Obter um item pelo ID ou QR Code
app.get("/api/inventory/:identifier", (req, res) => {
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

// 🟠 Atualizar um item do inventário
app.put("/api/inventory/:id", upload.array("images", 5), (req, res) => {
  const { id } = req.params;
  const { body, files } = req;

  const imagesBase64 = files.length > 0 ? JSON.stringify(files.map((file) => file.buffer.toString("base64"))) : null;

  const sql = `
      UPDATE inventory SET
          name = ?, category = ?, description = ?, quantity = ?, size = ?, model = ?, brand = ?,
          unitOrBox = ?, deliveredBy = ?, receivedBy = ?, deliveryTime = ?
          ${imagesBase64 ? ", images = ?" : ""}
      WHERE id = ?
  `;

  const params = [
    body.name,
    body.category,
    body.description,
    body.quantity,
    body.size,
    body.model,
    body.brand,
    body.unitOrBox,
    body.deliveredBy,
    body.receivedBy,
    body.deliveryTime,
  ];

  if (imagesBase64) params.push(imagesBase64);
  params.push(id);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Erro ao atualizar item:", err);
      return res.status(500).json({ error: "Erro ao atualizar item" });
    }
    res.json({ message: "Item atualizado com sucesso!" });
  });
});

// 🔴 Excluir um item do inventário
app.delete("/api/inventory/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM inventory WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Erro ao deletar item:", err);
      return res.status(500).json({ error: "Erro ao excluir item" });
    }
    res.json({ message: "Item removido com sucesso!" });
  });
});

// Iniciar o servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
