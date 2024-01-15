const sql = require('mssql');

const config = {
    server: 'EYABAHRI\\SQLEXPRESS',
    driver: 'ODBC Driver 17 for SQL Server',
    user: 'eyabh',
    password: '191JFT4899',
    options: {
        trustedConnection: false, 
        encrypt: false, 
        trustServerCertificate: false, 
        enableArithAbort: true, 
        database: '2018DIJON'
    }
};

sql.connect(config, function (err) {
    if (err) {
        console.log(err);
    } else {
        const request = new sql.Request();
        request.query('SELECT * FROM Dates', function (err, recordSet) {
            if (err) {
                console.log(err);
            } else {
                console.log(recordSet);
            }
            sql.close();
        });
    }
});
