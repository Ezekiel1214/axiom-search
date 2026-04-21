import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
}

async function tavilySearch(query: string, apiKey: string): Promise<TavilyResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      max_results: 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status} ${await response.text()}`);
  }

  const data: TavilyResponse = await response.json();
  return data.results;
}

function formatTavilyResultsAsContext(results: TavilyResult[]): string {
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
    )
    .join('\n\n');
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const searchProvider = process.env.SEARCH_PROVIDER || 'anthropic';
  const body = await req.json();

  if (searchProvider === 'tavily') {
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      return NextResponse.json({ error: 'Tavily API key not configured' }, { status: 500 });
    }

    // Extract the user's latest query from messages
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }> = body.messages || [];
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const query =
      typeof lastUserMessage?.content === 'string'
        ? lastUserMessage.content
        : Array.isArray(lastUserMessage?.content)
          ? lastUserMessage.content.find((b: { type: string; text?: string }) => b.type === 'text')?.text || ''
          : '';

    if (!query) {
      return NextResponse.json({ error: 'No user query found' }, { status: 400 });
    }

    // Call Tavily for web search results
    let tavilyResults: TavilyResult[];
    try {
      tavilyResults = await tavilySearch(query, tavilyApiKey);
    } catch (err) {
      return NextResponse.json(
        { error: `Tavily search failed: ${err instanceof Error ? err.message : String(err)}` },
        { status: 502 },
      );
    }

    const searchContext = formatTavilyResultsAsContext(tavilyResults);

    // Build a modified request body: inject search results as context, remove web_search tool
    const modifiedMessages = [...messages];
    const systemPrefix = `The following web search results were retrieved for the user's query. Use them to inform your response:\n\n${searchContext}\n\n`;
    const existingSystem = body.system || '';
    const system = systemPrefix + existingSystem;

    // Remove web_search tool from tools list if present
    const tools = (body.tools || []).filter(
      (t: { type?: string; name?: string }) => t.type !== 'web_search_20250305' && t.name !== 'web_search_20250305',
    );

    const modifiedBody = {
      ...body,
      system,
      messages: modifiedMessages,
      tools: tools.length > 0 ? tools : undefined,
    };

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
        'anthropic-beta': 'interleaved-thinking-2025-05-14',
      },
      body: JSON.stringify(modifiedBody),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new NextResponse(errText, { status: upstream.status });
    }

    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  // Default: existing Anthropic web_search tool path
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
      'anthropic-beta': 'interleaved-thinking-2025-05-14',
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return new NextResponse(errText, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
