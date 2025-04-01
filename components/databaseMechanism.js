import pg from 'pg';

// const db = new pg.Client({
//     user: "postgres",
//     host: "localhost",
//     database: "optho",
//     password: "123456",
//     port: 5432
// });

const connectionString = process.env.DB_URL || 'postgres://postgres:123456@localhost:5432/optho';

const db = new pg.Pool({
    connectionString: connectionString,
    ssl:{rejectUnauthorized: false}
});

db.connect();

export function createLog(visit, reg, dtype, ddur, insulin, oha, HBA1c, treatment, bcvar, bcval, iopr, iopl, ddr, drl ,mer, mel, octr, octl, advice, fllwp){
    try {
        db.query("INSERT INTO PatientLog(visit, reg,dtype,ddur,insulin,oha,HBA1c,treatment,bcvar,bcval,iopr,iopl,drr,drl,mer,mel,octr,octl,advice,fllwp,notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)",[visit, reg, dtype, ddur, insulin, oha, HBA1c, treatment, bcvar, bcval, iopr, iopl, ddr, drl ,mer, mel, octr, octl, advice, fllwp, "No notes"])
        

    } catch (error) {
        console.log("createLog function: "+error.message);
    }
}

//loading log
export async function loadLog(reg) {
    try {
        // console.log(reg);
        const result = await db.query("SELECT * FROM patientLog WHERE reg = $1 ORDER BY created_at DESC", [reg]); // Await the database query
        return result.rows; // Assuming `rows` contains the query results
    } catch (error) {
        console.error("LoadLog Function Error:", error.message);
        throw error; // Re-throw the error to be handled by the caller
    }
}
