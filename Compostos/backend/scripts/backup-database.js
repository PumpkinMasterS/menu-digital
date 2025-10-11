const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { securityLogger } = require('../config/security-logger');

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `compostos-backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);
    
    const mongodbUri = process.env.MONGODB_URI;
    
    if (!mongodbUri) {
      throw new Error('MONGODB_URI não está definida no ambiente');
    }

    // Extrair nome da base de dados da URI
    const dbName = mongodbUri.split('/').pop().split('?')[0];
    
    const command = `mongodump --uri="${mongodbUri}" --out="${backupPath}"`;
    
    return new Promise((resolve, reject) => {
      securityLogger.info('DATABASE_BACKUP_STARTED', {
        backupName,
        database: dbName,
        timestamp: new Date().toISOString()
      });

      exec(command, (error, stdout, stderr) => {
        if (error) {
          securityLogger.error('DATABASE_BACKUP_FAILED', {
            backupName,
            database: dbName,
            error: error.message,
            stderr: stderr,
            timestamp: new Date().toISOString()
          });
          return reject(error);
        }

        // Calcular tamanho do backup
        const backupSize = this.calculateBackupSize(backupPath);
        
        securityLogger.info('DATABASE_BACKUP_COMPLETED', {
          backupName,
          database: dbName,
          size: backupSize,
          timestamp: new Date().toISOString()
        });

        resolve({
          name: backupName,
          path: backupPath,
          size: backupSize,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  calculateBackupSize(backupPath) {
    let totalSize = 0;
    
    const calculateDirSize = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          calculateDirSize(filePath);
        } else {
          totalSize += stat.size;
        }
      });
    };

    calculateDirSize(backupPath);
    
    // Formatar para leitura humana
    const formatSize = (bytes) => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    return formatSize(totalSize);
  }

  async listBackups() {
    const backups = [];
    
    if (!fs.existsSync(this.backupDir)) {
      return backups;
    }

    const items = fs.readdirSync(this.backupDir);
    
    items.forEach(item => {
      const itemPath = path.join(this.backupDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        const size = this.calculateBackupSize(itemPath);
        backups.push({
          name: item,
          path: itemPath,
          size: size,
          created: stat.birthtime,
          modified: stat.mtime
        });
      }
    });

    // Ordenar por data de criação (mais recente primeiro)
    return backups.sort((a, b) => b.created - a.created);
  }

  async cleanupOldBackups(maxBackups = 30) {
    const backups = await this.listBackups();
    
    if (backups.length <= maxBackups) {
      return [];
    }

    const backupsToDelete = backups.slice(maxBackups);
    const deleted = [];

    for (const backup of backupsToDelete) {
      try {
        fs.rmSync(backup.path, { recursive: true, force: true });
        deleted.push(backup.name);
        
        securityLogger.info('DATABASE_BACKUP_DELETED', {
          backupName: backup.name,
          reason: 'Limpeza automática (excedeu limite máximo)',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        securityLogger.error('DATABASE_BACKUP_DELETE_FAILED', {
          backupName: backup.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return deleted;
  }

  async restoreBackup(backupName) {
    const backupPath = path.join(this.backupDir, backupName);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup ${backupName} não encontrado`);
    }

    const mongodbUri = process.env.MONGODB_URI;
    const dbName = mongodbUri.split('/').pop().split('?')[0];
    
    const command = `mongorestore --uri="${mongodbUri}" --drop "${backupPath}"`;
    
    return new Promise((resolve, reject) => {
      securityLogger.warning('DATABASE_RESTORE_STARTED', {
        backupName,
        database: dbName,
        timestamp: new Date().toISOString(),
        warning: 'OPERAÇÃO CRÍTICA - Restaurando base de dados'
      });

      exec(command, (error, stdout, stderr) => {
        if (error) {
          securityLogger.emergency('DATABASE_RESTORE_FAILED', {
            backupName,
            database: dbName,
            error: error.message,
            stderr: stderr,
            timestamp: new Date().toISOString()
          });
          return reject(error);
        }

        securityLogger.info('DATABASE_RESTORE_COMPLETED', {
          backupName,
          database: dbName,
          timestamp: new Date().toISOString(),
          message: 'Base de dados restaurada com sucesso'
        });

        resolve({
          success: true,
          message: 'Base de dados restaurada com sucesso',
          backup: backupName,
          timestamp: new Date().toISOString()
        });
      });
    });
  }
}

module.exports = DatabaseBackup;