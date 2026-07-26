"use client";

import { useEffect } from "react";

type Meaning = { text: string; keywords: string[] };
type MeaningMap = Record<string, Meaning>;
type MeaningType = "life_path" | "personal_year" | "soul" | "mission";
type ContentMap = Record<MeaningType, MeaningMap>;

const LIFE_PATH: MeaningMap = {
  1: { text: "Bạn có xu hướng chủ động, độc lập và muốn tự mở đường cho mình.", keywords: ["Chủ động", "Tiên phong", "Tự lập"] },
  2: { text: "Bạn nhạy cảm với cảm xúc, giỏi kết nối và cần môi trường hài hòa.", keywords: ["Kết nối", "Tinh tế", "Hợp tác"] },
  3: { text: "Bạn có năng lượng sáng tạo, biểu đạt tốt và dễ truyền cảm hứng.", keywords: ["Sáng tạo", "Giao tiếp", "Lan tỏa"] },
  4: { text: "Bạn cần nền tảng vững, hệ thống rõ và cảm giác mọi thứ có thể kiểm soát.", keywords: ["Kỷ luật", "Bền bỉ", "Thực tế"] },
  5: { text: "Bạn học tốt qua trải nghiệm, thích tự do và cần không gian để thay đổi.", keywords: ["Tự do", "Linh hoạt", "Trải nghiệm"] },
  6: { text: "Bạn quan tâm đến trách nhiệm, gia đình, cộng đồng và sự chăm sóc.", keywords: ["Yêu thương", "Trách nhiệm", "Chữa lành"] },
  7: { text: "Bạn có chiều sâu nội tâm, thích quan sát và thường cần thời gian để hiểu chính mình.", keywords: ["Chiêm nghiệm", "Trực giác", "Phân tích"] },
  8: { text: "Bạn có bài học về năng lực, thành tựu, quản trị và cách dùng sức ảnh hưởng.", keywords: ["Thành tựu", "Quản trị", "Ảnh hưởng"] },
  9: { text: "Bạn giàu lòng trắc ẩn, có tầm nhìn rộng và thường học qua sự buông bỏ.", keywords: ["Nhân ái", "Tầm nhìn", "Phụng sự"] },
  11: { text: "Bạn nhạy năng lượng, giàu trực giác và dễ trở thành người truyền cảm hứng.", keywords: ["Trực giác", "Khai sáng", "Cảm hứng"] },
  22: { text: "Bạn mang năng lượng kiến tạo lớn, cần biến lý tưởng thành cấu trúc thực tế.", keywords: ["Kiến tạo", "Tầm vóc", "Xây dựng"] },
  33: { text: "Bạn mang năng lượng chữa lành và phụng sự lớn, cần học cách yêu thương mà không đánh mất chính mình.", keywords: ["Chữa lành", "Phụng sự", "Yêu thương"] },
};

const PERSONAL_YEAR_TEXT: Record<string, string> = {
  1: "Năm khởi đầu: phù hợp gieo hạt, mở dự án mới và chủ động chọn hướng đi.",
  2: "Năm kết nối: phù hợp hợp tác, lắng nghe cảm xúc và nuôi dưỡng quan hệ.",
  3: "Năm biểu đạt: phù hợp sáng tạo, học hỏi, truyền thông và mở rộng niềm vui.",
  4: "Năm xây nền: phù hợp kỷ luật, hệ thống hóa và xử lý những việc cần bền bỉ.",
  5: "Năm thay đổi: phù hợp thử nghiệm, dịch chuyển và làm mới góc nhìn.",
  6: "Năm trách nhiệm: phù hợp chăm sóc gia đình, chữa lành và cân bằng nghĩa vụ.",
  7: "Năm chiêm nghiệm: phù hợp học sâu, tĩnh lại và hiểu rõ câu hỏi bên trong.",
  8: "Năm thành tựu: phù hợp quản trị tài chính, sự nghiệp và năng lực cá nhân.",
  9: "Năm hoàn tất: phù hợp tổng kết, buông bỏ điều cũ và chuẩn bị chu kỳ mới.",
};

