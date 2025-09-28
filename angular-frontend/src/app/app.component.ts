import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { JiraService } from './services/jira.service';
import { TestCaseService } from './services/test-case.service';
import { BadgeUtilsService } from './services/badge-utils.service';
import { ConnectionStatusService, ConnectionStatus } from './services/connection-status.service';
import { ApiConfigService } from './services/api-config.service';
import { JiraIssue, JiraIssuesResponse, JiraComponent, JiraSprint } from './models/jira-issue.model';
import { TestCase } from './models/test-case.model';

declare var bootstrap: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'TestCaseGenie';
  
  // Filter properties
  jqlFilter = '';
  issueTypeFilter = '';
  componentFilter = '';
  sprintFilter = '';
  
  // Data properties
  jiraIssues: JiraIssue[] = [];
  components: JiraComponent[] = [];
  sprints: JiraSprint[] = [];
  testCases: TestCase[] = [];
  
  // Pagination
  currentStartAt = 0;
  totalResults = 0;
  maxResults = 50;
  
  // Loading states
  isLoadingIssues = false;
  isGeneratingTestCases = false;
  
  // Current issue for test case generation
  currentIssue: JiraIssue | null = null;
  
  // Modal references
  issueDetailsModal: any;
  addTestCaseModal: any;
  editTestCaseModal: any;
  
  // Form data for modals
  newTestCase: Partial<TestCase> = {
    title: '',
    steps: '',
    expectedResult: '',
    priority: 'medium'
  };
  
  editingTestCase: TestCase | null = null;

  // Connection status
  connectionStatus: ConnectionStatus = {
    backend: false,
    jiraApi: false,
    lastChecked: new Date()
  };

  // Import to Jira properties
  isImportingToJira = false;
  jiraVersions: any[] = [];
  testCycles: any[] = [];
  selectedVersionId: string = '';
  selectedCycleId: string = '';
  importToJiraModal: any;

  constructor(
    public themeService: ThemeService,
    private jiraService: JiraService,
    private testCaseService: TestCaseService,
    public badgeUtils: BadgeUtilsService,
    private connectionStatusService: ConnectionStatusService,
    public apiConfig: ApiConfigService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.subscribeToTestCases();
    this.subscribeToConnectionStatus();
    this.initializeModals();
  }

  private loadInitialData(): void {
    this.loadJiraComponents();
    this.loadJiraSprints();
    this.loadJiraIssues();
  }

  private subscribeToTestCases(): void {
    this.testCaseService.testCases$.subscribe(testCases => {
      this.testCases = testCases;
    });
  }

  private subscribeToConnectionStatus(): void {
    this.connectionStatusService.connectionStatus$.subscribe(status => {
      this.connectionStatus = status;
    });
  }

  private initializeModals(): void {
    // Initialize Bootstrap modals after view init
    setTimeout(() => {
      const issueDetailsModalEl = document.getElementById('issueDetailsModal');
      const addTestCaseModalEl = document.getElementById('addTestCaseModal');
      const editTestCaseModalEl = document.getElementById('editTestCaseModal');
      const viewIssueModalEl = document.getElementById('viewIssueModal');
      const importToJiraModalEl = document.getElementById('importToJiraModal');
      
      if (issueDetailsModalEl) {
        this.issueDetailsModal = new bootstrap.Modal(issueDetailsModalEl);
      }
      if (addTestCaseModalEl) {
        this.addTestCaseModal = new bootstrap.Modal(addTestCaseModalEl);
      }
      if (editTestCaseModalEl) {
        this.editTestCaseModal = new bootstrap.Modal(editTestCaseModalEl);
      }
      if (viewIssueModalEl) {
        this.viewIssueModal = new bootstrap.Modal(viewIssueModalEl);
      }
      if (importToJiraModalEl) {
        this.importToJiraModal = new bootstrap.Modal(importToJiraModalEl);
      }
    }, 100);
  }

  loadJiraComponents(): void {
    this.jiraService.getComponents().subscribe({
      next: (components) => {
        this.components = components;
      },
      error: (error) => {
        console.error('Error loading components:', error);
      }
    });
  }

  loadJiraSprints(): void {
    this.jiraService.getSprints().subscribe({
      next: (data) => {
        this.sprints = data.sprints || [];
      },
      error: (error) => {
        console.error('Error loading sprints:', error);
      }
    });
  }

  loadJiraIssues(): void {
    this.isLoadingIssues = true;
    
    const filters = {
      issueType: this.issueTypeFilter,
      component: this.componentFilter,
      sprint: this.sprintFilter,
      jqlQuery: this.jqlFilter.trim(),
      startAt: this.currentStartAt,
      maxResults: this.maxResults
    };

    this.jiraService.getIssues(filters).subscribe({
      next: (response: JiraIssuesResponse) => {
        this.jiraIssues = response.issues || [];
        this.totalResults = response.total || 0;
        this.isLoadingIssues = false;
      },
      error: (error) => {
        console.error('Error loading issues:', error);
        this.jiraIssues = [];
        this.totalResults = 0;
        this.isLoadingIssues = false;
      }
    });
  }

  applyFilters(): void {
    this.currentStartAt = 0;
    this.loadJiraIssues();
  }

  clearFilters(): void {
    this.jqlFilter = '';
    this.issueTypeFilter = '';
    this.componentFilter = '';
    this.sprintFilter = '';
    this.currentStartAt = 0;
    this.loadJiraIssues();
  }

  previousPage(): void {
    if (this.currentStartAt > 0) {
      this.currentStartAt = Math.max(0, this.currentStartAt - this.maxResults);
      this.loadJiraIssues();
    }
  }

  nextPage(): void {
    if (this.currentStartAt + this.maxResults < this.totalResults) {
      this.currentStartAt += this.maxResults;
      this.loadJiraIssues();
    }
  }

  showIssueDetails(issue: JiraIssue): void {
    this.currentIssue = issue;
    if (this.issueDetailsModal) {
      this.issueDetailsModal.show();
    }
  }

  generateTestCases(): void {
    if (!this.currentIssue) return;
    
    this.isGeneratingTestCases = true;
    
    this.testCaseService.generateTestCases(this.currentIssue).subscribe({
      next: (response) => {
        const testCases = Array.isArray(response) ? response : (response.testCases || response.data || []);
        this.testCaseService.updateTestCases(testCases);
        
        if (response.conversation_history) {
          this.testCaseService.updateConversationHistory(response.conversation_history);
        }
        
        this.isGeneratingTestCases = false;
        if (this.issueDetailsModal) {
          this.issueDetailsModal.hide();
        }
        
        this.showSuccessToast(`Successfully generated ${testCases.length} test cases!`);
      },
      error: (error) => {
        console.error('Error generating test cases:', error);
        this.isGeneratingTestCases = false;
        this.showErrorToast('Failed to generate test cases. Please try again.');
      }
    });
  }

  generateMoreTestCases(): void {
    if (!this.currentIssue) return;
    
    this.isGeneratingTestCases = true;
    const existingTestCases = this.testCaseService.getCurrentTestCases();
    
    this.testCaseService.generateTestCases(this.currentIssue, true, existingTestCases).subscribe({
      next: (response) => {
        const testCases = Array.isArray(response) ? response : (response.testCases || response.data || []);
        this.testCaseService.updateTestCases(testCases, true);
        
        if (response.conversation_history) {
          this.testCaseService.updateConversationHistory(response.conversation_history);
        }
        
        this.isGeneratingTestCases = false;
        this.showSuccessToast(`Successfully generated ${testCases.length} more test cases!`);
      },
      error: (error) => {
        console.error('Error generating more test cases:', error);
        this.isGeneratingTestCases = false;
        this.showErrorToast('Failed to generate more test cases. Please try again.');
      }
    });
  }

  showAddTestCaseModal(): void {
    this.newTestCase = {
      title: '',
      steps: '',
      expectedResult: '',
      priority: 'medium'
    };
    if (this.addTestCaseModal) {
      this.addTestCaseModal.show();
    }
  }

  addTestCase(): void {
    if (this.newTestCase.title && this.newTestCase.steps && this.newTestCase.expectedResult) {
      const testCase: TestCase = {
        id: `tc-${Date.now()}`,
        title: this.newTestCase.title,
        steps: this.newTestCase.steps,
        expectedResult: this.newTestCase.expectedResult,
        priority: this.newTestCase.priority as 'high' | 'medium' | 'low',
        executionStatus: 'not-executed'
      };
      
      this.testCaseService.addTestCase(testCase);
      
      if (this.addTestCaseModal) {
        this.addTestCaseModal.hide();
      }
      
      this.showSuccessToast('Test case added successfully!');
    }
  }

  showEditTestCaseModal(testCase: TestCase): void {
    this.editingTestCase = { ...testCase };
    if (this.editTestCaseModal) {
      this.editTestCaseModal.show();
    }
  }

  saveTestCaseChanges(): void {
    if (this.editingTestCase) {
      this.testCaseService.updateTestCase(this.editingTestCase);
      
      if (this.editTestCaseModal) {
        this.editTestCaseModal.hide();
      }
      
      this.showSuccessToast('Test case updated successfully!');
    }
  }

  deleteTestCase(testCaseId: string): void {
    if (confirm('Are you sure you want to delete this test case?')) {
      this.testCaseService.deleteTestCase(testCaseId);
      this.showSuccessToast('Test case deleted successfully!');
    }
  }

  exportToExcel(): void {
    if (this.testCases.length > 0 && this.currentIssue) {
      this.testCaseService.exportToExcel(this.testCases, this.currentIssue.key);
    }
  }

  private showSuccessToast(message: string): void {
    // Implementation for success toast
    console.log('Success:', message);
  }

  private showErrorToast(message: string): void {
    // Implementation for error toast
    console.error('Error:', message);
  }

  get canGoToPreviousPage(): boolean {
    return this.currentStartAt > 0;
  }

  get canGoToNextPage(): boolean {
    return this.currentStartAt + this.maxResults < this.totalResults;
  }

  get paginationInfo(): string {
    if (this.totalResults === 0) return '0 items';
    const startItem = this.currentStartAt + 1;
    const endItem = Math.min(this.currentStartAt + this.jiraIssues.length, this.totalResults);
    return `${startItem}-${endItem} of ${this.totalResults} items`;
  }

  // Additional modal references
  viewIssueModal: any;

  private initializeViewIssueModal(): void {
    setTimeout(() => {
      const viewIssueModalEl = document.getElementById('viewIssueModal');
      if (viewIssueModalEl) {
        this.viewIssueModal = new bootstrap.Modal(viewIssueModalEl);
      }
    }, 100);
  }

  viewIssueDetails(issue: JiraIssue): void {
    this.currentIssue = issue;
    if (!this.viewIssueModal) {
      this.initializeViewIssueModal();
      setTimeout(() => {
        if (this.viewIssueModal) {
          this.viewIssueModal.show();
        }
      }, 200);
    } else {
      this.viewIssueModal.show();
    }
  }

  generateTestCasesFromView(): void {
    if (this.viewIssueModal) {
      this.viewIssueModal.hide();
    }
    setTimeout(() => {
      this.generateTestCases();
    }, 300);
  }

  updateTestCaseStatus(testCase: TestCase): void {
    this.testCaseService.updateTestCase(testCase);
    this.showSuccessToast(`Test case status updated to ${testCase.executionStatus}`);
  }

  // TrackBy functions for performance
  trackByIssueKey(index: number, issue: JiraIssue): string {
    return issue.key;
  }

  trackByTestCaseId(index: number, testCase: TestCase): string {
    return testCase.id;
  }

  // Math reference for template
  Math = Math;

  // Import to Jira functionality
  showImportToJiraModal(): void {
    if (this.testCases.length === 0) {
      this.showErrorToast('No test cases to import. Please generate test cases first.');
      return;
    }

    // Load Jira versions and test cycles
    this.loadJiraVersions();
    this.loadTestCycles(-1); // Load with default version_id=-1
    
    if (this.importToJiraModal) {
      this.importToJiraModal.show();
    }
  }

  loadJiraVersions(): void {
    console.log('Loading Jira versions...');
    this.jiraService.getVersions().subscribe({
      next: (versions) => {
        console.log('Loaded versions:', versions);
        
        // Ensure we have an array
        if (Array.isArray(versions)) {
          // Sort versions by release date in descending order (newest first)
          this.jiraVersions = versions.sort((a, b) => {
            const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
            const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
            return dateB - dateA;
          });
        } else {
          console.warn('Unexpected versions response format:', versions);
          this.jiraVersions = [];
        }
        
        console.log('Sorted versions:', this.jiraVersions);
      },
      error: (error) => {
        console.error('Error loading Jira versions:', error);
        this.jiraVersions = []; // Ensure it's always an array
        this.showErrorToast('Failed to load Jira versions');
      }
    });
  }

  loadTestCycles(versionId: number = -1): void {
    console.log('Loading test cycles for version ID:', versionId);
    this.jiraService.getTestCycles(versionId).subscribe({
      next: (response) => {
        console.log('Test cycles response:', response);
        
        // Handle the actual API response structure
        if (Array.isArray(response)) {
          this.testCycles = response;
        } else if (response && Array.isArray(response.items)) {
          // This is the correct structure based on your API response
          this.testCycles = response.items;
        } else if (response && Array.isArray(response.cycles)) {
          this.testCycles = response.cycles;
        } else if (response && Array.isArray(response.data)) {
          this.testCycles = response.data;
        } else {
          console.warn('Unexpected test cycles response format:', response);
          this.testCycles = [];
        }
        
        console.log('Processed test cycles:', this.testCycles);
        console.log('Test cycles count:', this.testCycles.length);
      },
      error: (error) => {
        console.error('Error loading test cycles:', error);
        this.testCycles = []; // Ensure it's always an array
        this.showErrorToast('Failed to load test cycles');
      }
    });
  }

  onVersionChange(): void {
    console.log('Version changed to:', this.selectedVersionId);
    console.log('Is test cycle disabled?', this.isTestCycleDisabled);
    const versionId = this.selectedVersionId ? parseInt(this.selectedVersionId) : -1;
    this.selectedCycleId = ''; // Reset cycle selection
    this.loadTestCycles(versionId);
  }

  get isTestCycleDisabled(): boolean {
    const disabled = !this.selectedVersionId || this.selectedVersionId === '';
    console.log('Test cycle disabled check - selectedVersionId:', `"${this.selectedVersionId}"`, 'type:', typeof this.selectedVersionId, 'disabled:', disabled);
    return disabled;
  }

  importToJira(): void {
    if (this.testCases.length === 0) {
      this.showErrorToast('No test cases to import');
      return;
    }

    // Validate selections
    if (!this.selectedVersionId) {
      this.showErrorToast('Please select a version');
      return;
    }

    if (!this.selectedCycleId) {
      this.showErrorToast('Please select a test cycle');
      return;
    }

    this.isImportingToJira = true;

    const importOptions = {
      projectKey: this.apiConfig.jiraProjectKey,
      versionId: this.selectedVersionId,
      cycleId: this.selectedCycleId,
      issueInfo: this.currentIssue ? {
        key: this.currentIssue.key,
        sprintId: this.currentIssue.sprint ? parseInt(this.currentIssue.sprint) : 0,
        component: this.currentIssue.component
      } : undefined
    };

    this.jiraService.importTestCasesToJira(this.testCases, importOptions).subscribe({
      next: (response) => {
        this.isImportingToJira = false;
        
        if (response.success) {
          const message = `Successfully imported ${response.created} test cases to Jira!`;
          if (response.failed > 0) {
            this.showErrorToast(`${message} ${response.failed} failed to import.`);
          } else {
            this.showSuccessToast(message);
          }
        } else {
          this.showErrorToast('Failed to import test cases to Jira');
        }

        if (this.importToJiraModal) {
          this.importToJiraModal.hide();
        }
      },
      error: (error) => {
        this.isImportingToJira = false;
        console.error('Error importing to Jira:', error);
        this.showErrorToast('Failed to import test cases to Jira. Please check your connection and try again.');
      }
    });
  }

  get canImportToJira(): boolean {
    return this.testCases.length > 0 && this.connectionStatus.jiraApi;
  }

  get canConfirmImport(): boolean {
    return this.selectedVersionId !== '' && this.selectedCycleId !== '' && !this.isImportingToJira;
  }
}
