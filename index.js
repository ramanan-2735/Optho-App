import express from 'express';
import bodyParser from "body-parser"
import pg from 'pg';
import bcrypt from "bcrypt";
import session from 'express-session';
import passport from 'passport';
import Strategy from 'passport-local';
import ExcelJS from "exceljs";
import multer from 'multer';
import fs, { access } from "fs/promises";
import path from 'path';
import { fileURLToPath } from 'url';
import GoogleStrategy from "passport-google-oauth2";
import dotenv from 'dotenv';
// import { sendEmail } from './components/mailer.js';
import whatsappClient from './components/whatsapp.js';
import { createLog, loadLog } from './components/databaseMechanism.js';
import { searchPat } from './components/search.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import './components/cleaner.js'; // this auto-runs the cleanup task

import { resolveObjectURL } from 'buffer';
import rateLimit from 'express-rate-limit';
import { tmpdir } from "os";

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
const port = process.env.PORT || 3000;
const saltRounds = 5;
const cl = console.log;


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

// const db = new pg.Pool({
//     user: "postgres",
//     host: "localhost",
//     database: "optho",
//     password: "123456",
//     port: 5432
// });

const connectionString = process.env.DB_URL || 'postgres://postgres:123456@localhost:5432/optho';

const db = new pg.Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

db.connect();
// whatsappClient.initializeClient;



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
    // if (req.isAuthenticated()) {
    name = await pats();
    const currentUrl = req.get("host");
    cl(currentUrl);
    cl(__dirname)
    searchPat(name);
    res.render("index.ejs", { name: name.rows });
    // } else {
    //     res.redirect("/login");
    // }

})

// app.get('/patientDet/:id', async (req, res) => {
//     const patRow = name.rows;
//     const patdet = patRow.find(x => x.reg == req.params.id)

//     const patlog = await loadLog(patdet.reg);
//     res.render("patientDet.ejs", { det: patdet, treatment: patlog[0].treatment, advice: patlog[0].advice, logs: patlog });
// })

app.get('/patientDet/:id', async (req, res) => {
    try {
        // Ensure `name.rows` exists
        if (!name || !name.rows) {
            console.error("Server error: Patient database not found.");
            return res.redirect('/home');
        }

        const patRow = name.rows;
        const patdet = patRow.find(x => x.reg == req.params.id);

        if (!patdet) {
            console.error(`Patient with reg ${req.params.id} not found.`);
            return res.redirect('/home');
        }

        const patlog = await loadLog(patdet.reg);
        if (!patlog || patlog.length === 0) {
            console.error(`No logs found for patient ${patdet.reg}.`);
            return res.redirect('/home');
        }

        res.render("patientDet.ejs", {
            det: patdet,
            treatment: patlog[0]?.treatment || "No treatment info",
            advice: patlog[0]?.advice || "No advice given",
            logs: patlog
        });
    } catch (error) {
        console.error("Internal Server Error:", error);
        res.redirect('/home');
    }
});


// app.get('/patientDet/:reg/:id', async (req, res) => {
//     const patRow = name.rows;
//     const patdet = patRow.find(x => x.reg == req.params.reg);
//     let patlog = await loadLog(req.params.reg);
//     let history = await loadLog(req.params.reg);
//     patlog.reverse();
//     patlog = patlog[patlog.length - req.params.id]

//     res.render("patDet.ejs", { det: patdet, treatment: patlog.treatment, advice: patlog.advice, logs: patlog, hstry: history });

// })

