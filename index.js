const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 5000;

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // Pasta para armazenar as imagens
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Nome único para cada imagem
  },
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads")); // Servir arquivos da pasta "uploads"

// Conexão com o banco de dados do Railway
const db = mysql.createConnection({
  host: 'junction.proxy.rlwy.net', // Host fornecido pelo Railway
  user: 'root',                    // Usuário fornecido
  password: 'sIQQmXageViNtzbjyzdAuszNyvZHvDod', // Senha fornecida
  port: 12005,                     // Porta fornecida
  database: 'railway',             // Banco de dados fornecido
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
    return;
  }
  console.log("Conectado ao banco de dados!");
});

// Rota para adicionar um item ao inventário com upload de imagens
app.post("/api/inventory", upload.array("images", 5), (req, res) => {
  const {
    name,
    category,
    description,
    quantity,
    size,
    model,
    brand,
    unitOrBox,
    deliveryCompany,
    deliveredBy,
    receivedBy,
    deliveryTime,
  } = req.body;

  // Salvar as URLs das imagens
  const imageUrls = req.files.map((file) => `/uploads/${file.filename}`);

  // Lista de campos obrigatórios
  const requiredFields = ["name", "category", "description", "quantity"];
  const missingFields = [];

  // Verificar campos obrigatórios
  requiredFields.forEach((field) => {
    if (!req.body[field]) {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: "Os seguintes campos obrigatórios estão ausentes:",
      missingFields,
    });
  }

  const qrCode = `${name}-${Date.now()}`;

  const sql = `
    INSERT INTO inventory (
      name, category, description, quantity, qr_code, size, model, brand, 
      unitOrBox, deliveryCompany, deliveredBy, receivedBy, deliveryTime, images
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      deliveryCompany,
      deliveredBy,
      receivedBy,
      deliveryTime,
      JSON.stringify(imageUrls), // Salvar como JSON
    ],
    (err, result) => {
      if (err) {
        console.error("Erro ao inserir item:", err);
        res.status(500).json({ error: "Erro ao inserir item no inventário" });
      } else {
        res.status(201).json({ message: "Item adicionado com sucesso!", qrCode });
      }
    }
  );
});

// Rota para listar todos os itens do inventário
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

// Rota para buscar um item específico por QR Code ou ID
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
