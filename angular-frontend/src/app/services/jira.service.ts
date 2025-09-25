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
}
