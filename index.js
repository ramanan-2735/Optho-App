import express from 'express';
import bodyParser from "body-parser"
import exp from 'constants';
import pg from 'pg';

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "optho",
    password: "123456",
    port: 5432
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public/'));

let name;

function pats() {
    try {
        return db.query("select * from details");
    } catch (e) {
        console.log(e);
    }
}

// GET
app.get('/', async (req, res) => {
    name = await pats();
    res.render("index.ejs", { name: name.rows });
})

app.get('/patientDet/:id', (req, res) => {
    const patRow = name.rows;
    const patdet = patRow.find(x => x.id == req.params.id)

    let str = patdet.treatment;
    str = str.replace(/{/g, '[').replace(/}/g, ']');
    let treatmentArray = JSON.parse(str);


    let btr = patdet.advice;
    btr = btr.replace(/{/g, '[').replace(/}/g, ']');
    btr = btr.replace(/'/g, '"');
    console.log(btr);
    let adviceArray = JSON.parse(btr);

    res.render("patientDet.ejs", { det: patdet, treatmentArray, adviceArray });
})

app.get("/addPat", (req, res) => {
    function generateRegNumber() {
        const date = new Date();
        const year = date.getFullYear().toString(); // Last 2 digits of the year
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month
        const day = String(date.getDate()).padStart(2, '0'); // Day

        // Generate a random 4-digit number
        const randomNum = Math.floor(1000 + Math.random() * 9000);

        // Create the registration number
        const regNumber = `${year}${month}${day}-${randomNum}`;
        return regNumber;
    }

    const reg = generateRegNumber();
    console.log(reg);
    res.render('addPat.ejs', { reg });
});



// POST
app.post("/addPat", (req, res) => {
    const det = req.body;
    console.log(det);
    try {
        db.query("INSERT INTO details(name, reg, age, sex, contact, beneficiary, dtype, ddur, insulin, oha, HBA1c, treatment, bcvar, bcval, iopr, iopl, drr, drl, mer, mel, octr, octl, advice, fllwp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,$23, $24)", [det.name, det.reg, det.age, det.sex, det.contact, det.beneficiary, det.dtype, det.ddur, det.insulin, det.oha, det.HBA1c,
        det.treatment, det.bcvar, det.bcval, det.iopr, det.iopl, det.drr, det.drl, det.mer, det.mel, det.octr, det.octl,
        det.advice, det.fllwp]);
    } catch (e) {
        console.log(e);
        console.log("Kaand");
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
    res.redirect("/");
});

app.post("/updatePat/:id", (req, res) => {
    const updRow = name.rows;
    const updPat = updRow.find(x => x.id == req.params.id);

    const patRow = name.rows;
    const patdet = patRow.find(x => x.id == req.params.id)
    console.log(updPat);
    res.render("updPat.ejs", { det: updPat });
})


app.listen(port, () => {
    console.log(`Server deployed on http://localhost:${port}`);
})


