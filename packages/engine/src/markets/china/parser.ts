import type { JobPosting } from "../../domain/schemas.js";
import type { ChineseJobPostingExtracted, ChinesePlatform } from "./types.js";

/**
 * Parses raw job description pasted from Chinese recruitment platforms
 * (BOSS直聘, 猎聘, 前程无忧 51Job, 智联招聘, 牛客网, etc.)
 */
export function detectPlatform(text: string): ChinesePlatform {
  if (/BOSS直聘|直聘|BOSS/i.test(text)) return "boss";
  if (/猎聘|liepin/i.test(text)) return "liepin";
  if (/前程无忧|51job/i.test(text)) return "51job";
  if (/智联招聘|智联/i.test(text)) return "zhaopin";
  if (/牛客网|牛客/i.test(text)) return "nowcoder";
  if (/实习僧/i.test(text)) return "shixiseng";
  return "other";
}

export function parseChineseJobPosting(rawText: string, id: string = "p-zh-1"): JobPosting {
  const platform = detectPlatform(rawText);
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let company: string | undefined;
  let roleTitle: string | undefined;
  let department: string | undefined;
  let location: string | undefined;
  let salaryRange: string | undefined;
  let experienceReq: string | undefined;
  let educationReq: string | undefined;

  const responsibilities: string[] = [];
  const requirements: string[] = [];
  const keywordsSet = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.replace(/^[【\[][^】\]]+[】\]]\s*/, "").trim();

    // Salary pattern
    const salaryMatch = line.match(/(\d+[-~到]\d+[kK万](?:·\d+薪|\/月|\/年)?)/);
    if (salaryMatch && !salaryRange) {
      salaryRange = salaryMatch[1];
    }

    // Experience pattern
    const expMatch = line.match(/(\d+[-~到]\d+年|\d+年以上|应届生|经验不限)/);
    if (expMatch && !experienceReq) {
      experienceReq = expMatch[1];
    }

    // Education pattern
    const eduMatch = line.match(/(统招本科|本科及以上|大专及以上|硕士及以上|本科|硕士|大专|博士|学历不限)/);
    if (eduMatch && !educationReq) {
      educationReq = eduMatch[1];
    }

    // Location pattern
    const locMatch = line.match(/([\u4e00-\u9fa5]{2,6}[·\-][\u4e00-\u9fa5]{2,6}(?:区|市)?)/);
    if (locMatch && !location && !line.includes("职责") && !line.includes("要求")) {
      location = locMatch[1];
    }

    // Role title
    if (!roleTitle) {
      const cleanLine = line.replace(/(?:职位|岗位|招聘)[：:\s]+/, "");
      const roleMatch = cleanLine.match(/^([\u4e00-\u9fa5a-zA-Z0-9_+/\-]{2,20}(?:工程师|专家|主管|总监|经理|架构师|开发|运维|运营|算法|前端|后端|全栈|测试|设计师|专员|助理))/);
      if (roleMatch) {
        roleTitle = roleMatch[1];
      }
    }

    // Company
    if (!company) {
      const compMatch = line.match(/(?:公司|企业|招聘方)[：:\s]+([\u4e00-\u9fa5a-zA-Z0-9（）()]{2,30})/);
      if (compMatch) {
        company = compMatch[1];
      } else if (line.endsWith("有限公司") || line.endsWith("科技") || line.endsWith("集团") || line.endsWith("网络")) {
        if (!line.includes("职责") && !line.includes("要求") && line.length < 35) {
          company = line;
        }
      }
    }
  }

  let currentSection: "resp" | "req" | "other" = "other";
  for (const line of lines) {
    if (/(?:岗位职责|工作职责|职位描述|职责描述|工作内容)[：:]?/i.test(line)) {
      currentSection = "resp";
      continue;
    } else if (/(?:任职要求|任职资格|职位要求|任职条件|我们需要你|加分项)[：:]?/i.test(line)) {
      currentSection = "req";
      continue;
    }

    if (currentSection === "resp") {
      if (/^[0-9一二三四五六七八九十、.\-·*\s]+/.test(line) || line.length > 5) {
        responsibilities.push(line.replace(/^[0-9一二三四五六七八九十、.\-·*\s]+/, ""));
      }
    } else if (currentSection === "req") {
      if (/^[0-9一二三四五六七八九十、.\-·*\s]+/.test(line) || line.length > 5) {
        requirements.push(line.replace(/^[0-9一二三四五六七八九十、.\-·*\s]+/, ""));
      }
    }

    const techMatches = line.match(/\b(React|Vue|TypeScript|JavaScript|Node\.js|Python|Java|Go|Golang|Rust|C\+\+|SQL|PostgreSQL|MySQL|Redis|Docker|Kubernetes|K8s|AWS|GraphQL|Next\.js|Tailwind|Microservices|微服务|分布式|高并发|云原生)\b/gi);
    if (techMatches) {
      for (const t of techMatches) keywordsSet.add(t);
    }
  }

  if (keywordsSet.size === 0) {
    keywordsSet.add("技术能力");
    keywordsSet.add("业务交付");
  }

  return {
    id,
    source: "user-paste",
    rawText,
    extracted: {
      company: company || "目标招聘企业",
      roleTitle: roleTitle || "目标岗位",
      department,
      location,
      language: "zh",
    },
    keywords: Array.from(keywordsSet),
    createdAt: new Date().toISOString(),
  };
}
