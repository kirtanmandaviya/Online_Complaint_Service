# Online Complaint Service for Students – Backend

A complete backend system built using **Node.js**, **Express**, **MongoDB**, and **Multer**,**JWT** designed to help students securely file complaints related to harassment, ragging, or any misconduct.
The system supports robust authentication, secure complaint submission with file uploads, admin/supervisor management, real-time status tracking, and detailed logging.

This project demonstrates solid understanding of REST API design, JWT authentication, file handling, MongoDB schema modeling, and modular backend architecture.
It includes routes and controllers for User, Admin, Supervisor, Complaint, Department, Notification, Status Logs, and more.

---

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- Multer for file uploads
- BCrypt for password hashing

---

## Features

- JWT-based Authentication : User login/signup, Secure access to protected routes,  Role-based access: User, Supervisor, Admin
- Complaint Management : Students can file complaints, Upload proof using Multer (images, documents, etc.), Update, retrieve, and filter complaints ,Track complaint status in real-time
- Department & Role Management: Assign departments to complaints, Supervisor & admin-specific routes, Centralized management system
- Notifications System : Notify students/supervisors when complaint status changes, Store and retrieve notifications
- Status Logs Tracking : Tracks every update made on a complaint, Maintains full complaint progress history
- Modular Architecture : MVC pattern with separate routes & controllers, Clean, scalable code structure, Reusable functions and middleware
- File Upload Handling : Uses Multer middleware for file uploads, Stores complaint proof files securely

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/kirtanmandaviya/Online_Complaint_Service.git
```

### 2. install dependencies:

```bash
npm install
```

### 3. start the server:

```bash
npm run dev
```

---

## Testing

- Use Postman or Thunder Client to test routes.
- JWT tokens are required for protected routes.
- Ensure MongoDB is running locally or remotely.