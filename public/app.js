// public/app.js
// ANOCONNECT Frontend - Encryption, Upload, Download with Spy Codes

// Spy code word lists
const CODE_NAMES = [
    'VORTEX', 'PHANTOM', 'SPECTRE', 'NEXUS', 'ECHO', 
    'GHOST', 'CYPHER', 'SHADOW', 'RAZOR', 'QUANTUM'
];

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const uploadFill = document.getElementById('uploadFill');
const uploadText = document.getElementById('uploadText');
const uploadSuccess = document.getElementById('uploadSuccess');
const spyCodeDisplay = document.getElementById('spyCodeDisplay');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const spyCodeInput = document.getElementById('spyCodeInput');
const downloadBtn = document.getElementById('downloadBtn');
const downloadProgress = document.getElementById('downloadProgress');
const downloadFill = document.getElementById('downloadFill');
const downloadText = document.getElementById('downloadText');
const errorMessage = document.getElementById('errorMessage');
const codePrefixDisplay = document.getElementById('codePrefixDisplay');

// State
let currentSpyCodeFull = '';
let currentFile = null;

// Helper: Generate random 7-character alphanumeric key (excludes confusing chars)
function generateSpyKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 7; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Helper: Generate random codename
function generateCodename() {
    return CODE_NAMES[Math.floor(Math.random() * CODE_NAMES.length)];
}

// Helper: Show error message
function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

// Helper: SHA-256 hash of string
async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Derive AES key from 7-char code and salt using PBKDF2
async function deriveKey(code, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(code),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        {
            name: 'AES-GCM',
            length: 256
        },
        true,
        ['encrypt', 'decrypt']
    );
    
    return key;
}

// Helper: Encrypt file using derived key
async function encryptFile(file, key) {
    const fileData = await file.arrayBuffer();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        fileData
    );
    
    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return combined.buffer;
}

// Helper: Decrypt file using derived key
async function decryptFile(encryptedBuffer, key) {
    const iv = encryptedBuffer.slice(0, 12);
    const data = encryptedBuffer.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        data
    );
    
    return decrypted;
}

// Upload file handler
async function uploadFile(file) {
    if (!file) return;
    
    // Reset UI
    uploadProgress.classList.remove('hidden');
    uploadSuccess.classList.add('hidden');
    uploadFill.style.width = '0%';
    uploadText.textContent = 'Generating spy code...';
    
    // Activate tunnel boost
    if (window.tunnel) {
        window.tunnel.setSpeedBoost(1.5);
    }
    
    try {
        // Generate spy code components
        const spyKey = generateSpyKey();
        const codename = generateCodename();
        currentSpyCodeFull = `${codename}-${spyKey}`;
        
        // Generate random salt (16 bytes)
        const salt = crypto.getRandomValues(new Uint8Array(16));
        
        uploadText.textContent = 'Deriving encryption key...';
        const key = await deriveKey(spyKey, salt);
        
        uploadText.textContent = 'Encrypting file (AES-256-GCM)...';
        const encryptedData = await encryptFile(file, key);
        
        // Compute hash of spy key for server lookup
        const codeHash = await sha256(spyKey);
        
        uploadText.textContent = 'Uploading to secure server...';
        
        // Prepare form data
        const formData = new FormData();
        formData.append('file', new Blob([encryptedData]), 'encrypted.bin');
        formData.append('fileName', file.name);
        formData.append('fileSize', file.size.toString());
        formData.append('mimeType', file.type || 'application/octet-stream');
        formData.append('codeHash', codeHash);
        formData.append('salt', btoa(String.fromCharCode(...salt)));
        
        // Simulate upload progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress = Math.min(95, progress + 5);
            uploadFill.style.width = `${progress}%`;
            uploadText.textContent = `Uploading... ${progress}%`;
        }, 200);
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        clearInterval(progressInterval);
        
        // Safely parse response JSON
        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                responseData = await response.json();
            } catch (e) {
                throw new Error('Invalid JSON response from server');
            }
        } else {
            const text = await response.text();
            console.error('Server responded with non-JSON:', text.substring(0, 200));
            throw new Error(`Server returned non-JSON: ${text.substring(0, 100)}`);
        }
        
        if (!response.ok) {
            throw new Error(responseData.error || `Upload failed with status ${response.status}`);
        }
        
        uploadFill.style.width = '100%';
        uploadText.textContent = 'Upload complete!';
        
        // Show success with spy code
        setTimeout(() => {
            uploadProgress.classList.add('hidden');
            uploadSuccess.classList.remove('hidden');
            spyCodeDisplay.textContent = currentSpyCodeFull;
            
            // Trigger tunnel pulse
            if (window.tunnel) {
                window.tunnel.triggerPulse();
                setTimeout(() => window.tunnel.setSpeedBoost(1.0), 500);
            }
        }, 500);
        
    } catch (error) {
        console.error('Upload error:', error);
        showError(`Transmission failed: ${error.message}`);
        uploadProgress.classList.add('hidden');
        if (window.tunnel) window.tunnel.setSpeedBoost(1.0);
    }
}

