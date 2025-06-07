//import pg from 'pg';
// // const db = new pg.Client({
// //     user: "postgres",
// //     host: "localhost",
// //     database: "optho",
// //     password: "123456",
// //     port: 5432
// // });

// const connectionString = process.env.DB_URL || 'postgres://postgres:123456@localhost:5432/optho';

// const db = new pg.Pool({
//     connectionString: connectionString,
//     ssl:{rejectUnauthorized: false}
// });

// db.connect();

// export function createLog(visit, reg, dtype, ddur, insulin, oha, HBA1c, treatment, bcvar, bcval, iopr, iopl, ddr, drl ,mer, mel, octr, octl, advice, fllwp){
//     try {
//         db.query("INSERT INTO PatientLog(visit, reg,dtype,ddur,insulin,oha,HBA1c,treatment,bcvar,bcval,iopr,iopl,drr,drl,mer,mel,octr,octl,advice,fllwp,notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)",[visit, reg, dtype, ddur, insulin, oha, HBA1c, treatment, bcvar, bcval, iopr, iopl, ddr, drl ,mer, mel, octr, octl, advice, fllwp, "No notes"])


//     } catch (error) {
//         console.log("createLog function: "+error.message);
//     }
// }

// //loading log
// export async function loadLog(reg) {
//     try {
//         // console.log(reg);
//         const result = await db.query("SELECT * FROM patientLog WHERE reg = $1 ORDER BY created_at DESC", [reg]); // Await the database query
//         return result.rows; // Assuming `rows` contains the query results
//     } catch (error) {
//         console.error("LoadLog Function Error:", error.message);
//         throw error; // Re-throw the error to be handled by the caller
//     }
// }




import pg from 'pg';


// import pg from 'pg';

// Validate environment variables
if (!(process.env.DB_URL || 'postgres://postgres:123456@localhost:5432/optho')) {
    console.error('DB_URL environment variable is required');
    process.exit(1);
}

const sslConfig = process.env.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: true,
        ca: process.env.DB_CA_CERT
    }
    : { rejectUnauthorized: false };

const db = new pg.Pool({
    connectionString: process.env.DB_URL || 'postgres://postgres:123456@localhost:5432/optho',
    ssl: sslConfig,
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Simple error logging
db.on('error', (err) => {
    console.error('Unexpected database error', err);
    process.exit(-1);
});

export async function createLog(visit, reg, dtype, ddur, insulin, oha,HBA1c, treatment, bcvar, bcval, iopr,iopl,drr, drl, mer, mel, octr,
    octl, advice, fllwp, notes) {
    //   const {
    //     visit, reg, dtype, ddur, insulin, oha, 
    //     HBA1c, treatment, bcvar, bcval, iopr, 
    //     iopl, ddr, drl, mer, mel, octr, 
    //     octl, advice, fllwp, notes = "No notes"
    //   } = logData;

    const queryText = `
    INSERT INTO PatientLog(
      visit, reg, dtype, ddur, insulin, oha, 
      HBA1c, treatment, bcvar, bcval, iopr, 
      iopl, drr, drl, mer, mel, octr, 
      octl, advice, fllwp, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
  `;

    const values = [
        visit, reg, dtype, ddur, insulin, oha,
        HBA1c, treatment, bcvar, bcval, iopr,
        iopl, drr, drl, mer, mel, octr,
        octl, advice, fllwp, notes
    ];

    try {
        await db.query(queryText, values);
        console.log(`Created log for patient: ${reg}`);
    } catch (error) {
        console.error('Failed to create patient log', {
            error: error.message,
            patientId: reg
        });
        throw new Error('DATABASE_OPERATION_FAILED');
    }
}

export async function loadLog(reg) {
    const queryText = `
    SELECT * FROM patientLog 
    WHERE reg = $1 
    ORDER BY created_at DESC
  `;

    try {
        const result = await db.query(queryText, [reg]);
        console.log(`Loaded ${result.rowCount} logs for patient: ${reg}`);
        return result.rows;
    } catch (error) {
        console.error('Failed to load patient logs', {
            error: error.message,
            patientId: reg
        });
        throw new Error('DATABASE_OPERATION_FAILED');
    }
}

// Graceful shutdown handler
process.on('SIGTERM', () => db.end().then(() => process.exit(0)));
process.on('SIGINT', () => db.end().then(() => process.exit(0)));