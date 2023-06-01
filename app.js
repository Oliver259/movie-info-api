// Import necessary modules
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const cors = require("cors");

// Setup knex
const options = require("./knexfile.js");
const knex = require("knex")(options);

// Setip swagger docs
const swaggerUI = require("swagger-ui-express");
const swaggerDoc = require("./docs/swagger.json");

const swaggerOptions = {
  customCss: ".swagger-ui .models { display: none }",
  customOptions: {
    defaultModelsExpandDepth: -1, // Hide the schemas showing at the bottom of UI
  },
};

require("dotenv").config();

// Create Routers
var usersRouter = require("./routes/users");
var moviesRouter = require("./routes/movies");
var peopleRouter = require("./routes/people");

var app = express();

app.use((req, res, next) => {
  req.db = knex;
  next();
});

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Use Routes
app.use("/movies", moviesRouter);
app.use("/user", usersRouter);
app.use("/people", peopleRouter);
app.use("/", swaggerUI.serve);
app.get("/", swaggerUI.setup(swaggerDoc, swaggerOptions));

// Catch 404 and display page not found message
app.use(function (req, res, next) {
  res.status(404).json({ error: true, message: "Page not found!" });
});

// Error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
