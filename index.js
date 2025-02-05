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
import fs, { access } from "fs/promises";
import path from 'path';
import { fileURLToPath } from 'url';
import GoogleStrategy from "passport-google-oauth2";
import dotenv from 'dotenv';
import { sendEmail } from './components/mailer.js';
import axios from 'axios';
import { initializeClient, sendMessage, qrCodeUrl } from './components/whatsapp.js';
import { createLog, loadLog } from './components/databaseMechanism.js';
import { searchPat } from './components/search.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { resolveObjectURL } from 'buffer';


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

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "optho",
    password: "123456",
    port: 5432
});

db.connect();
initializeClient();

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
    searchPat(name);
    res.render("index.ejs", { name: name.rows });
    // } else {
    //     res.redirect("/login");
    // }

})

app.get('/patientDet/:id', async (req, res) => {
    const patRow = name.rows;
    const patdet = patRow.find(x => x.reg == req.params.id)

    const patlog = await loadLog(patdet.reg);
    res.render("patientDet.ejs", { det: patdet, treatment: patlog[0].treatment, advice: patlog[0].advice, logs: patlog });
})

app.get('/patientDet/:reg/:id', async (req, res) => {
    const patRow = name.rows;
    const patdet = patRow.find(x => x.reg == req.params.reg);
    let patlog = await loadLog(req.params.reg);
    let history = await loadLog(req.params.reg);
    patlog.reverse();    
    patlog = patlog[patlog.length - req.params.id]    

    res.render("patDet.ejs", { det: patdet, treatment: patlog.treatment, advice: patlog.advice, logs: patlog , hstry: history});
  
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
        res.setHeader('Content-Disposition', 'attachment; filename="Details of Patients '+ reg +'.xlsx"');

        // Send the workbook as a download
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating Excel file');
    }

});

