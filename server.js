const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const CryptoJS = require("crypto-js");

const app = express();

const PORT = process.env.PORT || 8080;

const PASSPHRASE = "98yNCjeAfWMwk0wI";

const CORS_FILE = path.join(__dirname, "cors-origins.json");

app.use(express.json());


// -----------------------------------------
// CORS CONFIG
// -----------------------------------------

function getAllowedOrigins() {
    try {
        if (!fs.existsSync(CORS_FILE)) {
            fs.writeFileSync(
                CORS_FILE,
                JSON.stringify({
                    origins: []
                }, null, 2)
            );
        }

        const data = JSON.parse(
            fs.readFileSync(CORS_FILE, "utf8")
        );

        return Array.isArray(data.origins)
            ? data.origins
            : [];

    } catch (error) {
        console.error("CORS FILE ERROR:", error);
        return [];
    }
}


// Dynamic CORS
app.use(cors({
    origin: function (origin, callback) {

        // Request without Origin
        if (!origin) {
            return callback(null, true);
        }

        const allowedOrigins = getAllowedOrigins();

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(null, false);
    },

    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));


// -----------------------------------------
// ROOT
// -----------------------------------------

app.get("/", (req, res) => {
    res.status(404).send("Cannot GET /");
});


// -----------------------------------------
// DATA API
// -----------------------------------------

app.get("/data", (req, res) => {

    try {

        const platform = String(
            req.query.platform || ""
        ).toLowerCase();

        if (platform !== "win" && platform !== "mac") {

            return res.status(400).json({
                error:
                    "Invalid or missing 'platform' parameter. Must be 'win' or 'mac'."
            });
        }

        const filePath =
            platform === "win"
                ? path.join(__dirname, "win.html")
                : path.join(__dirname, "mac.html");

        if (!fs.existsSync(filePath)) {

            console.error("File not found:", filePath);

            return res.status(500).json({
                error: "HTML file not found"
            });
        }

        const html = fs.readFileSync(
            filePath,
            "utf8"
        );

        if (!html.trim()) {

            return res.status(500).json({
                error: "HTML file is empty"
            });
        }

        const cipher = CryptoJS.AES
            .encrypt(html, PASSPHRASE)
            .toString();

        res.setHeader(
            "Content-Type",
            "application/json; charset=utf-8"
        );

        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate"
        );

        res.setHeader(
            "Pragma",
            "no-cache"
        );

        res.setHeader(
            "Expires",
            "0"
        );

        return res.status(200).json({
            cipher: cipher
        });

    } catch (error) {

        console.error("DATA API ERROR:");
        console.error(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
});


// -----------------------------------------
// CORS MANAGEMENT
// -----------------------------------------

// Get current origins
app.get("/approval-nola-team/api/origins", (req, res) => {

    return res.json({
        origins: getAllowedOrigins()
    });

});


// Add origin
app.post("/approval-nola-team/api/origins", (req, res) => {

    try {

        let origin = String(
            req.body.origin || ""
        ).trim();

        if (!origin) {

            return res.status(400).json({
                error: "Origin is required"
            });
        }

        // Remove trailing slash
        origin = origin.replace(/\/+$/, "");

        // Basic URL validation
        let parsed;

        try {
            parsed = new URL(origin);
        } catch {

            return res.status(400).json({
                error: "Invalid URL"
            });
        }

        // Only allow http/https
        if (
            parsed.protocol !== "http:" &&
            parsed.protocol !== "https:"
        ) {

            return res.status(400).json({
                error: "Only HTTP and HTTPS origins are allowed"
            });
        }

        const origins = getAllowedOrigins();

        if (origins.includes(origin)) {

            return res.status(409).json({
                error: "Origin already exists"
            });
        }

        origins.push(origin);

        fs.writeFileSync(
            CORS_FILE,
            JSON.stringify({
                origins: origins
            }, null, 2)
        );

        return res.json({
            success: true,
            origin: origin,
            origins: origins
        });

    } catch (error) {

        console.error("ADD ORIGIN ERROR:", error);

        return res.status(500).json({
            error: "Failed to add origin"
        });
    }

});


// Delete origin
app.delete("/approval-nola-team/api/origins", (req, res) => {

    try {

        let origin = String(
            req.body.origin || ""
        ).trim();

        origin = origin.replace(/\/+$/, "");

        const origins = getAllowedOrigins();

        const newOrigins = origins.filter(
            item => item !== origin
        );

        if (newOrigins.length === origins.length) {

            return res.status(404).json({
                error: "Origin not found"
            });
        }

        fs.writeFileSync(
            CORS_FILE,
            JSON.stringify({
                origins: newOrigins
            }, null, 2)
        );

        return res.json({
            success: true,
            origins: newOrigins
        });

    } catch (error) {

        console.error("DELETE ORIGIN ERROR:", error);

        return res.status(500).json({
            error: "Failed to delete origin"
        });
    }

});


// -----------------------------------------
// APPROVAL UI
// -----------------------------------------

app.get("/approval-nola-team", (req, res) => {

    res.send(`
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>CORS Approval Manager</title>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    font-family: Arial, sans-serif;
    background: #f4f6f8;
    color: #222;
}

.container {
    width: 700px;
    max-width: 95%;
    margin: 60px auto;
}

.card {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 5px 25px rgba(0,0,0,.08);
}

h1 {
    margin-top: 0;
}

.subtitle {
    color: #666;
    margin-bottom: 25px;
}

.form {
    display: flex;
    gap: 10px;
    margin-bottom: 25px;
}

input {
    flex: 1;
    padding: 13px;
    border: 1px solid #ccc;
    border-radius: 7px;
    font-size: 15px;
}

button {
    border: 0;
    border-radius: 7px;
    padding: 12px 18px;
    cursor: pointer;
    font-size: 14px;
}

.add {
    background: #111;
    color: white;
}

.delete {
    background: #e53935;
    color: white;
}

.origin {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    margin-bottom: 10px;
}

.origin-url {
    word-break: break-all;
}

.status {
    margin-bottom: 15px;
    color: #555;
}

.empty {
    color: #888;
    padding: 20px 0;
}

</style>

</head>

<body>

<div class="container">

<div class="card">

<h1>CORS Approval Manager</h1>

<div class="subtitle">
Manage allowed origins in realtime
</div>

<div class="form">

<input
    id="originInput"
    type="text"
    placeholder="http://127.0.0.1:5500"
>

<button
    class="add"
    onclick="addOrigin()"
>
    Add Origin
</button>

</div>

<div class="status" id="status">
Loading...
</div>

<div id="origins"></div>

</div>

</div>


<script>

async function loadOrigins() {

    try {

        const response = await fetch(
            "/approval-nola-team/api/origins"
        );

        const data = await response.json();

        renderOrigins(data.origins);

    } catch (error) {

        document.getElementById("status")
            .textContent = "Failed to load origins";

    }

}


function renderOrigins(origins) {

    const container =
        document.getElementById("origins");

    const status =
        document.getElementById("status");

    status.textContent =
        origins.length + " allowed origin(s)";

    container.innerHTML = "";

    if (origins.length === 0) {

        container.innerHTML =
            '<div class="empty">No allowed origins</div>';

        return;
    }

    origins.forEach(origin => {

        const row =
            document.createElement("div");

        row.className = "origin";

        row.innerHTML = \`
            <div class="origin-url">
                \${escapeHtml(origin)}
            </div>

            <button
                class="delete"
                onclick='deleteOrigin(\${JSON.stringify(origin)})'
            >
                Delete
            </button>
        \`;

        container.appendChild(row);

    });

}


async function addOrigin() {

    const input =
        document.getElementById("originInput");

    const origin =
        input.value.trim();

    if (!origin) {

        alert("Enter an origin");

        return;
    }

    try {

        const response = await fetch(
            "/approval-nola-team/api/origins",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    origin: origin
                })
            }
        );

        const data =
            await response.json();

        if (!response.ok) {

            alert(data.error || "Failed");

            return;
        }

        input.value = "";

        renderOrigins(data.origins);

    } catch (error) {

        alert("Server error");

    }

}


async function deleteOrigin(origin) {

    if (!confirm(
        "Delete this origin?\\n\\n" + origin
    )) {

        return;
    }

    try {

        const response = await fetch(
            "/approval-nola-team/api/origins",
            {
                method: "DELETE",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    origin: origin
                })
            }
        );

        const data =
            await response.json();

        if (!response.ok) {

            alert(data.error || "Failed");

            return;
        }

        renderOrigins(data.origins);

    } catch (error) {

        alert("Server error");

    }

}


function escapeHtml(value) {

    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


loadOrigins();

</script>

</body>
</html>
    `);

});


// -----------------------------------------
// 404
// -----------------------------------------

app.use((req, res) => {

    res.status(404).send(
        "Cannot GET " + req.path
    );

});


// -----------------------------------------
// START
// -----------------------------------------

app.listen(PORT, "0.0.0.0", () => {

    console.log("----------------------------------");
    console.log("Encrypted HTML Server Started");
    console.log("----------------------------------");
    console.log("Port:", PORT);
    console.log("----------------------------------");

});