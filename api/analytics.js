import OpenAI from 'openai';

// This is a Vercel Serverless Function
export default async function handler(req, res) {
  // 1. Enable CORS (allows your frontend to talk to this backend)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle the OPTIONS request (pre-flight check for browsers)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Check for the API Key
  const apiKey = process.env.OPEN_AI; 
  if (!apiKey) {
    return res.status(500).json({ error: 'Server Error: OPEN_AI environment variable is missing.' });
  }

  // 3. Initialize the Client for GitHub Models
  const client = new OpenAI({
    baseURL: "https://models.inference.ai.azure.com", // Endpoint for GitHub Models
    apiKey: apiKey,
  });

  try {
    // 4. Get the data from the frontend request
    // We expect the frontend to send { data: "..." } containing the Excel data
    const { data, userQuery } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'No data provided.' });
    }

    // 5. Define the System Prompt for Analytics
    const systemPrompt = `
      You are an expert Data Analyst and Visualization Assistant.
      Your goal is to analyze the provided dataset and return a JSON object specifically for Chart.js.
      
      Rules:
      1. Analyze the user's data.
      2. Based on the data and the user's query, decide the best chart type (bar, line, pie, etc.).
      3. RETURN ONLY JSON. Do not include markdown formatting (like \`\`\`json).
      4. The JSON must follow this structure:
      {
        "summary": "A brief 1-sentence analysis of the trend.",
        "chartConfig": {
          "type": "bar", // or line, pie, etc.
          "data": {
            "labels": ["Label1", "Label2"],
            "datasets": [{
              "label": "Metric Name",
              "data": [10, 20],
              "backgroundColor": "rgba(75, 192, 192, 0.6)"
            }]
          }
        }
      }
    `;

    // 6. Call the AI Model
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the dataset: ${JSON.stringify(data)}. User Query: ${userQuery || "Analyze this and show a graph."}` }
      ],
      model: "gpt-4o", // Ensure you use a model supported by your GitHub token
      temperature: 0.1, // Low temperature for consistent JSON output
      max_tokens: 2000,
      response_format: { type: "json_object" } // Forces the model to return valid JSON
    });

    // 7. Return the result to your frontend
    const aiResponse = JSON.parse(completion.choices[0].message.content);
    return res.status(200).json(aiResponse);

  } catch (error) {
    console.error("AI Error:", error);
    return res.status(500).json({ error: "Failed to analyze data", details: error.message });
  }
}