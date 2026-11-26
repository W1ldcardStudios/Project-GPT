import OpenAI from "openai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "The server is missing OPENAI_API_KEY." }, { status: 500 });
    }

    const body = await request.json();
    const messages = body.messages as ChatMessage[];

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return Response.json({ error: "Please send between 1 and 40 messages." }, { status: 400 });
    }

    const valid = messages.every(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0 &&
        m.content.length <= 12000
    );

    if (!valid) {
      return Response.json({ error: "One or more messages are invalid." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions:
        "You are Project GPT, a helpful, clear, friendly AI assistant. Answer accurately, explain your reasoning at an appropriate level, and admit uncertainty when needed. Use Markdown when it improves readability.",
      input: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "response.output_text.delta") {
              controller.enqueue(encoder.encode(event.delta));
            }
          }
          controller.close();
        } catch {
          controller.error(new Error("The AI response stream failed."));
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: "The AI request failed. Check your API setup and try again." }, { status: 500 });
  }
}
