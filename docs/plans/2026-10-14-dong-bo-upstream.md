# Kế hoạch: đồng bộ repo gốc (upstream) vào fork local + GitHub

## Bối cảnh

- `origin` = `https://github.com/covuaduongsinh/paseo.git` (fork của người dùng).
- `upstream` = `https://github.com/getpaseo/paseo.git` (repo gốc, đã cấu hình sẵn remote).
- Nhánh `main` local có commit riêng của fork (antigravity provider, deep dive docs, Windows build fixes, durable timeline persistence, 1-click scripts) nên **không thể fast-forward** — dùng `merge`, không rebase (tránh viết lại lịch sử đã push lên origin).
- Working tree đang bẩn: `Start-Paseo.bat`, `Stop-Paseo.bat` đã sửa; chưa theo dõi: `.omc/`, `packages/plugin/src/server/.omc/`, `plugins/antigravity-provider/.omc/`, `plugins/antigravity-provider/test/fixtures/.omc/`, `plugins/paseo-team-mode/`.
- Quy ước mới của người dùng: **mọi kế hoạch đặt ở `docs/plans/`**. Bản kế hoạch này sẽ được copy vào `docs/plans/2026-10-14-dong-bo-upstream.md` ngay khi được approve (plan mode hiện chỉ cho ghi file plan hệ thống).

## Các bước (sau khi approve)

1. **Chuẩn bị**
   - Tạo `docs/plans/` và lưu kế hoạch này vào đó.
   - Ghi quy ước "kế hoạch → `docs/plans/`" vào memory của dự án (feedback).
   - `git status --short --branch` xác nhận đang ở `main`.
2. **Bảo vệ công việc dở**
   - Commit riêng các thay đổi `Start-Paseo.bat` / `Stop-Paseo.bat` (đã có chủ đích) và `plugins/paseo-team-mode/` nếu người dùng muốn giữ; để `.omc/` ngoài (thêm vào `.gitignore` nếu chưa có) — **hỏi lại người dùng với `plugins/paseo-team-mode/` và `.omc/` trước khi commit**.
   - Tạo nhánh sao lưu `backup/pre-upstream-sync-2026-10-14` trỏ vào `main` hiện tại.
3. **Lấy upstream**
   - `git fetch upstream --prune`.
   - Xem trước: `git log --oneline main..upstream/main` và `git diff --stat main...upstream/main`.
   - Đối chiếu các file fork đã sửa với thay đổi upstream để dự đoán xung đột (nhiều khả năng: provider antigravity trong `packages/server`, `docs/`, lockfile, script Windows).
4. **Merge**
   - Tạo nhánh `sync/upstream-2026-10-14` từ `main`, chạy `git merge upstream/main`.
   - Giải xung đột theo nguyên tắc: giữ tính năng riêng của fork (antigravity, persistence, script 1-click), nhận phần còn lại từ upstream. Lockfile (`package-lock.json`) → nhận bản upstream rồi `npm install` để sinh lại, không sửa tay.
5. **Kiểm chứng** (theo CLAUDE.md, không chạy full test suite)
   - `npm install`, `npm run build:server` (cập nhật declaration chéo workspace).
   - `npm run typecheck`, `npm run lint`, `npm run format`.
   - Chỉ chạy các file test liên quan trực tiếp tới vùng xung đột: `npx vitest run <file> --bail=1`, đặc biệt test antigravity.
   - Không khởi động lại daemon cổng 6767.
6. **Đồng bộ local + GitHub**
   - Fast-forward `main` lên nhánh sync (`git merge --ff-only`), commit merge kèm dòng Co-Authored-By theo quy định.
   - `git push origin main` (push thường, **không force**). Đây là hành động ra ngoài → xác nhận lần cuối với người dùng ngay trước khi push.
   - Xác nhận `git status` sạch và `origin/main` == `main`.

## Rủi ro / điểm cần người dùng quyết

- `plugins/paseo-team-mode/` và `.omc/` chưa theo dõi: commit hay bỏ qua?
- Nếu xung đột lớn ở provider antigravity, sẽ dừng lại báo cáo thay vì tự quyết.
- Hoàn tác: reset `main` về `backup/pre-upstream-sync-2026-10-14` (chưa push thì không ảnh hưởng GitHub).

## Cách kiểm tra cuối

`git log --oneline --graph -15` thấy merge commit; `git diff upstream/main --stat` chỉ còn các thay đổi riêng của fork; typecheck + lint xanh; GitHub fork hiện commit mới.
