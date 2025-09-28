import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { TestCase, GenerateTestCaseRequest, GenerateTestCaseResponse, ConversationMessage } from '../models/test-case.model';
import { JiraIssue } from '../models/jira-issue.model';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root'
})
export class TestCaseService {
  private testCasesSubject = new BehaviorSubject<TestCase[]>([]);
  private conversationHistorySubject = new BehaviorSubject<ConversationMessage[]>([]);

  public testCases$ = this.testCasesSubject.asObservable();
  public conversationHistory$ = this.conversationHistorySubject.asObservable();

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {}

  generateTestCases(issue: JiraIssue, isAdditional: boolean = false, existingTestCases: TestCase[] = []): Observable<any> {
    const payload: GenerateTestCaseRequest = {
      prompt: issue.description || '',
      issue_key: issue.key,
      summary: issue.summary || '',
      issue_type: issue.issue_type || '',
      status: issue.status || '',
      existing_test_cases: existingTestCases,
      conversation_history: this.conversationHistorySubject.value,
    };

    return this.http.post<any>(this.apiConfig.getFullUrl('backend', 'generateTestCases'), payload);
  }

  updateTestCases(testCases: TestCase[], append: boolean = false): void {
    // Ensure all test cases have default execution status
    const testCasesWithStatus = testCases.map(testCase => ({
      ...testCase,
      executionStatus: testCase.executionStatus || 'not-executed' as 'not-executed'
    }));

    if (append) {
      const currentTestCases = this.testCasesSubject.value;
      this.testCasesSubject.next([...currentTestCases, ...testCasesWithStatus]);
    } else {
      this.testCasesSubject.next(testCasesWithStatus);
    }
  }

  addTestCase(testCase: TestCase): void {
    const currentTestCases = this.testCasesSubject.value;
    const newTestCase = {
      ...testCase,
      executionStatus: testCase.executionStatus || 'not-executed' as 'not-executed'
    };
    this.testCasesSubject.next([...currentTestCases, newTestCase]);
  }

  updateTestCase(updatedTestCase: TestCase): void {
    const currentTestCases = this.testCasesSubject.value;
    const index = currentTestCases.findIndex(tc => tc.id === updatedTestCase.id);
    if (index !== -1) {
      currentTestCases[index] = updatedTestCase;
      this.testCasesSubject.next([...currentTestCases]);
    }
  }

  deleteTestCase(testCaseId: string): void {
    const currentTestCases = this.testCasesSubject.value;
    const filteredTestCases = currentTestCases.filter(tc => tc.id !== testCaseId);
    this.testCasesSubject.next(filteredTestCases);
  }

  updateConversationHistory(history: ConversationMessage[]): void {
    this.conversationHistorySubject.next(history);
  }

  clearConversationHistory(): void {
    this.conversationHistorySubject.next([]);
  }

  getCurrentTestCases(): TestCase[] {
    return this.testCasesSubject.value;
  }

  getCurrentConversationHistory(): ConversationMessage[] {
    return this.conversationHistorySubject.value;
  }

  exportToExcel(testCases: TestCase[], issueKey: string): void {
    // This will be implemented using the xlsx library
    import('xlsx').then(XLSX => {
      const worksheet = XLSX.utils.json_to_sheet(
        testCases.map((tc, index) => ({
          'ID': tc.id,
          'Title': tc.title,
          'Steps': tc.steps,
          'Expected Result': tc.expectedResult,
          'Priority': tc.priority,
          'Execution Status': tc.executionStatus || 'not-executed'
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');

      const fileName = `test-cases-${issueKey}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    });
  }
}
