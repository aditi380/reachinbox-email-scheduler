# ReachInbox Email Scheduler

A full-stack email scheduling application built as an internship assignment. Compose emails, schedule them, and process them through a background queue.

## Features

- Compose and schedule emails
- View scheduled and sent emails
- REST API built with Node.js, Express, and TypeScript
- Background job processing with BullMQ and Redis
- Email delivery integration using Nodemailer and SMTP
- React and Vite frontend

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Queue: BullMQ and Redis
- Email: Nodemailer and SMTP

## Run Locally

### Prerequisites

- Node.js and npm
- Redis server
- SMTP credentials for email testing

### 1. Install frontend dependencies

From the project root:

```bash
npm install
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Configure the frontend API URL and the backend Redis and SMTP variables in your local environment. Use the project's environment example as a guide. Never commit real passwords or API keys.

### 4. Start the services

Start Redis, the backend API, the email worker, and the frontend in separate terminals using the scripts available in the root and backend package.json files.

Frontend: http://localhost:3000
Backend API: http://localhost:4000

## Email Testing

Ethereal Email may be used for testing. Ethereal provides email previews and does not deliver messages to real inboxes.

## Author

GitHub: https://github.com/aditi380
