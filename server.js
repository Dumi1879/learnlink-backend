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

// Create all tables with proper schema
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

    // Papers table
    db.run(`CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        grade TEXT NOT NULL,
        year INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        download_link TEXT
    )`);

    // Comments table - SIMPLIFIED: only name and comment
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        news_id INTEGER NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        student_name TEXT NOT NULL,
        comment TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )`);

    // Comment likes table
    db.run(`CREATE TABLE IF NOT EXISTS comment_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comment_id INTEGER NOT NULL,
        student_name TEXT NOT NULL,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
    )`);

    // Insert sample data if news table is empty
    db.get(`SELECT COUNT(*) as count FROM news`, (err, row) => {
        if (!err && row && row.count === 0) {
            db.run(`INSERT INTO news (title, content, category, date, isPinned) VALUES 
                ('🎓 Welcome to LearnLink!', 'Your app is successfully deployed!', 'ANNOUNCEMENT', date('now'), 1),
                ('💬 New Features Added', 'Comments and replies now available!', 'ANNOUNCEMENT', date('now'), 0)
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

// POST new paper
app.post('/api/papers', (req, res) => {
    const { subject, grade, year, title, type, download_link } = req.body;
    
    db.run(
        'INSERT INTO papers (subject, grade, year, title, type, download_link) VALUES (?, ?, ?, ?, ?, ?)',
        [subject, grade, year, title, type, download_link || ''],
        function(err) {
            if (err) {
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

// ============ SIMPLIFIED COMMENT ROUTES ============

// GET all comments for a news post
app.get('/api/comments/:newsId', (req, res) => {
    const { newsId } = req.params;
    db.all(
        `SELECT * FROM comments WHERE news_id = ? ORDER BY created_at ASC`,
        [newsId],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        }
    );
});

// POST a new comment or reply - SIMPLIFIED (name + comment only)
app.post('/api/comments', (req, res) => {
    const { news_id, parent_id, student_name, comment, created_at } = req.body;
    
    db.run(
        `INSERT INTO comments (news_id, parent_id, student_name, comment, likes, created_at) 
         VALUES (?, ?, ?, ?, 0, ?)`,
        [news_id, parent_id || null, student_name, comment, created_at],
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

// DELETE a comment
app.delete('/api/comments/:id', (req, res) => {
    db.run('DELETE FROM comments WHERE id = ?', req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

// LIKE or UNLIKE a comment
app.post('/api/comments/like', (req, res) => {
    const { comment_id, student_name } = req.body;
    
    db.get(
        'SELECT * FROM comment_likes WHERE comment_id = ? AND student_name = ?',
        [comment_id, student_name],
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (row) {
                // Unlike
                db.run('DELETE FROM comment_likes WHERE comment_id = ? AND student_name = ?',
                    [comment_id, student_name],
                    (err2) => {
                        db.run('UPDATE comments SET likes = likes - 1 WHERE id = ?', [comment_id]);
                        res.json({ success: true, action: 'unliked' });
                    }
                );
            } else {
                // Like
                db.run('INSERT INTO comment_likes (comment_id, student_name) VALUES (?, ?)',
                    [comment_id, student_name],
                    (err2) => {
                        db.run('UPDATE comments SET likes = likes + 1 WHERE id = ?', [comment_id]);
                        res.json({ success: true, action: 'liked' });
                    }
                );
            }
        }
    );
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Fix database endpoint
app.get('/fix-database', (req, res) => {
    db.run("ALTER TABLE papers ADD COLUMN download_link TEXT", (err) => {
        if (err && err.message.includes('duplicate column name')) {
            res.json({ message: '✅ Column already exists!' });
        } else if (err) {
            res.json({ error: err.message });
        } else {
            res.json({ message: '✅ Successfully added download_link column!' });
        }
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
