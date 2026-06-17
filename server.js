const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware - Serves files from "public" folder
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./learnlink.db');

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        isPinned INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        grade TEXT NOT NULL,
        year INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        download_link TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        news_id INTEGER NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        student_name TEXT NOT NULL,
        comment TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comment_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comment_id INTEGER NOT NULL,
        student_name TEXT NOT NULL
    )`);
});

// API Routes
app.get('/api/news', (req, res) => {
    db.all('SELECT * FROM news ORDER BY isPinned DESC, date DESC', (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/news', (req, res) => {
    const { title, content, category, date, isPinned } = req.body;
    db.run(
        'INSERT INTO news (title, content, category, date, isPinned) VALUES (?, ?, ?, ?, ?)',
        [title, content, category, date, isPinned || 0],
        function(err) {
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.delete('/api/news/:id', (req, res) => {
    db.run('DELETE FROM news WHERE id = ?', req.params.id);
    res.json({ success: true });
});

app.get('/api/papers', (req, res) => {
    db.all('SELECT * FROM papers ORDER BY year DESC', (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/papers', (req, res) => {
    const { subject, grade, year, title, type, download_link } = req.body;
    db.run(
        'INSERT INTO papers (subject, grade, year, title, type, download_link) VALUES (?, ?, ?, ?, ?, ?)',
        [subject, grade, year, title, type, download_link || ''],
        function(err) {
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.delete('/api/papers/:id', (req, res) => {
    db.run('DELETE FROM papers WHERE id = ?', req.params.id);
    res.json({ success: true });
});

app.get('/api/comments/:newsId', (req, res) => {
    db.all('SELECT * FROM comments WHERE news_id = ? ORDER BY created_at ASC', [req.params.newsId], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/comments', (req, res) => {
    const { news_id, parent_id, student_name, comment, created_at } = req.body;
    db.run(
        'INSERT INTO comments (news_id, parent_id, student_name, comment, likes, created_at) VALUES (?, ?, ?, ?, 0, ?)',
        [news_id, parent_id || null, student_name, comment, created_at],
        function(err) {
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.delete('/api/comments/:id', (req, res) => {
    db.run('DELETE FROM comments WHERE id = ?', req.params.id);
    res.json({ success: true });
});

app.post('/api/comments/like', (req, res) => {
    const { comment_id, student_name } = req.body;
    db.get('SELECT * FROM comment_likes WHERE comment_id = ? AND student_name = ?', [comment_id, student_name], (err, row) => {
        if (row) {
            db.run('DELETE FROM comment_likes WHERE comment_id = ? AND student_name = ?', [comment_id, student_name]);
            db.run('UPDATE comments SET likes = likes - 1 WHERE id = ?', [comment_id]);
            res.json({ success: true, action: 'unliked' });
        } else {
            db.run('INSERT INTO comment_likes (comment_id, student_name) VALUES (?, ?)', [comment_id, student_name]);
            db.run('UPDATE comments SET likes = likes + 1 WHERE id = ?', [comment_id]);
            res.json({ success: true, action: 'liked' });
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
