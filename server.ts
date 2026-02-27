import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("doctor_smile.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    email TEXT,
    role TEXT CHECK(role IN ('PATIENT', 'ADMIN', 'DOCTOR', 'PARTNER')),
    name TEXT,
    dob DATE,
    address TEXT,
    risk_score INTEGER DEFAULT 0,
    is_frozen BOOLEAN DEFAULT 0,
    referral_code TEXT UNIQUE,
    upline_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(upline_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    company_name TEXT,
    tax_id TEXT,
    type TEXT CHECK(type IN ('HOTEL', 'RESTAURANT', 'CORPORATION')),
    city TEXT,
    commission_rate REAL DEFAULT 10.0,
    unique_code TEXT UNIQUE,
    status TEXT DEFAULT 'ACTIVE',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT,
    price REAL,
    loyalty_eligible BOOLEAN DEFAULT 1,
    loyalty_rate REAL DEFAULT 10.0,
    commission_eligible BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    doctor_id INTEGER,
    service_id INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    status TEXT CHECK(status IN ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),
    notes TEXT,
    source TEXT DEFAULT 'DIRECT', -- DIRECT, REFERRAL, PARTNER
    partner_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES users(id),
    FOREIGN KEY(doctor_id) REFERENCES users(id),
    FOREIGN KEY(service_id) REFERENCES services(id),
    FOREIGN KEY(partner_id) REFERENCES partners(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    appointment_id INTEGER,
    total_amount REAL,
    wallet_used REAL DEFAULT 0,
    status TEXT CHECK(status IN ('DRAFT', 'ISSUED', 'PAID', 'VOID')),
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES users(id),
    FOREIGN KEY(appointment_id) REFERENCES appointments(id)
  );

  CREATE TABLE IF NOT EXISTS ledger_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT CHECK(type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    user_id INTEGER,
    balance REAL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ledger_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,
    reference_type TEXT,
    reference_id INTEGER,
    status TEXT DEFAULT 'POSTED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER,
    account_id INTEGER,
    amount REAL,
    type TEXT CHECK(type IN ('DEBIT', 'CREDIT')),
    FOREIGN KEY(transaction_id) REFERENCES ledger_transactions(id),
    FOREIGN KEY(account_id) REFERENCES ledger_accounts(id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT,
    attachment_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    entity TEXT,
    entity_id INTEGER,
    old_data TEXT,
    new_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial system accounts if they don't exist
const seedAccounts = [
  { name: 'Cash/Bank', type: 'ASSET' },
  { name: 'Revenue - Dental Services', type: 'REVENUE' },
  { name: 'Marketing Expense - Loyalty', type: 'EXPENSE' },
  { name: 'Affiliate Expense - Partners', type: 'EXPENSE' }
];

seedAccounts.forEach(acc => {
  const exists = db.prepare("SELECT id FROM ledger_accounts WHERE name = ?").get(acc.name);
  if (!exists) {
    db.prepare("INSERT INTO ledger_accounts (name, type) VALUES (?, ?)").run(acc.name, acc.type);
  }
});

// Seed initial system config
const defaultConfig = [
  { key: 'loyalty_rate_default', value: '10' },
  { key: 'partner_commission_rate', value: '10' },
  { key: 'referral_rate', value: '10' },
  { key: 'min_transfer_amount', value: '1' },
  { key: 'daily_transfer_limit', value: '1000' },
  { key: 'cancellation_policy_hours', value: '24' }
];

defaultConfig.forEach(cfg => {
  const exists = db.prepare("SELECT key FROM system_config WHERE key = ?").get(cfg.key);
  if (!exists) {
    db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?)").run(cfg.key, cfg.value);
  }
});

// Seed some services
const initialServices = [
  { name: 'General Checkup', category: 'Diagnostic', price: 50 },
  { name: 'Teeth Whitening', category: 'Cosmetic', price: 200 },
  { name: 'Dental Implant', category: 'Surgery', price: 1500 },
  { name: 'Root Canal', category: 'Treatment', price: 300 }
];

initialServices.forEach(s => {
  const exists = db.prepare("SELECT id FROM services WHERE name = ?").get(s.name);
  if (!exists) {
    db.prepare("INSERT INTO services (name, category, price) VALUES (?, ?, ?)").run(s.name, s.category, s.price);
  }
});

export const app = express();
app.use(express.json());

// Helper for double-entry
const postLedgerEntry = (txId: number, accountId: number, amount: number, type: 'DEBIT' | 'CREDIT') => {
  db.prepare("INSERT INTO ledger_entries (transaction_id, account_id, amount, type) VALUES (?, ?, ?, ?)").run(txId, accountId, amount, type);
  const multiplier = type === 'DEBIT' ? 1 : -1;
  db.prepare("UPDATE ledger_accounts SET balance = balance + ? WHERE id = ?").run(amount * multiplier, accountId);
};

// --- API ROUTES ---

  // Auth
  app.post("/api/auth/login", (req, res) => {
    const { phone, role, name, partner_code } = req.body;
    let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
    if (!user) {
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      let uplineId = null;
      if (partner_code) {
        const partner = db.prepare("SELECT user_id FROM partners WHERE unique_code = ?").get(partner_code);
        if (partner) uplineId = partner.user_id;
      }

      const result = db.prepare("INSERT INTO users (phone, role, name, referral_code, upline_id) VALUES (?, ?, ?, ?, ?)").run(phone, role, name, referralCode, uplineId);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      
      // Create personal wallet account
      db.prepare("INSERT INTO ledger_accounts (name, type, user_id) VALUES (?, 'LIABILITY', ?)").run(`${name}'s Wallet`, user.id);
    }
    res.json(user);
  });

  // Services
  app.get("/api/services", (req, res) => {
    res.json(db.prepare("SELECT * FROM services").all());
  });

  // Appointments
  app.get("/api/appointments", (req, res) => {
    const { patient_id, doctor_id } = req.query;
    let query = "SELECT a.*, s.name as service_name, u.name as patient_name FROM appointments a JOIN services s ON a.service_id = s.id JOIN users u ON a.patient_id = u.id";
    let params = [];
    if (patient_id) { query += " WHERE patient_id = ?"; params.push(patient_id); }
    else if (doctor_id) { query += " WHERE doctor_id = ?"; params.push(doctor_id); }
    res.json(db.prepare(query).all(...params));
  });

  app.post("/api/appointments", (req, res) => {
    const { patient_id, service_id, start_time, notes } = req.body;
    const result = db.prepare("INSERT INTO appointments (patient_id, service_id, start_time, status) VALUES (?, ?, ?, 'CONFIRMED')").run(patient_id, service_id, start_time);
    res.json({ id: result.lastInsertRowid });
  });

  // Wallet
  app.get("/api/wallet/:userId", (req, res) => {
    const wallet = db.prepare("SELECT * FROM ledger_accounts WHERE user_id = ?").get(req.params.userId);
    const history = db.prepare(`
      SELECT e.*, t.description, t.created_at 
      FROM ledger_entries e 
      JOIN ledger_transactions t ON e.transaction_id = t.id 
      WHERE e.account_id = ? 
      ORDER BY t.created_at DESC
    `).all(wallet.id);
    res.json({ wallet, history });
  });

  app.post("/api/wallet/transfer", (req, res) => {
    const { from_user_id, to_phone, amount } = req.body;
    
    const senderWallet = db.prepare("SELECT * FROM ledger_accounts WHERE user_id = ?").get(from_user_id);
    const receiver = db.prepare("SELECT id FROM users WHERE phone = ?").get(to_phone);
    if (!receiver) return res.status(404).json({ error: "Receiver not found" });
    const receiverWallet = db.prepare("SELECT * FROM ledger_accounts WHERE user_id = ?").get(receiver.id);

    // Anti-fraud check
    const dailyLimit = parseFloat(db.prepare("SELECT value FROM system_config WHERE key = 'daily_transfer_limit'").get().value);
    if (amount > dailyLimit) return res.status(400).json({ error: "Daily limit exceeded" });
    if (senderWallet.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

    const tx = db.prepare("INSERT INTO ledger_transactions (description, reference_type) VALUES (?, 'TRANSFER')").run(`Transfer to ${to_phone}`, 0);
    const txId = tx.lastInsertRowid;

    postLedgerEntry(txId, senderWallet.id, amount, 'CREDIT');
    postLedgerEntry(txId, receiverWallet.id, amount, 'DEBIT');

    res.json({ success: true });
  });

  // Checkout
  app.post("/api/checkout", (req, res) => {
    const { patient_id, appointment_id, payment_method, wallet_to_use } = req.body;
    
    const appt = db.prepare("SELECT a.*, s.price, s.loyalty_rate FROM appointments a JOIN services s ON a.service_id = s.id WHERE a.id = ?").get(appointment_id);
    const totalAmount = appt.price;
    
    const tx = db.prepare("INSERT INTO ledger_transactions (description, reference_type, reference_id) VALUES (?, 'INVOICE', ?)").run(`Payment for Appt #${appointment_id}`, appointment_id);
    const txId = tx.lastInsertRowid;

    const cashAcc = db.prepare("SELECT id FROM ledger_accounts WHERE name = 'Cash/Bank'").get();
    const revAcc = db.prepare("SELECT id FROM ledger_accounts WHERE name = 'Revenue - Dental Services'").get();
    const mktAcc = db.prepare("SELECT id FROM ledger_accounts WHERE name = 'Marketing Expense - Loyalty'").get();
    const affAcc = db.prepare("SELECT id FROM ledger_accounts WHERE name = 'Affiliate Expense - Partners'").get();
    const userWallet = db.prepare("SELECT id FROM ledger_accounts WHERE user_id = ?").get(patient_id);

    // 1. Handle Wallet Usage
    let remainingToPay = totalAmount;
    if (wallet_to_use > 0) {
      const useAmount = Math.min(wallet_to_use, userWallet.balance, totalAmount);
      postLedgerEntry(txId, userWallet.id, useAmount, 'CREDIT');
      postLedgerEntry(txId, revAcc.id, useAmount, 'DEBIT');
      remainingToPay -= useAmount;
    }

    // 2. Handle Cash/Card Payment
    if (remainingToPay > 0) {
      postLedgerEntry(txId, cashAcc.id, remainingToPay, 'DEBIT');
      postLedgerEntry(txId, revAcc.id, remainingToPay, 'CREDIT');
    }

    // 3. Loyalty Earn (on the cash portion)
    const earnAmount = remainingToPay * (appt.loyalty_rate / 100);
    postLedgerEntry(txId, mktAcc.id, earnAmount, 'DEBIT');
    postLedgerEntry(txId, userWallet.id, earnAmount, 'CREDIT');

    // 4. Partner Commission
    const patient = db.prepare("SELECT upline_id FROM users WHERE id = ?").get(patient_id);
    if (patient.upline_id) {
      const partnerWallet = db.prepare("SELECT id FROM ledger_accounts WHERE user_id = ?").get(patient.upline_id);
      if (partnerWallet) {
        const commission = remainingToPay * 0.1; // 10% default
        postLedgerEntry(txId, affAcc.id, commission, 'DEBIT');
        postLedgerEntry(txId, partnerWallet.id, commission, 'CREDIT');
      }
    }

    db.prepare("UPDATE appointments SET status = 'COMPLETED' WHERE id = ?").run(appointment_id);
    db.prepare("INSERT INTO invoices (patient_id, appointment_id, total_amount, wallet_used, status, payment_method) VALUES (?, ?, ?, ?, 'PAID', ?)").run(patient_id, appointment_id, totalAmount, wallet_to_use, payment_method);

    res.json({ success: true });
  });

  // Admin Stats
  app.get("/api/admin/stats", (req, res) => {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'PATIENT'").get().count;
    const totalRevenue = db.prepare("SELECT balance FROM ledger_accounts WHERE name = 'Revenue - Dental Services'").get().balance;
    const outstandingLiability = db.prepare("SELECT SUM(balance) as sum FROM ledger_accounts WHERE type = 'LIABILITY'").get().sum;
    const recentAppts = db.prepare(`
      SELECT a.*, u.name as patient_name, s.name as service_name 
      FROM appointments a 
      JOIN users u ON a.patient_id = u.id 
      JOIN services s ON a.service_id = s.id
      ORDER BY a.start_time DESC LIMIT 10
    `).all();
    res.json({ totalUsers, totalRevenue, outstandingLiability, recentAppts });
  });

  // Partners
  app.get("/api/partners", (req, res) => {
    res.json(db.prepare("SELECT p.*, u.name as owner_name FROM partners p JOIN users u ON p.user_id = u.id").all());
  });

  app.post("/api/partners", (req, res) => {
    const { user_id, company_name, tax_id, type, city, unique_code } = req.body;
    db.prepare("INSERT INTO partners (user_id, company_name, tax_id, type, city, unique_code) VALUES (?, ?, ?, ?, ?, ?)").run(user_id, company_name, tax_id, type, city, unique_code);
    res.json({ success: true });
  });

  // --- VITE MIDDLEWARE ---
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

if (!process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
