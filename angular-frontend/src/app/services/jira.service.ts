import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JiraIssue, JiraIssuesResponse, JiraComponent, JiraSprint } from '../models/jira-issue.model';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root'
})
export class JiraService {
  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {}

  getIssues(filters: {
    issueType?: string;
    component?: string;
    sprint?: string;
    jqlQuery?: string;
    startAt?: number;
    maxResults?: number;
  } = {}): Observable<JiraIssuesResponse> {
    let params = new HttpParams()
      .set('project_key', this.apiConfig.jiraProjectKey)
      .set('start_at', (filters.startAt || 0).toString())
      .set('max_results', (filters.maxResults || 50).toString());

    if (filters.issueType) {
      params = params.set('issue_type', filters.issueType);
    }
    if (filters.component) {
      params = params.set('component', filters.component);
    }
    if (filters.sprint) {
      params = params.set('sprint', filters.sprint);
    }

    if (filters.jqlQuery) {
      params = params.set('jql_filter', filters.jqlQuery);
    } else {
      // Build JQL from individual filters
      const jqlFilter = [];
      if (filters.issueType) jqlFilter.push(`issuetype = "${filters.issueType}"`);
      if (filters.component) jqlFilter.push(`component = "${filters.component}"`);
      if (filters.sprint) jqlFilter.push(`sprint = "${filters.sprint}"`);
      
      if (jqlFilter.length > 0) {
        params = params.set('jql_filter', jqlFilter.join(' AND '));
      }
    }

    return this.http.get<JiraIssuesResponse>(this.apiConfig.getFullUrl('jira', 'jiraIssues'), { params });
  }

  getComponents(): Observable<JiraComponent[]> {
    const params = new HttpParams().set('project_key', this.apiConfig.jiraProjectKey);
    return this.http.get<JiraComponent[]>(this.apiConfig.getFullUrl('jira', 'jiraComponents'), { params });
  }

  getSprints(boardId?: number): Observable<{ sprints: JiraSprint[] }> {
    const id = boardId || this.apiConfig.jiraBoardId;
    return this.http.get<{ sprints: JiraSprint[] }>(`${this.apiConfig.getFullUrl('jira', 'jiraSprints')}?board_id=${id}`);
  }

  getBoards(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiConfig.getFullUrl('jira', 'jiraBoards')}?project_key=${this.apiConfig.jiraProjectKey}`);
  }

  // Import test cases to Jira
  importTestCasesToJira(testCases: any[], options: {
    projectKey?: string;
    versionId?: string;
    cycleId?: string;
    folderId?: string;
    issueInfo?: {
      key?: string;
      sprintId?: number;
      component?: string;
    };
  } = {}): Observable<any> {
    // Transform test cases to match the API schema
    const transformedTestCases = testCases.map(testCase => ({
      summary: testCase.title || testCase.summary || '',
      description: testCase.title || testCase.summary || '', // Use title as description too
      components: options.issueInfo?.component ? [options.issueInfo.component] : ["Supply Chain"], // Map component from issue
      related_issues: options.issueInfo?.key ? [options.issueInfo.key] : [], // Map issue key
      steps: this.parseStepsToArray(testCase.steps || ''),
      version_id: parseInt(options.versionId || '-1'),
      cycle_id: parseInt(options.cycleId || '-1'),
      sprint_id: options.issueInfo?.sprintId || 0, // Map sprint ID from issue
      execution_status: {
        id: this.getExecutionStatusId(testCase.executionStatus || 'not-executed')
      }
    }));

    const payload = {
      TestCases: transformedTestCases,
      version_id: parseInt(options.versionId || '-1'),
      cycle_id: parseInt(options.cycleId || '-1')
    };

    return this.http.post<any>(`http://localhost:8000/api/test-cases/bulk/full-create`, payload);
  }

  // Helper method to parse steps string into array format
  private parseStepsToArray(stepsString: string): any[] {
    if (!stepsString) return [];
    
    // Split by numbered steps (1., 2., 3., etc.) or line breaks
    const stepLines = stepsString
      .split(/\d+\.\s*/)
      .filter(step => step.trim())
      .map(step => step.trim());
    
    if (stepLines.length === 0) {
      // If no numbered steps found, treat as single step
      return [{
        step: stepsString.trim(),
        stepDescription: stepsString.trim(),
        data: "",
        result: ""
      }];
    }
    
    // Convert each step to the expected format
    return stepLines.map(stepText => ({
      step: stepText,
      stepDescription: stepText,
      data: "",
      result: stepText.toLowerCase().includes('result') || stepText.toLowerCase().includes('should') ? stepText : ""
    }));
  }

  // Helper method to get execution status ID
  private getExecutionStatusId(status: string): number {
    const statusMap: { [key: string]: number } = {
      'not-executed': -1,
      'passed': 1,
      'failed': 2,
      'blocked': 4
    };
    return statusMap[status] || 1;
  }

  // Get project versions
  getVersions(): Observable<any[]> {
    const params = new HttpParams()
      .set('all', 'true')
      .set('max_per_page', '50');
    return this.http.get<any[]>(`http://localhost:8000/api/jira/versions`, { params });
  }

  // Get Zephyr test cycles
  getTestCycles(versionId: number = -1): Observable<any> {
    const params = new HttpParams()
      .set('version_id', versionId.toString())
      .set('offset', '0')
      .set('limit', '50');
    return this.http.get<any>(`http://localhost:8000/api/zephyr/cycles`, { params });
  }
}
