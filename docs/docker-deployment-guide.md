# 🐳 Hướng Dẫn Build & Chạy Dự Án Bằng Docker (Containerization Guide)

Tài liệu này hướng dẫn chi tiết cách build hình ảnh Docker (Docker Image) và khởi chạy toàn bộ hệ thống SyncCraft thông qua **Docker Compose**.

---

## 📑 Mục Lục
1. [Cấu Trúc Các Dịch Vụ Docker](#1-cấu-trúc-các-dịch-vụ-docker)
2. [Yêu Cầu Tiền Đề](#2-yêu-cầu-tiền-đề)
3. [Các Bước Khởi Chạy Với Docker Compose](#3-các-bước-khởi-chạy-với-docker-compose)
4. [Cấu Hình Biến Môi Trường (OAuth Credentials)](#4-cấu-hình-biến-môi-trường-oauth-credentials)
5. [Khởi Tạo Dữ Liệu Ban Đầu (Database Migration & Seed)](#5-khởi-tạo-dữ-liệu-ban-đầu-database-migration--seed)
6. [Các Lệnh Quản Lý Thường Dùng](#6-các-lệnh-quản-lý-thường-dùng)

---

## 1. Cấu Trúc Các Dịch Vụ Docker

Hệ thống được đóng gói thành **4 containers độc lập**:

```
+------------------------------------------------------------------------------------+
|                               DOCKER COMPOSE STACK                                 |
|                                                                                    |
|  [client] (Port 80)                                                                |
|  - Multi-stage Nginx Alpine                                                        |
|  - Phục vụ Static Bundle React 19 / Vite                                           |
|  - Reverse proxy /api sang server và xử lý WebSocket Upgrade                        |
|                                                                                    |
|  [server] (Port 4000)                                                              |
|  - Multi-stage Node.js 22 Alpine                                                   |
|  - Express REST API & Hocuspocus CRDT Sync Engine (Yjs)                            |
|                                                                                    |
|  [postgres] (Port 5432)                                                            |
|  - PostgreSQL 16 Alpine với Volume dữ liệu vĩnh viễn (postgres_data)               |
|                                                                                    |
|  [redis] (Port 6379)                                                               |
|  - Redis 7 Alpine điều phối Cluster Pub/Sub đa phiên bản                           |
+------------------------------------------------------------------------------------+
```

---

## 2. Yêu Cầu Tiền Đề

- Đã cài đặt **Docker Desktop** (hoặc Docker Engine + Docker Compose v2+).

---

## 3. Các Bước Khởi Chạy Với Docker Compose

### Bước 1: Build và khởi động toàn bộ cụm Container
Chạy lệnh sau tại thư mục gốc của dự án:

```bash
docker compose up --build -d
```

- Cờ `--build`: Tự động biên dịch mã nguồn TypeScript của server và bundle Vite của client.
- Cờ `-d`: Chạy ngầm trong background (detached mode).

### Bước 2: Kiểm tra trạng thái các Container
```bash
docker compose ps
```

Kết quả mong đợi:
```
NAME                 IMAGE                     STATUS         PORTS
synccraft_postgres   postgres:16-alpine        Up (healthy)   0.0.0.0:5432->5432/tcp
synccraft_redis      redis:7-alpine            Up (healthy)   0.0.0.0:6379->6379/tcp
synccraft_server     collaborative-server      Up             0.0.0.0:4000->4000/tcp
synccraft_client     collaborative-client      Up             0.0.0.0:80->80/tcp
```

### Bước 3: Truy cập ứng dụng
- **Giao diện Client (Frontend)**: [http://localhost](http://localhost) (hoặc `http://localhost:80`)
- **Cổng Quản Trị Super Admin**: [http://localhost/admin](http://localhost/admin)
- **Backend API & Healthcheck**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## 4. Cấu Hình Biến Môi Trường (OAuth Credentials)

Nếu muốn kích hoạt đăng nhập thật với **Google** và **GitHub OAuth 2.0**, tạo file `.env` tại thư mục gốc hoặc cấu hình trong `docker-compose.yml`:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

Sau đó build lại container:
```bash
docker compose up -d --build
```

---

## 5. Khởi Tạo Dữ Liệu Ban Đầu (Database Migration & Seed)

Khi chạy lần đầu tiên trên PostgreSQL mới, nạp bảng và dữ liệu mẫu (4 tài khoản mock + tài liệu collaborative):

```bash
# Push schema vào database
docker compose exec server npx prisma db push

# Nạp dữ liệu mẫu
docker compose exec server npm run seed
```

---

## 6. Các Lệnh Quản Lý Thường Dùng

| Mục Đích | Lệnh Thực Thi |
| :--- | :--- |
| **Xem Log của toàn bộ hệ thống** | `docker compose logs -f` |
| **Xem Log riêng của Backend API** | `docker compose logs -f server` |
| **Dừng các container (giữ nguyên dữ liệu)** | `docker compose stop` |
| **Hủy toàn bộ container** | `docker compose down` |
| **Hủy toàn bộ container và xóa sạch volume Database** | `docker compose down -v` |
| **Rebuild riêng Frontend Client** | `docker compose build client && docker compose up -d client` |
| **Rebuild riêng Backend Server** | `docker compose build server && docker compose up -d server` |
