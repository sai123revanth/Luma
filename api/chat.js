/**
 * Vercel Serverless Function: /api/chat
 * Handles Groq API integration with JSON enforcement.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { query, systemPrompt, image } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: 'API Configuration Error' });
  }

  // Model selection: Llama-3.2-90b-vision-preview for images, Llama-3.3-70b-versatile for text
  const model = image ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

  const messages = [
    { role: "system", content: systemPrompt + " IMPORTANT: You MUST respond ONLY with a valid JSON object. No Markdown, no backticks." },
    {
      role: "user",
      content: image 
        ? [
            { type: "text", text: query || "What is this product?" },
            { type: "image_url", image_url: { url: image } }
          ]
        : query
    }
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: "json_object" } // Force JSON output
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq Error:", errorData);
      throw new Error("Groq API Request Failed");
    }

    const result = await response.json();
    let content = result.choices[0].message.content;

    // Parse safety: ensure it's valid JSON for the frontend
    const parsedData = JSON.parse(content);
    return res.status(200).json(parsedData);

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ 
      message: "LUMA AI is currently undergoing prism maintenance. Please try again shortly.",
      error: error.message 
    });
  }
}