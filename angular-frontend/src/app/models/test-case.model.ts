export interface TestCase {
  id: string;
  title: string;
  steps: string;
  expectedResult: string;
  priority: 'high' | 'medium' | 'low';
  executionStatus?: 'not-executed' | 'passed' | 'failed' | 'blocked';
}

export interface GenerateTestCaseRequest {
  prompt: string;
  issue_key?: string;
  summary?: string;
  issue_type?: string;
  status?: string;
  existing_test_cases?: TestCase[];
  conversation_history?: ConversationMessage[];
  is_additional_generation?: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateTestCaseResponse {
  testCases?: TestCase[];
  data?: TestCase[];
  conversation_history?: ConversationMessage[];
}
