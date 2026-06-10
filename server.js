const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./learnlink.db');

// Create tables with correct schema
db.serialize(() => {
    // News table
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        isPinned INTEGER DEFAULT 0
    )`);

    // Papers table - with download_link column
    db.run(`CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        grade TEXT NOT NULL,
        year INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        download_link TEXT
    )`);

    // Insert sample data if news table is empty
    db.get(`SELECT COUNT(*) as count FROM news`, (err, row) => {
        if (!err && row && row.count === 0) {
            db.run(`INSERT INTO news (title, content, category, date, isPinned) VALUES 
                ('🎓 Welcome to LearnLink!', 'Your app is successfully deployed!', 'ANNOUNCEMENT', date('now'), 1)
            `);
        }
    });
});

// ============ API ROUTES ============

// GET all news
app.get('/api/news', (req, res) => {
    db.all('SELECT * FROM news ORDER BY isPinned DESC, date DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// POST new news
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

// DELETE news
app.delete('/api/news/:id', (req, res) => {
    db.run('DELETE FROM news WHERE id = ?', req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

// GET all papers
app.get('/api/papers', (req, res) => {
    db.all('SELECT * FROM papers ORDER BY year DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// POST new paper with download_link
app.post('/api/papers', (req, res) => {
    const { subject, grade, year, title, type, download_link } = req.body;
    
    db.run(
        'INSERT INTO papers (subject, grade, year, title, type, download_link) VALUES (?, ?, ?, ?, ?, ?)',
        [subject, grade, year, title, type, download_link || ''],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                res.status(500).json({ error: err.message });
            } else {
                res.json({ success: true, id: this.lastID });
            }
        }
    );
});

// DELETE paper
app.delete('/api/papers/:id', (req, res) => {
    db.run('DELETE FROM papers WHERE id = ?', req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

// FIX ENDPOINT - Add download_link column if missing
app.get('/fix-database', (req, res) => {
    db.run("ALTER TABLE papers ADD COLUMN download_link TEXT", (err) => {
        if (err && err.message.includes('duplicate column name')) {
            res.json({ message: '✅ Column already exists! Database is ready.' });
        } else if (err) {
            res.json({ error: err.message });
        } else {
            res.json({ message: '✅ Successfully added download_link column!' });
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
