# JoinUp - Backend Server

This is the backend API server for the **JoinUs** platform. It is built with **Express.js**, **TypeScript**, and **MongoDB**, and uses **JWT (JSON Web Tokens)** to secure private routes.

## 🚀 Tech Stack

- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB (Atlas)
- **Authentication:** JWT (via BetterAuth JWKS)
- **Deployment:** Vercel

## ⚙️ Environment Variables

To run this server locally, create a `.env` file in the root directory and add the following variables:

    PORT=5000
    MONGODB_UN=your_mongodb_username
    MONGODB_PASS=your_mongodb_password
    CLIENT_URL=http://localhost:3000

## 🛠️ Local Setup

1. **Clone the repository:**

       git clone https://github.com/naderarrahman/JoinUp-Server.git
       cd JoinUp-Server

2. **Install dependencies:**

       npm install

3. **Run the development server:**

       npm run dev

   The server will start at `http://localhost:5000`.

## 📡 API Endpoints

### Public Routes

- `GET /` - Health check
- `GET /get-events` - Get all events
- `GET /get-events/:id` - Get a single event by ID
- `GET /recent-events` - Get the 6 most recent upcoming events
- `GET /past-events` - Get past events for the gallery

### Private Routes (Requires JWT Bearer Token)

- `POST /create-event` - Create a new event
- `POST /join-event` - Join an event
- `POST /check-join-status` - Check if a user has joined an event
- `GET /my-events/:email` - Get events created by a specific user
- `GET /joined-events/:email` - Get events joined by a specific user
- `PATCH /update-event/:id` - Update an event (Owner only)
- `DELETE /delete-event/:id` - Delete an event (Owner only)
- `DELETE /leave-event/:id` - Leave a joined event

## 🔐 Security

- All private routes are protected by a `verifyToken` middleware.
- Tokens are verified using the public JWKS endpoint from the client's BetterAuth setup.
- Event modifications (Update/Delete) include an ownership check to ensure users can only modify their own events.

## 👨‍💻 Author

**Nader Ar Rahman**

- **LinkedIn:** [linkedin.com/in/naderarrahman](https://www.linkedin.com/in/naderarrahman/)
- **Email:** [naderarrahman@gmail.com](mailto:naderarrahman@gmail.com)