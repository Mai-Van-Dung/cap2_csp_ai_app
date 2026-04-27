# CAPS AI App - Expo React Native + Node.js Backend

Ứng dụng được xây dựng với React Native Expo, Tailwind CSS, Node.js và MySQL.

## User App AI Integration Guide

Frontend va backend phai dung cung mot host/IP LAN that khi chay tren dien thoai. Khong hard-code IP Python cu trong app.

### Discovery rules

- User app phai bootstrap qua `GET /api/connection-info`.
- Tren mobile, khong uu tien `localhost` hay `127.0.0.1`.
- Camera va socket phai dung cung `activeBase` da probe thanh cong.
- Port `5003` la Node relay; camera admin chay o `5000`.

### Dynamic connection discovery

User app uu tien goi `GET /api/connection-info` tu Python backend de lay `preferred_base_url`, `base_candidates`, `camera.viewer_url`, `socket.handshake_url`.

Sau do app se auto-probe `base_candidates` va dung dia chi dang reachable cho camera/socket.

### Biến môi trường khuyến nghị

Frontend Expo/React Native có thể đọc các biến sau:

```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.8:5003
EXPO_PUBLIC_BACKEND_BASE_URL=http://192.168.1.8:5003
EXPO_PUBLIC_CAMERA_PUBLIC_BASE_URL=http://192.168.1.8:5000
EXPO_PUBLIC_CAMERA_BASE_URL=http://192.168.1.8:5000
EXPO_PUBLIC_VIDEO_FEED_URL=http://192.168.1.8:5000/video_feed
EXPO_PUBLIC_ALERTS_API_URL=http://192.168.1.8:5003/api/alerts
EXPO_PUBLIC_DISCOVERY_SEED_HOST=192.168.1.8
EXPO_PUBLIC_SOCKET_BASE_URL=http://192.168.1.8:5000
EXPO_PUBLIC_SOCKET_PATH=/socket.io
```

Nếu dự án web đang dùng Vite, các key `VITE_*` tương ứng cũng được hỗ trợ.

Nếu cần cho phép localhost trong quá trình dev web/local, đặt `EXPO_PUBLIC_ALLOW_LOCALHOST_SEED=true`.

### Luồng camera live

Màn hình Home dùng WebView để nhúng `GET /viewer/camera?label=...`. URL phải được dựng từ base URL cấu hình, không hard-code `localhost`.

### Ảnh cảnh báo

Backend trả về cả `image_url` và `image_urls`. UI phải thử lần lượt từng URL trong `image_urls`, sau đó mới fallback sang `image_url` hoặc ảnh mặc định.

### Verify discovery

Chạy kiểm tra nhanh candidate probing trong frontend:

```bash
cd frontend
npm run verify:camera-discovery
```

### Checklist

- Dùng host/IP LAN hoặc domain thật của máy chạy backend.
- Không phụ thuộc vào `localhost` trên điện thoại.
- Khi ảnh cảnh báo không hiện, kiểm tra trước `PUBLIC_BASE_URL` và URL trong `image_urls`.
- Nếu backend đổi cổng, cập nhật đồng thời URL WebView, API alerts, và image URLs.

## Cấu trúc thư mục

```
cap2_csp_ai_app/
├── frontend/                 # React Native Expo + Tailwind CSS
│   ├── src/
│   │   ├── components/      # Các component tái sử dụng
│   │   ├── screens/         # Các màn hình ứng dụng
│   │   ├── services/        # API services và helpers
│   │   ├── utils/           # Hàm tiện ích
│   │   ├── assets/          # Hình ảnh, font, media
│   │   ├── hooks/           # Custom React hooks
│   │   ├── context/         # React Context
│   │   └── styles/          # CSS styles
│   ├── App.js
│   ├── index.js
│   ├── app.json
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                  # Node.js Express + MySQL
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Logic xử lý các routes
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Middleware (auth, validation...)
│   │   ├── utils/           # Hàm tiện ích
│   │   ├── config/          # Cấu hình (database, env...)
│   │   ├── database/        # Database migrations, seeds
│   │   └── index.js         # Entry point
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## Hướng dẫn sử dụng

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

`npm start` da duoc cau hinh chay `expo start --tunnel` de ket noi Expo Go tren dien thoai on dinh hon (khong phu thuoc LAN/firewall).

Neu ban muon chay LAN trong cung mang noi bo:

```bash
npm run start:lan
```

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Cập nhật thông tin database
npm install
npm run dev
```

### Telegram Setup

Trong `backend/.env`, điền các biến sau:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
INTERNAL_SECRET=your_internal_secret
PUBLIC_BASE_URL=http://192.168.1.8:5003
ALERT_IMAGE_PUBLIC_BASE_URL=http://192.168.1.8:5000
```

Sau đó restart backend. Trong app, vào Profile để lưu Chat ID và bấm Test để kiểm tra bot đã nhận tin nhắn chưa.

### Gửi ảnh cảnh báo Telegram đúng nguồn

Nếu ảnh alert nằm ở backend admin/web khác với backend user app, hãy đảm bảo một trong hai cách sau:

1. Cách tốt nhất: AI/admin backend gửi `image_url` hoặc `image_base64` vào `POST /api/alerts/notify`.
2. Nếu chỉ có `image_path`, hãy đặt `PUBLIC_BASE_URL` trỏ đúng host đang phục vụ ảnh đó, ví dụ:

```env
PUBLIC_BASE_URL=http://192.168.1.8:5000
```

Neu Node va Python chay cung may trong luc dev, uu tien su dung localhost de on dinh hon:

```env
PUBLIC_BASE_URL=http://localhost:5003
ALERT_IMAGE_PUBLIC_BASE_URL=http://localhost:5000
```

Khuyến nghị rõ ràng hơn: đặt riêng `ALERT_IMAGE_PUBLIC_BASE_URL` cho host đang phục vụ ảnh cảnh báo, để không bị nhầm với host của user backend:

```env
ALERT_IMAGE_PUBLIC_BASE_URL=http://192.168.1.8:5000
```

Backend sẽ thử tải ảnh theo thứ tự:

- `image_base64`
- `image_url`
- `image_path` qua `PUBLIC_BASE_URL`
- `image_path` qua `ALERT_IMAGE_PUBLIC_BASE_URL` nếu có
- file local nếu ảnh thực sự nằm trên máy chạy backend

Payload mẫu cho AI backend:

```json
{
  "object_type": "Child",
  "camera_name": "Camera chinh",
  "confidence": 0.91,
  "image_url": "http://192.168.1.8:5000/static/alerts/alert_cam1_DPZ-01_20260414_134937.jpg",
  "image_urls": [
    "http://192.168.1.8:5000/static/alerts/alert_cam1_DPZ-01_20260414_134937.jpg"
  ],
  "secret": "change_me_internal_secret"
}
```

Telegram photo priority used by the Node service:

1. `image_base64`
2. `image_url`
3. each entry in `image_urls`
4. local file from `image_path`
5. public URL built from `ALERT_IMAGE_PUBLIC_BASE_URL + image_path`

## Công nghệ sử dụng

- **Frontend**: React Native, Expo, Tailwind CSS, NativeWind
- **Backend**: Node.js, Express.js, MySQL2
- **Database**: MySQL

## Liên hệ & Hỗ trợ

Để biết thêm chi tiết, vui lòng tham khảo tài liệu trong từng thư mục.
