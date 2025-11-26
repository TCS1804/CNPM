Bạn đúng! Folder **`client/`** (frontend) chưa được đưa vào README ở mức chi tiết.
Mình sẽ **cập nhật lại README mới**, viết đẹp – rõ ràng – đầy đủ, bao gồm cả **client React**.

Dưới đây là bản **README đầy đủ & hoàn chỉnh**, phản ánh chính xác cấu trúc source code trong file `.zip`.

---

# 🚀 FastFood Delivery – Microservices System

**Hệ thống đặt – giao đồ ăn đa vai trò (Customer / Restaurant / Delivery)**
Kiến trúc **Microservices**, backend chạy bằng **Node.js + Express + MongoDB**, frontend là **ReactJS**, quản lý bằng **Docker Compose**.

---

# 📌 1. Tính năng chính

### 👥 4 loại người dùng

* **Customer** – đặt món, thanh toán, theo dõi đơn
* **Restaurant** – quản lý nhà hàng, sản phẩm, nhận đơn
* **Delivery** – nhận đơn giao hàng
* **Admin** – quản trị toàn hệ thống

### 🔧 Các service backend

* Auth (đăng nhập / phân quyền)
* Restaurant (nhà hàng + menu)
* Order (đặt món)
* Delivery (shipper)
* Notification (SMS + email)
* Payment (Stripe + chia tiền)
* API Gateway (điều phối request)

### 🎨 Frontend (client/)

* Build bằng **ReactJS + Vite**
* Hỗ trợ login, đặt món, quản lý nhà hàng
* Gọi API qua API Gateway (`http://localhost:5020/api`)

---

# 🏗️ 2. Kiến trúc hệ thống

```
Client (React)
     ↓  HTTP
API Gateway (5020)
     ↓  Internal HTTP
 ┌─────────────┬────────────┬────────────┬───────────┬──────────────┬──────────────┐
 │ Auth (5001) │ Restaurant │ Order (5003│ Delivery  │ Notification │ Payment (5008│
 │             │  (5002)    │            │  (5004)   │   (5006)     │              │
 └─────────────┴────────────┴────────────┴───────────┴──────────────┴──────────────┘
                     ↓
                 MongoDB (27017)
```

---

# 📦 3. Cách chạy dự án (Frontend + Backend)

## 3.1 Chạy toàn bộ bằng Docker (Khuyến nghị)

Tại thư mục gốc:

```sh
docker-compose up --build
```

Sau khi chạy xong:

| Thành phần           | URL                                                    |
| -------------------- | ------------------------------------------------------ |
| **Frontend (React)** | [http://localhost:5173](http://localhost:5173)         |
| **API Gateway**      | [http://localhost:5020/api](http://localhost:5020/api) |
| **Mongo Express**    | [http://localhost:8081](http://localhost:8081)         |
| **MongoDB**          | localhost:27017                                        |

---

# 📁 4. Cấu trúc thư mục

```
SGU_CNPM_DoAn-main/
│
├── client/                    # ReactJS Frontend
│   ├── src/
│   │   ├── pages/             # Giao diện: login, home, order...
│   │   ├── components/        # Navbar, card, button...
│   │   ├── hooks/             # React hooks
│   │   ├── services/          # API services gọi API Gateway
│   │   └── contexts/          # Auth context
│   └── vite.config.js
│
├── api-gateway/               # Gateway điều phối request
├── auth-service/              # Service đăng nhập, JWT
├── restaurant-service/        # Nhà hàng + món ăn (Cloudinary)
├── order-service/             # Tạo + quản lý đơn hàng
├── delivery-service/          # Shipper
├── notification-service/      # SMS, email (Twilio, Gmail)
├── payment-service/           # Stripe Payment
│
├── docker-compose.yml         # Chạy toàn hệ thống bằng Docker
└── README.md                  # Tài liệu hướng dẫn
```

---

# 🌐 5. Client (ReactJS)

### 5.1 Chạy client thủ công (không dùng Docker)

```sh
cd client
npm install
npm run dev
```

Ứng dụng chạy tại:

👉 [http://localhost:5173](http://localhost:5173)

### 5.2 Client giao tiếp với API Gateway

Trong `client/src/services/api.js` (hoặc tương tự):

```js
export const API_URL = "http://localhost:5020/api";
```

---

# 🔧 6. Biến môi trường (ENV)

### Ví dụ `.env` của API Gateway:

```
PORT=5020
API_PREFIX=/api
AUTH_BASE_URL=http://auth-service:5001
ORDER_BASE_URL=http://order-service:5003
RESTAURANT_BASE_URL=http://restaurant-service:5002
DELIVERY_BASE_URL=http://delivery-service:5004
NOTIFICATION_BASE_URL=http://notification-service:5006
PAYMENT_BASE_URL=http://payment-service:5008
```

---

# 🧪 7. Kiểm thử API

Bạn có thể dùng:

* Postman
* Thunder Client (VSCode)
* CURL

Ví dụ:

### Đăng ký

```
POST http://localhost:5020/api/auth/register
```

### Tạo đơn hàng

```
POST http://localhost:5020/api/orders
```

### Thanh toán bằng Stripe

```
POST http://localhost:5020/api/payments/checkout
```

---

# 🧹 8. Cleanup Docker

```sh
docker-compose down --remove-orphans
docker system prune -af
```

Xoá dữ liệu MongoDB:

```sh
docker volume rm sgu_cnpm_doan_mongo_data
```

---


