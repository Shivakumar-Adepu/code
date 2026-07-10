# CodeGuard AI (MERN + Python Code Review SaaS Platform)

This project has been migrated to a modern **MERN (MongoDB, Express, React, Node) + Python** microservices architecture. 

It is split into three main components:
1.  **`frontend/`**: Vite + React client application using TanStack Router client SPA mode, Monaco Code Editor, and Recharts.
2.  **`backend/`**: Node.js & Express server connected to MongoDB for user management and scanning history, acting as a gateway/proxy.
3.  **`python_service/`**: FastAPI python service that handles the actual static analysis heuristics and AST rules checking.

---

## System Requirements
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18+) & `npm`
*   [Python 3](https://www.python.org/) & `pip`
*   [MongoDB](https://www.mongodb.com/try/download/community) (Local instance running at `mongodb://localhost:27017` or a MongoDB Atlas Cloud connection string)

---

## Quick Start Setup (Run all 3 servers)

To run the application, open 3 separate terminal tabs and run the following commands:

### Tab 1: Python Analysis Service
```bash
cd python_service
pip install -r requirements.txt
python main.py
```
*Runs on [http://localhost:8000](http://localhost:8000)*

### Tab 2: Express API Backend
```bash
cd backend
npm install
# Make sure your MongoDB server is running!
# You can customize your mongo connection string or JWT secret in backend/.env
npm run dev
```
*Runs on [http://localhost:5000](http://localhost:5000)*

### Tab 3: React SPA Frontend
```bash
cd frontend
npm install
npm run dev
```
*Runs on [http://localhost:8080](http://localhost:8080)*

---

## Environment Configuration
You can configure the Express port, MongoDB URI, and microservice URLs in:
*   [backend/.env](file:///c:/Users/shiva/Downloads/guardian-code-sense-e4dbeb7e-main/guardian-code-sense-e4dbeb7e-main/backend/.env)