// Download and decrypt handler
async function downloadAndDecrypt() {
    let userInput = spyCodeInput.value.trim().toUpperCase();
    if (!userInput) {
        showError('Please enter a spy code');
        return;
    }
    
    // Extract the 7-character key
    let spyKey = '';
    if (userInput.includes('-')) {
        spyKey = userInput.split('-')[1];
    } else {
        spyKey = userInput;
    }
    
    if (!/^[A-Z0-9]{7}$/.test(spyKey)) {
        showError('Invalid spy code format. Expected 7 alphanumeric characters (e.g., 7X9D2KW)');
        return;
    }
    
    const codeHash = await sha256(spyKey);
    
    // Reset UI
    downloadProgress.classList.remove('hidden');
    downloadFill.style.width = '0%';
    downloadText.textContent = 'Locating mission package...';
    errorMessage.classList.add('hidden');
    
    if (window.tunnel) window.tunnel.setSpeedBoost(1.3);
    
    try {
        const response = await fetch(`/api/download/${codeHash}`);
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid JSON response from server');
            }
        } else {
            const text = await response.text();
            throw new Error(`Server returned non-JSON: ${text.substring(0, 100)}`);
        }
        
        if (!response.ok) {
            throw new Error(data.error || 'Download failed');
        }
        
        downloadText.textContent = 'Decrypting package...';
        downloadFill.style.width = '30%';
        
        // Decode salt
        const salt = new Uint8Array(atob(data.salt).split('').map(c => c.charCodeAt(0)));
        
        const key = await deriveKey(spyKey, salt);
        
        downloadText.textContent = 'Decrypting data (AES-GCM)...';
        downloadFill.style.width = '60%';
        
        const encryptedBuffer = Uint8Array.from(atob(data.encryptedData), c => c.charCodeAt(0));
        const decryptedData = await decryptFile(encryptedBuffer, key);
        
        downloadFill.style.width = '100%';
        downloadText.textContent = 'Decryption complete!';
        
        // Trigger download
        const blob = new Blob([decryptedData], { type: data.mimeType });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        if (window.tunnel) {
            window.tunnel.triggerPulse();
            setTimeout(() => window.tunnel.setSpeedBoost(1.0), 500);
        }
        
        setTimeout(() => {
            downloadProgress.classList.add('hidden');
        }, 1000);
        
    } catch (error) {
        console.error('Download error:', error);
        showError(`Interception failed: ${error.message}`);
        downloadProgress.classList.add('hidden');
        if (window.tunnel) window.tunnel.setSpeedBoost(1.0);
    }
}

// Copy spy code to clipboard
async function copySpyCode() {
    if (currentSpyCodeFull) {
        await navigator.clipboard.writeText(currentSpyCodeFull);
        copyCodeBtn.textContent = 'COPIED!';
        setTimeout(() => {
            copyCodeBtn.textContent = 'COPY';
        }, 2000);
    }
}

// Drag and drop handlers
function setupDragAndDrop() {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
        if (window.tunnel) window.tunnel.setSpeedBoost(2.0);
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        dropZone.classList.remove('drag-over');
        if (window.tunnel) window.tunnel.setSpeedBoost(1.0);
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            currentFile = files[0];
            uploadFile(currentFile);
        }
        if (window.tunnel) window.tunnel.setSpeedBoost(1.2);
        setTimeout(() => {
            if (window.tunnel) window.tunnel.setSpeedBoost(1.0);
        }, 1000);
    });
    
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            currentFile = e.target.files[0];
            uploadFile(currentFile);
        }
    });
}

// Setup intercept input
function setupIntercept() {
    spyCodeInput.addEventListener('input', (e) => {
        const val = e.target.value.toUpperCase();
        if (val.length === 7 && /^[A-Z0-9]{7}$/.test(val)) {
            codePrefixDisplay.textContent = `${generateCodename()}-`;
        } else {
            codePrefixDisplay.textContent = 'AGENT-';
        }
    });
    
    downloadBtn.addEventListener('click', downloadAndDecrypt);
    spyCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            downloadAndDecrypt();
        }
    });
}

// Initialize
function init() {
    setupDragAndDrop();
    setupIntercept();
    copyCodeBtn.addEventListener('click', copySpyCode);
    codePrefixDisplay.textContent = `${CODE_NAMES[0]}-`;
    console.log('ANOCONNECT initialized | Zero-knowledge encryption active');
}

init();