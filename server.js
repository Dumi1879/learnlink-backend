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

// Database setup - SAFE: Only adds columns, never deletes data
const db = new sqlite3.Database('./learnlink.db');

// Safe schema updates
db.serialize(() => {
    // News table (preserve all existing data)
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        isPinned INTEGER DEFAULT 0
    )`);

    // Papers table (preserve all existing data)
    db.run(`CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        grade TEXT NOT NULL,
        year INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        download_link TEXT
    )`);

    // ONLY ADD NEW COLUMNS IF THEY DON'T EXIST (Safe migration)
    db.get("PRAGMA table_info(news)", (err, columns) => {
        if (!err && columns) {
            const hasViews = columns.some(col => col.name === 'views');
            if (!hasViews) {
                db.run("ALTER TABLE news ADD COLUMN views INTEGER DEFAULT 0");
                console.log('✓ Added views column to news');
            }
        }
    });

    // Insert sample data ONLY if table is completely empty
    db.get(`SELECT COUNT(*) as count FROM news`, (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO news (title, content, category, date, isPinned) VALUES 
                ('🎓 Welcome to LearnLink!', 'Your app is successfully deployed! Start by posting announcements.', 'ANNOUNCEMENT', date('now'), 1)
            `);
            console.log('✓ Sample news inserted (first time only)');
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

// POST new paper
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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'All data preserved' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log('✓ Database schema updated safely - all existing data preserved');
});
