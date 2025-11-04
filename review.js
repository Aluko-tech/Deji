// review.js
import 'dotenv/config';
import fs from 'fs';
import OpenAI from 'openai';
import { glob } from 'glob';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getAllCode() {
  // Find all JS/TS files excluding node_modules and test files
  const files = await glob('**/*.{js,ts}', {
    ignore: ['node_modules/**', '**/*.test.js', '**/*.spec.js']
  });

  let allCode = '';
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    allCode += `\n\n// FILE: ${file}\n${content}`;
  }
  return allCode;
}

async function reviewProject() {
  console.log("Collecting project files...");
  const allCode = await getAllCode();

  console.log("Sending code to ChatGPT for review (this might take a moment)...");

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert Node.js, Express, and backend API reviewer. Provide detailed improvement suggestions for the entire project.'
      },
      {
        role: 'user',
        content: `Here is the full project code:\n${allCode}`
      }
    ],
    temperature: 0.3
  });

  console.log("\n--- FULL PROJECT REVIEW ---\n");
  console.log(response.choices[0].message.content);
}

reviewProject();
