# 🔒 ANOCONNECT – ANONYMOUS Encrypted File Transfer

> **Mission‑code based, end‑to‑end encrypted file sharing**  
> *Your decryption key never leaves your device.*

![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![Flask](https://img.shields.io/badge/Flask-2.0-red)
![AES‑256‑GCM](https://img.shields.io/badge/Encryption-AES--256--GCM-brightgreen)

---

## 📌 Overview

ANOCONNECT is a **privacy‑first**, anonymous file transfer system.  
Upload a file → receive a unique **Mission Code** (e.g., `CYPHER‑NKLLKKJ`) → share only that code → the recipient downloads and **decrypts locally** – no server ever sees the decryption key or plaintext.

Designed for **final year project** demonstration of zero‑knowledge architecture, client‑side encryption, and ephemeral storage.

---

## ✨ Key Features

- 🔐 **Zero‑knowledge encryption** – AES‑256‑GCM, key derived from mission code.
- 🕶️ **Anonymous transfer** – no accounts, no logs, no tracking.
- ⏱️ **Auto‑expiry** – files and codes expire after 24 hours (or after first download).
- 🖱️ **Drag & drop upload** – simple web interface.
- 📱 **One‑click download** – recipient only needs the code.
- 🚇 **Tunnel active** indicator – shows connection status.
- 💻 **Client‑side decryption** – decryption happens in the browser; the server stores only encrypted data.
- 🧹 **Automatic cleanup** – expired or downloaded files are instantly removed.

---

## 🧱 Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Backend     | Python + Flask                      |
| Frontend    | HTML, CSS, JavaScript               |
| Encryption  | WebCrypto API (AES‑256‑GCM)         |
| Storage     | Temporary filesystem (auto‑deleted) |
| Deployment  | Any VPS / localhost / Tor hidden service |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Modern browser (Chrome, Firefox, Edge – for WebCrypto)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/anoconnect.git
   cd anoconnect

   Install dependencies

2. **bash**
pip install -r requirements.txt
Run the application

3. **bash**
python app.py
Open your browser and go to http://127.0.0.1:5000

📖 How to Use
Uploader (Sender)
Drag & drop a file (or click to browse).

Click "Upload & Generate Code".

Copy the generated Mission Code (e.g., CYPHER‑NKLLKKJ).

Share this code securely with the recipient (any channel).

Recipient (Downloader)
Go to the download page (/download or click “Intercept”).

Paste the Mission Code.

Click "Decrypt & Download".

The file is decrypted locally and saved to your device.

⚠️ The file can be downloaded only once (or within 24 hours). After that, the code becomes invalid and the file is wiped from the server.

🧪 Testing the Project
You can test the system locally:

Upload a file → get a code.

Open an incognito/private browser window.

Use the same code to download the file.

Try the same code again → you’ll get “Invalid or expired code”.

For stress testing, use tools like curl or write a simple Python script.

🔒 Security & Privacy Model
Component	How it protects you
Encryption	AES‑256‑GCM, key derived from mission code using PBKDF2 (client‑side).
Key handling	Key never transmitted – only derived and used in browser memory.
Server storage	Stores only the encrypted file + salt + auth tag. Never the plaintext or key.
Expiry	After 24 hours or first download, files are permanently deleted.
No logs	The Flask app is configured with access logging disabled.
Anonymity (opt.)	Can be deployed as a Tor hidden service for full network anonymity.
✅ Zero‑knowledge means even the server operator cannot decrypt your file.

📂 Project Structure
text
anoconnect/
├── app.py                # Flask backend (upload, download, auto‑cleanup)
├── requirements.txt      # Python dependencies
├── templates/
│   ├── upload.html       # Drag & drop UI for sender
│   └── download.html     # Code input & decryption UI
├── static/               # (optional) CSS/JS files
├── uploads/              # Temporary encrypted files (auto‑deleted)
└── README.md
🧰 Future Improvements (for final year extension)
🔐 Optional password‑protected codes – share both code and password.

📊 Rate limiting – prevent brute‑force code guessing.

🧾 Download history (client‑side only, using localStorage).

🧪 Unit tests for encryption and cleanup logic.

🐳 Docker container – one‑click deploy.

👨‍💻 Author
Your Name – Aditya & Alok

⭐ Acknowledgments
Flask for lightweight backend

WebCrypto API for browser‑side AES‑256‑GCM

Inspiration from Magic Wormhole and OnionShare
