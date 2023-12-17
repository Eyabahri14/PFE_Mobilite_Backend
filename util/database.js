require('dotenv').config();
const sql = require('mssql');

const encrypt = process.env.DB_ENCRYPT === 'true'; 
const certificate = process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'; 

const config = {
  server: 'EYABAHRI\\SQLEXPRESS',
  user: 'eyabh',
  password:'191JFT4899',
  options: {
    trustedConnection: false,
    encrypt: encrypt,
    trustServerCertificate: certificate,
    enableArithAbort: true,
    database: 'Dijon_mob_last'
  }
};

console.log('Server:', process.env.DB_SERVER);

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to database');
    return pool;
  })
  .catch(err => console.log('Database Connection Failed! Bad Config: ', err));

module.exports = {
  sql,
  poolPromise
};
