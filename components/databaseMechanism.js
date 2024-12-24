import pg from 'pg';

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "optho",
    password: "123456",
    port: 5432
});

db.connect();

export function createLog(reg, dtype, ddur, insulin, oha, HBA1c, treatment, bcvar, bcval, iopr, iopl, ddr, drl ,mer, mel, octr, octl, advice, fllwp){
    try {
        db.query("INSERT INTO PatientLog(reg,dtype,ddur,insulin,oha,HBA1c,treatment,bcvar,bcval,iopr,iopl,drr,drl,mer,mel,octr,octl,advice,fllwp,notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)",[reg, dtype, ddur, insulin, oha, HBA1c, treatment, bcvar, bcval, iopr, iopl, ddr, drl ,mer, mel, octr, octl, advice, fllwp, "No notes"])
        

    } catch (error) {
        console.log("createLog function: "+error.message);
    }
}