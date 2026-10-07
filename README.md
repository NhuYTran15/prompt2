# E-commerce RESTful API (MVP)

Backend MVP được xây dựng bằng Node.js, Express, Prisma và PostgreSQL dựa trên ERD gồm `Role`, `User`, `Membership`, `Product`, `Order`, `OrderDetail` và `Shipment`.

## 1. Kiến trúc và nghiệp vụ

- Khách đăng ký luôn nhận role `CUSTOMER` và membership `BRONZE`; client không thể tự cấp quyền.
- Mật khẩu được băm bằng bcrypt (cost 12), không bao giờ trả về trong response.
- JWT dùng thuật toán HS256; middleware kiểm tra chữ ký, hạn token và user trong database.
- Chỉ `ADMIN` được tạo/sửa/xóa sản phẩm và quản lý shipment.
- Customer chỉ xem được đơn của chính mình; admin xem được mọi đơn.
- Tạo đơn chạy trong transaction `Serializable`: chụp giá tại thời điểm mua vào `unit_price` và giảm tồn kho nguyên tử.
- `GET /health/live` kiểm tra process; `GET /health/ready` kiểm tra kết nối PostgreSQL.

Các bảng/cột vật lý vẫn dùng tên gần với sơ đồ (`uid`, `oid`, `pid`...), còn Prisma model dùng camelCase. `Shipment.status` được giới hạn bằng enum để tránh trạng thái sai.

## 2. Cấu trúc thư mục

```text
.
├── prisma/
│   ├── migrations/       # migration PostgreSQL có thể deploy ngay
│   ├── schema.prisma     # mô hình và quan hệ
│   └── seed.js           # role, membership và tài khoản admin
├── src/
│   ├── config/           # đọc và kiểm tra .env
│   ├── lib/              # Prisma, JWT, HttpError
│   ├── middlewares/      # auth, validation, error handler
│   ├── routes/           # REST endpoints
│   ├── schemas/
│   ├── app.js
│   └── server.js
├── test/
├── compose.yaml
└── Dockerfile
```

## 3. Chạy toàn bộ bằng Docker Compose

Yêu cầu: Docker và Docker Compose.

```bash
cp .env.example .env
```

Đổi tối thiểu `JWT_SECRET` và `ADMIN_PASSWORD` trong `.env`, sau đó:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f api
```

API mặc định ở `http://localhost:3000` (hoặc cổng `API_PORT` trong `.env`). Container API tự chạy migration và seed idempotent khi khởi động. Kiểm tra:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

Dừng hệ thống (giữ dữ liệu):

```bash
docker compose down
```

Chỉ khi muốn xóa cả volume database:

```bash
docker compose down -v
```

## 4. Chạy local để phát triển

Có thể chỉ chạy PostgreSQL bằng Docker rồi chạy Node trên máy:

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

Các lệnh hữu ích:

```bash
npm test
npx prisma studio
npx prisma format
npx prisma validate
```

Khi thay đổi schema, tạo migration mới bằng:

```bash
npx prisma migrate dev --name ten_thay_doi
```

## 5. Biến môi trường

| Biến | Ý nghĩa | Ví dụ |
|---|---|---|
| `NODE_ENV` | Môi trường chạy | `development` |
| `PORT` | Cổng HTTP | `3000` |
| `API_PORT` | Cổng publish trên host khi chạy Compose | `3000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public` |
| `JWT_SECRET` | Khóa ký JWT, ít nhất 32 ký tự | Dùng chuỗi ngẫu nhiên dài |
| `JWT_EXPIRES_IN` | Thời hạn access token | `1d` |
| `CORS_ORIGIN` | Origin được phép, nhiều origin cách nhau bởi dấu phẩy | `http://localhost:5173` |
| `ADMIN_USERNAME` | Tên admin được seed | `admin` |
| `ADMIN_PASSWORD` | Mật khẩu admin ban đầu | Cần đổi trước khi deploy |
| `ADMIN_FULLNAME` | Họ tên admin | `System Administrator` |

Tạo secret ngẫu nhiên, ví dụ:

```bash
openssl rand -base64 48
```

Không commit file `.env` lên Git.

## 6. Danh sách API

Base URL: `/api/v1`. Endpoint có ký hiệu Admin/User cần header `Authorization: Bearer <token>`.

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| POST | `/auth/register` | Public | Đăng ký customer |
| POST | `/auth/login` | Public | Đăng nhập, nhận JWT |
| GET | `/auth/me` | User | Thông tin hiện tại |
| GET | `/products` | Public | Danh sách, phân trang và tìm kiếm |
| GET | `/products/:id` | Public | Chi tiết sản phẩm |
| POST | `/products` | Admin | Tạo sản phẩm |
| PATCH | `/products/:id` | Admin | Sửa sản phẩm |
| DELETE | `/products/:id` | Admin | Xóa sản phẩm chưa được tham chiếu |
| POST | `/orders` | User | Tạo đơn và trừ tồn kho |
| GET | `/orders` | User/Admin | Đơn của mình / mọi đơn |
| GET | `/orders/:id` | Owner/Admin | Chi tiết đơn |
| POST | `/orders/:id/shipments` | Admin | Tạo lần giao hàng |
| PATCH | `/shipments/:id` | Admin | Cập nhật trạng thái giao |
| GET | `/health/live` | Public | Liveness probe |
| GET | `/health/ready` | Public | Readiness probe + database |
| GET | `/health` | Public | Health check cơ bản |

Query cho danh sách sản phẩm: `?page=1&limit=20&search=shirt`. Query cho danh sách đơn: `?page=1&limit=20`.

## 7. Luồng thử API

Đăng nhập admin (dùng thông tin trong `.env`):

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123456"}'
```

Lưu `accessToken` từ response vào biến `ADMIN_TOKEN`, rồi tạo sản phẩm:

```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Mechanical Keyboard","price":1299000,"quantity":20}'
```

Đăng ký và đăng nhập customer:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"customer1","fullName":"Nguyen Van A","password":"Customer@123"}'

curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"customer1","password":"Customer@123"}'
```

Lưu token vào `CUSTOMER_TOKEN`, rồi đặt hàng (thay `productId` bằng ID vừa tạo):

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":1,"quantity":2}]}'
```

Cập nhật giao hàng:

```bash
curl -X POST http://localhost:3000/api/v1/orders/1/shipments \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -X PATCH http://localhost:3000/api/v1/shipments/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"SHIPPED"}'
```

Trạng thái shipment hợp lệ: `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.

## 8. Phạm vi MVP và bước tiếp theo

MVP chưa gồm refresh token/logout blacklist, giỏ hàng, thanh toán, địa chỉ, ảnh sản phẩm, coupon và audit log. Khi đưa lên production nên thêm rate limit cho đăng nhập, HTTPS/reverse proxy, secret manager, backup PostgreSQL, observability và integration test bằng database riêng.
