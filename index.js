import express from 'express';
import bodyParser from "body-parser"
import exp from 'constants';
import pg from 'pg';
import bcrypt from "bcrypt";
import session from 'express-session';
import passport from 'passport';
import Strategy from 'passport-local';
import ExcelJS from "exceljs";
import multer from 'multer';
import fs, { access } from "fs";
import path from 'path';
import { fileURLToPath } from 'url';
import GoogleStrategy from "passport-google-oauth2";
import dotenv from 'dotenv';
import { sendEmail } from './components/mailer.js';
import axios from 'axios';
import { initializeClient, sendMessage, qrCodeUrl } from './components/whatsapp.js';
import { createLog, loadLog } from './components/databaseMechanism.js';
import {searchPat} from './components/search.js';




dotenv.config();
if (!process.env.UNAME) {
    console.error('Failed to load environment variables from .env');
} else {
    console.log('Environment variables loaded successfully');
}

/* Change api keys for
sms
email
google auth
in index.js and their respective file and patientDet.ejs*/

const app = express();
const port = 3000;
const saltRounds = 5;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public/'));
app.use(session({
    secret: "SECRET",
    resave: false,
    saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(bodyParser.json({ limit: '10mb' })); // To handle large base64 images
app.use(express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files
app.use(express.json());
app.use(bodyParser.json());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "optho",
    password: "123456",
    port: 5432
});

db.connect();



let name;

function pats() {
    try {
        return db.query("select * from details");
    } catch (e) {
        console.log(e);
    }
}

// GET
app.get('/', (req, res) => {
    res.redirect("/home")
})

app.get('/home', async (req, res) => {
    if (req.isAuthenticated()) {
        name = await pats();
        searchPat(name);
        res.render("index.ejs", { name: name.rows });
    } else {
        res.redirect("/login");
    }

})

app.get('/patientDet/:id', async (req, res) => {
    const patRow = name.rows;
    console.log("");
    const patdet = patRow.find(x => x.id == req.params.id)

    const patlog = await loadLog(patdet.reg);
    // console.log(patlog)
    // console.log(patlog[0].treatment);
    // console.log(patlog[0].advice);

    async function parseTreatmentAndAdvice(input) {
        // Preprocess the input to make it valid JSON
        async function preprocessInput(input) {
            // Remove the outer curly braces and split by commas
            const cleanedString = input
                .replace(/^{/, '[') // Replace the opening brace with a square bracket
                .replace(/}$/, ']') // Replace the closing brace with a square bracket
                .replace(/'/g, '"'); // Replace single quotes with double quotes

            return cleanedString; // Now it looks like a JSON array
        }

        try {
            const preprocessedInput = await preprocessInput(input);
            // Parse the cleaned string into a JavaScript array
            return JSON.parse(preprocessedInput);
        } catch (error) {
            console.error('Error parsing JSON:', error);
            return []; // Return an empty array on error
        }
    }

    res.render("patientDet.ejs", { det: patdet, treatment: await parseTreatmentAndAdvice(patlog[0].treatment), advice: await parseTreatmentAndAdvice(patlog[0].advice), logs: patlog });
})

app.get("/addPat", (req, res) => {
    function generateRegNumber() {
        const now = new Date();
        const regNumber = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        return regNumber;
    }
    const reg = generateRegNumber();
    console.log(reg);
    res.render('addPat.ejs', { reg });
});

app.get("/register", (req, res) => {
    res.render("register.ejs")
})

app.get("/login", (req, res) => {
    res.render("login.ejs");
})

app.get('/export-to-excel', async (req, res) => {
    try {
        // Fetch data from PostgreSQL
        const result = await db.query('SELECT * FROM details');

        // Create a new workbook and a worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        // Define columns in the Excel file
        worksheet.columns = Object.keys(result.rows[0]).map(key => ({ header: key, key }));

        // Add rows from the result set
        result.rows.forEach(row => worksheet.addRow(row));

        // Set the content type and disposition for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Details of Patients.xlsx"');

        // Send the workbook as a download
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating Excel file');
    }
});

app.get("/canvas", (req, res) => {
    res.render("canvas.ejs");
})

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('xray'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ filePath: `/uploads/${req.file.filename}` });
});

app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
}));

app.get("/auth/google/home", passport.authenticate("google", {
    successRedirect: "/home",
    failureRedirect: "/login",
}))


// POST
app.post("/addPat", async (req, res) => {
    const det = req.body;
    // console.log(det);
    try {
        await db.query("INSERT INTO details(name, reg, age, sex, contact, beneficiary, dtype, ddur, insulin, oha, HBA1c, treatment, bcvar, bcval, iopr, iopl, drr, drl, mer, mel, octr, octl, advice, fllwp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,$23, $24)", [det.name, det.reg, det.age, det.sex, det.contact, det.beneficiary, det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c, det.treatment, det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl, det.mer, det.mel, det.octr, det.octl, det.advice, det.fllwp]);

        try {
            await createLog(det.reg, det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c, det.treatment, det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl, det.mer, det.mel, det.octr, det.octl, det.advice, det.fllwp);
        } catch (e) {
            console.log(e.message);
        }
    } catch (e) {
        console.log(e);
        res.redirect("/addPat")
    }
    res.redirect("/")
});

