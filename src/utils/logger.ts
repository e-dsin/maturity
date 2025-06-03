// src/utils/logger.ts

/**
 * Module de logging pour le frontend
 * Permet d'envoyer les logs au backend et de les stocker localement
 */

// Types pour le logger
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface LogMetadata {
  userId?: string;
  sessionId: string;
  userAgent: string;
  language: string;
  screenSize: string;
  batchId: string;
  [key: string]: any;
}

// Configuration du logger
interface LoggerConfig {
  minLevel: LogLevel;
  sendToServer: boolean;
  serverUrl: string;
  batchSize: number;
  sendInterval: number;
  includeUserInfo: boolean;
}

// Configuration par défaut
const defaultConfig: LoggerConfig = {
  minLevel: import.meta.env.PROD ? 'INFO' : 'DEBUG',
  sendToServer: import.meta.env.PROD,
  serverUrl: '/api/logs',
  batchSize: 10,
  sendInterval: 30000, // 30s
  includeUserInfo: true,
};

// Ordre des niveaux de logs pour faciliter les comparaisons
const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  'DEBUG': 0,
  'INFO': 1,
  'WARN': 2,
  'ERROR': 3,
};

// Classe principale du logger
class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private sendTimer: number | null = null;
  private sessionId: string;
  
  constructor(customConfig: Partial<LoggerConfig> = {}) {
    // Fusionner la configuration personnalisée avec la configuration par défaut
    this.config = { ...defaultConfig, ...customConfig };
    
    // Initialiser ou récupérer l'ID de session
    this.sessionId = this.getOrCreateSessionId();
    
    // Démarrer le timer d'envoi si nécessaire
    if (this.config.sendToServer) {
      this.startSendTimer();
      this.setupUnloadHandler();
    }
    
    // Capturer les erreurs non gérées
    this.setupErrorCapture();
  }
  
  /**
   * Obtient ou crée un ID de session
   */
  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('logSessionId');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      sessionStorage.setItem('logSessionId', sessionId);
    }
    return sessionId;
  }
  
  /**
   * Configure le timer d'envoi des logs
   */
  private startSendTimer(): void {
    if (this.sendTimer) {
      window.clearInterval(this.sendTimer);
    }
    
    this.sendTimer = window.setInterval(() => {
      this.sendLogs();
    }, this.config.sendInterval);
  }
  
  /**
   * Capture les erreurs non gérées
   */
  private setupErrorCapture(): void {
    window.addEventListener('error', (event) => {
      this.error('Erreur non gérée', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
      return false;
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Promesse rejetée non gérée', {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
      });
      return false;
    });
  }
  
  /**
   * Envoie les logs au serveur
   */
  private async sendLogs(force: boolean = false): Promise<void> {
    if (!this.config.sendToServer || (this.logBuffer.length < this.config.batchSize && !force)) {
      return;
    }
    
    if (this.logBuffer.length === 0) {
      return;
    }
    
    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      const metadata: LogMetadata = {
        sessionId: this.sessionId,
        batchId: Date.now().toString(36),
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        userId: localStorage.getItem('userId') || undefined,
        url: window.location.href,
        referrer: document.referrer,
      };
      
      const response = await fetch(this.config.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          metadata,
        }),
        // Timeout
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
      });
      
      if (!response.ok) {
        console.error(`Échec d'envoi des logs: ${response.status}`);
        // Remettre les logs dans le buffer
        this.logBuffer = [...logsToSend, ...this.logBuffer];
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi des logs:', error);
      // Remettre les logs dans le buffer
      this.logBuffer = [...logsToSend, ...this.logBuffer];
    }
  }
  
  /**
   * Configure le gestionnaire d'événement unload
   */
  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      this.sendLogs(true);
    });
  }
  
  /**
   * Ajoute une entrée de log
   */
  private addLog(level: LogLevel, message: string, details: Record<string, any> = {}): void {
    // Vérifier le niveau de log
    if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[this.config.minLevel]) {
      return;
    }
    
    // Créer l'entrée de log
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      details: { ...details },
    };
    
    // Ajouter l'entrée au buffer
    this.logBuffer.push(logEntry);
    
    // Afficher dans la console
    switch (level) {
      case 'DEBUG':
        console.debug(`[${level}] ${message}`, details);
        break;
      case 'INFO':
        console.info(`[${level}] ${message}`, details);
        break;
      case 'WARN':
        console.warn(`[${level}] ${message}`, details);
        break;
      case 'ERROR':
        console.error(`[${level}] ${message}`, details);
        // Envoyer immédiatement les erreurs
        this.sendLogs(true);
        break;
    }
  }
  
  /**
   * API publique pour les différents niveaux de logs
   */
  public debug(message: string, details: Record<string, any> = {}): void {
    this.addLog('DEBUG', message, details);
  }
  
  public info(message: string, details: Record<string, any> = {}): void {
    this.addLog('INFO', message, details);
  }
  
  public warn(message: string, details: Record<string, any> = {}): void {
    this.addLog('WARN', message, details);
  }
  
  public error(message: string, details: Record<string, any> = {}): void {
    this.addLog('ERROR', message, details);
  }
  
  /**
   * Force l'envoi des logs au serveur
   */
  public flush(): Promise<void> {
    return this.sendLogs(true);
  }
  
  /**
   * Met à jour la configuration
   */
  public setConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Mettre à jour le timer si nécessaire
    if (this.config.sendToServer) {
      this.startSendTimer();
    } else if (this.sendTimer) {
      window.clearInterval(this.sendTimer);
      this.sendTimer = null;
    }
  }
  
  /**
   * Log d'un événement utilisateur
   */
  public logUserAction(action: string, details: Record<string, any> = {}): void {
    this.info(`Action utilisateur: ${action}`, {
      type: 'user_action',
      action,
      ...details
    });
  }
  
  /**
   * Log d'une navigation
   */
  public logNavigation(path: string, details: Record<string, any> = {}): void {
    this.info(`Navigation: ${path}`, {
      type: 'navigation',
      path,
      ...details
    });
  }
  
  /**
   * Log de performance
   */
  public logPerformance(operation: string, durationMs: number, details: Record<string, any> = {}): void {
    this.info(`Performance: ${operation} (${durationMs}ms)`, {
      type: 'performance',
      operation,
      durationMs,
      ...details
    });
  }
  
  /**
   * Log d'appel API
   */
  public logApiCall(endpoint: string, method: string, status: number, durationMs: number, details: Record<string, any> = {}): void {
    const level = status >= 400 ? 'ERROR' : 'INFO';
    
    this.addLog(level, `API ${method} ${endpoint}: ${status} (${durationMs}ms)`, {
      type: 'api_call',
      endpoint,
      method,
      status,
      durationMs,
      ...details
    });
  }
}

// Créer et exporter une instance par défaut
const logger = new Logger();

export default logger;