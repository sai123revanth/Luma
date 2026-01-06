export default async function handler(req, res) {
    // 1. Handle CORS (Cross-Origin Resource Sharing)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle Preflight Request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 2. Robust Body Parsing
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid JSON body in request' });
            }
        }
        
        const { message } = body || {};
        
        if (!message) {
             return res.status(400).json({ error: 'Message field is missing in request body' });
        }

        // Retrieve the API key
        const apiKey = process.env.CHAT_API; 
        if (!apiKey) {
            return res.status(500).json({ error: 'Server Error: CHAT_API environment variable is not set' });
        }

        // ==============================================================================
        // CONFIGURATION: PROVIDER SETUP
        // ==============================================================================

        // OPTION 1: Groq (Fastest, Recommended for Llama 3.1)
        const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
        // Note: Groq maps "Meta-Llama-3.1-8B-Instruct" to the ID below:
        const MODEL_NAME = 'llama-3.1-8b-instant';

        // ==============================================================================

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
                        content: "You are NexusAI, a technical assistant specialized in coding, debugging, and system architecture."
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
            // ERROR HANDLING FIX: Try to parse JSON error first to avoid [object Object]
            let errorMsg = `Provider API Error: ${response.status}`;
            
            try {
                const errorJson = await response.json();
                // Groq/OpenAI format usually has error.message
                if (errorJson.error && typeof errorJson.error === 'object') {
                    errorMsg = errorJson.error.message || JSON.stringify(errorJson.error);
                } else if (errorJson.error && typeof errorJson.error === 'string') {
                    errorMsg = errorJson.error;
                } else {
                    errorMsg = JSON.stringify(errorJson);
                }
            } catch (parseError) {
                // If JSON parse fails, fall back to text
                const errorText = await response.text();
                errorMsg += ` - ${errorText}`;
            }

            // Specific status checks
            if (response.status === 401) {
                throw new Error(`Invalid API Key. (Provider message: ${errorMsg})`);
            } else if (response.status === 404) {
                 throw new Error(`Model '${MODEL_NAME}' not found. (Provider message: ${errorMsg})`);
            } else {
                throw new Error(errorMsg);
            }
        }

        const data = await response.json();
        const botReply = data.choices?.[0]?.message?.content || "No response generated.";

        return res.status(200).json({ answer: botReply });

    } catch (error) {
        console.error('Backend Handler Error:', error);
        
        // Ensure error is always a string to prevent [object Object] in frontend
        const safeErrorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        
        return res.status(500).json({ 
            error: safeErrorMessage || 'An unexpected server error occurred'
        });
    }
}