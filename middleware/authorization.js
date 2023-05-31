const jwt = require("jsonwebtoken");
module.exports = function (allowUnauthorized) {
  return function (req, res, next) {
    if (
      !("authorization" in req.headers) ||
      !req.headers.authorization.match(/^Bearer /)
    ) {
      if(allowUnauthorized !== true) {
        res.status(401).json({
          error: true,
          message: "Authorization header ('Bearer token') not found",
        });
        return;
      }
      next();
      return;
    }
    const token = req.headers.authorization.replace(/^Bearer /, "");
    try {
      const verifiedToken = jwt.verify(token, process.env.JWT_SECRET); // Decodes and verifies the token to ensure the authenticity and check the expiration of the token
      req.user = { email: verifiedToken.email }; // Set the user object with the verified email address
      next();
    } catch (e) {
      if (e.name === "TokenExpiredError") {
        res.status(401).json({ error: true, message: "JWT token has expired" });
      } else {
        res.status(401).json({ error: true, message: "Invalid JWT token" });
      }
      return;
    }
  };
};
