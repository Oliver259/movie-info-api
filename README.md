# Movie Info API Server-Side Express Application

## Overview
This project is an Express-based REST API that provides access to movie information and user profiles. It uses Node.js, Express, MySQL, Swagger, Knex, and JSON Web Tokens (JWT) for authentication.

## Features
- User registration and login with JWT authentication
- Fetch movie data and people information
- User profile management with authorized and unauthorized access modes
- Swagger documentation for API endpoints

## Setup Instructions
### Prerequisites
- Node.js
- MySQL or MariaDB
- Git

### Installation
1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd Assessment3
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up the database:
   - Import the provided SQL dump file into your MySQL database.
   - Create a table for storing user details.

4. Configure environment variables:
   - Create a `.env` file in the root directory with the following content:
     ```
     JWT_SECRET=<your-jwt-secret>
     JWT_REFRESH_SECRET=<your-jwt-refresh-secret>
     ```

5. Start the server:
   ```sh
   npm start
   ```

## Usage
- The API is accessible at `https://<your-server-ip>:3000/`.
- Swagger documentation is available at the root URL.

## API Endpoints
### Authentication
- `POST /user/register`: Register a new user
- `POST /user/login`: Log in an existing user
- `POST /user/refresh`: Obtain a new bearer token using a refresh token
- `POST /user/logout`: Log out and invalidate the refresh token

### User Profile
- `GET /user/{email}/profile`: Get user profile information
- `PUT /user/{email}/profile`: Update user profile information

### Movies
- `GET /movies/search`: Search for movies
- `GET /movies/data/{imdbID}`: Get data for a specific movie

### People
- `GET /people/{id}`: Get information about a person by their IMDB ID

## Deployment
- The application should be deployed to a QUT VM using HTTPS with a self-signed certificate.
- Ensure the server is running and accessible at the provided IP address.

## Acknowledgements
- Data sourced from OMDb and licensed under CC BY-NC 4.0.

## License
This project is licensed under the MIT License.