app.get('/patientDet/:reg/:id', async (req, res) => {
    try {
        // Ensure `name.rows` exists
        if (!name || !name.rows) {
            console.error("Server error: Patient database not found.");
            return res.redirect('/home');
        }

        const patRow = name.rows;
        const patdet = patRow.find(x => x.reg == req.params.reg);

        if (!patdet) {
            console.error(`Patient with reg ${req.params.reg} not found.`);
            return res.redirect('/home');
        }

        let patlog = await loadLog(req.params.reg);
        if (!patlog || patlog.length === 0) {
            console.error(`No logs found for patient ${req.params.reg}.`);
            return res.redirect('/home');
        }

        let history = [...patlog]; // Avoid reloading
        patlog.reverse();

        let index = patlog.length - Number(req.params.id);
        if (isNaN(index) || index < 0 || index >= patlog.length) {
            console.error(`Invalid log index: ${req.params.id} for patient ${req.params.reg}.`);
            return res.redirect('/home');
        }

        patlog = patlog[index];

        res.render("patDet.ejs", {
            det: patdet,
            treatment: patlog.treatment || "No treatment info",
            advice: patlog.advice || "No advice given",
            logs: patlog,
            hstry: history
        });
    } catch (error) {
        console.error("Internal Server Error:", error);
        res.redirect('/home');
    }
});




app.get("/addPat", (req, res) => {
    function generateRegNumber() {
        const now = new Date();
        const regNumber = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        return regNumber;
    }
    const reg = generateRegNumber();
    // console.log(reg);
    res.render('addPat.ejs', { reg });
});

app.get("/register", (req, res) => {
    res.render("register.ejs")
})

app.get("/login", (req, res) => {
    res.render("login.ejs");
})


app.get('/export-to-excel-all', async (req, res) => {
    try {
        // Fetch all data from PostgreSQL in ascending order based on a relevant column (e.g., 'reg')
        const result = await db.query('SELECT * FROM patientlog ORDER BY reg ASC');

        // Create a new workbook and a worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('All Patients Data');

        // Define columns in the Excel file
        worksheet.columns = Object.keys(result.rows[0]).map(key => ({ header: key, key }));

        // Add rows from the result set
        result.rows.forEach(row => worksheet.addRow(row));

        // Set the content type and disposition for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="All_Patients_Data.xlsx"');

        // Send the workbook as a download
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        // res.status(500).send('Error generating Excel file');
        res.redirect("/home");
    }
});

app.get('/export-to-excel/:id', async (req, res) => {
    const reg = req.params.id;
    try {
        // Fetch data from PostgreSQL
        const result = await db.query('SELECT * FROM patientlog where reg = $1', [reg]);

        // Create a new workbook and a worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        // Define columns in the Excel file
        worksheet.columns = Object.keys(result.rows[0]).map(key => ({ header: key, key }));

        // Add rows from the result set
        result.rows.forEach(row => worksheet.addRow(row));

        // Set the content type and disposition for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Details of Patients ' + reg + '.xlsx"');

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

//IMAGE UPLOAD
// client.connect();

// // Set up multer storage to store files in memory (for easier processing)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// // Middleware to parse incoming data
// app.use(express.json());

// // Serve the index.html file at the root URL
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'index.html'));
// });

// // Route to upload an image
app.post('/upload/:reg', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Insert the image into PostgreSQL
    const { originalname, buffer, mimetype } = req.file;
    const query = 'INSERT INTO images(reg, filename, data, contentType) VALUES($1, $2, $3, $4) RETURNING id';
    const values = [req.params.reg, originalname, buffer, mimetype];

    try {
        const result = await db.query(query, values);
        res.json({ id: result.rows[0].id, filename: originalname });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading file');
    }
});

// // Route to view an image
// app.get('/image/:id/:visit', async (req, res) => {
//     const query = 'SELECT * FROM images WHERE visit = ($1)';
//     const values = [req.params.visit];

//     try {
//         const result = await db.query(query, values);
//         if (!result.rows.length) {
//             return res.status(404).send('Image not found');
//         }

//         const image = result.rows[0];
//         res.contentType(image.contenttype);
//         res.send(image.data);  // Send the binary image data as the response
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Error retrieving image');
//     }
// });


app.get('/image/:id', async (req, res) => {
    const query = 'SELECT * FROM images WHERE id = $1';
    const values = [req.params.id];

    try {
        const result = await db.query(query, values);
        if (!result.rows.length) {
            return res.status(404).send('Image not found');
        }
        const image = result.rows[0];
        res.contentType(image.contenttype);
        res.send(image.data);  // Send the binary image data as the response
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving image');
    }
});

