var express = require("express");
var router = express.Router();

const authorization = require("../middleware/authorization");

router.get("/search", function (req, res) {
  const searchTerm = req.query.title;
  req.db
    .from("basics")
    .select(
      "primaryTitle",
      "year",
      "tconst",
      "imdbRating",
      "rottentomatoesRating",
      "metacriticRating",
      "rated"
    )
    .where("primaryTitle", "like", `%${searchTerm}%`)
    .then((rows) => {
      res.json({ error: false, message: "success", basics: rows });
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

router.get("/api/city/:CountryCode", function (req, res) {
  req.db
    .from("City")
    .select("*")
    .where("CountryCode", "=", req.params.CountryCode)
    .then((rows) => {
      res.json({ error: false, message: "Success", city: rows });
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
