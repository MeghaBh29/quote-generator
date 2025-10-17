require("dotenv").config({ path: "./cred.env" });
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post("/api-endpoint", async (req, res) => {
  try {
    console.log("📨 Received POST /api-endpoint");

    const { secret, brief, email, task, round, nonce, evaluation_url } = req.body;

    // Verify secret
    if (secret !== process.env.STUDENT_SECRET) {
      console.log("❌ Secret mismatch");
      return res.status(403).json({ error: "Invalid secret" });
    }

    console.log("✅ Secret verified. Generating app...");

    // Prepare prompt for LLM
    const prompt = `
You are a coding assistant. Build a minimal app based on the following brief:
${brief}

Requirements:
- Use MIT license
- Write a professional README.md
- The app should be deployable on GitHub Pages

Respond with a JSON object containing:
{
  "files": {
    "index.html": "<html>...</html>",
    "README.md": "..."
  },
  "license": "MIT"
}
`;

    // Call AIPipe API
    const response = await axios.post(
      process.env.AIPIPE_API_URL,
      {
        model: "openai/gpt-4.1-nano",
        input: prompt,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AIPIPE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Here you would parse the response and create the repo + push + enable GitHub Pages
    // For demo, just log the output and send success response
    const llmOutput = response.data.output?.[0]?.content?.[0]?.text || '❌ No output content received';



    console.log("\n📦 Generated Files:\n", llmOutput);

    // Simulate repo URL and commit SHA for evaluation post
    const repo_url = `https://github.com/yourusername/${task}`;
    const commit_sha = "dummycommitsha123456";
    const pages_url = `https://yourusername.github.io/${task}/`;

    // POST to evaluation_url
    try {
      await axios.post(
        evaluation_url,
        {
          email,
          task,
          round,
          nonce,
          repo_url,
          commit_sha,
          pages_url,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("✅ Evaluation URL notified");
    } catch (evalErr) {
      console.error("❌ Failed to notify evaluation URL:", evalErr.message);
      // Retry logic could go here
    }

    return res.status(200).json({ status: "✅ Task accepted" });
  } catch (err) {
    console.error("❌ Error handling /api-endpoint:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
