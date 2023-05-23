var express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const JWT_SECRET = process.env.JWT_SECRET;

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.json({ error: false });
});

router.post("/login", function (req, res, next) {
  // 1. Retrieve email and password from req.body
  // Retrieve email and password from req.body
  const email = req.body.email;
  const password = req.body.password;

  // Verify body
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed",
    });
    return;
  }
  // 2. Determine if user already exists in table
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("email", "=", email);
  queryUsers
    .then((users) => {
      if (users.length === 0) {
        throw new Error("User does not exist");
      }
      // 2.1 If user does exist, verify if passwords match
      const user = users[0];
      return bcrypt.compare(password, user.hash);
    })
    // 2.1.2 If passwords do not match, return error response
    .then((match) => {
      if (!match) {
        throw new Error("Passwords do not match");
      }
      // Create and return JWT token
      const expires_in = 60 * 60 * 24; // 24 hours
      const exp = Math.floor(Date.now() / 1000 + expires_in);
      const token = jwt.sign({ email, exp }, process.env.JWT_SECRET);
      res.status(200).json({
        token,
        tokenType: "Bearer",
        expires_in,
      });
    });
});
// 2.1.1 If passwords match, return JWT

// 2.2 If user does not exist, return error response

router.post("/register", function (req, res, next) {
  // Retrieve email and password from req.body
  const email = req.body.email;
  const password = req.body.password;

  // Verify body
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed",
    });
    return;
  }

  // Determine if user already exists in table
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("email", "=", email);
  queryUsers
    .then((users) => {
      if (users.length > 0) {
        throw new Error("User already exists");
      }

      // Insert user into DB
      const saltRounds = 10;
      const hash = bcrypt.hashSync(password, saltRounds);
      return req.db.from("users").insert({ email, hash });
    })
    .then(() => {
      res.status(201).json({ success: true, message: "User created" });
    })
    .catch((e) => {
      res.status(500).json({ success: false, message: e.message });
    });
});
module.exports = router;
