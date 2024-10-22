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

    res.render("patientDet.ejs", { det: patdet });
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
    res.render('addPat.ejs', {reg});
});



// POST
app.post("/addPat", (req, res) => {
    const det = req.body;
    console.log(det);
    try {
        db.query("insert into details(name,registration_number,age,contact_number,diabetes_type,insulin,OHA_count,HBA1c,BCVA_right,BCVA_left, IOP_right,IOP_left, DR_right, macular_edema_right, oct_right, DR_left, macular_edema_left, oct_left, advice_right,advice_left, follow_up,sex) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)", [det.name, det.registration_no, det.age_gender, det.contact, det.type, det.insulin, det.oha_count, det.HBA1c, det.bcva_right, det.bcva_left, det.iop_right, det.iop_left, det.dr_right, det.macular_edema_right, det.oct_finding_right, det.dr_left, det.macular_edema_left, det.oct_finding_left, det.right_eye_advice, det.left_eye_advice, det.follow_up, det.sex]);
    } catch (e) {
        console.log(e);
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
    res.render("updPat.ejs", {det: updPat });
})


app.listen(port, () => {
    console.log(`Server deployed on http://localhost:${port}`);
})