app.get("/canvas/:reg/:visit", (req, res) => {
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
    const values = [req.params.reg ,originalname, buffer, mimetype];

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
app.post("/addPat", async (req, res) => {
    const det = req.body;

    const treatment = Array.isArray(det.treatment) ? det.treatment : [det.treatment];
    const advice = Array.isArray(det.advice) ? det.advice : [det.advice];

    try {
        await db.query("INSERT INTO details(name, reg, age, sex, contact, beneficiary, dtype, ddur, insulin, oha, HBA1c, treatment, bcvar, bcval, iopr, iopl, drr, drl, mer, mel, octr, octl, advice, fllwp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,$23, $24)", [det.name, det.reg, det.age, det.sex, det.contact, det.beneficiary, det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c, treatment, det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl, det.mer, det.mel, det.octr, det.octl, advice, det.fllwp]);

        try {
            await createLog(1,det.reg, det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c, treatment, det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl, det.mer, det.mel, det.octr, det.octl, advice, det.fllwp);
        } catch (e) {
            console.log(e.message);
            res.redirect("/addPat")
        }
    } catch (e) {
        console.log(e);
        res.redirect("/addPat")
    }
    res.redirect("/home")
});

app.get("/deletePat/:id",async (req, res) => {
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

app.post("/updatePat/:reg", async (req, res) => {
    const det = req.body;

    const treatment = Array.isArray(det.treatment) ? det.treatment : [det.treatment];
    const advice = Array.isArray(det.advice) ? det.advice : [det.advice];

    let result =  await db.query("select max(visit) from patientlog where reg = ($1)", [req.params.reg])

    let last_visit = (result.rows[0].max) + 1;

    try {
        await createLog(last_visit,det.reg, det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c, treatment, det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl, det.mer, det.mel, det.octr, det.octl, advice, det.fllwp);
    } catch (e) {
        console.log(e.message);
    }

    res.redirect(`/patientDet/${req.params.reg}/${last_visit}`);
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

app.get('/get-qr-code', (req, res) => {
    if (qrCodeUrl) {
        res.json({ success: true, qrCodeUrl });
    } else {
        res.json({ success: false, message: 'QR code not generated yet.' });
    }
});


// Route to send a WhatsApp message
app.post('/whatsapp-message', async (req, res) => {
    const { phoneNumber, message } = req.body;

    // Validate input data
    if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Phone number and message are required.' });
    }

    try {
        await sendMessage(phoneNumber, message); // Send the message using sendMessage
        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        res.status(500).json({ error: 'Failed to send the message. Please try again later.' });
    }
});

app.post('/generate-pdf', async (req, res) => {
    const {
        name,
        registrationNo,
        age,
        sex,
        contactNo,
        diabetesType,
        insulin,
        noOfOHA,
        hba1c,
        bcvar,
        bcval,
        iopr,
        iopl,
        drr,
        drl,
        mer,
        mel,
        octr,
        octl,
        treatmentAdvice,
        followUp,
    } = req.body;

    try {
        // Load the PDF template
        const pdfTemplate = await fs.readFile('public/templates/DM screening Form.pdf');
        if (!pdfTemplate) {
            throw new Error('PDF template not found or is empty');
        }
        const pdfDoc = await PDFDocument.load(pdfTemplate);

        // Get the first page of the PDF
        const page = pdfDoc.getPages()[0];
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 10;

        // Fill in the blank fields
        page.drawText(name || '', { x: 120, y: 595, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(registrationNo || '', { x: 450, y: 595, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(`${age || ''}`, { x: 145, y: 570, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(sex || '', { x: 255, y: 570, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(contactNo || '', { x: 400, y: 570, size: fontSize, font, color: rgb(0, 0, 0) });

        page.drawText(" - " + diabetesType || '', { x: 315, y: 545, size: fontSize, font, color: rgb(0, 0, 0) });

        page.drawText(insulin ? 'Yes' : 'No', { x: 190, y: 520, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(`${noOfOHA || ''}`, { x: 410, y: 520, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(`${hba1c || ''}`, { x: 505, y: 520, size: fontSize, font, color: rgb(0, 0, 0) });

        page.drawText(`${bcvar || 'g'}`, { x: 385, y: 415, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(`${bcval || 'g'}`, { x: 285, y: 415, size: fontSize, font, color: rgb(0, 0, 0) });

        page.drawText(`${iopr || 'g'}`, { x: 385, y: 385, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(`${iopl || 'g'}`, { x: 285, y: 385, size: fontSize, font, color: rgb(0, 0, 0) });

        page.drawText(`${drr || 'g'}`, { x: 250, y: 268, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(`${drl || 'g'}`, { x: 250, y: 240, size: fontSize, font, color: rgb(0, 0, 0) });

        page.drawText(`${mer || 'g'}`, { x: 385, y: 268, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(`${mel || 'g'}`, { x: 385, y: 240, size: fontSize, font, color: rgb(0, 0, 0) });

        page.drawText(`${octr || 'g'}`, { x: 495, y: 268, size: fontSize, font, color: rgb(0, 0, 0) });
        page.drawText(`${octl || 'g'}`, { x: 495, y: 240, size: fontSize, font, color: rgb(0, 0, 0) });

        page.drawText(treatmentAdvice || '', { x: 235, y: 180, size: fontSize, font, color: rgb(0, 0, 0), lineHeight: 14 });
        page.drawText(followUp || '', { x: 55, y: 95, size: fontSize, font, color: rgb(0, 0, 0), lineHeight: 14 });

        // Save the updated PDF
        const pdfBytes = await pdfDoc.save();

        // Save the PDF to a file
        const pdfPath = path.join(__dirname, 'DM-Screening-Form.pdf');
        await fs.writeFile(pdfPath, pdfBytes);

        // Send the PDF via WhatsApp
        await sendMessage("91" + contactNo, name + "'s DM Screening Report", pdfPath);

        // Respond to the client
        res.status(200).send('PDF generated and sent via WhatsApp');
    } catch (error) {
        console.error('Error generating or sending PDF:', error);
        res.status(500).send('An error occurred while generating or sending the PDF.');
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