app.post("/deletePat/:id", (req, res) => {
    const delId = (req.params.id);
    try {
        db.query('delete from details where id = ($1)', [delId]);
        console.log("Row with ID " + delId + " deleted successfully");
    } catch (e) {
        console.log(e)
    }
    res.redirect("/home");
});

app.post("/updatePat", (req, res) => {
    console.log(req.params)
    // res.render("updPat.ejs", { det: updPat });
})

app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;

    try {
        const checkres = await db.query("select * from users where email = $1", [email]);

        if (checkres.rows.length > 0) {
            res.send("exists");
        } else {
            //hashing
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if (err) {
                    console.log(err)
                } else {
                    const result = await db.query("insert into users (email, password) values ($1,$2) returning *", [email, hash]);

                    const user = result.rows[0];
                    req.login(user, (err) => {
                        console.log(err);
                        res.redirect("/home");
                    })
                }

            })

        }
    } catch (err) {
        console.log(err);
    }

})

// Email API endpoint
app.post('/send-email', async (req, res) => {
    const { recipient, subject, templateData } = req.body;

    // Generate dynamic email content
    const emailTemplate = `
        <h1>Hello ${templateData.name}!</h1>
        <p>${templateData.message.greet}</p>
        <p>That your ETDRS grade for right eye is ${templateData.message.drr}</p>
        <p>That your ETDRS grade for left eye is ${templateData.message.drl}</p>
        <p>That your Macular Edema for right eye is ${templateData.message.mer}</p>
        <p>That your Macular Edema for left eye is ${templateData.message.mel}</p>
        <p>That your OCT Finding for right eye is ${templateData.message.octr}</p>
        <p>That your OCT Finding for left eye is ${templateData.message.octl}</p>
        
        <p>Thank you for using our service.</p>
    `;

    const result = await sendEmail(recipient, subject, emailTemplate);
    res.status(result.success ? 200 : 500).json(result);
});


// SMS Endpoint
// app.post('/send-message', async (req, res) => {
//     try {
//       const { phoneNumber, message } = req.body;
//       console.log('Received request:', phoneNumber, message); // Log incoming request

//       const response = await axios.post('https://www.fast2sms.com/dev/bulk', null, {
//         params: {
//           authorization: process.env.ApiKey, // Replace with your Fast2SMS API key
//           message,
//           numbers: process.env.password,
//         },
//       });

//       console.log('Fast2SMS Response:', response.data); // Log Fast2SMS response

//       if (response.data && response.data.return) {
//         res.status(200).json({ success: true, data: response.data });
//       } else {
//         res.status(500).json({ success: false, error: 'Failed to send SMS' });
//       }
//     } catch (error) {
//       console.error('Error:', error); // Log the error for debugging
//       if (error.response) {
//         console.error('Fast2SMS API Error:', error.response.data); // Log Fast2SMS error details
//         res.status(500).json({ success: false, error: error.response.data });
//       } else {
//         res.status(500).json({ success: false, error: error.message });
//       }
//     }
//   });

//Whatsapp
// Initialize WhatsApp client when the server starts
initializeClient();
// console.log(qrCodeUrl);

// Example route to send a WhatsApp message
app.post('/whatsapp-message', async (req, res) => {
    const { phoneNumber, message } = req.body;

    // Validate input data
    if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Phone number and message are required' });
    }

    try {
        await sendMessage("918356074065", "Hello world!");
        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Error sending message' });
    }
});


app.post("/login", passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login",
}))

passport.use("local", new Strategy(async function verify(username, password, cb) {
    try {
        const result = await db.query("select * from users where email = $1", [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedHashPassword = user.password;

            bcrypt.compare(password, storedHashPassword, (err, result) => {
                if (err) {
                    return cb(err);
                } else {
                    if (result) {
                        return cb(null, user);
                    }
                    else {
                        return cb(null, false);
                    }
                }
            })

        } else {
            res.redirect("/login");
            console.log("NOt found!")
        }
    } catch (err) {
        console.log(err);
    }
}))

passport.use("google",
    new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/home",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    }, async (accessToken, refreshToken, profile, cb) => {
        console.log(profile);
        try {
            const result = await db.query("select * from users where email = $1", [profile.email])
            if (result.rows.length === 0) {
                const newUser = await db.query("insert into users (email, password) values ($1,$2)", [profile.email, "google"])
                cb(null, newUser.rows[0]);
            } else {
                //exists
                cb(null, result.rows[0])
            }
        } catch (error) {
            cb(error);
        }
    }));

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});


app.listen(port, () => {
    console.log(`Server deployed on http://localhost:${port}/home`);
})


