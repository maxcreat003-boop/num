const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const API_URL = 'http://147.135.212.197/crapi/st/viewstats?token=R1dURklBUzR3kpNfiIuJaIdmlHNeZWFEc5N0U0VsjGtKiXBIZ5h5hA==';

// ─── Cache to avoid rate limiting ───
let cache = { data: null, time: 0 };
const CACHE_TTL = 3500; // 3.5 seconds cache

function fetchFromAPI() {
    return new Promise((resolve, reject) => {
        // Return cache if fresh
        const now = Date.now();
        if (cache.data && (now - cache.time) < CACHE_TTL) {
            return resolve(cache.data);
        }

        http.get(API_URL, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Check for rate limit error
                if (data.includes('too many') || data.includes('Error')) {
                    // Return cached data if available, otherwise return error
                    if (cache.data) {
                        return resolve(cache.data);
                    }
                    // Wait and retry once
                    setTimeout(() => {
                        http.get(API_URL, (res2) => {
                            let d2 = '';
                            res2.on('data', c => d2 += c);
                            res2.on('end', () => {
                                if (d2.includes('too many') || d2.includes('Error')) {
                                    return resolve(cache.data || '[]');
                                }
                                cache = { data: d2, time: Date.now() };
                                resolve(d2);
                            });
                        }).on('error', () => resolve(cache.data || '[]'));
                    }, 5500);
                    return;
                }
                cache = { data: data, time: Date.now() };
                resolve(data);
            });
        }).on('error', (err) => {
            if (cache.data) return resolve(cache.data);
            reject(err);
        });
    });
}

const server = http.createServer(async (req, res) => {
    // API proxy route
    if (req.url === '/api/messages') {
        try {
            const data = await fetchFromAPI();
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            });
            res.end(data);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Serve static files
    let filePath = req.url.split('?')[0]; // strip query params
    if (filePath === '/') filePath = '/index.html';
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

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        res.writeHead(200, { 
            'Content-Type': mimeTypes[ext] || 'text/plain',
            'Cache-Control': 'no-cache'
        });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`\n  ⚡ Server running at http://localhost:${PORT}`);
    console.log(`  📡 API proxy at http://localhost:${PORT}/api/messages`);
    console.log(`  🔄 Cache TTL: ${CACHE_TTL}ms\n`);
});
