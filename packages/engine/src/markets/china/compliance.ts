/**
 * Compliance constants & helpers for the China market overlay.
 * Conforms to 《人工智能生成合成内容标识办法》 and PIPL regulations.
 * Invariant (Constitution II & VII): no auto-sending, local-only processing.
 */

export const CHINA_AI_DISCLOSURE_TEXT =
  "【AI 辅助生成声明】本求职材料（含简历排版与自荐信）由求职者使用人工智能工具辅助进行相关性重构，所有履历细节、工作经验与项目成果均由求职者本人核验真实性并确认。符合《人工智能生成合成内容标识办法》。";

export const CHINA_PRIVACY_NOTICE =
  "【隐私与合规保障】JobSage 恪守本地优先（Local-First）原则。您的个人档案与岗位数据全程在本地运行，绝不上传至任何未经授权的第三方服务器。";

export function formatChinaDisclosure(enabled: boolean = true): { enabled: boolean; text: string } {
  return {
    enabled,
    text: CHINA_AI_DISCLOSURE_TEXT,
  };
}
