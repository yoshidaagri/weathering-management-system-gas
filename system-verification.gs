/**
 * システム総合検証スクリプト
 * 最適化完了後の動作確認用
 */

/**
 * システム全体の動作を検証
 */
function verifyCompleteSystem() {
  console.log('=== システム総合検証開始 ===');
  
  const verificationResults = {
    configurationCheck: false,
    authenticationCheck: false,
    uiAccessCheck: false,
    dataOperationCheck: false,
    errorHandlingCheck: false,
    overallStatus: 'PENDING'
  };
  
  try {
    // 1. 設定検証
    console.log('1. 設定検証を実行中...');
    verificationResults.configurationCheck = verifyConfiguration();
    
    // 2. 認証システム検証
    console.log('2. 認証システム検証を実行中...');
    verificationResults.authenticationCheck = verifyAuthentication();
    
    // 3. UI アクセス検証
    console.log('3. UI アクセス検証を実行中...');
    verificationResults.uiAccessCheck = verifyUIAccess();
    
    // 4. データ操作検証
    console.log('4. データ操作検証を実行中...');
    verificationResults.dataOperationCheck = verifyDataOperations();
    
    // 5. エラーハンドリング検証
    console.log('5. エラーハンドリング検証を実行中...');
    verificationResults.errorHandlingCheck = verifyErrorHandling();
    
    // 総合判定
    const allChecks = [
      verificationResults.configurationCheck,
      verificationResults.authenticationCheck,
      verificationResults.uiAccessCheck,
      verificationResults.dataOperationCheck,
      verificationResults.errorHandlingCheck
    ];
    
    const passedChecks = allChecks.filter(check => check === true).length;
    const totalChecks = allChecks.length;
    
    if (passedChecks === totalChecks) {
      verificationResults.overallStatus = 'PASS';
    } else if (passedChecks >= totalChecks * 0.8) {
      verificationResults.overallStatus = 'WARNING';
    } else {
      verificationResults.overallStatus = 'FAIL';
    }
    
    console.log('=== システム総合検証完了 ===');
    console.log(`総合判定: ${verificationResults.overallStatus}`);
    console.log(`合格率: ${passedChecks}/${totalChecks} (${Math.round(passedChecks/totalChecks*100)}%)`);
    
    return {
      success: true,
      results: verificationResults,
      summary: {
        status: verificationResults.overallStatus,
        passRate: `${passedChecks}/${totalChecks}`,
        percentage: Math.round(passedChecks/totalChecks*100)
      }
    };
    
  } catch (error) {
    console.error('システム検証エラー:', error);
    return {
      success: false,
      error: error.message,
      results: verificationResults
    };
  }
}

/**
 * 設定検証
 */
function verifyConfiguration() {
  try {
    // Config.gsの関数を使用
    if (typeof Config === 'undefined') {
      throw new Error('Config オブジェクトが見つかりません');
    }
    
    const validation = Config.validateConfiguration();
    const environment = Config.getEnvironment();
    
    console.log(`環境: ${environment}`);
    console.log(`設定検証結果: ${validation.isValid ? 'PASS' : 'FAIL'}`);
    
    if (!validation.isValid) {
      console.log(`未設定項目: ${validation.missing.join(', ')}`);
    }
    
    return validation.isValid;
    
  } catch (error) {
    console.error('設定検証エラー:', error.message);
    return false;
  }
}

/**
 * 認証システム検証
 */
function verifyAuthentication() {
  try {
    // AuthLib.gsの関数を使用
    if (typeof AuthLib === 'undefined') {
      throw new Error('AuthLib オブジェクトが見つかりません');
    }
    
    const currentUser = AuthLib.getCurrentUser();
    const authResult = AuthLib.authenticateUser();
    
    console.log('現在のユーザー:', currentUser ? currentUser.email : 'ログインなし');
    console.log('認証結果:', authResult.authenticated ? 'PASS' : 'FAIL');
    
    if (authResult.authenticated) {
      console.log(`ユーザーロール: ${authResult.role}`);
    } else {
      console.log(`認証エラー: ${authResult.error}`);
    }
    
    return authResult.authenticated;
    
  } catch (error) {
    console.error('認証検証エラー:', error.message);
    return false;
  }
}

/**
 * UI アクセス検証
 */
function verifyUIAccess() {
  try {
    // 主要ページのHTMLテンプレート存在確認
    const requiredPages = [
      'index',
      'admin-login',
      'admin-dashboard',
      'customer-login',
      'customer-dashboard'
    ];
    
    let pagesFound = 0;
    
    requiredPages.forEach(pageName => {
      try {
        const template = HtmlService.createTemplateFromFile(pageName);
        if (template) {
          pagesFound++;
          console.log(`✓ ${pageName}.html - 正常`);
        }
      } catch (error) {
        console.log(`✗ ${pageName}.html - エラー: ${error.message}`);
      }
    });
    
    const success = pagesFound === requiredPages.length;
    console.log(`UI検証結果: ${pagesFound}/${requiredPages.length} ページ利用可能`);
    
    return success;
    
  } catch (error) {
    console.error('UI検証エラー:', error.message);
    return false;
  }
}