// // Route to get all images
// app.get('/images', async (req, res) => {
//     const query = 'SELECT id, filename FROM images';
//     try {
//         const result = await db.query(query);
//         const reversedRows = result.rows.reverse(); // Reverse only the rows array
//         res.json(reversedRows); // Send the reversed rows as the response
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Error fetching images');
//     }
// });
// app.get('/images', async (req, res) => {
//     let { reg, visit } = req.query;

//     // cl(reg);
//     cl(visit);
//     cl(typeof(visit));
//     visit = parseInt(visit, 10)

//     cl(visit);
//     cl(typeof(visit));
//     if (!reg || !visit) {
//         return res.status(400).json({ error: 'Both reg and visit parameters are required' });
//     }

//     try {
//         const query = 'SELECT * FROM images WHERE reg = ($1) AND visit = ($2)';
//         const values = [reg, visit];

//         const result = await db.query(query, values);
//         // cl(result.rows)
//         res.json(result.rows.reverse()); // Reverse to get latest images first
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Error fetching images');
//     }
// });

app.get('/images', async (req, res) => {
    const reg = req.query.reg;
    const images = await db.query('SELECT * FROM images WHERE reg = $1', [reg]);
    // cl(images.rows.reverse());
    res.json(images.rows.reverse());
});




// // Route to delete an image
app.delete('/image/:id', async (req, res) => {
    const query = 'DELETE FROM images WHERE id = $1';
    const values = [req.params.id];

    try {
        await db.query(query, values);
        res.send('Image deleted');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting image');
    }
});

//Try Above CODE

app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
}));

app.get("/auth/google/home", passport.authenticate("google", {
    successRedirect: "/home",
    failureRedirect: "/login",
}))


// POST
// app.post("/addPat", async (req, res) => {
//     const det = req.body;

//     const treatment = Array.isArray(det.treatment) ? det.treatment : [det.treatment];
//     const advice = Array.isArray(det.advice) ? det.advice : [det.advice];

//     let reason="";
//     if(req.body.quen2 === "Others"){
//          reason = "Others - "+ req.body.other_reason;
//     }

//     console.log("Received Data:", det);

//     let formattedTreatments = [];

//     // **Fixed Treatment-to-Date & Specification Mapping**
//     const treatmentDateFields = {
//         "Intravitreal injection": { dateKey: "injection_date", specKey: "injection_spec" },
//         "PRP": { dateKey: "prp_date", specKey: "prp_spec" },
//         "Retinal surgery": { dateKey: "surgery_date", specKey: "retinal_spec" },
//         "None": { dateKey: "none_date", specKey: null } // "None" doesn't have a spec
//     };

//     // **Iterate through selected treatments**
//     treatment.forEach(treat => {
//         let dateKey = treatmentDateFields[treat]?.dateKey;
//         let specKey = treatmentDateFields[treat]?.specKey;

//         let date = req.body[dateKey] || "Not known"; // Default to "Not known" if empty
//         let spec = specKey ? req.body[specKey] || "Not Mentioned" : null; // Default "Not known" if empty

//         // Construct formatted treatment string
//         let treatmentStr = treat;
//         if (spec) treatmentStr += ` - (${spec})`; // Add specification if available
//         if (date) treatmentStr += ` - ${date}`; // Add date if available

//         formattedTreatments.push(treatmentStr);
//     });

//     let formattedAdvice = [];

//     // **Fixed Treatment Advice to Specification Mapping**
//     const treatmentAdviceFields = {
//         "Continue same treatment": "continue_advspec",
//         "Start new medications": "medication_advspec",
//         "PRP": "prp_advspec",
//         "Intravitreal injection": "injection_advspec",
//         "Vitreoretinal Surgery": "surgery_advspec"
//     };

//     // **Iterate through selected treatment advice**
//     advice.forEach(advice => {
//         let specKey = treatmentAdviceFields[advice]; // Get the specification field name
//         let spec = specKey ? req.body[specKey] || "Not Mentioned" : "Not Mentioned"; // Default to "Not known" if empty

