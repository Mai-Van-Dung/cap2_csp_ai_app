# User App AI Integration Guide

Tài liệu này hướng dẫn cách user app kết nối đúng với backend camera và alert của CAP2 CSP.

## Mục tiêu

User app phải hiển thị được:

1. Live camera stream qua WebView.
2. Ảnh snapshot của cảnh báo từ backend.
3. Danh sách cảnh báo và trạng thái xử lý.

## Quy tắc quan trọng

- Không dùng `localhost` trên điện thoại.
- Luôn dùng IP LAN hoặc domain thật của máy chạy backend.
- Nếu WebView chạy được nhưng ảnh cảnh báo không hiện, ưu tiên kiểm tra URL ảnh và biến môi trường trước.
- Nếu backend trả về nhiều URL trong `image_urls`, UI phải thử lần lượt từng URL rồi mới fallback.

## Backend endpoints

- `GET /viewer/camera?label=...`
- `GET /video_feed`
- `GET /api/alerts`
- `PATCH /api/alerts/:id/resolve`

## Biến môi trường đề xuất

```env
EXPO_PUBLIC_BACKEND_BASE_URL=http://192.168.1.8:5003
EXPO_PUBLIC_CAMERA_BASE_URL=http://192.168.1.8:5000
EXPO_PUBLIC_VIDEO_FEED_URL=http://192.168.1.8:5000/video_feed
EXPO_PUBLIC_ALERTS_API_URL=http://192.168.1.8:5003/api/alerts
```

Nếu app web đang dùng Vite, các giá trị `VITE_*` tương ứng cũng được hỗ trợ.

## Cách nhúng camera live

Mẫu đúng:

```jsx
const viewerUrl = `${API_BASE_URL}/viewer/camera?label=Camera%20chinh`;

<WebView
  source={{ uri: viewerUrl }}
  originWhitelist={["*"]}
  javaScriptEnabled
  domStorageEnabled
  allowsInlineMediaPlayback
  mediaPlaybackRequiresUserAction={false}
/>;
```

Không được hard-code:

```jsx
source={{ uri: 'http://localhost:5000/viewer/camera' }}
```

## Cách nhúng ảnh cảnh báo

Backend history API trả về các trường sau:

- `image_url`
- `image_urls`
- `image_path`

Ưu tiên xử lý theo thứ tự:

1. Nếu `image_urls` có giá trị, thử từng URL một.
2. Nếu chỉ có `image_url`, dùng nó.
3. Nếu tất cả thất bại, hiển thị ảnh fallback.

Logic khuyến nghị:

```jsx
const urls = Array.isArray(alert.image_urls)
  ? alert.image_urls.filter(Boolean)
  : [];
const primaryUrl = urls[0] || alert.image_url || fallbackImage;
```

## Checklist cho AI khi hoàn thiện tính năng

- Dùng host/IP LAN thật của backend.
- Không phụ thuộc vào `localhost`.
- Khi render alert detail, có fallback cho ảnh lỗi tải.
- Nếu cần refresh lịch sử cảnh báo, gọi lại `GET /api/alerts`.
- Nếu app chạy trên Android, kiểm tra cleartext HTTP nếu backend chưa có HTTPS.
- Nếu điện thoại cùng Wi-Fi với backend, xác nhận mở được `http://<LAN_IP>:5000/viewer/camera` trên trình duyệt trước.

## Gợi ý kiểm tra nhanh

1. Mở `http://<LAN_IP>:5000/viewer/camera` trên điện thoại.
2. Nếu trang live hiện, WebView sẽ có khả năng hoạt động.
3. Gọi `GET /api/alerts` và xác nhận `image_url` hoặc `image_urls` trả về URL truy cập được từ điện thoại.
4. Nếu ảnh không tải, kiểm tra `PUBLIC_BASE_URL` ở backend.

## Quy ước khi AI sửa code

- Giữ một nguồn cấu hình base URL duy nhất.
- Khi thêm endpoint mới, cập nhật tài liệu này.
- Không tạo thêm hard-code IP/port rải rác trong nhiều file.
- Nếu đổi cổng backend, phải cập nhật cả WebView URL lẫn alert image URL.
