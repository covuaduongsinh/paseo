# Kế hoạch: làm sạch lint cho plugins/paseo-team-mode

Trạng thái: **đã xong** (2026-10-14). Plugin lint sạch với cấu hình chung của repo, không còn `ignorePatterns` hay `overrides` riêng.

## Bối cảnh

Plugin `plugins/paseo-team-mode/` vào fork mà chưa từng qua `npm run lint`. Sau khi đồng bộ upstream, lint báo 312 lỗi.

## Đã làm

- 12 lỗi `rules-of-hooks` là bug thật: `TeamCreateModal` và `ModelSelectorModal` gọi hook sau `return null`, nên React ném lỗi khi `visible` đổi từ false sang true. Mỗi modal tách thành vỏ (trả `null`) và lõi (chứa hook).
- Bỏ toàn bộ `any`: `server/rpc-handlers.ts` dùng kiểu của `context.paseo`; `position: "fixed"` dùng `FIXED_POSITION` trong `client/theme/overlay.ts`.
- 233 lỗi `react-perf` sửa bằng một mẫu chung:
  - Style phụ thuộc theme gom vào một `useMemo` (đã `StyleSheet.flatten`), biến thể chọn/không chọn là hai style riêng thay vì mảng ghép trong JSX.
  - Callback trong danh sách tách thành component con (`Chip`, `TeamPill`, `ModelCard`, `SlotColumn`...) nhận `id` và callback ổn định từ `useCallback`.
  - Phần soạn tin của hai view chat gom vào `client/components/ChatComposer.tsx` với hai mật độ (`regular`, `compact`) để giữ đúng kích thước cũ; logic đọc ảnh và phím Enter nằm ở `client/chat-input.ts`.
- Team được giới hạn theo workspace: panel Team Board truyền `workspaceId` (bọc bằng `key={workspaceId}` để đổi workspace thì state reset); màn hình Teams đầy đủ dùng nhóm chung `"default"` (`GLOBAL_TEAM_SCOPE`). Trong dữ liệu team, trường vẫn tên `projectId`. Team tạo trước đây nằm ở nhóm `"default"`, nên chỉ hiện ở màn hình đầy đủ.

## Chưa kiểm chứng

Các sửa UI chỉ được xác nhận bằng typecheck và lint. Plugin không có test dựng component, nên chưa ai chạy giao diện. Cần mở thử: tạo team, chọn model cho slot, dán ảnh, gõ `/`, đổi workspace.
