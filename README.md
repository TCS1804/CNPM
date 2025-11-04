# Food-Ordering-Delivery-System
Food Ordering &amp; Delivery System using microservice

# Food Ordering & Delivery System – Microservices Project

## 📦 Technologies Used
- Node.js + Express (Backend Services)
- MongoDB (Database)
- React.js (Frontend)
- Docker + Docker Compose (Containerization)
- JWT (Authentication & Role-Based Access)
- Twilio (SMS Notifications)
- Nodemailer (Email Notifications)
- Axios (Inter-service communication)

## 🧱 Microservices
| Service             | Port   | Description                          |
|---------------------|--------|--------------------------------------|
| API Gateway         | 5000   | Routes requests to all services      |
| Auth Service        | 5001   | Handles user login/register          |
| Restaurant Service  | 5002   | Menu & restaurant management         |
| Order Service       | 5003   | Order creation, status tracking      |
| Delivery Service    | 5004   | Delivery assignment, tracking        |
| Payment Service     | 5005   | Mock payment confirmation            |
| Notification Service| 5006   | Sends SMS & Email                    |
| Frontend (React)    | 3000   | Customer-facing web UI               |

## 🚀 Setup Instructions

1. **Clone the Repository:**

https://github.com/SACHITH-KAVISHKA/Food-Ordering-Delivery-System.git

2. **Configure Environment Variables:**
- Each microservice contains its own `.env` file with variables like:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `PORT`
  - `TWILIO_*`, `EMAIL_*` for notifications

3. **Run with Docker Compose:**

  docker-compose up --build


4. **Run with Docker Compose:**
```bash
kubectl apply -f k8s/all-services.yaml,
kubectl cluster-info,
kubectl get pods






