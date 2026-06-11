const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5500;

app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.static('public'));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ---------- helpers ----------
async function saveFile(codeHash, fileName, fileSize, mimeType, salt, encryptedData, expiryMode, expiryMinutes) {
    const fileDir = path.join(UPLOAD_DIR, codeHash);
    if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });

    fs.writeFileSync(path.join(fileDir, 'encrypted.bin'), encryptedData);

    let expiresAt = null;
    if (expiryMode === 'time') {
        const minutes = parseInt(expiryMinutes) || 60;
        expiresAt = Date.now() + minutes * 60 * 1000;
    }

    const metadata = {
        fileName,
        fileSize: parseInt(fileSize),
        mimeType,
        salt,
        expiryMode,
        expiryMinutes: expiryMode === 'time' ? (parseInt(expiryMinutes) || 60) : null,
        expiresAt,
        createdAt: Date.now(),
        downloadCount: 0
    };
    fs.writeFileSync(path.join(fileDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    return true;
}

function getFile(codeHash) {
    const fileDir = path.join(UPLOAD_DIR, codeHash);
    if (!fs.existsSync(fileDir)) return null;
    const metadataPath = path.join(fileDir, 'metadata.json');
    const encryptedPath = path.join(fileDir, 'encrypted.bin');
    if (!fs.existsSync(metadataPath) || !fs.existsSync(encryptedPath)) return null;
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const encryptedData = fs.readFileSync(encryptedPath);
    return { metadata, encryptedData };
}

function incrementDownloadCount(codeHash) {
    const metaPath = path.join(UPLOAD_DIR, codeHash, 'metadata.json');
    if (!fs.existsSync(metaPath)) return;
    try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        meta.downloadCount = (meta.downloadCount || 0) + 1;
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        return meta.downloadCount;
    } catch (err) {
        console.error('Error incrementing download count:', err.message);
    }
}

function deleteFile(codeHash) {
    const fileDir = path.join(UPLOAD_DIR, codeHash);
    if (fs.existsSync(fileDir)) {
        fs.rmSync(fileDir, { recursive: true, force: true });
        console.log(`🗑️ Deleted: ${codeHash}`);
    }
}

// Cleanup for time-expired files (runs hourly)
function cleanupExpiredFiles() {
    const now = Date.now();
    const dirs = fs.readdirSync(UPLOAD_DIR);
    let deleted = 0;
    for (const dir of dirs) {
        const metaPath = path.join(UPLOAD_DIR, dir, 'metadata.json');
        if (fs.existsSync(metaPath)) {
            try {
                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                if (meta.expiryMode === 'time' && meta.expiresAt && meta.expiresAt < now) {
                    fs.rmSync(path.join(UPLOAD_DIR, dir), { recursive: true, force: true });
                    deleted++;
                }
            } catch (err) { console.error(`Cleanup error ${dir}:`, err.message); }
        }
    }
    if (deleted) console.log(`🧹 Cleaned ${deleted} expired time-based files`);
}
setInterval(cleanupExpiredFiles, 60 * 60 * 1000);
setTimeout(cleanupExpiredFiles, 5000);

// ---------- API ----------
app.get('/api/health', (req, res) => {
    res.json({ status: 'operational', timestamp: Date.now() });
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { fileName, fileSize, mimeType, codeHash, salt, expiryMode, expiryMinutes } = req.body;
        const encryptedFile = req.file?.buffer;

        if (!fileName || !fileSize || !mimeType || !codeHash || !salt || !encryptedFile) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!/^[a-f0-9]{64}$/.test(codeHash)) {
            return res.status(400).json({ error: 'Invalid code hash' });
        }
        if (!expiryMode || !['download', 'time'].includes(expiryMode)) {
            return res.status(400).json({ error: 'Invalid or missing expiryMode' });
        }

        await saveFile(codeHash, fileName, fileSize, mimeType, salt, encryptedFile, expiryMode, expiryMinutes);
        res.json({ success: true, message: 'File uploaded' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/download/:codeHash', async (req, res) => {
    try {
        const { codeHash } = req.params;
        const fileData = getFile(codeHash);
        if (!fileData) return res.status(404).json({ error: 'File not found or expired' });

        const { metadata, encryptedData } = fileData;

        // Check time-based expiry
        if (metadata.expiryMode === 'time' && metadata.expiresAt && metadata.expiresAt < Date.now()) {
            deleteFile(codeHash);
            return res.status(410).json({ error: 'File has expired' });
        }

        // Increment download count BEFORE sending (for 'download' mode it will be deleted after)
        const newCount = incrementDownloadCount(codeHash);

        // Return the file data + download count + expiry info
        res.json({
            fileName: metadata.fileName,
            fileSize: metadata.fileSize,
            mimeType: metadata.mimeType,
            salt: metadata.salt,
            encryptedData: encryptedData.toString('base64'),
            downloadCount: newCount || 1,
            expiryMode: metadata.expiryMode,
            expiresAt: metadata.expiresAt,
            createdAt: metadata.createdAt
        });

        // AFTER sending, if mode is 'download', delete immediately
        if (metadata.expiryMode === 'download') {
            deleteFile(codeHash);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Catch-all for unmatched routes
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Multer error handler
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 500MB)' });
        return res.status(400).json({ error: `Multer error: ${err.message}` });
    }
    res.status(500).json({ error: err.message || 'Unknown server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 ANOCONNECT running on http://localhost:${PORT}`);
    console.log(`📁 Uploads: ${UPLOAD_DIR}`);
});