const SOUL: MeaningMap = {
  1: { text: "Bên trong bạn khao khát được tự quyết, được dẫn đường và được là chính mình.", keywords: ["Tự chủ", "Dẫn dắt", "Can đảm"] },
  2: { text: "Linh hồn bạn cần sự kết nối, thấu hiểu và cảm giác được đồng hành nhẹ nhàng.", keywords: ["Kết nối", "Hòa hợp", "Tinh tế"] },
  3: { text: "Bạn được nuôi dưỡng bởi biểu đạt, sáng tạo và niềm vui được chia sẻ cảm xúc.", keywords: ["Biểu đạt", "Sáng tạo", "Niềm vui"] },
  4: { text: "Bạn cần cảm giác vững vàng, rõ ràng và một nền tảng đủ an toàn để phát triển.", keywords: ["Ổn định", "Kỷ luật", "An toàn"] },
  5: { text: "Linh hồn bạn tìm kiếm tự do, trải nghiệm mới và không gian để thay đổi.", keywords: ["Tự do", "Khám phá", "Linh hoạt"] },
  6: { text: "Bạn có nhu cầu yêu thương, chăm sóc và tạo nên sự hài hòa cho người mình quý.", keywords: ["Yêu thương", "Chăm sóc", "Hài hòa"] },
  7: { text: "Bên trong bạn cần chiều sâu, sự tĩnh lặng và quyền được hiểu mọi thứ theo cách riêng.", keywords: ["Chiều sâu", "Tĩnh lặng", "Trực giác"] },
  8: { text: "Bạn mong muốn làm chủ năng lực, tạo thành tựu và dùng sức ảnh hưởng đúng cách.", keywords: ["Thành tựu", "Bản lĩnh", "Ảnh hưởng"] },
  9: { text: "Linh hồn bạn hướng đến lòng trắc ẩn, sự bao dung và những giá trị lớn hơn bản thân.", keywords: ["Bao dung", "Nhân ái", "Phụng sự"] },
  11: { text: "Bạn có trực giác mạnh, dễ rung cảm với năng lượng xung quanh và cần tin vào ánh sáng nội tâm.", keywords: ["Trực giác", "Cảm hứng", "Khai mở"] },
  22: { text: "Bạn mang khát vọng kiến tạo điều có ích, biến lý tưởng sâu bên trong thành cấu trúc thật.", keywords: ["Kiến tạo", "Lý tưởng", "Bền vững"] },
  33: { text: "Sâu bên trong bạn có nhu cầu yêu thương, chữa lành và nâng đỡ người khác bằng sự bao dung trưởng thành.", keywords: ["Yêu thương", "Chữa lành", "Bao dung"] },
};

