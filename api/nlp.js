export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message } = req.body;
        
        // Retrieve the API key from Vercel Environment Variables
        // Ensure this matches your Vercel Project Settings > Environment Variables
        const apiKey = process.env.CHAT_API; 

        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error: API Key missing' });
        }

        // CONFIGURATION: Llama 3.1 Provider URL (Defaulting to Groq)
        const API_URL = 'https://api.groq.com/openai/v1/chat/completions'; 

        // CONFIGURATION: Llama 3.1 Model ID
        // For Groq use: 'llama-3.1-70b-versatile' or 'llama-3.1-8b-instant'
        // For Together AI use: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
        const MODEL_NAME = 'llama-3.1-70b-versatile';

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    {
                        role: "system",
                        content: "You are NexusAI, a technical assistant specialized in coding, debugging, and system architecture. You provide concise, technical, and accurate answers."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        
        // Extract the actual text response
        const botReply = data.choices[0].message.content;

        return res.status(200).json({ answer: botReply });

    } catch (error) {
        console.error('Backend Error:', error);
        return res.status(500).json({ error: 'Failed to process request', details: error.message });
    }
}