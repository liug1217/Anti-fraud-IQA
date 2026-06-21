// Vercel Node.js Serverless Function
// 路徑: /api/chat
// 用途: 接收前端送來的訊息,呼叫 Hugging Face 的免費 Inference API,
//       把 AI 的回覆傳回前端。HF_API_TOKEN 存在 Vercel 環境變數裡,
//       不會曝露在前端程式碼中。

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { message } = req.body || {};

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "缺少 message 參數" });
    return;
  }

  const HF_TOKEN = process.env.HF_API_TOKEN;
  const MODEL = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";

  if (!HF_TOKEN) {
    res.status(500).json({
      error: "伺服器未設定 HF_API_TOKEN,請到 Vercel 專案的 Settings > Environment Variables 加入"
    });
    return;
  }

  try {
    const hfResponse = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + HF_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "你是「反詐騙IQA」App 裡的智能小助手,用簡短的繁體中文回覆(2-3句話以內)。" +
              "不要對特定網址、電話號碼或具體個案直接斷定「安全」或「是詐騙」," +
              "只給通用的防詐騙建議與觀念,並可以建議使用者使用 App 裡的網址檢查、訊息分析、電話查詢功能做進一步確認。"
          },
          { role: "user", content: message }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      res.status(502).json({
        error: "呼叫 AI 模型失敗",
        detail: errText
      });
      return;
    }

    const data = await hfResponse.json();
    const reply =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
      "不好意思,我目前沒辦法理解這個問題,建議您使用「訊息分析」「電話查詢」或「網址檢查」功能做進一步確認。";

    res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message || "未知錯誤" });
  }
}
