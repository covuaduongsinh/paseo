# Kế hoạch Tìm hiểu, Giới thiệu Chi tiết và Khởi chạy Paseo

## Context
Người dùng yêu cầu tìm hiểu sâu, tạo tài liệu giới thiệu chi tiết toàn diện về phần mềm **Paseo** (mã nguồn trong repo hiện tại `D:/code/paseo`), hướng dẫn và thực hiện khởi chạy toàn bộ hệ thống Paseo (Daemon, Frontend Web / Desktop, CLI, kết nối Agent Provider) trên môi trường Windows 10, đồng thời thiết lập quy chuẩn lưu trữ các kế hoạch tại thư mục `docs/plans/`.

---

## Approach

### Phase 1: Tạo quy chuẩn thư mục kế hoạch & Soạn tài liệu giới thiệu chi tiết
1. **Thiết lập thư mục `docs/plans/`**:
   - Tạo thư mục `docs/plans/` trong workspace.
   - Sao lưu kế hoạch này vào `docs/plans/paseo-overview-and-run-plan.md` để đảm bảo tuân thủ yêu cầu lưu trữ kế hoạch.
2. **Soạn thảo tài liệu giới thiệu chi tiết về Paseo (`docs/PASEO_DEEP_DIVE.md`)**:
   - **Bản chất**: Paseo là một *Agentic Development Environment (ADE)* mã nguồn mở, hoạt động theo triết lý *local-first*, không telemetry, hỗ trợ đa nền tảng (Desktop Electron, Mobile iOS/Android qua Expo, Web Browser, Terminal CLI).
   - **Mục tiêu & Vấn đề giải quyết**: Hợp nhất các AI Coding Agents khác nhau (Claude Code, OpenAI Codex, GitHub Copilot, OpenCode, Pi, Oh My Pi - omp, Antigravity, Muse Code) vào một giao diện làm việc duy nhất với khả năng chạy song song nhiều agent trên các Git Worktrees riêng biệt, ngăn chặn xung đột mã nguồn.
   - **Kiến trúc hệ thống**:
     - `packages/protocol`: Wire schemas, RPC protocol, WebSocket message codecs, types.
     - `packages/server`: Daemon trung tâm quản lý lifecycle của agent, workspace manager, file storage (`~/.paseo`), MCP tool catalog, WebSocket server và E2E encrypted relay bridge.
     - `packages/client`: TypeScript Client SDK (`PaseoClient`, `PaseoApi`) cung cấp interface kết nối daemon.
     - `packages/app`: Giao diện React Native / Expo đa nền tảng (Web, iOS, Android, Desktop UI container).
     - `packages/desktop`: Electron wrapper đóng gói UI và tự động quản lý daemon cục bộ.
     - `packages/cli`: Công cụ dòng lệnh `paseo` điều khiển daemon, tạo workspace, spawn agent từ terminal.
     - `packages/relay`: Máy chủ relay mã hóa đầu cuối cho phép điện thoại/remote client ghép nối với máy tính dev mà không cần mở port firewall.
     - `packages/plugin`: Hệ sinh thái plugin mở rộng UI, custom providers, lifecycle hooks, timeline elements, themes.
     - `packages/expo-two-way-audio` & `packages/highlight`: Xử lý voice chat 2 chiều thời gian thực và syntax highlighting.
   - **So sánh với các giải pháp khác**: Bảng so sánh chi tiết tính năng giữa Paseo, Claude Desktop, OpenAI Codex App, Superset, Conductor và IDE AI thông thường.

---

### Phase 2: Chuẩn bị môi trường & Cài đặt Dependencies
1. **Kiểm tra môi trường Windows**:
   - Node.js version (đã có v25.2.1), npm (11.6.2), Git (2.56.0).
   - Xác nhận các Agent CLIs đã có sẵn trong PATH: `omp`, `claude`, `codex`, `opencode`, `pi`.
2. **Cài đặt package dependencies**:
   - Chạy `npm install` tại thư mục gốc để liên kết các npm workspaces (`packages/*`, `plugins`).
3. **Biên dịch các package phụ thuộc cốt lõi theo thứ tự**:
   - `npm run build:protocol`
   - `npm run build:client`
   - `npm run build:highlight`
   - `npm run build:plugin`
   - `npm run build:relay`
   - `npm run build:server`
   - `npm run build:cli`

---

### Phase 3: Khởi chạy và Kiểm thử Paseo Daemon & CLI
1. **Chạy Paseo Daemon trên Windows**:
   - Chạy daemon cục bộ ở chế độ development thông qua script:
     - Lệnh: `npm run dev:server:raw` hoặc chạy qua PowerShell với biến môi trường `PASEO_LISTEN=127.0.0.1:6768`, `PASEO_NODE_ENV=development`.
   - Quan sát log khởi động WebSocket server lắng nghe tại port `6768`, kiểm tra việc khởi tạo `$PASEO_HOME` tại `.dev/paseo-home` (hoặc `%USERPROFILE%\.paseo`).