//         // Construct formatted advice string
//         let adviceStr = advice;
//         if (spec) adviceStr += ` - (${spec})`; // Add specification if available

//         formattedAdvice.push(adviceStr);
//     });

//     console.log("Formatted Treatments:", formattedTreatments);
//     console.log("Formatted Treatment Advice:", formattedAdvice);
//     cl(reason);


//     try {
//         await db.query("INSERT INTO details(name, reg, age, sex, contact, beneficiary, dtype, ddur, insulin, oha, HBA1c, treatment, bcvar, bcval, iopr, iopl, drr, drl, mer, mel, octr, octl, advice, fllwp, quen1, quen2) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,$23, $24,$25,$26)", [det.name, det.reg, det.age, det.sex, det.contact, det.beneficiary, det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c, formattedTreatments, det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl, det.mer, det.mel, det.octr, det.octl, formattedAdvice, det.fllwp,det.quen1,reason]);

//         try {
//             await createLog(1,det.reg, det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c, formattedTreatments, det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl, det.mer, det.mel, det.octr, det.octl, formattedAdvice, det.fllwp);
//         } catch (e) {
//             console.log(e.message); 
//             res.redirect("/addPat");
//         }
//     } catch (e) {
//         console.log(e);
//         res.redirect("/addPat");
//     }
//     res.redirect("/home");
//     // res.redirect("/addPat")

// });

// Helper functions
function processFormData(det) {
    // Process treatments
    const formattedTreatments = processTreatments(det);

    // Process advice
    const formattedAdvice = processAdvice(det);

    return { formattedTreatments, formattedAdvice };
}

function processTreatments(det) {
    const treatment = Array.isArray(det.treatment) ? det.treatment : [det.treatment];
    const treatmentDateFields = {
        "Intravitreal injection": { dateKey: "injection_date", specKey: "injection_spec" },
        "PRP": { dateKey: "prp_date", specKey: "prp_spec" },
        "Retinal surgery": { dateKey: "surgery_date", specKey: "retinal_spec" },
        "None": { dateKey: "none_date", specKey: null }
    };

    return treatment.map(treat => {
        const { dateKey, specKey } = treatmentDateFields[treat] || {};
        const date = det[dateKey] || "Not known";
        const spec = specKey ? (det[specKey] || "Not Mentioned") : null;

        let treatmentStr = treat;
        if (spec) treatmentStr += ` - (${spec})`;
        if (date) treatmentStr += ` - ${date}`;

        return treatmentStr;
    });
}

function processAdvice(det) {
    const advice = Array.isArray(det.advice) ? det.advice : [det.advice];
    const treatmentAdviceFields = {
        "Continue same treatment": "continue_advspec",
        "Start new medications": "medication_advspec",
        "PRP": "prp_advspec",
        "Intravitreal injection": "injection_advspec",
        "Vitreoretinal Surgery": "surgery_advspec"
    };

    return advice.map(adv => {
        const specKey = treatmentAdviceFields[adv];
        const spec = specKey ? (det[specKey] || "Not Mentioned") : null;

        return spec ? `${adv} - (${spec})` : adv;
    });
}

async function insertPatientDetails(det, treatments, advice, reason) {
    const query = `
        INSERT INTO details(
            name, reg, age, sex, contact, beneficiary, dtype, ddur, insulin, oha, 
            HBA1c, treatment, bcvar, bcval, iopr, iopl, drr, drl, mer, mel, 
            octr, octl, advice, fllwp, quen1, quen2
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                  $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
                  $21, $22, $23, $24, $25, $26)
    `;

    const values = [
        det.name, det.reg, det.age, det.sex, det.contact, det.beneficiary,
        det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c, treatments,
        det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl,
        det.mer, det.mel, det.octr, det.octl, advice, det.fllwp,
        det.quen1, reason
    ];

    await db.query(query, values);
}

async function createLogEntry(det, treatments, advice) {
    createLog(1, det.reg, det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c, treatments, det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl, det.mer, det.mel, det.octr, det.octl, advice, det.fllwp);
}

