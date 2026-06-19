# Handover Notes

## 1. Tổng quan
Project này là web dự đoán World Cup 2026 cho nội bộ team.

Chức năng chính:
- đăng ký / đăng nhập
- đặt cược `1X2`
- đặt cược `kèo chấp`
- bảng xếp hạng
- lịch sử cược
- dự đoán vui
- admin/operator vận hành trận, kèo, kết quả
- maintenance mode
- chuẩn hóa tên đội bằng catalog dùng chung

## 2. Chạy project
```bash
npm install
npm start
```

App chạy ở:
- `http://localhost:3000`

## 3. File quan trọng
- `D:\AI\FC Online\Project 4\server\index.js`
  Backend chính
- `D:\AI\FC Online\Project 4\public\app.js`
  Frontend logic chính
- `D:\AI\FC Online\Project 4\public\styles.css`
  CSS
- `D:\AI\FC Online\Project 4\public\i18n.js`
  VI / EN
- `D:\AI\FC Online\Project 4\public\team-catalog.js`
  Catalog đội tuyển + alias + flag

## 4. Dữ liệu
App hỗ trợ 2 mode lưu dữ liệu:

1. Local fallback:
- lưu trong `D:\AI\FC Online\Project 4\data.json`

2. Online:
- Supabase table `public.app_state`

Nếu có đủ:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

thì app sẽ dùng Supabase làm nguồn dữ liệu chính.

## 5. Deploy
Đang phù hợp để deploy lên Render:
- Build command: `npm install`
- Start command: `npm start`

Cần set env trên Render theo `.env.example`

## 6. Admin / operator
Role hiện có:
- `admin`
- `can_manage_odds`
- `can_set_result`

Maintenance mode:
- Khi bật bảo trì, chỉ `admin` hoặc user có quyền vận hành mới vào được

## 7. Chuẩn hóa tên đội
Project đã có shared catalog:
- `D:\AI\FC Online\Project 4\public\team-catalog.js`

Muốn thêm đội / alias mới:
1. thêm vào catalog
2. deploy lại
3. admin bấm `Chuẩn hóa tên đội`

## 8. Cần bàn giao cùng project
- repo GitHub
- file zip sạch
- `.env.example`
- `README.md`
- `HANDOVER.md`
- quyền vào:
  - GitHub repo
  - Render service
  - Supabase project

## 9. Không nên gửi cho người ngoài
- `.env` thật
- secret key thật
- session secret thật
- service role key thật

## 10. Gợi ý việc tiếp theo cho dev mới
- thêm full catalog đội tuyển nếu cần
- thêm fuzzy matching cho tên đội nhập sai nhẹ
- thêm test cho logic settle kèo
- tách bớt `server/index.js` thành nhiều module cho dễ maintain
