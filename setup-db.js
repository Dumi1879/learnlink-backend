const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database('./learnlink.db');

// Create tables
db.serialize(() => {
  // News table
  db.run(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      isPinned INTEGER DEFAULT 0
    )
  `);

  // Past papers table
  db.run(`
    CREATE TABLE IF NOT EXISTS papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      grade TEXT NOT NULL,
      year INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      filename TEXT NOT NULL
    )
  `);

  // Insert sample data
  db.run(`
    INSERT OR IGNORE INTO news (id, title, content, category, date, isPinned)
    VALUES 
      (1, '🎓 NSFAS Bursary 2026 Now Open', 'Applications close 30 November 2026', 'BURSARY', '2026-06-01', 1),
      (2, '⏰ Exam Registration Deadline', 'Register for final exams by 15 November', 'DEADLINE', '2026-06-01', 1),
      (3, '📚 New Study Material Added', 'Mathematics and Physics papers now available', 'ANNOUNCEMENT', '2026-05-30', 0)
  `);

  console.log('Database created successfully!');
});

db.close();
