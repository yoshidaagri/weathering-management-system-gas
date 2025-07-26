/**
 * Script Properties自動設定用スクリプト
 * 初回セットアップ時に実行してシステムを初期化
 */

/**
 * 必要なスプレッドシートを作成しScript Propertiesを設定
 */
function setupSystemProperties() {
  try {
    console.log('=== システムプロパティの設定開始 ===');
    
    // 各種スプレッドシートを作成
    const sheetIds = {};
    
    // 1. 管理者ユーザー管理用スプレッドシート
    const adminUsersSheet = SpreadsheetApp.create('風化促進CO2除去管理システム - 管理者ユーザー');
    sheetIds.ADMIN_USERS_SHEET_ID = adminUsersSheet.getId();
    setupAdminUsersSheet(adminUsersSheet);
    
    // 2. 顧客ユーザー管理用スプレッドシート
    const customerUsersSheet = SpreadsheetApp.create('風化促進CO2除去管理システム - 顧客ユーザー');
    sheetIds.CUSTOMER_USERS_SHEET_ID = customerUsersSheet.getId();
    setupCustomerUsersSheet(customerUsersSheet);
    
    // 3. 顧客情報管理用スプレッドシート
    const customersSheet = SpreadsheetApp.create('風化促進CO2除去管理システム - 顧客情報');
    sheetIds.CUSTOMERS_SHEET_ID = customersSheet.getId();
    setupCustomersSheet(customersSheet);
    
    // 4. プロジェクト管理用スプレッドシート
    const projectsSheet = SpreadsheetApp.create('風化促進CO2除去管理システム - プロジェクト');
    sheetIds.PROJECTS_SHEET_ID = projectsSheet.getId();
    setupProjectsSheet(projectsSheet);
    
    // 5. 測定データ管理用スプレッドシート
    const measurementsSheet = SpreadsheetApp.create('風化促進CO2除去管理システム - 測定データ');
    sheetIds.MEASUREMENTS_SHEET_ID = measurementsSheet.getId();
    setupMeasurementsSheet(measurementsSheet);
    
    // 6. エラーログ用スプレッドシート
    const errorLogSheet = SpreadsheetApp.create('風化促進CO2除去管理システム - エラーログ');
    sheetIds.ERROR_LOG_SHEET_ID = errorLogSheet.getId();
    setupErrorLogSheet(errorLogSheet);
    
    // 7. 品質レポート用スプレッドシート
    const qualityReportSheet = SpreadsheetApp.create('風化促進CO2除去管理システム - 品質レポート');
    sheetIds.QUALITY_REPORT_SHEET_ID = qualityReportSheet.getId();
    setupQualityReportSheet(qualityReportSheet);
    
    // Script Propertiesに設定
    const properties = PropertiesService.getScriptProperties();
    sheetIds.ENVIRONMENT = 'development';
    
    properties.setProperties(sheetIds);
    
    console.log('=== Script Properties設定完了 ===');
    console.log('設定されたスプレッドシートID:', sheetIds);
    
    // 初期管理者ユーザーの作成
    setupInitialAdminUser();
    
    return {
      success: true,
      message: 'システムプロパティの設定が完了しました',
      sheetIds: sheetIds
    };
    
  } catch (error) {
    console.error('setupSystemProperties error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 管理者ユーザーシートの初期設定
 */
function setupAdminUsersSheet(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Sheet1');
  sheet.setName('AdminUsers');
  
  // ヘッダー行を設定
  const headers = ['adminId', 'email', 'name', 'isActive', 'lastLogin', 'createdAt'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダー行のフォーマット
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#e3f2fd');
}

/**
 * 顧客ユーザーシートの初期設定
 */
function setupCustomerUsersSheet(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Sheet1');
  sheet.setName('CustomerUsers');
  
  const headers = ['userId', 'email', 'name', 'customerId', 'companyName', 'isActive', 'lastLogin', 'createdAt'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#e8f5e8');
}

/**
 * 顧客情報シートの初期設定
 */
function setupCustomersSheet(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Sheet1');
  sheet.setName('Customers');
  
  const headers = ['customerId', 'companyName', 'contactName', 'email', 'phone', 'address', 'isActive', 'createdAt'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#fff3e0');
}

/**
 * プロジェクトシートの初期設定
 */
function setupProjectsSheet(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Sheet1');
  sheet.setName('Projects');
  
  const headers = ['projectId', 'customerId', 'projectName', 'description', 'status', 'startDate', 'endDate', 'createdAt'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#f3e5f5');
}

/**
 * 測定データシートの初期設定
 */
function setupMeasurementsSheet(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Sheet1');
  sheet.setName('Measurements');
  
  const headers = ['measurementId', 'projectId', 'customerId', 'measurementDate', 'co2Removal', 'temperature', 'humidity', 'ph', 'notes', 'createdAt'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#e0f2f1');
}

/**
 * エラーログシートの初期設定
 */
function setupErrorLogSheet(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Sheet1');
  sheet.setName('ErrorLogs');
  
  const headers = ['timestamp', 'functionName', 'errorMessage', 'stackTrace', 'context'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#ffebee');
}

/**
 * 品質レポートシートの初期設定
 */
function setupQualityReportSheet(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Sheet1');
  sheet.setName('QualityReports');
  
  const headers = ['reportId', 'reportDate', 'phase', 'testResults', 'qualityScore', 'issues', 'recommendations', 'createdAt'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#f9fbe7');
}

/**
 * 初期管理者ユーザーの作成
 */
function setupInitialAdminUser() {
  try {
    const currentUser = Session.getActiveUser();
    const email = currentUser.getEmail();
    
    if (!email) {
      console.log('ログインユーザーが取得できません');
      return;
    }
    
    const sheetId = PropertiesService.getScriptProperties().getProperty('ADMIN_USERS_SHEET_ID');
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('AdminUsers');
    
    // 初期管理者ユーザーを追加
    const adminId = Utilities.getUuid();
    const initialAdmin = [
      adminId,
      email,
      email.split('@')[0], // 簡易名前
      true, // isActive
      null, // lastLogin
      new Date() // createdAt
    ];
    
    sheet.appendRow(initialAdmin);
    console.log('初期管理者ユーザーを作成しました:', email);
    
  } catch (error) {
    console.error('初期管理者ユーザー作成エラー:', error);
  }
}

/**
 * 設定済みプロパティの確認
 */
function checkSystemProperties() {
  const properties = PropertiesService.getScriptProperties().getProperties();
  console.log('=== 現在のScript Properties ===');
  console.log(properties);
  return properties;
}

/**
 * システムの完全初期化（開発用）
 */
function resetSystem() {
  if (confirm('システムを完全にリセットしますか？全てのデータが削除されます。')) {
    PropertiesService.getScriptProperties().deleteAll();
    console.log('システムをリセットしました');
  }
}