app.post("/addPat", async (req, res) => {
    try {
        const det = req.body;

        // Validate required fields
        if (!det.reg) {
            throw new Error("Registration number is required");
        }

        // Format treatments and advice
        const { formattedTreatments, formattedAdvice } = processFormData(det);

        // Handle special case for "Others" reason
        const reason = det.quen2 === "Others"
            ? `Others - ${det.other_reason || 'Not specified'}`
            : det.quen2 || '';

        // Insert patient details
        await insertPatientDetails(det, formattedTreatments, formattedAdvice, reason);

        // Create log entry
        await createLogEntry(det, formattedTreatments, formattedAdvice);

        res.redirect("/home");
    } catch (error) {
        console.error("Error in /addPat:", error.message);
        res.redirect("/addPat");
    }
});



app.get("/deletePat/:id", async (req, res) => {
    const delReg = (req.params.id);

    try {
        await db.query('delete from patientLog where reg = ($1)', [delReg]);
        console.log("Patient with Registeration No:" + delReg + " deleted successfully from patientLog");
        try {
            await db.query('delete from details where reg = ($1)', [delReg]);
            console.log("Patient with Registeration No:" + delReg + " deleted successfully from details");
        } catch (e) {
            console.log(e);
            res.redirect("/home");
        }
    } catch (e) {
        console.log(e);
        res.redirect("/home");
    }
    res.redirect("/home");
});

app.get("/deleteLog/:reg/:id", async (req, res) => {
    cl(req.params);

    await db.query("delete from patientlog where reg = ($1) AND visit = ($2)", [req.params.reg, req.params.id]);

    res.redirect("/home");
})

app.post("/updatePat/:reg", async (req, res) => {
    const det = req.body;

    cl(det);

    const treatment = Array.isArray(det.treatment) ? det.treatment : [det.treatment];
    const advice = Array.isArray(det.advice) ? det.advice : [det.advice];

    let reason = "";
    if (req.body.quen2 === "Others") {
        reason = "Others - " + req.body.other_reason;
    }
    let formattedTreatments = [];

    // **Fixed Treatment-to-Date & Specification Mapping**
    const treatmentDateFields = {
        "Intravitreal injection": { dateKey: "injection_date", specKey: "injection_spec" },
        "PRP": { dateKey: "prp_date", specKey: "prp_spec" },
        "Retinal surgery": { dateKey: "surgery_date", specKey: "retinal_spec" },
        "None": { dateKey: "none_date", specKey: null } // "None" doesn't have a spec
    };

    // **Iterate through selected treatments**
    treatment.forEach(treat => {
        let dateKey = treatmentDateFields[treat]?.dateKey;
        let specKey = treatmentDateFields[treat]?.specKey;

        let date = req.body[dateKey] || "Not known"; // Default to "Not known" if empty
        let spec = specKey ? req.body[specKey] || "Not Mentioned" : null; // Default "Not known" if empty

        // Construct formatted treatment string
        let treatmentStr = treat;
        if (spec) treatmentStr += ` - (${spec})`; // Add specification if available
        if (date) treatmentStr += ` - ${date}`; // Add date if available

        formattedTreatments.push(treatmentStr);
    });

    let formattedAdvice = [];

    // **Fixed Treatment Advice to Specification Mapping**
    const treatmentAdviceFields = {
        "Continue same treatment": "continue_advspec",
        "Start new medications": "medication_advspec",
        "PRP": "prp_advspec",
        "Intravitreal injection": "injection_advspec",
        "Vitreoretinal Surgery": "surgery_advspec"
    };

    // **Iterate through selected treatment advice**
    advice.forEach(advice => {
        let specKey = treatmentAdviceFields[advice]; // Get the specification field name
        let spec = specKey ? req.body[specKey] || "Not Mentioned" : "Not Mentioned"; // Default to "Not known" if empty

        // Construct formatted advice string
        let adviceStr = advice;
        if (spec) adviceStr += ` - (${spec})`; // Add specification if available

        formattedAdvice.push(adviceStr);
    });

    // console.log("Formatted Treatments:", formattedTreatments);
    // console.log("Formatted Treatment Advice:", formattedAdvice);
    // cl(reason);

    let result = await db.query("select max(visit) from patientlog where reg = ($1)", [req.params.reg])

    let last_visit = (result.rows[0].max) + 1;

    try {
        await createLog(last_visit, det.reg, det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c, formattedTreatments, det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl, det.mer, det.mel, det.octr, det.octl, formattedAdvice, det.fllwp);
    } catch (e) {
        console.log(e.message);
        res.redirect(`/patientDet/${req.params.reg}/${last_visit - 1}`);

    }

    res.redirect(`/patientDet/${req.params.reg}/${last_visit}`);
    // res.redirect("/home")
})