const MISSION: MeaningMap = {
  1: { text: "Sứ mệnh của bạn là học cách đứng vững, mở đường và tạo dấu ấn riêng.", keywords: ["Mở đường", "Độc lập", "Tiên phong"] },
  2: { text: "Bạn phát triển tốt khi trở thành người kết nối, hòa giải và nâng đỡ các mối quan hệ.", keywords: ["Hợp tác", "Kết nối", "Lắng nghe"] },
  3: { text: "Con đường của bạn gắn với sáng tạo, truyền đạt và lan tỏa cảm hứng qua lời nói hoặc tác phẩm.", keywords: ["Giao tiếp", "Sáng tạo", "Lan tỏa"] },
  4: { text: "Bạn đến để xây nền, tạo hệ thống và biến ý tưởng thành kết quả có thể dùng lâu dài.", keywords: ["Xây dựng", "Hệ thống", "Bền bỉ"] },
  5: { text: "Bạn học qua trải nghiệm, thích nghi nhanh và giúp người khác nhìn thấy nhiều lựa chọn hơn.", keywords: ["Thích nghi", "Trải nghiệm", "Đổi mới"] },
  6: { text: "Sứ mệnh của bạn liên quan đến trách nhiệm, chữa lành và tạo không gian an toàn cho người khác.", keywords: ["Chữa lành", "Trách nhiệm", "Gia đình"] },
  7: { text: "Bạn có thiên hướng nghiên cứu, chiêm nghiệm và chia sẻ hiểu biết sau khi đã tự mình đào sâu.", keywords: ["Nghiên cứu", "Chiêm nghiệm", "Minh triết"] },
  8: { text: "Bạn phát triển qua năng lực quản trị, tạo giá trị vật chất và dùng quyền lực một cách tỉnh táo.", keywords: ["Quản trị", "Giá trị", "Thành tựu"] },
  9: { text: "Sứ mệnh của bạn là mở rộng lòng trắc ẩn, hoàn thiện bài học cũ và đóng góp cho cộng đồng.", keywords: ["Cộng đồng", "Bao dung", "Hoàn thiện"] },
  11: { text: "Bạn có sứ mệnh truyền cảm hứng, đánh thức trực giác và giúp người khác tin vào ánh sáng của họ.", keywords: ["Truyền cảm hứng", "Khai sáng", "Trực giác"] },
  22: { text: "Bạn có khả năng xây dựng điều lớn nếu biết kết hợp tầm nhìn với kỷ luật thực tế.", keywords: ["Tầm nhìn", "Kiến tạo", "Thực tế"] },
  33: { text: "Bạn có sứ mệnh lan tỏa tình thương, chữa lành và dẫn dắt bằng sự nâng đỡ thay vì kiểm soát.", keywords: ["Lan tỏa", "Chữa lành", "Nâng đỡ"] },
};

function cloneMap(map: MeaningMap): MeaningMap {
  return Object.fromEntries(
    Object.entries(map).map(([number, meaning]) => [
      number,
      { text: meaning.text, keywords: [...meaning.keywords] },
    ]),
  );
}

function createDefaults(): ContentMap {
  return {
    life_path: cloneMap(LIFE_PATH),
    personal_year: Object.fromEntries(
      Object.entries(PERSONAL_YEAR_TEXT).map(([number, text]) => [
        number,
        { text, keywords: [] },
      ]),
    ),
    soul: cloneMap(SOUL),
    mission: cloneMap(MISSION),
  };
}

function stripHtml(value: unknown) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function reduceNumber(value: number) {
  let number = Math.abs(Number(value) || 0);
  while (number > 9) {
    number = String(number)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return number;
}

declare global {
  interface Window {
    ClowMiniReportRuntime?: {
      sync: (items: unknown[]) => void;
      getMeaning: (type: string, number: number) => Meaning;
    };
  }
}

export function useMiniReportContent() {
  useEffect(() => {
    let content = createDefaults();
    const sync = (items: unknown[]) => {
      content = createDefaults();
      items.forEach((value) => {
        if (!value || typeof value !== "object") return;
        const item = value as Record<string, unknown>;
        if (item.enabled === false) return;
        const match = String(item.key || "").match(
          /^mini_report\.(life_path|personal_year|soul|mission)\.(\d+)\.(text|keywords)$/,
        );
        if (!match) return;
        const [, rawType, number, field] = match;
        const type = rawType as MeaningType;
        content[type][number] ||= { text: "", keywords: [] };
        const text = stripHtml(item.value);
        if (field === "keywords") {
          content[type][number].keywords = text
            .split(/[,\n|]+/)
            .map((keyword) => keyword.trim())
            .filter(Boolean);
        } else {
          content[type][number].text = text;
        }
      });
    };
    const getMeaning = (rawType: string, number: number) => {
      const type = rawType as MeaningType;
      const map = content[type] || {};
      return (
        map[String(number)] ||
        map[String(reduceNumber(number))] ||
        map["9"] || { text: "", keywords: [] }
      );
    };

    window.ClowMiniReportRuntime = { sync, getMeaning };
    return () => {
      if (window.ClowMiniReportRuntime?.getMeaning === getMeaning) {
        delete window.ClowMiniReportRuntime;
      }
    };
  }, []);
}
