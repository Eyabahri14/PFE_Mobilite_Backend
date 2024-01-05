const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../util/database');

router.get('/data/mesure', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM mesure');
    res.json(result.recordset);
    console.log(result)
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});



router.get('/data/capteur', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Capteur');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

router.get('/data/Dates', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Dates2018');
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

    const singleSelectedCapteurId = selectedCapteurIdsArray.length === 1 ? selectedCapteurIdsArray[0] : null;

    // Adjust the query based on the new database and table names
    const query = `
      SELECT
        D.FullDate AS Date,
        D.Year, 
        D.Month,
        D.Day,
        D.Hour,
        D.Minute,
        M.valeur
      FROM
        [2018DIJON].[dbo].[Dates2018] D
      INNER JOIN
        [2018DIJON].[dbo].[mesure] M ON D.id_date = M.id_date
      WHERE
        (@selectedCapteurId IS NULL OR M.id_capteur = @selectedCapteurId)
        AND CONVERT(DATE, D.FullDate) IN (${selectedDates2Array.map((date, index) => `@date${index}`).join(',')})
      ORDER BY
        D.Hour,
        D.Minute;
    `;

    // Adjusted query for single or multiple capteurs
    const adjustedQuery = singleSelectedCapteurId
      ? query.replace('@selectedCapteurId', singleSelectedCapteurId.toString())
      : query.replace('M.id_capteur = @selectedCapteurId', '1=1');

    // Execute the query for each selected capteur and date combination
    const resultsPromises = selectedCapteurIdsArray.map(async (selectedCapteurId) => {
      const inputParameters = pool.request();

      // Add parameters for each date
      selectedDates2Array.forEach((date, index) => {
        inputParameters.input(`date${index}`, sql.Date, date);
      });

      const dashboardResult = await inputParameters
        .input('selectedCapteurId', sql.Int, selectedCapteurId)
        .query(adjustedQuery);

      return dashboardResult.recordset;
    });

    // Combine the results from all promises
    const allResults = await Promise.all(resultsPromises);
    const concatenatedResults = allResults.flat();

    res.json(concatenatedResults);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving data for dashboard');
  }
});


router.get('/data/capteursParDate', async (req, res) => {
  try {
    const dates = req.query.dates;
    if (!dates) {
      return res.status(400).send('No dates provided');
    }

    const dateList = dates.split('&').map(date => date.trim());
    const pool = await poolPromise;

    const query = `
      SELECT
        C.id_capteur,
        C.Capteur,
        C.Capteur_long,
        C.Capteur_lat,
        C.Station_point_de_depart,
        C.Station_Direction,
        M.valeur,
        D.FullDate
      FROM
        [2018DIJON].[dbo].[Capteur] C
      INNER JOIN
        [2018DIJON].[dbo].[mesure] M ON C.id_capteur = M.id_capteur
      INNER JOIN
        [2018DIJON].[dbo].[Dates2018] D ON M.id_date = D.id_date
      WHERE
        CONVERT(DATE, D.FullDate) IN (${dateList.map(date => `'${date}'`).join(", ")})
    `;

    const result = await pool.request().query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving data');
  }
});





module.exports = router;
