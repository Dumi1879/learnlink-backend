const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup - this will create a fresh database
const db = new sqlite3.Database('./learnlink.db');

// Create tables with correct schema
db.serialize(() => {
    // Drop existing papers table to start fresh
    db.run(`DROP TABLE IF EXISTS papers`);
    
    // Create papers table with download_link column
    db.run(`CREATE TABLE papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        grade TEXT NOT NULL,
        year INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        download_link TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating papers table:', err);
        } else {
            console.log('✓ Papers table created with download_link column');
        }
    });

    // Create news table
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        isPinned INTEGER DEFAULT 0
    )`, (err) => {
        if (err) {
            console.error('Error creating news table:', err);
        } else {
            console.log('✓ News table ready');
        }
    });

    // Insert sample news data if empty
    db.get(`SELECT COUNT(*) as count FROM news`, (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO news (title, content, category, date, isPinned) VALUES 
                ('🎓 Welcome to LearnLink!', 'Your app is successfully deployed! Start by posting announcements.', 'ANNOUNCEMENT', '${new Date().toISOString().split('T')[0]}', 1),
                ('📚 How to Use', 'Post news here. Students will see it instantly.', 'ANNOUNCEMENT', '${new Date().toISOString().split('T')[0]}', 0)
            `);
            console.log('✓ Sample news inserted');
        }
    });
});

// ============ API ROUTES ============

app.get('/api/news', (req, res) => {
    db.all('SELECT * FROM news ORDER BY isPinned DESC, date DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
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
    db.run('DELETE FROM news WHERE id = ?', req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

app.get('/api/papers', (req, res) => {
    db.all('SELECT * FROM papers ORDER BY year DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

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

app.delete('/api/papers/:id', (req, res) => {
    db.run('DELETE FROM papers WHERE id = ?', req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', tables: 'news and papers' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
