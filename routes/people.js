var express = require("express");
var router = express.Router();

const authorization = require("../middleware/authorization");

//   TODO Add error handling for invalid parameters
router.get("/:id", authorization, function (req, res) {
  const id = req.params.id;

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

  Promise.all([personQuery, rolesQuery]).then(([personRows, roleRows]) => {
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
        characters: row.characters.split(",") == "" ? [] : JSON.parse(row.characters),
        imdbRating: row.imdbRating,
      }));

      res
        .status(200)
        .json({
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
//   if (rows.length === 0) {
//     res.status(404).json({
//       error: true,
//       message: "No record exists of a movie with this ID",
//     });
//     return;
//   }
//   let person = rows[0];
//   let movieIds = person.knownForTitles.split(",");
//   principalsQuery.where("principals.nconst", "=", movieIds).then((rows) => {
//     let roles = rows.map((row) => {
//       return {
//         movieQuery: movieQuery,
//         category: row.category,
//         characters: row.characters == "" ? [] : JSON.parse(row.characters),
//       };
//     });
//     ratingsQuery.where("ratings.tconst", "=", imdbID).then((rows) => {
//       let ratings = rows.map((row) => {
//         return {
//           source: row.source,
//           value: parseFloat(row.value),
//         };
//       });

//       res.json({
//         name: person.name,
//         birthYear: person.birthYear,
//         deathYear: person.deathYear,
//         roles: roles,
//         genres: movie.genres.split(","),
//         country: movie.country,
//         ratings: ratings,
//         boxoffice: movie.boxoffice,
//         poster: movie.poster,
//         plot: movie.plot,
//       });
//     });
//   });
// })
//   // // .catch((err) => {
//   // //   console.log(err);
//   // //   res.json({ error: true, message: "Error in MySQL query" });
//   // });
// });

// router.post("/api/update", authorization, (req, res) => {
//   if (!req.body.City || !req.body.CountryCode || !req.body.Pop) {
//     res.status(400).json({ message: "Error updating population" });
//     console.log("Error on request body", JSON.stringify(req.body));
//   } else {
//     const filter = {
//       Name: req.body.City,
//       CountryCode: req.body.CountryCode,
//     };

//     const pop = {
//       Population: req.body.Pop,
//     };

//     req
//       .db("City")
//       .where(filter)
//       .update(pop)
//       .then(() => {
//         res.status(201).json({
//           message: `Successful update ${req.body.City}`,
//         });
//         console.log("successful population update: ", JSON.stringify(filter));
//       })
//       .catch((error) => {
//         res.status(500).json({ message: "Database error - not updated" });
//       });
//   }
// });
      })
module.exports = router;
