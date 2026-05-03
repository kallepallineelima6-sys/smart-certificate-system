const express = require("express");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "mysecretkey";
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Tesseract = require("tesseract.js");
const db = require("./db"); // Import our database connection helper

const app = express();

// ✅ CORS must be first — before routes and static files
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Static file serving
app.use('/uploads', express.static('uploads'));

// Ensure uploads folder exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    },
});
const upload = multer({ storage: storage });

// JWT Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ error: "No token" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log("JWT VERIFY FAILED:", err.message);
            return res.status(403).json({ error: "Invalid token" });
        }
        console.log("User Authenticated:", user.username);
        req.user = user;
        next();
    });
}

// Routes
app.get("/", (req, res) => {
    res.send("Smart Certificate System API is running.");
});

// Auth Route
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "10h" });
        return res.json({ success: true, token, username });
    }
    res.status(401).json({ success: false, message: "Invalid username or password" });
});

// 2. Automated Upload Route with Intelligence
app.post("/upload", authenticateToken, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        const userId = req.body.userId || req.body.user_id || 1;
        const filePathForOCR = req.file.path;
        const fileUrl = `http://127.0.0.1:5005/uploads/${req.file.filename}`;
        
        // Default values
        let title = "General Certificate";
        let expiryDate = null;
        let extractedText = "";

        // 🧠 OCR Intelligence (Tesseract.js)
        try {
            const { data: { text } } = await Tesseract.recognize(filePathForOCR, 'eng');
            extractedText = text.toLowerCase();
            console.log("OCR EXTRACED TEXT SNIPPET:", extractedText.substring(0, 100));

            // --- A) AUTO TITLE DETECTION ---
            if (extractedText.includes("python")) title = "Python Certificate";
            else if (extractedText.includes("java")) title = "Java Certificate";
            else if (extractedText.includes("aws")) title = "AWS Certificate";
            else if (extractedText.includes("course") || extractedText.includes("certificate of completion")) title = "Skill Certificate";
            else if (extractedText.includes("aadhaar") || extractedText.includes("government of india")) title = "Aadhaar Card";
            else if (extractedText.includes("pan") || extractedText.includes("income tax department")) title = "PAN Card";
            else if (extractedText.includes("driving licence")) title = "Driving License";
            else if (extractedText.includes("ssc") || extractedText.includes("secondary school certificate")) title = "10th Certificate";
            else if (extractedText.includes("intermediate") || extractedText.includes("board of intermediate")) title = "12th Certificate";
            else if (extractedText.includes("university")) title = "Degree Certificate";

            // --- B) EXPIRY DETECTION (Regex) ---
            const dateRegex = /(\d{2}[/-]\d{2}[/-]\d{4})/;
            const match = text.match(dateRegex);

            // Special rule: Government/Education docs don't usually have expiry in this context
            const noExpiryTitles = ["Aadhaar Card", "PAN Card", "10th Certificate", "12th Certificate", "Degree Certificate"];
            
            if (match && !noExpiryTitles.includes(title)) {
                try {
                    // Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
                    const parts = match[0].split(/[/-]/);
                    // parts[2] = Year, parts[1] = Month, parts[0] = Day
                    const parsedDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    if (!isNaN(parsedDate)) {
                        expiryDate = parsedDate.toISOString().split('T')[0];
                    }
                } catch (e) {
                    console.error("DATE PARSE ERR:", e);
                }
            }
        } catch (ocrErr) {
            console.error("OCR PROCESSING FAILED:", ocrErr);
        }

        // --- C) SAVE TO DATABASE ---
        const query = `
            INSERT INTO certificates (user_id, title, file_url, expiry_date)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [userId, title, fileUrl, expiryDate];
        const result = await db.query(query, values);

        console.log("Intelligence used to save:", title);

        return res.json({
            message: "Upload and OCR Intelligence successful",
            file_url: fileUrl,
            certificate: result.rows[0]
        });
        
    } catch (err) {
        console.error("UPLOAD ERROR:", err);
        return res.status(500).send("Upload failed");
    }
});

// 3. GET API
app.get('/certificates', authenticateToken, async (req, res) => {
    console.log("Fetching certificates for user:", req.user.username);
    try {
        const result = await db.query('SELECT * FROM certificates ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("GET ERROR:", err);
        res.status(500).send("Failed to fetch data");
    }
});

// 4. DELETE API
app.delete('/certificates/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM certificates WHERE id=$1 RETURNING *',
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Not found" });
        }

        res.json({ message: "Deleted successfully" });
    } catch (err) {
        console.error("DELETE ERROR:", err);
        res.status(500).send("Delete failed");
    }
});

// 5. UPDATE API
app.put('/certificates/:id', authenticateToken, async (req, res) => {
    try {
        const { title, expiry_date } = req.body;

        const result = await db.query(
            'UPDATE certificates SET title=$1, expiry_date=$2 WHERE id=$3 RETURNING *',
            [title, expiry_date, req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Not found" });
        }

        res.json({ message: "Updated successfully" });
    } catch (err) {
        console.error("UPDATE ERROR:", err);
        res.status(500).send("Update failed");
    }
});

// 6. Statistics API
app.get('/stats', authenticateToken, async (req, res) => {
    try {
        const totalResult = await db.query('SELECT COUNT(*) FROM certificates');
        const expiredResult = await db.query(`
            SELECT COUNT(*) FROM certificates 
            WHERE expiry_date IS NOT NULL 
            AND expiry_date < CURRENT_DATE
        `);
        const expiringSoonResult = await db.query(`
            SELECT COUNT(*) FROM certificates 
            WHERE expiry_date IS NOT NULL 
            AND expiry_date >= CURRENT_DATE 
            AND expiry_date <= CURRENT_DATE + INTERVAL '7 days'
        `);
        const noExpiryResult = await db.query('SELECT COUNT(*) FROM certificates WHERE expiry_date IS NULL');

        res.json({
            total: parseInt(totalResult.rows[0].count),
            expired: parseInt(expiredResult.rows[0].count),
            expiringSoon: parseInt(expiringSoonResult.rows[0].count),
            noExpiry: parseInt(noExpiryResult.rows[0].count)
        });
    } catch (err) {
        console.error("STATS ERROR:", err);
        res.status(500).send("Failed to fetch statistics");
    }
});

// Start Server
let PORT = 5005;
const startServer = () => {
    const server = app.listen(PORT, () => {
        console.log(`Auth Server running successfully on port ${PORT}`);
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`Port ${PORT} is in use, trying ${PORT + 1}...`);
            PORT++;
            server.listen(PORT);
        } else {
            console.error('Server error:', e);
        }
    });
};

startServer();
