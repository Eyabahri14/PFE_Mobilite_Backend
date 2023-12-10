const sql = require('mssql');

const config = {
    server: 'EYABAHRI\\SQLEXPRESS',
    driver: 'ODBC Driver 17 for SQL Server',
    user: 'eyabh',
    password: '191JFT4899',
    options: {
        trustedConnection: false, // Utilisation de la connexion via nom d'utilisateur et mot de passe
        encrypt: false, // Désactiver le chiffrement si non requis
        trustServerCertificate: false, // Ne pas faire confiance au certificat du serveur
        enableArithAbort: true, // Activer l'option arithabort

        // Si vous avez une base de données spécifique à sélectionner, ajoutez la propriété suivante :
        database: 'PfeDb'
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
