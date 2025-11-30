
// 火山引擎 Ark API 端点 (Doubao)
const API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

export const generateBlogContent = async (request) => {
  const apiKey = process.env.ARK_API_KEY;
  // 豆包模型需要具体的 Endpoint ID (例如 ep-20240604123456-abcde)
  // 用户需要在环境变量中提供此 ID
  const modelEndpoint = process.env.ARK_MODEL_ENDPOINT;

  if (!apiKey || !modelEndpoint) {
    throw new Error("未配置豆包 API。请设置 ARK_API_KEY 和 ARK_MODEL_ENDPOINT (Endpoint ID)。");
  }

  let systemPrompt = "你是一个全能的 AI 写作助手，服务于「流影博客」。你的输出应当是 Markdown 格式。风格偏向：深度、优雅、技术前沿。";
  let userPrompt = "";

  // 提示词构建逻辑
  switch (request.type) {
    case 'TITLE':
      userPrompt = `请根据以下主题/关键词，生成5个吸引人的中文文章标题。
要求：
1. 每个标题独占一行
2. 只输出标题本身，不要序号、引号或其他说明
3. 标题要与主题高度相关
4. 风格：专业但不失吸引力

主题/关键词：${request.prompt}`;
      break;
    case 'SUMMARY':
      userPrompt = `请为以下内容写一段 100 字左右的摘要，要求语言精炼，带有悬念，能吸引读者点击。内容：\n\n${request.context}`;
      break;
    case 'POLISH':
      userPrompt = `请润色以下文本。保持 Markdown 格式，优化行文逻辑，使其听起来更专业、更有深度，同时保留作者的原意：\n\n${request.prompt}`;
      break;
    case 'CONTINUE':
      systemPrompt += " 保持与上文一致的文风。";
      userPrompt = `请基于上下文继续撰写文章。\n上下文片段：\n${request.context?.slice(-800)}\n\n续写提示： "${request.prompt}"`;
      break;
    case 'TAG_GENERATE':
      userPrompt = `我计划写一篇关于标签 [${request.tags?.join(', ')}] 的文章。请根据这些标签的特性，生成一份结构清晰的文章大纲（包含一级和二级标题），并提供开头的一段引言。`;
      break;
    case 'SEO_OPTIMIZE':
      userPrompt = `请分析以下文章内容的 SEO（搜索引擎优化）表现。给出 3 个具体的优化建议，并提取 5 个最佳 SEO 关键词。\n\n文章内容片段：\n${request.context?.slice(0, 1500)}...`;
      break;
    default:
      userPrompt = request.prompt;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelEndpoint,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Doubao API Error:", errorData);
      throw new Error(`API 请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    return content || "生成内容为空，请重试。";

  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error(error.message || "AI 服务连接中断，请检查网络设置。");
  }
};
