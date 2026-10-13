# Kế hoạch: làm sạch lint cho plugins/paseo-team-mode

## Bối cảnh

Plugin `plugins/paseo-team-mode/` được commit vào fork ngày 2026-10-14 mà chưa từng qua `npm run lint`. Khi đồng bộ upstream, lint báo 312 lỗi trong plugin này, nên nó đang bị loại khỏi lint tạm thời bằng `ignorePatterns` trong `.oxlintrc.json`. Việc này là để gỡ khoản nợ đó.

## Phân loại lỗi (lần chạy 2026-10-14)

| Rule                                     | Số lỗi | Ghi chú                                                     |
| ---------------------------------------- | ------ | ----------------------------------------------------------- |
| `react-perf/jsx-no-new-array-as-prop`    | 148    | Mảng tạo mới trong props → đưa ra hằng số hoặc `useMemo`    |
| `react-perf/jsx-no-new-function-as-prop` | 68     | Hàm tạo mới trong props → `useCallback` hoặc tách component |
| `typescript-eslint/no-explicit-any`      | 24     | Thay bằng kiểu suy ra từ Zod trong `shared/contracts.ts`    |
| `react-perf/jsx-no-new-object-as-prop`   | 18     | Style/object inline                                         |
| `no-nested-ternary`                      | 13     | Tách if/else                                                |
| `react-hooks/rules-of-hooks`             | 12     | **Ưu tiên cao**: có thể là bug thật, không chỉ style        |
| còn lại                                  | ~30    | `jsx-max-depth`, `prefer-add-event-listener`...             |

## Các bước

1. Sửa 12 lỗi `rules-of-hooks` trước, kiểm tra hành vi từng chỗ.
2. Thay `any` bằng kiểu từ Zod (xem `server/rpc-handlers.ts`, handler `listProvidersRpc`).
3. Xử lý nhóm `react-perf` theo component: `ParallelChatView`, `SingleChatView`, `TeamCreateModal`, `ModelSelectorModal`, `KanbanBoard`.
4. Gỡ `plugins/paseo-team-mode/**` khỏi `ignorePatterns`, chạy `npm run lint`, `npm run typecheck`, `npm run format`.

## Hoàn tất khi

`npm run lint` xanh với plugin không còn trong `ignorePatterns`.
