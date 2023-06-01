// Import necessary modules
var express = require("express");
var router = express.Router();

// Add knex pagination
const { attachPaginate } = require("knex-paginate");
attachPaginate();

// Get movies based on the inputted search otherwise get all movies
router.get("/search", function (req, res) {
  const searchTitle = req.query.title;
  const searchYear = req.query.year;
  const page = req.query.page;

  let query = req.db
    .from("basics")
    .select(
      "primaryTitle AS title",
      "year",
      "tconst as imdbID",
      "imdbRating",
      "rottenTomatoesRating",
      "metacriticRating",
      "rated AS classification"
    );

  // If there is a title inputted then search for that movies contiaining the given input
  if (searchTitle) {
    query = query.where("primaryTitle", "like", `%${searchTitle}%`);
  }

  // If a year is inputted then search for movies containing that given year
  if (searchYear) {
    if (!/^\d{4}$/.test(searchYear)) {
      return res
        .status(400)
        .json({
          error: true,
          message: "Invalid year format. Format must be yyyy.",
        });
    }
    query = query.where("year", "=", searchYear);
  }

  // If invalid page format is entered then an error message is returned
  if (page && isNaN(page)) {
    return res.status(400).json({
      error: true,
      message: "Invalid page format. page must be a number.",
    });
  }

  // Query the database
  query
    .paginate({ perPage: 100, currentPage: page, isLengthAware: true })
    .then((result) => {
      const parsedRows = result.data.map((row) => {
        return {
          title: row.title,
          year: row.year,
          imdbID: row.imdbID,
          imdbRating: parseFloat(row.imdbRating),
          rottenTomatoesRating: parseFloat(row.rottenTomatoesRating),
          metacriticRating: parseFloat(row.metacriticRating),
          classification: row.classification,
        };
      });

      // Calculate nextPage value
      const currentPage = parseInt(result.pagination.currentPage);
      const nextPage =
        currentPage < result.pagination.lastPage ? currentPage + 1 : null;

      // Update pagination object with correct nextPage value
      const pagination = {
        ...result.pagination,
        currentPage: currentPage,
        nextPage: nextPage,
      };

      res.json({ data: parsedRows, pagination: pagination });
    })
    .catch((err) => {
      console.log(err);
      res.json({ error: true, message: "Error in MySQL query" });
    });
});

// Get data for an individual movie given a valid imdbID
router.get("/data/:imdbID", function (req, res) {
  const imdbID = req.params.imdbID;

  // Check for invalid query parameters
  if (Object.keys(req.query).length !== 0) {
    res
      .status(400)
      .json({ error: true, message: "Query parameters are not permitted." });
    return;
  }

  // Movie query
  let movieQuery = req.db
    .from("basics")
    .select(
      "basics.primaryTitle AS title",
      "basics.year",
      "basics.runtimeMinutes AS runtime",
      "basics.genres",
      "basics.country",
      "basics.poster",
      "basics.plot",
      "basics.boxoffice"
    );
  // Query the database regarding the people involved in a given movie's imdbID
  let principalsQuery = req.db
    .from("principals")
    .select(
      "principals.nconst",
      "principals.id",
      "principals.category",
      "principals.name",
      "principals.characters"
    );
  // Ratings query
  let ratingsQuery = req.db
    .from("ratings")
    .select("ratings.source", "ratings.value");

  // Run movie query given an imdbID, if no record of a movie with the ID exists then return an error message
  movieQuery
    .where("basics.tconst", "=", imdbID)
    .then((rows) => {
      if (rows.length === 0) {
        res.status(404).json({
          error: true,
          message: "No record exists of a movie with this ID",
        });
        return;
      }
      let movie = rows[0];

      // Run the principals query
      principalsQuery.where("principals.tconst", "=", imdbID).then((rows) => {
        let principals = rows.map((row) => {
          return {
            id: row.nconst,
            category: row.category,
            name: row.name,
            characters: row.characters == "" ? [] : JSON.parse(row.characters),
          };
        });

        // Run the ratings query
        ratingsQuery.where("ratings.tconst", "=", imdbID).then((rows) => {
          let ratings = rows.map((row) => {
            return {
              source: row.source,
              value: parseFloat(row.value),
            };
          });

          // Retyrb the movie data
          res.json({
            title: movie.title,
            year: movie.year,
            runtime: movie.runtime,
            genres: movie.genres.split(","),
            country: movie.country,
            principals: principals,
            ratings: ratings,
            boxoffice: movie.boxoffice,
            poster: movie.poster,
            plot: movie.plot,
          });
        });
      });
    })
    // Return unknown errors
    .catch((err) => {
      console.log(err);
      res.json({ error: true, message: "Error in MySQL query" });
    });
});

module.exports = router;