2. **Kiểm tra tương tác CLI với Daemon**:
   - Chạy thử lệnh CLI: `node packages/cli/bin/paseo.js --help` hoặc `npm run cli -- status`.
   - Kiểm tra khả năng kết nối của CLI tới daemon đang chạy.

---

### Phase 4: Khởi chạy Giao diện Frontend (Web UI & Desktop)
1. **Chạy Paseo Web UI (Expo Web)**:
   - Chạy Metro Bundler & Expo Web:
     - `npm run dev:app` (hoặc `cd packages/app && npx expo start --web`).
   - Mở và kiểm tra giao diện Paseo trên trình duyệt tại `http://localhost:8081` (kết nối trực tiếp tới daemon `127.0.0.1:6768`).
2. **Chạy Paseo Desktop App (Electron) (Tùy chọn)**:
   - Chạy `npm run dev:win:desktop` hoặc `powershell ./scripts/dev.ps1` để khởi động đồng thời cả Daemon và Electron App trên Windows.

---

### Phase 5: Trải nghiệm & Xác minh End-to-End với Agent Provider
1. **Tạo Workspace thử nghiệm**:
   - Mở Web UI / Desktop UI, tạo một workspace mới trỏ vào một Git repository (hoặc repo Paseo hiện tại).
2. **Kiểm tra Provider Detection**:
   - Kiểm tra danh sách provider khả dụng trên giao diện: `Oh My Pi (omp)`, `Claude Code`, `Codex`, `OpenCode`, `Mock Provider`.
3. **Thực hiện Agent Session**:
   - Khởi tạo một phiên làm việc với Agent (ví dụ với `omp` hoặc `Mock Load Test Agent`).
   - Gửi yêu cầu kiểm tra: Xem agent stream timeline output, quan sát tool calls, file edits và diff panel trên giao diện Paseo.

---

## Critical files & anchors

|File Path|Vị trí / Module|Mục đích & Ý nghĩa|
|:---|:---|:---|
|`scripts/dev.ps1`|Toàn bộ script|Script chuẩn để chạy dev server + Expo app trên môi trường Windows|
|`packages/server/src/server/bootstrap.ts`|`bootstrapDaemon()`|Khởi tạo HTTP server, WebSocket, Agent Manager, Storage và Providers|
|`packages/protocol/src/index.ts`|Type definitions & messages|Trung tâm định nghĩa các message types trao đổi qua WebSocket|
|`packages/app/src/app/index.tsx`|Entrypoint Expo Router|Điều hướng và khởi tạo giao diện người dùng trên web/mobile/desktop|
|`packages/desktop/src/main.ts`|Electron main process|Quản lý vòng đời Electron window, auto-spawn daemon và bridge communication|

---

## Verification

1. **Xác minh tài liệu**:
   - File `docs/plans/paseo-overview-and-run-plan.md` và `docs/PASEO_DEEP_DIVE.md` được tạo đầy đủ nội dung, cấu trúc rõ ràng.
2. **Xác minh build**:
   - Lệnh `npm run build:protocol`, `npm run build:client`, `npm run build:server` hoàn thành không có lỗi biên dịch TypeScript.
3. **Xác minh Daemon**:
   - Khởi chạy daemon và gọi WebSocket handshake: daemon phản hồi gói tin `hello` thành công và ghi nhận status healthy trên port `6768`.
4. **Xác minh Frontend Web UI**:
   - Truy cập `http://localhost:8081`, giao diện Paseo hiển thị Dashboard, danh sách Workspace, trạng thái kết nối `Connected` tới daemon `localhost:6768`.
5. **Xác minh Agent Workflow**:
   - Tạo thử một agent turn, timeline hiển thị streaming text và phản hồi tương tác thành công.

---

## Assumptions & contingencies

- **Giả định về môi trường Windows**: Nếu việc build native module trong Electron hoặc Expo gặp cảnh báo liên quan đến Visual Studio C++ Build Tools, giải pháp dự phòng là tập trung chạy Frontend thông qua **Paseo Web UI (Expo Web)** kết hợp **Paseo Daemon (Node.js)** và **Paseo CLI**, đảm bảo 100% chức năng agentic workflow hoạt động mà không bị cản trở bởi native desktop compilation.
- **Giả định về Provider Credentials**: Nếu người dùng chưa cấu hình API key cho Claude/OpenAI, hệ thống sẽ sử dụng Provider `omp` (đã có sẵn `omp.exe` v18.8.3) hoặc `mock-load-test-agent` để kiểm thử toàn diện quy trình mà không tốn chi phí API.
