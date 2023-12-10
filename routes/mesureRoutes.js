const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../util/database');

// GET all data from Db Mesure
router.get('/data/mesure', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Mesure');
    res.json(result.recordset);
    console.log(result)
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// GET all data from Db Capteur
router.get('/data/dates', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Dates');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// GET all data from Db Capteur
router.get('/data/capteur', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Capteur');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// GET all data from Db Capteur
router.get('/data/Dates', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Dates');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});


router.get('/data/tableau/:selectedDate/:selectedCapteurId', async (req, res) => {
  try {
    const { selectedDate, selectedCapteurId } = req.params; // Assurez-vous de récupérer ces valeurs de votre requête

    const pool = await poolPromise;

    // Requête pour le tableau
    const tableauResult = await pool
      .request()
      .input('selectedDate', selectedDate)
      .input('selectedCapteurId', selectedCapteurId)
      .query(`
        SELECT
          C.Capteur,
          M.valeur,
          D.FullDate AS Date,
          D.Hour,
          D.Minute,
          C.Station_point_de_depart,
          C.Station_Direction
        FROM
          [Dijon_mob].[dbo].[Mesure] M
        INNER JOIN
          [Dijon_mob].[dbo].[Dates] D ON M.id_date = D.id_date
        INNER JOIN
          [Dijon_mob].[dbo].[Capteur] C ON M.id_capteur = C.id_capteur
        WHERE
        CONVERT(DATE, D.FullDate) = @selectedDate AND M.id_capteur = @selectedCapteurId
      `);

    res.json(tableauResult.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving data for tableau');
  }
});

// GET data for dashboard
/* router.get('/data/dashboard/:selectedDate/:selectedCapteurId', async (req, res) => {
  try {
    const { selectedDate, selectedCapteurId } = req.params;

    const pool = await poolPromise;

    const dashboardResult = await pool
      .request()
      .input('selectedDate', selectedDate)
      .input('selectedCapteurId', selectedCapteurId)
      .query(`
            SELECT
            D.FullDate AS Date,
            D.Hour,
            D.Minute,
            D.Year,
            D.Month,
            M.valeur
          FROM
            [Dijon_mob].[dbo].[Mesure] M
          INNER JOIN
            [Dijon_mob].[dbo].[Dates] D ON M.id_date = D.id_date
          WHERE
            CONVERT(DATE, D.FullDate) = @selectedDate AND M.id_capteur = @selectedCapteurId
          ORDER BY
            D.Hour,
            D.Minute;
      `);

    res.json(dashboardResult.recordsets);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving data for dashboard');
  }
});

*/
router.get('/data/dashboard/:selectedCapteurIds', async (req, res) => {
  try {
    let { selectedCapteurIds } = req.params;
    const selectedCapteurIdsArray = selectedCapteurIds.split(',').map(id => parseInt(id.trim(), 10));
    const selectedDates = req.query.dates;
    const pool = await poolPromise;
    const selectedDatesArray = Array.isArray(selectedDates) ? selectedDates : [selectedDates];

    // If there's only one selectedCapteurId, use it directly in the query
    const singleSelectedCapteurId = selectedCapteurIdsArray.length === 1 ? selectedCapteurIdsArray[0] : null;

    // Adjust the query based on the presence of a singleSelectedCapteurId
    const query = `
      SELECT
        D.FullDate AS Date,
        D.Hour,
        D.Minute,
        D.Year,
        D.Month,
        M.valeur
      FROM
        [Dijon_mob].[dbo].[Mesure] M
      INNER JOIN
        [Dijon_mob].[dbo].[Dates] D ON M.id_date = D.id_date
      WHERE
        (@selectedCapteurId IS NULL OR M.id_capteur = @selectedCapteurId)
        AND CONVERT(DATE, D.FullDate) = @selectedDate
      ORDER BY
        D.Hour,
        D.Minute;
    `;

    // If singleSelectedCapteurId is not null, append the capteurId to the query
    const adjustedQuery = singleSelectedCapteurId
      ? query.replace('@selectedCapteurId', singleSelectedCapteurId.toString())
      : query.replace('M.id_capteur = @selectedCapteurId', '1=1');

    // If multiple sensors and dates are selected, call the same query multiple times and concatenate the results
    const resultsPromises = selectedCapteurIdsArray.map(async (selectedCapteurId) => {
      const dashboardResult = await pool
        .request()
        .input('selectedCapteurId', selectedCapteurId)
        .input('selectedDate', selectedDatesArray[0])  // Assuming the date is the same for all selectedCapteurIds
        .query(adjustedQuery);

      return dashboardResult.recordsets;
    });

    // Wait for all promises to resolve and concatenate the results
    const allResults = await Promise.all(resultsPromises);

    // Concatenate the recordsets from each query into a single array
    const concatenatedResults = allResults.reduce((accumulator, result) => accumulator.concat(result), []);

    res.json(concatenatedResults);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving data for dashboard');
  }
});




module.exports = router;

