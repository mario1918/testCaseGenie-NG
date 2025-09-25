import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  // Backend API Configuration
  private readonly config = {
    // Your Node.js/Express backend URL
    BACKEND_API_URL: 'http://localhost:5000',
    
    // Jira API proxy endpoints (through your backend)
    JIRA_API_URL: 'http://localhost:8000/api/jira',
    
    // Default Jira project configuration
    JIRA_PROJECT_KEY: 'SE2',
    JIRA_BOARD_ID: 942,
    
    // API endpoints
    endpoints: {
      // Test Case Generation
      generateTestCases: '/generate',
      
      // Jira endpoints (proxied through backend)
      jiraIssues: '/test-cases/paginated',
      jiraComponents: '/components',
      jiraSprints: '/sprints/ordered',
      jiraBoards: '/boards',
      
      // Health check
      health: '/health'
    }
  };

  constructor() {}

  get backendApiUrl(): string {
    return this.config.BACKEND_API_URL;
  }

  get jiraApiUrl(): string {
    return this.config.JIRA_API_URL;
  }

  get jiraProjectKey(): string {
    return this.config.JIRA_PROJECT_KEY;
  }

  get jiraBoardId(): number {
    return this.config.JIRA_BOARD_ID;
  }

  getEndpoint(endpointName: keyof typeof this.config.endpoints): string {
    return this.config.endpoints[endpointName];
  }

  getFullUrl(baseUrl: 'backend' | 'jira', endpointName: keyof typeof this.config.endpoints): string {
    const base = baseUrl === 'backend' ? this.backendApiUrl : this.jiraApiUrl;
    return `${base}${this.getEndpoint(endpointName)}`;
  }

  // Method to update configuration (useful for different environments)
  updateConfig(newConfig: Partial<typeof this.config>): void {
    Object.assign(this.config, newConfig);
  }

  // Method to check if backend is reachable
  isBackendReachable(): Promise<boolean> {
    return fetch(`${this.backendApiUrl}/health`)
      .then(response => response.ok)
      .catch(() => false);
  }

  // Method to check if Jira API is reachable
  isJiraApiReachable(): Promise<boolean> {
    return fetch(`${this.jiraApiUrl}/health`)
      .then(response => response.ok)
      .catch(() => false);
  }
}
