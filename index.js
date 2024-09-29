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



// GET
app.get('/', async (req, res) => {
    try {
        name = await db.query("select * from patients");
    } catch (e) {
        console.log(e);
    }
    // console.log(name.rows);
    res.render("index.ejs", { name: name.rows });
})

app.get('/patientDet/:id', (req, res) => {
    // console.log(req.params.id)
    const patedet = name.rows.find(x => x.id == req.params.id)
    res.render("patientDet.ejs", { det: patedet });
})

app.get("/addPat", (req, res) => {
    res.render('addPat.ejs');
});



// POST
app.post("/addPat", (req, res) => {
    const nam = req.body.name;
    try {
        db.query("insert into patients(name) values($1)", [nam]);
    } catch (e) {
        console.log(e);
    }
    res.redirect("/")
});

app.post("/deletePat/:id", (req, res) => {
    const delId = (req.params.id);
    try {
        db.query('delete from patients where id = ($1)', [delId]);
        console.log("Row with ID "+delId+" deleted successfully");
    } catch (e) {
        console.log(e)
    }
    res.redirect("/");
})


app.listen(port, () => {
    console.log(`Your server has been started on port ${port}`);
})