app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;

    console.log("Password:", password);
    console.log("Salt Rounds:", saltRounds);


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
// app.post('/send-email', async (req, res) => {
//     const { recipient, subject, templateData } = req.body;

//     // Generate dynamic email content
//     const emailTemplate = `
//         <h1>Hello ${templateData.name}!</h1>
//         <p>${templateData.message.greet}</p>
//         <p>That your ETDRS grade for right eye is ${templateData.message.drr}</p>
//         <p>That your ETDRS grade for left eye is ${templateData.message.drl}</p>
//         <p>That your Macular Edema for right eye is ${templateData.message.mer}</p>
//         <p>That your Macular Edema for left eye is ${templateData.message.mel}</p>
//         <p>That your OCT Finding for right eye is ${templateData.message.octr}</p>
//         <p>That your OCT Finding for left eye is ${templateData.message.octl}</p>

//         <p>Thank you for using our service.</p>
//     `;

//     const result = await sendEmail(recipient, subject, emailTemplate);
//     res.status(result.success ? 200 : 500).json(result);
// });


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

// app.get('/get-qr-code', (req, res) => {
//     if (qrCodeUrl) {
//         res.json({ success: true, qrCodeUrl });
//     } else {
//         res.json({ success: false, message: 'QR code not generated yet.' });
//     }
// });

// Add this near your other route handlers
let latestQrUrl = '';

// Update the stored QR URL when generated
whatsappClient.qrCodeEmitter.on('qrCodeGenerated', (url) => {
    latestQrUrl = url;
    console.log('QR Code updated');
});

app.get('/get-qr-code', (req, res) => {
    if (latestQrUrl) {
        res.json({ success: true, qrCodeUrl: latestQrUrl });
    } else {
        res.json({ success: false, message: 'QR code not generated yet.' });
    }
});


// //For Logout
// // Add this near your other routes
// app.post('/force-logout', async (req, res) => {
//     try {
//       // Destroy current session
//       await client.destroy();

//       // Clear local session files
//       const sessionPath = path.join(__dirname, '.wwebjs_auth');
//       try {
//         await fs.rm(sessionPath, { recursive: true, force: true });
//       } catch (err) {
//         console.log('No session files to delete');
//       }

//       // Reinitialize client to generate new QR
//       await client.initialize();

//       res.json({ success: true });
//     } catch (error) {
//       res.status(500).json({ success: false, error: error.message });
//     }
//   });

//   app.use((req, res, next) => {
//     req.whatsappClient = client;
//     next();
//   });


//   // Now in routes
//   app.get('/login-status', (req, res) => {
//     res.json({
//       isLoggedIn: req.whatsappClient.pupPage !== null
//     });
//   });

//   const logoutLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 3 // Allow 3 logout attempts per window
//   });

//   app.use('/force-logout', logoutLimiter); 

// Add this anywhere after client initialization
// app.get('/whatsapp-status', (req, res) => {
//     res.json({
//       isAuthenticated: client.pupPage !== null  // Checks if WhatsApp is logged in
//     });
//   });

//   app.post('/force-reauth', async (req, res) => {
//     try {
//       await client.destroy();  // Destroy current session
//       await client.initialize();  // Generate new QR
//       res.json({ success: true });
//     } catch (error) {
//       res.status(500).json({ success: false, error: error.message });
//     }
//   });


