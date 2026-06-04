const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all requests
app.use(cors());
app.use(express.json());

// Serve static files (admin panel)
app.use(express.static('public'));

// News endpoint
app.get('/api/news', (req, res) => {
    res.json([
        {
            id: 1,
            title: '🎓 Welcome to LearnLink!',
            content: 'Your app is successfully deployed on Render!',
            category: 'ANNOUNCEMENT',
            date: new Date().toISOString().split('T')[0],
            isPinned: 1
        },
        {
            id: 2,
            title: '📚 Past Papers Coming Soon',
            content: 'Upload past papers from the admin panel',
            category: 'ANNOUNCEMENT',
            date: new Date().toISOString().split('T')[0],
            isPinned: 0
        }
    ]);
});

// Papers endpoint
app.get('/api/papers', (req, res) => {
    res.json([]);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'LearnLink API is running!' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
