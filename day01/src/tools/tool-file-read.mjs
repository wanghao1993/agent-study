import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import fs from "node:fs/promises";
import { z } from "zod";
dotenv.config();

const AI = new ChatOpenAI({
  modelName: "deepseek-v4-flash",
  temperature: 0,
  apiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: "https://api.deepseek.com",
  },
});

const readFileTool = tool(
  async ({ filePath }) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      console.log(
        `File content read from ${filePath}:成功读取 ${content.length} 字符`,
      );
      return content;
    } catch (error) {
      return `Error reading file: ${error.message}`;
    }
  },
  {
    name: "readFile",
    description: "Reads the content of a file given its path.",
    schema: z.object({
      filePath: z.string().describe("The path to the file to read."),
    }),
  },
);

const tools = [readFileTool];

const modelWithTools = AI.bindTools(tools);
const message = [
  new SystemMessage(
    "You are a helpful assistant that can read files. \n 工作流程：1. 用户要求读取文件时，立即调用readFile工具读取文件内容；2. 读取文件后，直接将内容返回给用户。3. 基于文件内容进行分析和解释",
  ),

  new HumanMessage(
    "请读取文件 /Users/isaac/Desktop/agent-study/day01/src/tools/tool-file-read.mjs 的内容",
  ),
];

let res = await modelWithTools.invoke(message);
message.push(res);

while (res.tool_calls && res.tool_calls.length > 0) {
  console.log("Tool calls detected: ", res.tool_calls.length);

  const toolResults = await Promise.all(
    res.tool_calls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        throw new Error(`Tool ${toolCall.name} not found`);
      }

      console.log(
        `[执行工具] ${toolCall.name}:`,
        JSON.stringify(toolCall.args, null, 2),
      );
      try {
        const toolInput = toolCall.args;

        const result = await tool.invoke(toolInput);
        return result;
      } catch (error) {
        console.error(`Error invoking tool ${toolCall.name}:`, error);
        return `Error invoking tool ${toolCall.name}: ${error.message}`;
      }
    }),
  );
  console.log(toolResults, "toolResults");
  res.tool_calls.forEach((toolCall, index) => {
    message.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id,
      }),
    );
  });

  res = await modelWithTools.invoke(message);
  console.log("Final response from model:", res.content);
}
