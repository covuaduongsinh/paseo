# Kế hoạch: làm sạch lint cho plugins/paseo-team-mode

Trạng thái: **đã xong** (2026-10-14).

## Bối cảnh

Plugin `plugins/paseo-team-mode/` vào fork mà chưa từng qua `npm run lint`. Sau khi đồng bộ upstream, lint báo 312 lỗi.

## Đã làm

- 12 lỗi `rules-of-hooks` là bug thật: `TeamCreateModal` và `ModelSelectorModal` gọi hook sau `return null`, nên React ném lỗi khi `visible` đổi từ false sang true. Mỗi modal tách thành vỏ (trả `null`) và lõi (chứa hook).
- Bỏ toàn bộ `any`: `server/rpc-handlers.ts` dùng kiểu của `context.paseo`; logic đọc ảnh và phím Enter của hai view chat gom vào `client/chat-input.ts`; `position: "fixed"` dùng `FIXED_POSITION` trong `client/theme/overlay.ts`.
- Ternary lồng nhau, `jsx-max-depth`, `exhaustive-deps`, key theo index: sửa bằng `if/else`, component `MiniChip`, `TeammateCard`, `MessageAttachments`, và key ổn định cho teammate. `TeammateCard` cũng bỏ kiểu sửa trực tiếp object trong state.
- 233 lỗi `react-perf` (mảng, object, hàm tạo mới trong props) không sửa; khối `overrides` trong `.oxlintrc.json` tắt ba rule này cho `plugins/paseo-team-mode/client/**`. Style array của React Native được miễn theo cùng lý do với `packages/app`. Object và callback inline là nợ còn lại, chỉ được thu hẹp.

## Còn mở

- Host không truyền `projectId` cho surface của plugin, nên mọi team dùng chung nhóm `"default"` (`client/TeamDashboardScreen.tsx`). Muốn tách theo project cần đổi plugin sang panel theo workspace (`PluginWorkspacePanelProps` có `workspaceId`). Đây là quyết định thiết kế, chưa làm.
- Thu hẹp override `react-perf` khi có thời gian: bọc `useCallback`/`useMemo` cho `ParallelChatView` và `SingleChatView` trước.
