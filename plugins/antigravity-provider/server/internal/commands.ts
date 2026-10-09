import type { ProviderCommand } from "@getpaseo/plugin/server/provider";

interface AntigravityCommand extends ProviderCommand {
  /** Antigravity runs with --disable-slash-commands, so a command travels as its instruction. */
  instruction: string;
}

const commands: readonly AntigravityCommand[] = [
  {
    name: "review",
    description: "Rà soát, kiểm tra code và phát hiện lỗi/bảo mật",
    argumentHint: "[files/diff]",
    instruction:
      "Rà soát code và báo cáo lỗi logic, lỗi bảo mật, và rủi ro bảo trì. Nêu từng phát hiện kèm đường dẫn file và số dòng, xếp theo mức nghiêm trọng.",
  },
  {
    name: "test",
    description: "Tạo và chạy unit test cho các module",
    argumentHint: "[target]",
    instruction:
      "Viết unit test cho phần được chỉ định, chạy chúng, và báo cáo kết quả thật. Không đánh dấu hoàn thành khi test còn đỏ.",
  },
  {
    name: "refactor",
    description: "Tối ưu hóa cấu trúc code và hiệu năng",
    argumentHint: "[files]",
    instruction:
      "Tái cấu trúc code được chỉ định mà không đổi hành vi. Giải thích từng thay đổi và vì sao nó an toàn.",
  },
  {
    name: "explain",
    description: "Giải thích luồng hoạt động của mã nguồn hoặc kiến trúc",
    argumentHint: "[question]",
    instruction:
      "Giải thích luồng hoạt động của phần được hỏi: điểm vào, các bước chính, và dữ liệu đi qua đâu. Trích dẫn file và dòng cụ thể.",
  },
  {
    name: "commit",
    description: "Tạo git commit message chuẩn Conventional Commits",
    argumentHint: "[context]",
    instruction:
      "Đọc thay đổi đang có trong working tree và soạn commit message theo chuẩn Conventional Commits. Chỉ soạn message, không tự commit khi chưa được yêu cầu.",
  },
  {
    name: "doc",
    description: "Viết tài liệu hướng dẫn và chú thích kỹ thuật Markdown/JSDoc",
    argumentHint: "[topic]",
    instruction:
      "Viết tài liệu cho chủ đề được nêu. Ghi những gì code không tự nói ra: lý do thiết kế, ràng buộc, cạm bẫy.",
  },
  {
    name: "fix",
    description: "Phân tích và sửa lỗi cụ thể trong codebase",
    argumentHint: "[error/issue]",
    instruction:
      "Tìm nguyên nhân gốc của lỗi được mô tả trước khi sửa. Nêu bằng chứng cho chẩn đoán, rồi áp dụng bản sửa nhỏ nhất và kiểm chứng lại.",
  },
  {
    name: "plan",
    description: "Lập kế hoạch triển khai tính năng từng bước",
    argumentHint: "[goal]",
    instruction:
      "Lập kế hoạch triển khai theo từng bước cho mục tiêu được nêu. Nêu rõ file nào sẽ đổi và cách kiểm chứng. Chưa sửa code ở bước này.",
  },
  {
    name: "paseo",
    description: "Quản lý dự án, cấu hình và workspace Paseo",
    argumentHint: "[action]",
    instruction: "Thực hiện tác vụ quản lý dự án/cấu hình/workspace Paseo được mô tả.",
  },
  {
    name: "paseo-advisor",
    description: "Xin ý kiến phản biện/tư vấn kiến trúc độc lập",
    argumentHint: "[topic]",
    instruction:
      "Phản biện phương án đang có một cách độc lập: nêu giả định ẩn, rủi ro, và phương án thay thế kèm đánh đổi.",
  },
  {
    name: "paseo-committee",
    description: "Hội đồng AI đánh giá nguyên nhân gốc rễ và giải pháp",
    argumentHint: "[problem]",
    instruction:
      "Đánh giá vấn đề từ nhiều góc nhìn (kiến trúc, vận hành, bảo mật, kiểm thử), đối chiếu các giả thuyết cạnh tranh, rồi kết luận nguyên nhân gốc và giải pháp.",
  },
  {
    name: "paseo-handoff",
    description: "Chuyển giao ngữ cảnh tác vụ cho agent khác",
    argumentHint: "[agent]",
    instruction:
      "Tóm tắt trạng thái công việc để bàn giao: đã làm gì, còn gì dở dang, file liên quan, và bước kế tiếp.",
  },
  {
    name: "paseo-help",
    description: "Trợ giúp cài đặt và cấu hình hệ sinh thái Paseo",
    instruction: "Hướng dẫn cài đặt và cấu hình Paseo cho tình huống được hỏi.",
  },
];

export const providerCommands: readonly ProviderCommand[] = commands.map(
  ({ name, description, argumentHint }) => ({ name, description, argumentHint }),
);

/**
 * Commands from other plugins are unknown here; they travel verbatim so the agent still receives
 * the user's intent instead of a failed turn.
 */
export function renderCommand(name: string, args: string): string {
  const command = commands.find((entry) => entry.name === name);
  const trimmed = args.trim();
  if (!command) return trimmed ? `/${name} ${trimmed}` : `/${name}`;
  return trimmed ? `${command.instruction}\n\n${trimmed}` : command.instruction;
}

export function commandLabel(name: string, args: string): string {
  const trimmed = args.trim();
  return trimmed ? `/${name} ${trimmed}` : `/${name}`;
}
