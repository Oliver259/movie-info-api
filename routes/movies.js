var express = require("express");
var router = express.Router();

const authorization = require("../middleware/authorization");

//   TODO Add error handling for invalid parameters
router.get("/search", function (req, res) {
  const searchTitle = req.query.title;
  const searchYear = req.query.year;
  //   TODO Add page search somehow using knex paginate
  const searchPage = req.query.page;

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

  if (searchTitle) {
    query = query.where("primaryTitle", "like", `%${searchTitle}%`);
  }

  if (searchYear) {
    query = query.where("year", "=", searchYear);
  }

  query
    .limit(100) // Limit the results to 100 max
    .then((rows) => {
      const parsedRows = rows.map((row) => {
        return {
          title: row.title,
          year: row.year,
          imdbID: row.imdbID,
          imdbRating: parseFloat(row.imdbRating),
          rottenTomatoesRating: parseFloat(row.rottenTomatoesRating),
          metacriticRating: parseFloat(row.metacriticRating),
          classification: row.classification
        }
      })
      res.json({ data: parsedRows });
    })
    .catch((err) => {
      console.log(err);
      res.json({ error: true, message: "Error in MySQL query" });
    });
});
/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

router.get("/knex", function (req, res) {
  req.db
    .raw("SELECT VERSION()")
    .then((version) => console.log(version[0]))
    .catch((err) => console.log(err));

  res.json({ message: "Version Logged successfully" });
});

// TODO Change format of movie data route
router.get("/data/:imdbID", function (req, res) {
  const imdbID = req.params.imdbID;
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
  let principalsQuery = req.db
    .from("principals")
    .select(
      "principals.nconst",
      "principals.id",
      "principals.category",
      "principals.name",
      "principals.characters"
    );
  let ratingsQuery = req.db
    .from("ratings")
    .select("ratings.source", "ratings.value");

  movieQuery
    .where("basics.tconst", "=", imdbID)
    .then((rows) => {
      let movie = rows[0];
      principalsQuery.where("principals.tconst", "=", imdbID).then((rows) => {
        let principals = rows.map((row) => {
          return {
            id: row.nconst,
            category: row.category,
            name: row.name,
            characters: row.characters == "" ? [] : JSON.parse(row.characters),
          };
        });
        ratingsQuery.where("ratings.tconst", "=", imdbID).then((rows) => {
          let ratings = rows.map((row) => {;
            return {
              source: row.source,
              value: parseFloat(row.value),
            };
          });

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
    .catch((err) => {
      console.log(err);
      res.json({ error: true, message: "Error in MySQL query" });
    });
});

router.post("/api/update", authorization, (req, res) => {
  if (!req.body.City || !req.body.CountryCode || !req.body.Pop) {
    res.status(400).json({ message: "Error updating population" });
    console.log("Error on request body", JSON.stringify(req.body));
  } else {
    const filter = {
      Name: req.body.City,
      CountryCode: req.body.CountryCode,
    };

    const pop = {
      Population: req.body.Pop,
    };

    req
      .db("City")
      .where(filter)
      .update(pop)
      .then(() => {
        res.status(201).json({
          message: `Successful update ${req.body.City}`,
        });
        console.log("successful population update: ", JSON.stringify(filter));
      })
      .catch((error) => {
        res.status(500).json({ message: "Database error - not updated" });
      });
  }
});

module.exports = router;
