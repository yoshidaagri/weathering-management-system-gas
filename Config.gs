/**
 * システム設定とスプレッドシートID管理
 * Phase 1: 基盤構築 - 環境設定
 */

const Config = {
  
  /**
   * 環境設定を取得
   * @returns {Object} 環境設定
   */
  getEnvironment: function() {
    return PropertiesService.getScriptProperties().getProperty('ENVIRONMENT') || 'development';
  },

  /**
   * スプレッドシートIDを取得
   * @param {string} type スプレッドシートタイプ
   * @returns {string} スプレッドシートID
   * @throws {Error} IDが設定されていない場合
   */
  getSheetId: function(type) {
    // Script Propertiesから直接取得する場合とマッピングから取得する場合の両方に対応
    let propertyName;
    
    const propertyMap = {
      'adminUsers': 'ADMIN_USERS_SHEET_ID',
      'customerUsers': 'CUSTOMER_USERS_SHEET_ID',
      'customers': 'CUSTOMERS_SHEET_ID',
      'projects': 'PROJECTS_SHEET_ID',
      'measurements': 'MEASUREMENTS_SHEET_ID',
      'errorLog': 'ERROR_LOG_SHEET_ID',
      'qualityReport': 'QUALITY_REPORT_SHEET_ID'
    };

    // typeが既にScript Propertiesの名前の場合はそのまま使用
    if (type.endsWith('_SHEET_ID')) {
      propertyName = type;
    } else {
      // マッピングから取得
      propertyName = propertyMap[type];
      if (!propertyName) {
        throw new Error(`未対応のスプレッドシートタイプ: ${type}`);
      }
    }

    const sheetId = PropertiesService.getScriptProperties().getProperty(propertyName);
    if (!sheetId) {
      throw new Error(`${propertyName} が設定されていません`);
    }

    return sheetId;
  },

  /**
   * 全ての必須設定が完了しているかチェック
   * @returns {Object} チェック結果
   */
  validateConfiguration: function() {
    const requiredProperties = [
      'ADMIN_USERS_SHEET_ID',
      'CUSTOMER_USERS_SHEET_ID',
      'CUSTOMERS_SHEET_ID',
      'PROJECTS_SHEET_ID',
      'MEASUREMENTS_SHEET_ID',
      'ERROR_LOG_SHEET_ID',
      'QUALITY_REPORT_SHEET_ID',
      'ENVIRONMENT'
    ];

    const properties = PropertiesService.getScriptProperties().getProperties();
    const missing = requiredProperties.filter(prop => !properties[prop]);

    return {
      isValid: missing.length === 0,
      missing: missing,
      configured: Object.keys(properties).filter(key => requiredProperties.includes(key))
    };
  },

  /**
   * アプリケーション設定
   */
  APP: {
    NAME: '風化促進CO2除去管理システム',
    VERSION: '1.0.0',
    MAX_EXECUTION_TIME: 300000, // 5分（GAS制限）
    MAX_SHEET_ROWS: 1000000,    // スプレッドシート行数制限
    SESSION_TIMEOUT: 3600000,   // 1時間
    LOG_RETENTION_DAYS: 30
  },

  /**
   * UI設定
   */
  UI: {
    THEME: 'bootstrap',
    LANGUAGE: 'ja',
    TIMEZONE: 'Asia/Tokyo',
    DATE_FORMAT: 'YYYY/MM/DD',
    DATETIME_FORMAT: 'YYYY/MM/DD HH:mm:ss'
  },

  /**
   * アプリケーション名を取得
   * @returns {string} アプリケーション名
   */
  getAppName: function() {
    return this.APP.NAME;
  },

  /**
   * セキュリティ設定
   */
  SECURITY: {
    REQUIRE_AUTH: true,
    ADMIN_DOMAIN_RESTRICTION: false, // 管理者ドメイン制限（必要に応じて設定）
    SESSION_COOKIE_NAME: 'weathering_session',
    CSRF_TOKEN_NAME: 'csrf_token'
  },

  /**
   * パフォーマンス設定
   */
  PERFORMANCE: {
    BATCH_SIZE: 100,           // バッチ処理のサイズ
    CACHE_DURATION: 300,       // キャッシュ保持時間（秒）
    MAX_RETRY_ATTEMPTS: 3,     // リトライ回数
    RETRY_DELAY: 1000         // リトライ間隔（ミリ秒）
  }
};

/**
 * 設定の初期化とバリデーション
 */
function initializeConfig() {
  try {
    const validation = Config.validateConfiguration();
    
    if (!validation.isValid) {
      const errorMessage = `設定が不完全です。以下の項目を設定してください: ${validation.missing.join(', ')}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    console.log('設定の初期化が完了しました');
    console.log(`環境: ${Config.getEnvironment()}`);
    console.log(`設定済み項目: ${validation.configured.length}/${validation.configured.length + validation.missing.length}`);
    
    return {
      success: true,
      environment: Config.getEnvironment(),
      configuredCount: validation.configured.length
    };

  } catch (error) {
    console.error('設定の初期化に失敗しました:', error.message);
    throw error;
  }
}

/**
 * デバッグ用: 現在の設定を表示
 */
function debugConfiguration() {
  const properties = PropertiesService.getScriptProperties().getProperties();
  const validation = Config.validateConfiguration();
  
  console.log('=== 現在の設定 ===');
  console.log('Environment:', Config.getEnvironment());
  console.log('設定済み項目:', validation.configured);
  console.log('未設定項目:', validation.missing);
  console.log('アプリケーション設定:', Config.APP);
  
  return {
    environment: Config.getEnvironment(),
    validation: validation,
    app: Config.APP
  };
}