// Route to send a WhatsApp message
// app.post('/whatsapp-message', async (req, res) => {
//     const { phoneNumber, message } = req.body;

//     // Validate input data
//     if (!phoneNumber || !message) {
//         return res.status(400).json({ error: 'Phone number and message are required.' });
//     }

//     try {
//         await whatsappClient.sendMessage(phoneNumber, message); // Send the message using sendMessage
//         res.status(200).json({ message: 'Message sent successfully!' });
//     } catch (error) {
//         console.error('Error sending WhatsApp message:', error);
//         res.status(500).json({ error: 'Failed to send the message. Please try again later.' });
//     }
// });

// app.post('/generate-pdf', async (req, res) => {
//     const {
//         name,
//         registrationNo,
//         age,
//         sex,
//         contactNo,
//         diabetesType,
//         insulin,
//         noOfOHA,
//         hba1c,
//         bcvar,
//         bcval,
//         iopr,
//         iopl,
//         drr,
//         drl,
//         mer,
//         mel,
//         octr,
//         octl,
//         treatmentAdvice,
//         followUp,
//     } = req.body;

//     try {
//         // 1. Validate required fields
//         if (!name || !contactNo) {
//             return res.status(400).json({ error: "Name and contact number are required" });
//         }

//         // 2. Load PDF template
//         const templatePath = path.join(__dirname, 'public', 'templates', 'DM screening Form.pdf');
//         const pdfTemplate = await fs.readFile(templatePath);

//         if (!pdfTemplate) {
//             throw new Error('PDF template not found or is empty');
//         }

//         // 3. Generate PDF in memory
//         const pdfDoc = await PDFDocument.load(pdfTemplate);

//         if (pdfDoc.getPageCount() === 0) {
//             throw new Error('PDF template has no pages');
//         }

//         const page = pdfDoc.getPages()[0];
//         const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
//         const fontSize = 10;

//         // Fill in the blank fields
//         page.drawText(name || '', { x: 120, y: 595, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(registrationNo || '', { x: 450, y: 595, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(`${age || ''}`, { x: 145, y: 570, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(sex || '', { x: 255, y: 570, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(contactNo || '', { x: 400, y: 570, size: fontSize, font, color: rgb(0, 0, 0) });

//         page.drawText(" - " + diabetesType || '', { x: 315, y: 545, size: fontSize, font, color: rgb(0, 0, 0) });

//         page.drawText(insulin ? 'Yes' : 'No', { x: 190, y: 520, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(`${noOfOHA || ''}`, { x: 410, y: 520, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(`${hba1c || ''}`, { x: 505, y: 520, size: fontSize, font, color: rgb(0, 0, 0) });

//         page.drawText(`${bcvar || 'Nil'}`, { x: 385, y: 415, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(`${bcval || 'Nil'}`, { x: 285, y: 415, size: fontSize, font, color: rgb(0, 0, 0) });

//         page.drawText(`${iopr || 'Nil'}`, { x: 385, y: 385, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(`${iopl || 'Nil'}`, { x: 285, y: 385, size: fontSize, font, color: rgb(0, 0, 0) });

//         page.drawText(`${drr || 'Nil'}`, { x: 250, y: 268, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(`${drl || 'Nil'}`, { x: 250, y: 240, size: fontSize, font, color: rgb(0, 0, 0) });

//         page.drawText(`${mer || 'Nil'}`, { x: 385, y: 268, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(`${mel || 'Nil'}`, { x: 385, y: 240, size: fontSize, font, color: rgb(0, 0, 0) });

//         page.drawText(`${octr || 'Nil'}`, { x: 495, y: 268, size: fontSize, font, color: rgb(0, 0, 0) });
//         page.drawText(`${octl || 'Nil'}`, { x: 495, y: 240, size: fontSize, font, color: rgb(0, 0, 0) });

//         page.drawText(treatmentAdvice || '', { x: 235, y: 180, size: fontSize, font, color: rgb(0, 0, 0), lineHeight: 14 });
//         page.drawText(followUp || '', { x: 55, y: 95, size: fontSize, font, color: rgb(0, 0, 0), lineHeight: 14 });

