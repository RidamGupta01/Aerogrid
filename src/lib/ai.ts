export async function generateEvacuationAdvice(
  maxV: number,
  eta: number,
  level: string,
  shelterName: string,
  distKm: number
): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  const prompt = `You are an AI disaster desk assistant. The user is in a ${level} risk zone for an incoming cyclone. 
Peak winds at their location will be ${Math.round(maxV)} km/h. 
The cyclone hits in ${eta} hours. 
The nearest safe shelter is ${shelterName}, located ${distKm.toFixed(1)} km away.

Write a very brief (2-3 sentences max), urgent, and highly actionable survival instruction. Do not use formatting like markdown. Be direct and authoritative.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 150
      })
    });

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim();
    }
    throw new Error("No completion");
  } catch (error) {
    console.error("Groq API Error:", error);
    return `Based on the ${Math.round(maxV)}km/h projection at your location, structural damage is likely. Proceed to ${shelterName} before T+${Math.max(1, eta - 4)}h.`;
  }
}
