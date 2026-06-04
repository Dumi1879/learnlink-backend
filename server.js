const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Create uploads folder if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(uploadsDir));

// Database setup
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'learnlink.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        category TEXT,
        date TEXT,
        isPinned INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT,
        grade TEXT,
        year INTEGER,
        title TEXT,
        type TEXT,
        filename TEXT,
        filepath TEXT
    )`);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// API Routes
app.get('/api/news', (req, res) => {
    db.all('SELECT * FROM news ORDER BY date DESC', (err, rows) => {
        if (err) {
            res.json([]);
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/news', (req, res) => {
    const { title, content, category, date, isPinned } = req.body;
    db.run(
        'INSERT INTO news (title, content, category, date, isPinned) VALUES (?, ?, ?, ?, ?)',
        [title, content, category, date, isPinned || 0],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ success: true, id: this.lastID });
            }
        }
    );
});

app.delete('/api/news/:id', (req, res) => {
    db.run('DELETE FROM news WHERE id = ?', req.params.id, () => {
        res.json({ success: true });
    });
});

app.get('/api/papers', (req, res) => {
    db.all('SELECT * FROM papers', (err, rows) => {
        if (err) {
            res.json([]);
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/papers', upload.single('pdf'), (req, res) => {
    const { subject, grade, year, title, type } = req.body;
    const filename = req.file ? req.file.originalname : '';
    const filepath = req.file ? `/uploads/${req.file.filename}` : '';
    
    db.run(
        'INSERT INTO papers (subject, grade, year, title, type, filename, filepath) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [subject, grade, year, title, type, filename, filepath],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ success: true, id: this.lastID });
            }
        }
    );
});

app.delete('/api/papers/:id', (req, res) => {
    db.run('DELETE FROM papers WHERE id = ?', req.params.id, () => {
        res.json({ success: true });
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