//          // Inside your /generate-pdf endpoint:
//          const pdfBytes = Buffer.from(await pdfDoc.save()); // Force conversion to Buffer
// // console.log("PDF Buffer Type:", typeof pdfBytes); // Should be 'object'
// // console.log("Is Buffer?", Buffer.isBuffer(pdfBytes)); // Should be true

// // Then call sendMessage
// await whatsappClient.sendMessage(
//     `91${contactNo}`,
//     `${name}'s Diabetes Screening Report`,
//     pdfBytes, // Make sure this is a Buffer
//     `${name}_DM_Screening_Report.pdf`
// );

// await whatsappClient.sendMessage(
//     `91${contactNo}`
// );

//          res.status(200).json({ success: true, message: "PDF sent via WhatsApp!" });
//      } catch (error) {
//          console.error("Error:", error);
//          res.status(500).json({ error: error.message });
//      }
//   });

app.post('/generate-pdf', async (req, res) => {
    const {
        name, registrationNo, age, sex, contactNo,
        diabetesType, insulin, noOfOHA, hba1c,
        bcvar, bcval, iopr, iopl,
        drr, drl, mer, mel,
        octr, octl, treatmentAdvice, followUp
    } = req.body;

    cl("making pdf")

    try {
        if (!name || !contactNo) {
            return res.status(400).json({ error: "Name and contact number are required" });
        }

        const templatePath = path.join(__dirname, 'public', 'templates', 'DM screening Form.pdf');
        const pdfTemplate = await fs.readFile(templatePath);

        if (!pdfTemplate || pdfTemplate.length === 0) {
            throw new Error('PDF template not found or is empty');
        }

        const pdfDoc = await PDFDocument.load(pdfTemplate);
        const page = pdfDoc.getPage(0);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 10;

        // Draw data to the PDF
        const drawField = (text, x, y) => {
            page.drawText(String(text ?? ''), {
                x, y, size: fontSize, font, color: rgb(0, 0, 0)
            });
        };

        drawField(name, 120, 595);
        drawField(registrationNo, 450, 595);
        drawField(age, 145, 570);
        drawField(sex, 255, 570);
        drawField(contactNo, 400, 570);
        drawField(` - ${diabetesType || ''}`, 315, 545);

        drawField(insulin ? 'Yes' : 'No', 190, 520);
        drawField(noOfOHA, 410, 520);
        drawField(hba1c, 505, 520);

        drawField(bcval || 'Nil', 285, 415);
        drawField(bcvar || 'Nil', 385, 415);

        drawField(iopl || 'Nil', 285, 385);
        drawField(iopr || 'Nil', 385, 385);

        drawField(drr || 'Nil', 250, 268);
        drawField(drl || 'Nil', 250, 240);

        drawField(mer || 'Nil', 385, 268);
        drawField(mel || 'Nil', 385, 240);

        drawField(octr || 'Nil', 495, 268);
        drawField(octl || 'Nil', 495, 240);

        drawField(treatmentAdvice, 235, 180);
        drawField(followUp, 55, 95);

        // Save PDF to file

        const fileName = `${name.replace(/\s+/g, '_')}_DM_Screening_Report.pdf`;
        const filePath = path.join(__dirname, 'tmpPDF', fileName);
        const pdfBytes = await pdfDoc.save();
        await fs.writeFile(filePath, pdfBytes);

        cl("made pdf")
        // Optional: send via WhatsApp
        cl("now sending pdf")

        await whatsappClient.sendMessage(
            `91${contactNo}`,
            `${name}'s Diabetes Screening Report`,
            Buffer.from(pdfBytes),
            fileName
        );

        res.status(200).json({
            success: true,
            message: 'PDF generated and saved successfully.',
            filePath: `/tmpPDF/${fileName}`
        });

    } catch (error) {
        console.error("PDF generation error:", error);
        res.status(500).json({ error: error.message });
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
        clientID: "Ansh",
        clientSecret: "Ansh",
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


