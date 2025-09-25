import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiConfigService } from './api-config.service';

export interface ConnectionStatus {
  backend: boolean;
  jiraApi: boolean;
  lastChecked: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionStatusService {
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
    backend: false,
    jiraApi: false,
    lastChecked: new Date()
  });

  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {
    // Check connection status every 30 seconds
    interval(30000).subscribe(() => {
      this.checkConnectionStatus();
    });

    // Initial check
    this.checkConnectionStatus();
  }

  async checkConnectionStatus(): Promise<void> {
    const backendStatus = await this.checkBackendConnection();
    const jiraApiStatus = await this.checkJiraApiConnection();

    this.connectionStatusSubject.next({
      backend: backendStatus,
      jiraApi: jiraApiStatus,
      lastChecked: new Date()
    });
  }

  private checkBackendConnection(): Promise<boolean> {
    return this.http.get(`${this.apiConfig.backendApiUrl}/health`)
    .pipe(
      map(() => true),
      catchError(() => [false])
    )
    .toPromise()
    .then(result => result as boolean)
    .catch(() => false);
  }

  private checkJiraApiConnection(): Promise<boolean> {
    return this.http.get(`${this.apiConfig.jiraApiUrl}/health`)
    .pipe(
      map(() => true),
      catchError(() => [false])
    )
    .toPromise()
    .then(result => result as boolean)
    .catch(() => false);
  }

  getCurrentStatus(): ConnectionStatus {
    return this.connectionStatusSubject.value;
  }

  isBackendConnected(): boolean {
    return this.connectionStatusSubject.value.backend;
  }

  isJiraApiConnected(): boolean {
    return this.connectionStatusSubject.value.jiraApi;
  }

  isFullyConnected(): boolean {
    const status = this.connectionStatusSubject.value;
    return status.backend && status.jiraApi;
  }
}
