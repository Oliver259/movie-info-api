// Import necessary modules
var express = require("express");
const authorization = require("../middleware/authorization");
var router = express.Router();

// Get data about a person from their imdbID
router.get("/:id", authorization(false), function (req, res) {
  const id = req.params.id;

  // Check for invalid query parameters
  if (Object.keys(req.query).length !== 0) {
    res
      .status(400)
      .json({ error: true, message: "Query parameters are not permitted." });
    return;
  }

  // Query the database to fetch person details
  let personQuery = req.db
    .from("names")
    .select("names.primaryName as name", "names.birthYear", "names.deathYear")
    .where("nconst", "=", id);

  // Query the database to fetch the person's roles in movies give their id
  let rolesQuery = req.db
    .from("principals")
    .join("basics", "principals.tconst", "basics.tconst")
    .select(
      "basics.tconst as movieId",
      "basics.primaryTitle as movieName",
      "basics.imdbRating",
      "principals.category",
      "principals.characters"
    )
    .where("principals.nconst", "=", id);

  // Query the person's data and roles at the same time to improve speed
  Promise.all([personQuery, rolesQuery])
    .then(([personRows, roleRows]) => {
      if (personRows.length === 0) {
        res.status(404).json({
          error: true,
          message: "No record exists of a person with this ID",
        });
        return;
      }

      const roles = roleRows.map((row) => ({
        movieName: row.movieName,
        movieId: row.movieId,
        category: row.category,
        characters:
          row.characters.split(",") == "" ? [] : JSON.parse(row.characters),
        imdbRating: parseFloat(row.imdbRating),
      }));

      res.status(200).json({
        name: personRows[0].name,
        birthYear: personRows[0].birthYear,
        deathYear: personRows[0].deathYear,
        roles: roles,
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({ error: true, message: "Error in MySQL query" });
    });
});
module.exports = router;
