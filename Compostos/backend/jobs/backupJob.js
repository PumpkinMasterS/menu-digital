const cron = require('node-cron');
const DatabaseBackup = require('../scripts/backup-database');
const { securityLogger } = require('../config/security-logger');

class BackupJob {
  constructor() {
    this.isRunning = false;
    this.backupService = new DatabaseBackup();
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Backup job já está rodando');
      return;
    }

    // Executa backup diariamente às 2:00 AM
    this.job = cron.schedule('0 2 * * *', () => {
      this.performBackup();
    }, {
      scheduled: false
    });

    this.job.start();
    this.isRunning = true;
    console.log('📦 Backup job iniciado - execução diária às 2:00 AM');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.isRunning = false;
      console.log('📦 Backup job parado');
    }
  }

  async performBackup() {
    try {
      console.log('📦 Iniciando backup automático...');
      securityLogger.info('AUTOMATIC_BACKUP_STARTED', {
        type: 'diário',
        scheduledTime: '02:00',
        timestamp: new Date().toISOString()
      });

      // Executar backup
      const backupResult = await this.backupService.createBackup();
      
      console.log(`✅ Backup concluído: ${backupResult.name} (${backupResult.size})`);
      
      // Limpar backups antigos (manter apenas os 30 mais recentes)
      const deletedBackups = await this.backupService.cleanupOldBackups(30);
      
      if (deletedBackups.length > 0) {
        console.log(`🗑️ Backups antigos removidos: ${deletedBackups.length}`);
        securityLogger.info('OLD_BACKUPS_CLEANED', {
          deletedCount: deletedBackups.length,
          backups: deletedBackups,
          timestamp: new Date().toISOString()
        });
      }

      securityLogger.info('AUTOMATIC_BACKUP_COMPLETED', {
        backupName: backupResult.name,
        size: backupResult.size,
        deletedBackups: deletedBackups.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Erro no backup:', error);
      securityLogger.error('AUTOMATIC_BACKUP_FAILED', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new BackupJob();