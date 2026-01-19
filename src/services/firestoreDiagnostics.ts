import { getFirestoreDiagnostics, forceFirestoreOnline } from './firebaseConfig';
import { logger } from '@/utils/logger';

export interface FirestoreDiagnosticReport {
  timestamp: Date;
  isInitialized: boolean;
  persistenceEnabled: boolean;
  persistenceType: 'persistent' | 'memory' | 'none';
  networkEnabled: boolean;
  navigatorOnline: boolean;
  lastSyncAttempt?: Date;
  lastSyncSuccess?: Date;
  consecutiveFailures: number;
}

class FirestoreDiagnosticService {
  private report: FirestoreDiagnosticReport;
  private consecutiveFailures = 0;
  private lastSyncAttempt?: Date;
  private lastSyncSuccess?: Date;

  constructor() {
    this.report = this.generateReport();
  }

  generateReport(): FirestoreDiagnosticReport {
    const diagnostics = getFirestoreDiagnostics();
    return {
      timestamp: new Date(),
      ...diagnostics,
      navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastSyncAttempt: this.lastSyncAttempt,
      lastSyncSuccess: this.lastSyncSuccess,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  async runHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    actions: string[];
  }> {
    const report = this.generateReport();
    const issues: string[] = [];
    const actions: string[] = [];

    if (!report.isInitialized) {
      issues.push('Firestore not initialized');
      actions.push('Re-initialize Firebase app');
    }

    if (report.navigatorOnline && !report.networkEnabled) {
      issues.push('Device online but Firestore thinks it is offline');
      actions.push('Force enable Firestore network');
    }

    if (report.persistenceType === 'none') {
      issues.push('No persistence enabled (data loss risk on reload)');
      actions.push('Consider clearing cache and re-initializing');
    }

    if (this.consecutiveFailures > 3) {
      issues.push(`High failure rate: ${this.consecutiveFailures} consecutive failures`);
      actions.push('Consider clearing IndexedDB persistence');
    }

    return {
      healthy: issues.length === 0,
      issues,
      actions,
    };
  }

  async attemptRecovery(): Promise<boolean> {
    logger.log('[FirestoreDiagnostics] Attempting recovery...');
    const healthCheck = await this.runHealthCheck();

    if (healthCheck.healthy) {
      return true;
    }

    try {
      await forceFirestoreOnline();
      this.consecutiveFailures = 0;
      logger.log('[FirestoreDiagnostics] Recovery successful');
      return true;
    } catch (error) {
      logger.error('[FirestoreDiagnostics] Recovery failed:', error);
      this.consecutiveFailures++;
      return false;
    }
  }

  recordSyncAttempt(success: boolean): void {
    this.lastSyncAttempt = new Date();
    if (success) {
      this.consecutiveFailures = 0;
      this.lastSyncSuccess = new Date();
    } else {
      this.consecutiveFailures++;
    }
    this.report = this.generateReport();
  }

  getReport(): FirestoreDiagnosticReport {
    return this.generateReport();
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  resetFailures(): void {
    this.consecutiveFailures = 0;
  }
}

export const firestoreDiagnostics = new FirestoreDiagnosticService();
