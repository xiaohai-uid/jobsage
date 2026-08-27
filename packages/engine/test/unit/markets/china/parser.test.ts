import { describe, expect, it } from "vitest";
import { detectPlatform, parseChineseJobPosting } from "../../../../src/markets/china/parser.js";

describe("Chinese JD Parser", () => {
  it("detects BOSS直聘 platform and parses salary/role/requirements", () => {
    const sampleBoss = `
【BOSS直聘】高级全栈工程师 25-45K·15薪
北京·朝阳区 3-5年 本科及以上
北京智联未来科技有限公司
职位详情：
岗位职责：
1. 负责核心业务系统微服务架构设计与研发；
2. 推进 React / TypeScript 前端工程化及 Node.js BFF 建设；
3. 负责高并发数据流与 Redis 缓存优化。
任职要求：
1. 本科及以上学历，计算机相关专业，3年以上全栈开发经验；
2. 精通 TypeScript、React、Node.js 与 PostgreSQL；
3. 具备 Docker、Kubernetes 云原生容器化部署实战经验者优先。
福利待遇：
七险一金、弹性工作、免费三餐。
    `;

    expect(detectPlatform(sampleBoss)).toBe("boss");
    const parsed = parseChineseJobPosting(sampleBoss, "boss-test-1");
    expect(parsed.id).toBe("boss-test-1");
    expect(parsed.extracted.language).toBe("zh");
    expect(parsed.extracted.roleTitle).toContain("高级全栈工程师");
    expect(parsed.keywords).toContain("React");
    expect(parsed.keywords).toContain("TypeScript");
    expect(parsed.keywords).toContain("Node.js");
  });

  it("detects 猎聘 platform and parses structured fields", () => {
    const sampleLiepin = `
猎聘职位：资深前端架构师 30-50K
上海-浦东新区 5年以上 硕士及以上
某头部互联网独角兽集团
工作职责：
- 负责大型中后台前端中台及组件库建设
- 优化前端加载性能与 Webpack/Vite 编译速度
任职资格：
- 熟练掌握 Vue、React、TypeScript
- 具备跨团队技术领导力
    `;

    expect(detectPlatform(sampleLiepin)).toBe("liepin");
    const parsed = parseChineseJobPosting(sampleLiepin, "liepin-test-1");
    expect(parsed.extracted.language).toBe("zh");
    expect(parsed.keywords).toContain("TypeScript");
  });
});
