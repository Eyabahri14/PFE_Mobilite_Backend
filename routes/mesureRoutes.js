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


router.get('/data/tableau/:selectedCapteurIds', async (req, res) => {
  try {
    const selectedCapteurIdsArray = req.params.selectedCapteurIds.split(',').map(id => parseInt(id.trim(), 10));
    const selectedDates = req.query.Dates2.split('&').map(date => date.trim());

    const pool = await poolPromise;

    const query = `
      SELECT
        C.Capteur,
        M.valeur,
        D.FullDate AS Date,
        D.Hour,
        D.Minute,
        C.Station_point_de_depart,
        C.Station_Direction
      FROM
        [2018DIJON].[dbo].[Capteur] C
      INNER JOIN
        [2018DIJON].[dbo].[mesure] M ON C.id_capteur = M.id_capteur
      INNER JOIN
        [2018DIJON].[dbo].[Dates2018] D ON M.id_date = D.id_date
      WHERE
        M.id_capteur IN (${selectedCapteurIdsArray.join(',')})
        AND CONVERT(DATE, D.FullDate) IN (${selectedDates.map(date => `'${date}'`).join(',')})
      ORDER BY
        D.FullDate, D.Hour, D.Minute;
    `;

    const result = await pool.request().query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving data for tableau');
  }
});


router.get('/data/weeklyData/:selectedCapteurIds', async (req, res) => {
  try {
    let { selectedCapteurIds } = req.params;
    const selectedCapteurIdsArray = selectedCapteurIds.split(',').map(id => parseInt(id.trim(), 10));
    
    // Vous pouvez recevoir une seule semaine ou plusieurs sous forme de chaîne séparée par des virgules
    const selectedWeeks = req.query.weeks;
    const selectedWeeksArray = selectedWeeks.split(',').map(week => parseInt(week.trim(), 10));

    const pool = await poolPromise;

    const query = `
      SELECT
        M.id_capteur,
        D.WeekNumber,
        DATENAME(WEEKDAY, D.id_date) AS DayOfWeek,
        SUM(M.valeur) as TotalValeur  
      FROM
        [2018DIJON].[dbo].[Dates2018] D
      INNER JOIN
        [2018DIJON].[dbo].[mesure] M ON D.id_date = M.id_date
      WHERE
        M.id_capteur IN (${selectedCapteurIdsArray.join(',')})
        AND D.WeekNumber IN (${selectedWeeksArray.join(',')})
      GROUP BY
        M.id_capteur, D.WeekNumber, DATENAME(WEEKDAY, D.id_date)
      ORDER BY
        M.id_capteur, D.WeekNumber,
        CASE 
          WHEN DATENAME(WEEKDAY, D.id_date) = 'Monday' THEN 1
          WHEN DATENAME(WEEKDAY, D.id_date) = 'Tuesday' THEN 2
          WHEN DATENAME(WEEKDAY, D.id_date) = 'Wednesday' THEN 3
          WHEN DATENAME(WEEKDAY, D.id_date) = 'Thursday' THEN 4
          WHEN DATENAME(WEEKDAY, D.id_date) = 'Friday' THEN 5
          WHEN DATENAME(WEEKDAY, D.id_date) = 'Saturday' THEN 6
          WHEN DATENAME(WEEKDAY, D.id_date) = 'Sunday' THEN 7
        END;
    `;

    const result = await pool.request().query(query);

    // Organize the result into an array
    const organizedResult = result.recordset.map(item => ({
      id_capteur: item.id_capteur,
      weekNumber: item.WeekNumber,
      dayOfWeek: item.DayOfWeek,
      totalValues: item.TotalValeur,
    }));

    res.json(organizedResult);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving weekly data');
  }
});


router.get('/data/tableauWeekly/:selectedCapteurIds', async (req, res) => {
  try {
    let { selectedCapteurIds } = req.params;
    const selectedCapteurIdsArray = selectedCapteurIds.split(',').map(id => parseInt(id.trim(), 10));
    const selectedWeeks = req.query.weeks;
    const selectedWeeksArray = selectedWeeks.split(',').map(week => parseInt(week.trim(), 10));

    const pool = await poolPromise;

    const query = `
      SELECT
        C.id_capteur AS Capteur,
        SUM(M.valeur) AS SumValeur,
        D.WeekNumber,
        C.Station_point_de_depart,
        C.Station_Direction
      FROM
        [2018DIJON].[dbo].[Capteur] C
      INNER JOIN
        [2018DIJON].[dbo].[mesure] M ON C.id_capteur = M.id_capteur
      INNER JOIN
        [2018DIJON].[dbo].[Dates2018] D ON M.id_date = D.id_date
      WHERE
        C.id_capteur IN (${selectedCapteurIdsArray.join(',')})
        AND D.WeekNumber IN (${selectedWeeksArray.join(',')})
      GROUP BY
        C.id_capteur, D.WeekNumber, C.Station_point_de_depart, C.Station_Direction
      ORDER BY
        C.id_capteur, D.WeekNumber;
    `;

    const result = await pool.request().query(query);

    const organizedResult = result.recordset.map(item => ({
      capteur: item.Capteur,
      sumValeur: item.SumValeur,
      weekNumber: item.WeekNumber,
      stationPointDeDepart: item.Station_point_de_depart,
      stationDirection: item.Station_Direction
    }));

    res.json(organizedResult);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving weekly data for tableau');
  }
});


module.exports = router;
