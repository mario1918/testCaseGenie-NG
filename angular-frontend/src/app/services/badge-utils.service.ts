import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BadgeUtilsService {

  getStatusBadgeClass(status: string): { class: string; style: string } {
    const statusColors: { [key: string]: string } = {
      'to-do': '#BFC1C4',
      'open': '#CECFD2',
      'in progress': '#8FB8F6',
      'closed': '#B3DF72',
      'done': '#B3DF72',
      'resolved': '#B3DF72',
      'reopened': '#BFC1C4',
      'in qa': '#8FB8F6'
    };
    
    const normalizedStatus = status?.toLowerCase() || '';
    const bgColor = statusColors[normalizedStatus] || '#E9ECEF';
    
    return {
      class: 'badge',
      style: `background-color: ${bgColor}; color: #000;`
    };
  }

  getIssueTypeBadgeClass(issueType: string): { class: string; style: string } {
    const issueTypeColors: { [key: string]: string } = {
      'story': '#82B536',
      'bug': '#E2483D',
      'new feature': '#82B536',
      'sub-task': '#4688EC',
      'subtask': '#4688EC',
      'test': '#8FB8F6',
      'epic': '#BF63F3',
      'task': '#669DF1'
    };
    
    const normalizedType = issueType?.toLowerCase() || '';
    const bgColor = issueTypeColors[normalizedType] || '#E9ECEF';
    
    return {
      class: 'badge',
      style: `background-color: ${bgColor}; color: #fff;`
    };
  }

  getPriorityBadgeClass(priority: string): { class: string; style: string } {
    const priorityColors: { [key: string]: string } = {
      'critical': '#E2483D',
      'highest': '#E2483D',
      'high': '#E2483D',
      'major': '#F68909',
      'medium': '#F68909',
      'minor': '#4688EC',
      'low': '#4688EC',
      'lowest': '#6C757D'
    };
    
    const normalizedPriority = priority?.toLowerCase() || '';
    const bgColor = priorityColors[normalizedPriority] || '#6C757D';
    
    return {
      class: 'badge',
      style: `background-color: ${bgColor}; color: #fff;`
    };
  }

  truncateText(text: string, maxLength: number = 100): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}
