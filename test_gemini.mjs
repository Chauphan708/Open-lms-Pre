import { GoogleGenAI } from "@google/genai";
console.log("Testing GenAI Payload...");

const ai = new GoogleGenAI({ apiKey: "invalid_key_123" });
async function run() {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [
                {
                    inlineData: {
                        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
                        mimeType: "image/png"
                    }
                },
                "Hello"
            ]
        });
        console.log("Success", response);
    } catch (e) {
        console.error("Error catched:", JSON.stringify(e, null, 2));
    }
}
run();
