const express = require("express");
const mysql = require("mysql");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());


app.use(
    session({
        secret: "lostfoundsecret",
        resave: false,
        saveUninitialized: true
    })
);

//connector
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "GodofwarragnarokNovember2022",
    // GodofwarragnarokNovember2022
    //1234
    
    database: "lostfound"
});

db.connect(err => {
    if (err) console.log(err);
    else console.log("MySQL Connected!");
});

//image uploads Multer
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });


//register route
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    db.query(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, password],
        (err) => {
            if (err) return res.json({ error: err });
            res.json({ success: true });
        }
    );
});


// login route

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE username=? AND password=?",
        [username, password],
        (err, result) => {
            if (err) return res.json({ error: err });
            if (result.length === 0)
                return res.json({ success: false });

            req.session.user = {
                id: result[0].id,
                role: result[0].role
            };

            res.json({ success: true, role: result[0].role });
        }
    );
});

app.post("/add-item", (req, res) => {

    if (!req.session.user) {
        return res.json({ error: "Not logged in" });
    }

    const { item_name, category, description, location_found } = req.body;
    const user_id = req.session.user.id;

    db.query(
        `INSERT INTO items (user_id, item_name, category, description, location_found)
         VALUES (?, ?, ?, ?, ?)`,
        [user_id, item_name, category, description, location_found],
        (err) => {
            if (err) return res.json({ error: err });
            res.json({ success: true });
        }
    );
});

// for available items

app.get("/items", (req, res) => {
    db.query("SELECT * FROM items WHERE status='listed'", (err, result) => {
        if (err) return res.json({ error: err });
        res.json(result);
    });
});
        // claim form
app.post("/claim", upload.single("proof_image"), (req, res) => {
    const { item_id, proof_text } = req.body;
    const user_id = req.session.user.id;

    const file = req.file ? req.file.filename : null;

    db.query(
        `INSERT INTO claims (user_id, item_id, proof_text, proof_image)
         VALUES (?, ?, ?, ?)`,
        [user_id, item_id, proof_text, file],
        (err) => {
            if (err) return res.json({ error: err });
            db.query("UPDATE items SET status='claimed' WHERE id=?", [item_id]);
            res.json({ success: true });
        }
    );
});

//admin panel claims
app.get("/admin/claims", (req, res) => {
    db.query(
        `SELECT claims.*, items.item_name, users.username 
         FROM claims
         JOIN items ON claims.item_id = items.id
         JOIN users ON claims.user_id = users.id
         WHERE admin_status='pending'`,
        (err, result) => {
            if (err) return res.json({ error: err });
            res.json(result);
        }
    );
});


app.post("/admin/approve", (req, res) => {
    const { claim_id, item_id } = req.body;

    db.query("UPDATE claims SET admin_status='approved' WHERE id=?", [claim_id]);
    db.query("UPDATE items SET status='returned' WHERE id=?", [item_id]);

    res.json({ success: true });
});

app.post("/admin/reject", (req, res) => {
    const { claim_id, item_id } = req.body;

    db.query("UPDATE claims SET admin_status='rejected' WHERE id=?", [claim_id]);
    db.query("UPDATE items SET status='listed' WHERE id=?", [item_id]);

    res.json({ success: true });
});

//send to junk
app.get("/auto-junk", (req, res) => {
    db.query(
        `UPDATE items
         SET status='junked'
         WHERE category='miscellaneous'
         AND status='listed'
         AND TIMESTAMPDIFF(HOUR, found_date, NOW()) > 48`,
        (err, result) => {
            if (err) return res.json({ error: err });
            res.json({ message: "Auto junk complete" });
        }
    );
});
//public me jo files hain wo statically send hongi, server change nahin krega.
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.listen(3000, () => console.log("Server running on 3000"));
