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
router.get('/data/Dates2', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Dates2');
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
    const result = await pool.request().query('SELECT * FROM Dates2');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});


/* router.get('/data/tableau/:selectedDate/:selectedCapteurId', async (req, res) => {
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
          [Dijon_mob].[dbo].[Dates2] D ON M.id_date = D.id_date
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
*/
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
            [Dijon_mob].[dbo].[Dates2] D ON M.id_date = D.id_date
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
    const selectedDates2 = req.query.Dates2;
    const pool = await poolPromise;
    const selectedDates2Array = Array.isArray(selectedDates2) ? selectedDates2 : [selectedDates2];

    // If there's only one selectedCapteurId, use it directly in the query
    const singleSelectedCapteurId = selectedCapteurIdsArray.length === 1 ? selectedCapteurIdsArray[0] : null;

    // Adjust the query based on the presence of a singleSelectedCapteurId
    const query = `
      SELECT
        D.FullDate AS Date,
        D.Day,
        D.Hour,
        D.Minute,
        D.Year,
        D.Month,
        M.valeur
      FROM
        [Dijon_mob_last].[dbo].[Dates2] D
      INNER JOIN
        [Dijon_mob_last].[dbo].[mesure] M ON D.ID = M.ID
      WHERE
        (@selectedCapteurId IS NULL OR M.ID = @selectedCapteurId)
        AND CONVERT(DATE, D.FullDate) IN (${selectedDates2Array.map((date, index) => `@date${index}`).join(',')})
      ORDER BY
        D.Hour,
        D.Minute;
    `;

    // If singleSelectedCapteurId is not null, append the capteurId to the query
    const adjustedQuery = singleSelectedCapteurId
      ? query.replace('@selectedCapteurId', singleSelectedCapteurId.toString())
      : query.replace('M.ID = @selectedCapteurId', '1=1');

    // If multiple sensors and Dates2 are selected, call the same query multiple times and concatenate the results
    const resultsPromises = selectedCapteurIdsArray.map(async (selectedCapteurId) => {
      const inputParameters = pool.request();

      // Add parameters for each date
      selectedDates2Array.forEach((date, index) => {
        inputParameters.input(`date${index}`, sql.Date, date);
      });

      const adjustedQuery = query.replace('@selectedCapteurId', selectedCapteurId.toString());

      const dashboardResult = await inputParameters
        .input('selectedCapteurId', sql.Int, selectedCapteurId)
        .query(adjustedQuery);

      return dashboardResult.recordset;
    });

    // Wait for all promises to resolve and concatenate the results
    const allResults = await Promise.all(resultsPromises);

    // Concatenate the recordsets from each query into a single array
    const concatenatedResults = allResults.flat();

    res.json(concatenatedResults);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving data for dashboard');
  }
});







module.exports = router;