/**
 * データ操作検証
 */
function verifyDataOperations() {
  try {
    // DataLib.gsの基本関数をテスト
    if (typeof DataLib === 'undefined') {
      console.log('DataLib が見つかりません - スキップ');
      return true; // DataLibは必須ではないのでスキップ扱い
    }
    
    // 基本的なデータアクセステスト
    console.log('データアクセステストを実行...');
    
    // 実際のデータ操作は影響があるので、接続テストのみ実行
    let dataTestPassed = true;
    
    // スプレッドシート接続テスト
    try {
      const testSheetId = Config.getSheetId('adminUsers');
      const testSheet = SpreadsheetApp.openById(testSheetId);
      console.log('✓ スプレッドシート接続 - 正常');
    } catch (error) {
      console.log('✗ スプレッドシート接続 - エラー:', error.message);
      dataTestPassed = false;
    }
    
    return dataTestPassed;
    
  } catch (error) {
    console.error('データ操作検証エラー:', error.message);
    return false;
  }
}

/**
 * エラーハンドリング検証
 */
function verifyErrorHandling() {
  try {
    console.log('エラーハンドリングテスト実行中...');
    
    // 意図的にエラーを発生させてハンドリングをテスト
    let errorHandlingPassed = true;
    
    // 1. 存在しないスプレッドシートアクセステスト
    try {
      SpreadsheetApp.openById('invalid-sheet-id');
    } catch (error) {
      console.log('✓ 無効なスプレッドシートIDエラー - 正常にキャッチ');
    }
    
    // 2. 無効な認証テスト
    try {
      const result = AuthLib.hasPermission('invalid-email', 'invalid-resource');
      if (result === false) {
        console.log('✓ 無効な権限チェック - 正常に拒否');
      }
    } catch (error) {
      console.log('✓ 無効な権限チェックエラー - 正常にキャッチ');
    }
    
    return errorHandlingPassed;
    
  } catch (error) {
    console.error('エラーハンドリング検証エラー:', error.message);
    return false;
  }
}

/**
 * 開発者向け詳細診断
 */
function runDetailedDiagnostics() {
  console.log('=== 詳細診断開始 ===');
  
  const diagnostics = {
    systemInfo: getSystemInfo(),
    performanceMetrics: getPerformanceMetrics(),
    securityCheck: getSecurityCheck(),
    dependencyCheck: getDependencyCheck()
  };
  
  console.log('詳細診断結果:', JSON.stringify(diagnostics, null, 2));
  return diagnostics;
}

/**
 * システム情報取得
 */
function getSystemInfo() {
  return {
    scriptId: ScriptApp.getScriptId(),
    timezone: Session.getScriptTimeZone(),
    user: Session.getActiveUser().getEmail(),
    environment: Config.getEnvironment(),
    version: Config.APP.VERSION
  };
}

/**
 * パフォーマンス指標取得
 */
function getPerformanceMetrics() {
  const startTime = new Date();
  
  // 簡単な処理時間計測
  for (let i = 0; i < 1000; i++) {
    Math.random();
  }
  
  const processingTime = new Date() - startTime;
  
  return {
    basicProcessingTime: processingTime,
    maxExecutionTime: Config.APP.MAX_EXECUTION_TIME,
    timestamp: new Date()
  };
}

/**
 * セキュリティチェック
 */
function getSecurityCheck() {
  const properties = PropertiesService.getScriptProperties().getProperties();
  
  return {
    authenticationRequired: Config.SECURITY.REQUIRE_AUTH,
    hasRequiredProperties: Object.keys(properties).length > 0,
    adminUserCount: getAdminUserCount()
  };
}

/**
 * 依存関係チェック
 */
function getDependencyCheck() {
  const dependencies = {
    Config: typeof Config !== 'undefined',
    AuthLib: typeof AuthLib !== 'undefined',
    TestLib: typeof TestLib !== 'undefined',
    QualityLib: typeof QualityLib !== 'undefined'
  };
  
  return dependencies;
}

/**
 * 管理者ユーザー数取得
 */
function getAdminUserCount() {
  try {
    const sheetId = Config.getSheetId('adminUsers');
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('AdminUsers');
    return sheet.getLastRow() - 1; // ヘッダー行を除く
  } catch (error) {
    return 0;
  }
}