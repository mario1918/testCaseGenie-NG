export interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  issue_type: string;
  status: string;
  priority: string;
  assignee?: string;
  reporter?: string;
  sprint?: string;
  created?: string;
  updated?: string;
}

export interface JiraIssuesResponse {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

export interface JiraComponent {
  id: string;
  name: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
}
