var express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// TODO: Add refresh tokens
/* GET users listing. */
router.get("/", function (req, res, next) {
  res.json({ error: false });
});

router.post("/login", function (req, res, next) {
  // Retrieve email and password from req.body
  const email = req.body.email;
  const password = req.body.password;
  const bearerExpiresIn = req.body.bearerExpiresInSeconds;
  const refreshExpiresIn = req.body.refreshExpiresInSeconds;

  // Verify body
  if (!email || !password || !bearerExpiresIn || !refreshExpiresIn) {
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
      if (users.length === 0) {
        throw new Error("User does not exist");
      }
      // If user does exist, verify if passwords match
      const user = users[0];
      return bcrypt.compare(password, user.hash);
    })
    // If passwords do not match, return error response
    .then((match) => {
      if (!match) {
        throw new Error("Incorrect email or password");
      }
      // Create bearer and refresh tokens
      const bearerExp = Math.floor(Date.now() / 1000 + bearerExpiresIn);
      const refreshExp = Math.floor(Date.now() / 1000 + refreshExpiresIn);
      const bearerToken = jwt.sign({ email, exp: bearerExp }, JWT_SECRET);
      const refreshToken = jwt.sign(
        { email, exp: refreshExp },
        JWT_REFRESH_SECRET
      );
      res.status(200).json({
        bearerToken: {
          token: bearerToken,
          token_type: "Bearer",
          expires_in: 600,
        },
        refreshToken: {
          token: refreshToken,
          token_type: "Refresh",
          expires_in: 86400,
        },
      });
      // Store refresh token into database
      return queryUsers.update({ refresh_token: refreshToken });
    })
    .catch((error) => {
      res.status(500).json({ error: true, message: error.message });
      return;
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
      res.status(201).json({ error: false, message: "User created" });
    })
    .catch((e) => {
      res.status(500).json({ error: true, message: e.message });
    });
});

router.post("/logout", function (req, res, next) {
  // Retrieve the refresh token from the req.body
  const refreshToken = req.body.refreshToken;

  // Verify if a refresh token is provided
  if (!refreshToken) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, refresh token required",
    });
    return;
  }

  // Delete the refresh token from the database
  req.db
    .from("users")
    .where("refresh_token", refreshToken)
    .update({ refresh_token: "" }) // Set the refresh token to an empty string
    .then((numUpdated) => {
      if (numUpdated === 0) {
        res.json({ error: true, message: "JWT token has expired" });
      } else {
        res.status(200).json({
          error: false,
          message: "Token successfully invalidated",
        });
      }
    })
    .catch((e) => {
      res.status(500).json({ error: true, message: e.message });
    });
});


module.exports = router;
