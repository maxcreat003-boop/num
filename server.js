const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const API_URL = 'http://147.135.212.197/crapi/st/viewstats?token=R1dURklBUzR3kpNfiIuJaIdmlHNeZWFEc5N0U0VsjGtKiXBIZ5h5hA==';

const server = http.createServer((req, res) => {
    // API proxy route
    if (req.url === '/api/messages') {
        http.get(API_URL, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(data);
            });
        }).on('error', (err) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        });
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    const ext = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
    };
    const contentType = mimeTypes[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`\n  ⚡ Server running at http://localhost:${PORT}\n  📡 API proxy at http://localhost:${PORT}/api/messages\n`);
});
