export interface AiSummaryResponse {
  summary: string | null
  suggestedQuestions: string[]
  cached: boolean
  updated_at?: string
}

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiChatResponse {
  reply: string
}

export interface AiAssistantAccessibility {
  readingLevel?: string | null
  ageGroup?: string | null
  simplifiedUi?: boolean | null
}

export async function fetchCachedLessonSummary(lessonId: string): Promise<AiSummaryResponse> {
  const res = await fetch(`/api/lessons/${lessonId}/ai-summary`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch lesson summary');
  }
  return res.json();
}

export async function generateLessonSummary(
  lessonId: string,
  accessibility: AiAssistantAccessibility
): Promise<AiSummaryResponse> {
  const res = await fetch(`/api/lessons/${lessonId}/ai-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accessibility),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate lesson summary');
  }
  return res.json();
}

export async function askLessonAssistant(
  lessonId: string,
  message: string,
  history: AiChatMessage[],
  accessibility: AiAssistantAccessibility
): Promise<AiChatResponse> {
  const res = await fetch(`/api/lessons/${lessonId}/ai-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, ...accessibility }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to get a response from the AI assistant');
  }
  return res.json();
}
