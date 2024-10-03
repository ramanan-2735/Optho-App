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
    // console.log(name.rows);
    res.render("index.ejs", { name: name.rows });
})

app.get('/patientDet/:id', (req, res) => {
    // console.log(name)
    const patdet = name.rows.find(x => x.id == req.params.id)

    res.render("patientDet.ejs", { det: patdet });
})

app.get("/addPat", (req, res) => {
    res.render('addPat.ejs');
});



// POST
app.post("/addPat", (req, res) => {
    const det = req.body;
    console.log(det);
    try {
        db.query("insert into details(name,registration_number,age_sex,contact_number,diabetes_type,insulin,OHA_count,HBA1c,BCVA_right,BCVA_left, IOP_right,IOP_left, DR_right, macular_edema_right, oct_right, DR_left, macular_edema_left, oct_left, advice_right,advice_left, follow_up) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)", [det.name, det.registration_no, det.age_gender, det.contact, det.type, det.insulin, det.oha_count, det.HBA1c, det.bcva_right, det.bcva_left, det.iop_right, det.iop_left, det.dr_right, det.macular_edema_right, det.oct_finding_right, det.dr_left, det.macular_edema_left, det.oct_finding_left, det.right_eye_advice, det.left_eye_advice, det.follow_up]);
    } catch (e) {
        console.log(e);
    }
    res.redirect("/")
});

app.post("/deletePat/:id", (req, res) => {
    const delId = (req.params.id);
    try {
        db.query('delete from patients where id = ($1)', [delId]);
        console.log("Row with ID " + delId + " deleted successfully");
    } catch (e) {
        console.log(e)
    }
    res.redirect("/");
})


app.listen(port, () => {
    console.log(`Server deployed on http://localhost:${port}`);
})