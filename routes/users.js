var express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authorization = require("../middleware/authorization");
const { DateTime } = require("luxon");
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
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed",
    });
    return;
  }

  // Set the default value for bearerExpiresIn
  const defaultBearerExpiresIn = 600; // (10 Minutes)

  // Set the default value for refreshExpiresIn
  const defaultRefreshExpiresIn = 86400; // (24 hours)

  // Determine if user already exists in table
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("email", "=", email);

  queryUsers
    .then((users) => {
      if (users.length === 0) {
        return;
      }

      // If user does exist, verify if passwords match
      const user = users[0];
      return bcrypt.compare(password, user.hash);
    })
    .then((match) => {
      if (!match) {
        res.status(401).json({
          error: true,
          message: "Incorrect email or password",
        });
        return;
      }
      // Create bearer and refresh tokens
      const bearerExp =
        Math.floor(Date.now() / 1000) +
        (bearerExpiresIn || defaultBearerExpiresIn);
      const refreshExp =
        Math.floor(Date.now() / 1000) +
        (refreshExpiresIn || defaultRefreshExpiresIn);

      const bearerToken = jwt.sign({ email, exp: bearerExp }, JWT_SECRET);
      const refreshToken = jwt.sign(
        { email, exp: refreshExp },
        JWT_REFRESH_SECRET
      );

      const bearerExpirationTime = bearerExpiresIn || defaultBearerExpiresIn;
      const refreshExpirationTime = refreshExpiresIn || defaultRefreshExpiresIn;

      res.status(200).json({
        bearerToken: {
          token: bearerToken,
          token_type: "Bearer",
          expires_in: bearerExpirationTime,
        },
        refreshToken: {
          token: refreshToken,
          token_type: "Refresh",
          expires_in: refreshExpirationTime,
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
      res.status(201).json({ message: "User created" });
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

  // Verify if the refresh token is valid
  const validRefreshToken = jwt.decode(refreshToken);
  if (!validRefreshToken) {
    res.status(401).json({ error: true, message: "Invalid JWT token" });
    return;
  }

  // Verify if the refresh token is expired
  if (validRefreshToken.exp < Date.now() / 1000) {
    res.status(401).json({ error: true, message: "JWT token has expired" });
    return;
  }

  // Delete the refresh token from the database
  req.db
    .from("users")
    .where("refresh_token", refreshToken)
    .update({ refresh_token: "" }) // Set the refresh token to an empty string
    .then((numUpdated) => {
      if (numUpdated === 0) {
        res.status(401).json({ error: true, message: "Invalid JWT token" });
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

// Create a function to check if the user exists
function checkUserExists(req, res, next) {
  const email = req.params.email;

  // Check if the user exists
  req.db
    .from("users")
    .where("email", "=", email)
    .first()
    .then((existingUser) => {
      if (!existingUser) {
        // User not found
        return res.status(404).json({
          error: true,
          message: "User not found",
        });
      }
      next();
    })
    // Catch any errors from checking if the user exists
    .catch((e) => {
      console.log("Error:", e);
      return res.status(500).json({ error: true, message: e.message });
    });
}

// TODO: Add error handling for authorization header is malformed
router.get("/:email/profile", checkUserExists, authorization, function (req, res, next) {
  const email = req.params.email;
  const user = req.user;

  // Check if the user exists
  req.db
    .from("users")
    .where("email", "=", email)
    .first()
    .then((existingUser) => {
      if (!existingUser) {
        // User not found
        return res.status(404).json({
          error: true,
          message: "User not found",
        });
      }

      // Create the basic profile object for if the user isn't authorized and there isn't a bearer token present
      const profile = {
        email: email,
        firstname: existingUser.firstName,
        lastName: existingUser.lastName,
      };

      // Check if the request is authorized and if the token belongs to the user
      const isAuthorized = email === user.email;

      // Add additional fields to be shown if an authorized request was made
      if (isAuthorized) {
        profile.firstName = existingUser.firstName;
        profile.lastName = existingUser.lastName;
        profile.dob = existingUser.dob;
        profile.address = existingUser.address;
      }

      // Return 200 (OK) status code
      return res.status(200).json(profile);
    })
    // Catch any errors from user existing check
    .catch((e) => {
      console.log("Error:", e);
      return res.status(500).json({ error: true, message: e.message });
    });
});

// TODO: Add error handling for Authorzation header is malformed
router.put("/:email/profile", authorization, function (req, res, next) {
  const email = req.params.email;
  const user = req.user;

  // Check if the user exists
  req.db
    .from("users")
    .where("email", "=", email)
    .first()
    .then((existingUser) => {
      if (!existingUser) {
        // User not found
        return res.status(404).json({
          error: true,
          message: "User not found",
        });
      }

      // Check if the user is authorized to update the profile
      if (email !== user.email) {
        return res.status(403).json({ error: true, message: "Forbidden" });
      }

      // Check if the request body contains all required fields
      const { firstName, lastName, dob, address } = req.body;
      if (!firstName || !lastName || !dob || !address) {
        return res.status(400).json({
          error: true,
          message:
            "Request body incomplete: firstName, lastName, dob and address are required.",
        });
      }

      // Check if all fields are strings
      if (
        typeof firstName !== "string" ||
        typeof lastName !== "string" ||
        typeof dob !== "string" ||
        typeof address !== "string"
      ) {
        return res.status(400).json({
          error: true,
          message:
            "Request body invalid: firstName, lastName and address must be strings only.",
        });
      }

      // Check if dob is a valid date in the format YYYY-MM-DD and not in the past
      if (!DateTime.fromISO(dob).isValid) {
        return res.status(400).json({
          error: true,
          message:
            "Invalid input: dob must be a real date in format YYYY-MM-DD.",
        });
      }

      // Check if dob is not in the past
      if (DateTime.fromISO(dob) > DateTime.now()) {
        return res.status(400).json({
          error: true,
          message: "Invalid input: dob must be a date in the past.",
        });
      }

      // Update the user's profile information
      req.db
        .from("users")
        .where("email", "=", email)
        .update({
          firstName: firstName,
          lastName: lastName,
          dob: dob,
          address: address,
        })
        .then(() => {
          return res.status(200).json({
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            dob: dob,
            address: address,
          });
        })
        // Catch any errors when trying to update the user's profile in the database
        .catch((e) => {
          console.log("Error:", e);
          return res.status(500).json({ error: true, message: e.message });
        });
    })
    // Catch any errors from user existing check
    .catch((e) => {
      console.log("Error:", e);
      return res.status(500).json({ error: true, message: e.message });
    });
});

router.post("/refresh", function (req, res, next) {
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

  // Verify the refresh token and generate a new bearer token
  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (error, decoded) => {
    if (error) {
      const errorMessage = error.name === "TokenExpiredError" ? "JWT token has expired" : "Invalid JWT token";
      res.status(401).json({
        error: true,
        message: errorMessage,
      });
      return;
    }

    const email = decoded.email;

    // Generate a new bearer and refresh token
    const bearerExp = Math.floor(Date.now() / 1000 + 600);
    const refreshExp = Math.floor(Date.now() / 1000 + 86400);
    const newBearerToken = jwt.sign({ email, exp: bearerExp }, JWT_SECRET);
    const newRefreshToken = jwt.sign(
      { email, exp: refreshExp },
      JWT_REFRESH_SECRET
    );

    // Update the refresh token in the database
    req.db
      .from("users")
      .where("refresh_token", refreshToken)
      .update({ refresh_token: newRefreshToken })
      .then(() => {
        res.status(200).json({
          bearerToken: {
            token: newBearerToken,
            token_type: "Bearer",
            expires_in: 600,
          },
          refreshToken: {
            token: newRefreshToken,
            token_type: "Refresh",
            expires_in: 86400,
          },
        });
      })
      .catch((error) => {
        res.status(500).json({ error: true, message: error.message });
      });
  });
});

module.exports = router;
