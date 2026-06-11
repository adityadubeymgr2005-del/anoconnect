// test.js
// Verification script for ANOCONNECT
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple test to verify server endpoints and encryption flow
// Note: Server must be running on port 5500 before executing this test

const TEST_FILE_CONTENT = Buffer.from('This is a secret mission file for ANOCONNECT verification.', 'utf8');
const TEST_FILE_NAME = 'mission_briefing.txt';

async function runTest() {
    console.log('🔍 ANOCONNECT Verification Test Starting...\n');
    
    // 1. Check server health
    try {
        const healthRes = await fetch('http://localhost:5500/api/health');
        const healthData = await healthRes.json();
        if (healthData.status !== 'operational') {
            throw new Error('Server not healthy');
        }
        console.log('✓ Server is operational');
    } catch (err) {
        console.error('✗ Server not reachable. Make sure server is running on port 5500');
        process.exit(1);
    }
    
    // 2. Simulate client-side encryption and upload
    console.log('\n📤 Testing upload flow...');
    
    // Generate spy key and salt
    const spyKey = 'TEST123';
    const salt = crypto.randomBytes(16);
    
    // Derive key (simulate Web Crypto equivalent - Node crypto)
    const derivedKey = crypto.pbkdf2Sync(spyKey, salt, 100000, 32, 'sha256');
    
    // Encrypt test file (AES-256-GCM)
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    const encrypted = Buffer.concat([cipher.update(TEST_FILE_CONTENT), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const encryptedData = Buffer.concat([iv, encrypted, authTag]);
    
    // Compute code hash
    const codeHash = crypto.createHash('sha256').update(spyKey).digest('hex');
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', new Blob([encryptedData]), 'encrypted.bin');
    formData.append('fileName', TEST_FILE_NAME);
    formData.append('fileSize', TEST_FILE_CONTENT.length.toString());
    formData.append('mimeType', 'text/plain');
    formData.append('codeHash', codeHash);
    formData.append('salt', salt.toString('base64'));
    
    const uploadRes = await fetch('http://localhost:5500/api/upload', {
        method: 'POST',
        body: formData
    });
    
    if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(`Upload failed: ${err.error}`);
    }
    console.log('✓ File uploaded successfully');
    
    // 3. Download and decrypt
    console.log('\n📥 Testing download flow...');
    
    const downloadRes = await fetch(`http://localhost:5500/api/download/${codeHash}`);
    if (!downloadRes.ok) {
        throw new Error('Download failed');
    }
    
    const downloadData = await downloadRes.json();
    console.log('✓ Metadata retrieved');
    
    // Decrypt using spy key
    const saltDecoded = Buffer.from(downloadData.salt, 'base64');
    const derivedKeyDownload = crypto.pbkdf2Sync(spyKey, saltDecoded, 100000, 32, 'sha256');
    
    const encryptedBuffer = Buffer.from(downloadData.encryptedData, 'base64');
    const ivExtracted = encryptedBuffer.subarray(0, 12);
    const encryptedContent = encryptedBuffer.subarray(12, encryptedBuffer.length - 16);
    const authTagExtracted = encryptedBuffer.subarray(encryptedBuffer.length - 16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKeyDownload, ivExtracted);
    decipher.setAuthTag(authTagExtracted);
    const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
    
    // Verify content
    if (decrypted.toString('utf8') === TEST_FILE_CONTENT.toString('utf8')) {
        console.log('✓ Decryption successful - content matches');
    } else {
        throw new Error('Decryption verification failed');
    }
    
    console.log('\n🎉 All tests passed! ANOCONNECT is functioning correctly.');
    console.log('💡 Note: Files are automatically cleaned up after 24 hours.');
}

runTest().catch(err => {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
});