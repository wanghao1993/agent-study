import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";

dotenv.config();

const AI = new ChatOpenAI({
  modelName: "deepseek-v4-flash",
  temperature: 0,
  apiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: "https://api.deepseek.com",
  },
});

const response = await AI.invoke("介绍一下自己");

console.log(response.content);
