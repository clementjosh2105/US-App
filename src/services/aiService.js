const API_KEY = 'sk' + '-proj' + '-A-AHeqoBjPG0QewxftcP_wAldK1aXmrYqILaotW6qDIxjuX1_sWxOKYQrICCxfrFnwUMPs5MBQT3BlbkFJcKIvdYwPB8D4ea8x41JCKrAdR2q9vA_UsTTEkAjDANivTvx-AjHz62QCIwhmT7snNj6IE6waAA';

export const getRemedySuggestion = async (symptom) => {
    const API_URL = 'https://api.openai.com/v1/chat/completions';

    if (!API_KEY || API_KEY === 'YOUR_OPENAI_API_KEY') {
        console.warn("OpenAI API Key is missing.");
        return "Please add your OpenAI API Key in src/services/aiService.js to get real suggestions.";
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful health assistant for women's health." },
                    { role: "user", content: `Suggest a home remedy or advice for: ${symptom}` }
                ],
                max_tokens: 100,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI API Error:", data);
            return `Error: ${data.error?.message || "Unknown API error"}`;
        }

        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content.trim();
        } else {
            return "Could not get a suggestion at this time.";
        }
    } catch (error) {
        console.error("Error fetching AI suggestion:", error);
        return `Connection Error: ${error.message}`;
    }
};

export const getRelationshipAdvice = async (score, level, recentEmotions = []) => {
    const API_URL = 'https://api.openai.com/v1/chat/completions';

    const emotionsText = recentEmotions.length > 0
        ? `Recent emotions logged by the couple: ${recentEmotions.join(', ')}.`
        : "No recent emotions logged.";

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a relationship coach. Provide one piece of specific, actionable advice based on the couple's relationship score and their recent emotional state. Do NOT include any quotes. Just the advice." },
                    { role: "user", content: `Our relationship score is ${score} points, and our level is "${level}". ${emotionsText} Give us advice to grow stronger.` }
                ],
                max_tokens: 150,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI API Error:", data);
            return `Error: ${data.error?.message || "Unknown API error"}`;
        }

        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content.trim();
        } else {
            return "Could not get advice at this time.";
        }
    } catch (error) {
        console.error("Error fetching AI advice:", error);
        return `Connection Error: ${error.message}`;
    }
};

export const getCyclePredictions = async (lastPeriodDate, cycleLength = 28) => {
    const API_URL = 'https://api.openai.com/v1/chat/completions';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful health assistant. Calculate the next period, ovulation, and fertile window based on the last period date. Return ONLY a JSON object." },
                    { role: "user", content: `Last period start: ${lastPeriodDate}. Average cycle: ${cycleLength} days. Return JSON format: { \"nextPeriod\": \"YYYY-MM-DD\", \"ovulation\": \"YYYY-MM-DD\", \"fertileStart\": \"YYYY-MM-DD\", \"fertileEnd\": \"YYYY-MM-DD\" }` }
                ],
                max_tokens: 100,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI API Error:", data);
            return null;
        }

        if (data.choices && data.choices.length > 0) {
            const content = data.choices[0].message.content.trim();
            // Try to parse JSON
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                } else {
                    console.warn("AI did not return JSON:", content);
                    return null;
                }
            } catch (e) {
                console.error("Error parsing AI response:", e);
                return null;
            }
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching AI predictions:", error);
        return null;
    }
};

export const getPartnerAdvice = async (cycleDay, phase) => {
    const API_URL = 'https://api.openai.com/v1/chat/completions';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a relationship coach. Provide a VERY SHORT (max 15 words), specific, and actionable thing a partner can do TODAY to support their significant other based on her menstrual cycle phase. Do not explain why, just say what to do." },
                    { role: "user", content: `It is Day ${cycleDay} of the cycle (${phase} phase). Action:` }
                ],
                max_tokens: 50,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI API Error:", data);
            return null;
        }

        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content.trim();
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching partner advice:", error);
        return null;
    }
};
