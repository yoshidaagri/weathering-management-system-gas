/**
 * メインエントリーポイント
 * Phase 1: 基盤構築 - GAS Web Apps のメイン処理
 * HTTP リクエストのルーティング、セッション管理
 */

/**
 * WebアプリのベースURLを取得
 */
function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * HTTP GET リクエストのハンドラー - Phase 3対応版
 * @param {Event} e イベントオブジェクト
 * @returns {HtmlOutput} HTML出力
 */
function doGet(e) {
  let page = e.parameter.page;
  if (!page) {
    page = 'index';
  }
  
  // シンプルファイル名マッピング（GAS統一対応）
  const pageMapping = {
    // Phase 3 メイン機能ページ
    'index': 'index',
    'viewer': 'viewer',
    'data-simple': 'data-simple',         // Phase 3 新機能
    'analysis-simple': 'analysis-simple', // Phase 3 新機能
    
    // Phase 2 既存ページ（統合後も利用可能）
    'customers': 'customers',
    'projects': 'projects',
    'measurements': 'measurements',
    'analytics': 'analytics',
    
    // 認証関連ページ
    'admin-login': 'admin-login',
    'customer-login': 'customer-login',
    
    // ダッシュボードページ
    'admin-dashboard': 'admin-dashboard',
    'customer-dashboard': 'customer-dashboard'
  };
  
  // Phase 3対応 - 有効ページリストでのバリデーション
  const validPages = Object.keys(pageMapping);
  
  // 無効ページの自動フォールバック
  if (!validPages.includes(page)) {
    console.warn(`無効なページ要求: ${page} → index.htmlへリダイレクト`);
    page = 'index';
  }
  
  const actualFileName = pageMapping[page] || 'index';

  try {
    // 特別なレンダリング関数が必要なページの処理
    switch (page) {
      case 'admin-login':
        return renderAdminLoginPage();
      case 'customer-login':
        return renderCustomerLoginPage();
      case 'admin-dashboard':
        return renderAdminDashboard();
      case 'customer-dashboard':
        return renderCustomerDashboard();
      case 'customers':
        return renderCustomersPage();
      case 'projects':
        return renderProjectsPage();
      case 'measurements':
        return renderMeasurementsPage();
      case 'analytics':
        return renderAnalyticsPage();
      default:
        // シンプルなHTMLテンプレート（変数不要）
        var template = HtmlService.createTemplateFromFile(actualFileName);
        return template.evaluate()
          .setTitle('風化促進CO2除去システム - ' + page)
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  } catch (error) {
    // ページが存在しない場合はindex.htmlにリダイレクト
    console.error('ページの読み込みエラー:', error);
    var template = HtmlService.createTemplateFromFile('index');
    return template.evaluate()
      .setTitle('風化促進CO2除去システム - ホーム')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * HTTP POST リクエストのハンドラー
 * @param {Event} e イベントオブジェクト
 * @returns {ContentService.TextOutput} JSON応答
 */
function doPost(e) {
  try {
    console.log('doPost called');
    
    // JSON データの解析
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    console.log('POST action:', action);
    
    // アクションに基づく処理分岐
    switch (action) {
      case 'authenticate':
        return handleAuthentication(postData);
      
      case 'logout':
        return handleLogout(postData);
      
      case 'test-system':
        return handleSystemTest(postData);
      
      default:
        return createJsonResponse(false, `未対応のアクション: ${action}`);
    }
    
  } catch (error) {
    console.error('doPost error:', error);
    logError('doPost', error, { postData: e.postData });
    return createJsonResponse(false, 'システムエラーが発生しました。');
  }
}

/**
 * システム初期化
 * @returns {Object} 初期化結果
 */
function initializeSystem() {
  try {
    console.log('System initialization started');
    
    // 設定の初期化とバリデーション
    const configResult = initializeConfig();
    
    if (!configResult.success) {
      return {
        success: false,
        error: 'システム設定が不完全です。Script Properties を確認してください。'
      };
    }
    
    console.log('System initialization completed successfully');
    return { success: true };
    
  } catch (error) {
    console.error('System initialization failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * インデックスページのレンダリング
 * @returns {HtmlOutput} HTML出力
 */
function renderIndexPage() {
  try {
    const html = HtmlService.createTemplateFromFile('index');
    
    // テンプレート変数設定
    html.appName = Config.APP.NAME;
    html.version = Config.APP.VERSION;
    html.currentYear = new Date().getFullYear();
    
    const output = html.evaluate()
      .setTitle(`${Config.APP.NAME} - ログイン選択`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return output;
  } catch (error) {
    console.error('renderIndexPage error:', error);
    return createErrorPage('ページ読み込みエラー', 'ログイン選択ページの読み込みに失敗しました。');
  }
}

/**
 * 管理者ログインページのレンダリング
 * @returns {HtmlOutput} HTML出力
 */
function renderAdminLoginPage() {
  try {
    const html = HtmlService.createTemplateFromFile('admin-login');
    
    // テンプレート変数設定
    html.appName = Config.APP.NAME;
    html.currentUser = AuthLib.getCurrentUser();
    
    const output = html.evaluate()
      .setTitle(`${Config.APP.NAME} - 管理者ログイン`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return output;
  } catch (error) {
    console.error('renderAdminLoginPage error:', error);
    return createErrorPage('ページ読み込みエラー', '管理者ログインページの読み込みに失敗しました。');
  }
}

/**
 * 顧客ログインページのレンダリング
 * @returns {HtmlOutput} HTML出力
 */
function renderCustomerLoginPage() {
  try {
    const html = HtmlService.createTemplateFromFile('customer-login');
    
    // テンプレート変数設定
    html.appName = Config.APP.NAME;
    html.currentUser = AuthLib.getCurrentUser();
    
    const output = html.evaluate()
      .setTitle(`${Config.APP.NAME} - 顧客ログイン`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return output;
  } catch (error) {
    console.error('renderCustomerLoginPage error:', error);
    return createErrorPage('ページ読み込みエラー', '顧客ログインページの読み込みに失敗しました。');
  }
}

/**
 * 管理者ダッシュボードのレンダリング
 * @returns {HtmlOutput} HTML出力
 */
function renderAdminDashboard() {
  try {
    console.log('renderAdminDashboard: Starting...');
    
    // 認証チェック
    const authResult = AuthLib.authenticateUser();
    console.log('Auth result:', authResult);
    
    if (!authResult.authenticated || authResult.role !== 'admin') {
      console.log('Authentication failed or not admin');
      return createErrorPage('アクセス拒否', '管理者権限が必要です。');
    }
    
    console.log('Authentication successful, loading dashboard...');
    
    // 統計データを取得
    const stats = getAdminDashboardStats();
    console.log('Dashboard stats:', stats);
    
    // HTMLテンプレートを読み込み
    const html = HtmlService.createTemplateFromFile('admin-dashboard');
    
    // テンプレート変数設定
    html.appName = Config.APP.NAME;
    html.user = authResult.user;
    html.stats = stats;
    
    const output = html.evaluate()
      .setTitle(`${Config.APP.NAME} - 管理者ダッシュボード`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    console.log('Dashboard rendered successfully');
    return output;
    
  } catch (error) {
    console.error('renderAdminDashboard error:', error);
    return createErrorPage('ページ読み込みエラー', '管理者ダッシュボードの読み込みに失敗しました: ' + error.message);
  }
}

/**
 * 顧客ダッシュボードのレンダリング
 * @returns {HtmlOutput} HTML出力
 */
function renderCustomerDashboard() {
  try {
    // 認証チェック
    const authResult = AuthLib.authenticateUser();
    if (!authResult.authenticated || authResult.role !== 'customer') {
      return createErrorPage('アクセス拒否', '顧客権限が必要です。');
    }
    
    const html = HtmlService.createTemplateFromFile('customer-dashboard');
    
    // テンプレート変数設定
    html.appName = Config.APP.NAME;
    html.user = authResult.user;
    html.stats = getCustomerDashboardStats(authResult.user.customerId);
    
    const output = html.evaluate()
      .setTitle(`${Config.APP.NAME} - 顧客ダッシュボード`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return output;
  } catch (error) {
    console.error('renderCustomerDashboard error:', error);
    return createErrorPage('ページ読み込みエラー', '顧客ダッシュボードの読み込みに失敗しました。');
  }
}

/**
 * テストページのレンダリング（開発用）
 * @returns {HtmlOutput} HTML出力
 */
function renderTestPage() {
  try {
    const html = HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>システムテスト</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1>システムテスト</h1>
        <button onclick="runTests()">全テスト実行</button>
        <button onclick="runQualityCheck()">品質チェック実行</button>
        <div id="results"></div>
        
        <script>
          function runTests() {
            google.script.run
              .withSuccessHandler(showResults)
              .withFailureHandler(showError)
              .runPhase1Tests();
          }
          
          function runQualityCheck() {
            google.script.run
              .withSuccessHandler(showResults)
              .withFailureHandler(showError)
              .runPhase1QualityCheck();
          }
          
          function showResults(result) {
            document.getElementById('results').innerHTML = 
              '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
          }
          
          function showError(error) {
            document.getElementById('results').innerHTML = 
              '<div style="color: red;">エラー: ' + error.message + '</div>';
          }
        </script>
      </body>
      </html>
    `);
    
    return html.setTitle('システムテスト');
  } catch (error) {
    console.error('renderTestPage error:', error);
    return createErrorPage('ページ読み込みエラー', 'テストページの読み込みに失敗しました。');
  }
}

/**
 * 認証処理のハンドラー（google.script.run用）
 * @param {Object} authData 認証データ（オプション）
 * @returns {Object} 認証結果
 */
function handleAuthentication(authData) {
  try {
    console.log('handleAuthentication called with:', authData);
    
    const authResult = AuthLib.authenticateUser();
    console.log('AuthLib result:', authResult);
    
    if (authResult.authenticated) {
      const redirectUrl = authResult.role === 'admin' ? 
        ScriptApp.getService().getUrl() + '?page=admin-dashboard' :
        ScriptApp.getService().getUrl() + '?page=customer-dashboard';
      
      return {
        success: true,
        message: '認証成功',
        data: {
          user: authResult.user,
          role: authResult.role,
          redirectUrl: redirectUrl
        }
      };
    } else {
      return {
        success: false,
        message: authResult.error || '認証に失敗しました',
        data: null
      };
    }
    
  } catch (error) {
    console.error('handleAuthentication error:', error);
    return {
      success: false,
      message: '認証処理でエラーが発生しました: ' + error.message,
      data: null
    };
  }
}

/**
 * 認証テスト用の簡単な関数
 * @returns {Object} テスト結果
 */
function testAuthentication() {
  try {
    const currentUser = AuthLib.getCurrentUser();
    const config = Config.validateConfiguration();
    
    return {
      success: true,
      message: 'テスト完了',
      data: {
        currentUser: currentUser,
        config: config,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'テストエラー: ' + error.message,
      data: null
    };
  }
}

/**
 * ログアウト処理のハンドラー
 * @param {Object} postData POSTデータ
 * @returns {ContentService.TextOutput} JSON応答
 */
function handleLogout(postData) {
  try {
    // セッション情報をクリア（GASでは基本的にセッション管理が自動）
    const redirectUrl = ScriptApp.getService().getUrl();
    
    return createJsonResponse(true, 'ログアウトしました', {
      redirectUrl: redirectUrl
    });
    
  } catch (error) {
    console.error('handleLogout error:', error);
    return createJsonResponse(false, 'ログアウト処理でエラーが発生しました');
  }
}

/**
 * システムテスト処理のハンドラー
 * @param {Object} postData POSTデータ
 * @returns {ContentService.TextOutput} JSON応答
 */
function handleSystemTest(postData) {
  try {
    const testType = postData.testType || 'all';
    
    let result;
    switch (testType) {
      case 'tests':
        result = runPhase1Tests();
        break;
      case 'quality':
        result = runPhase1QualityCheck();
        break;
      default:
        result = {
          tests: runPhase1Tests(),
          quality: runPhase1QualityCheck()
        };
    }
    
    return createJsonResponse(true, 'テスト実行完了', result);
    
  } catch (error) {
    console.error('handleSystemTest error:', error);
    return createJsonResponse(false, 'テスト実行でエラーが発生しました');
  }
}

/**
 * 管理者ダッシュボード統計データ取得
 * @returns {Object} 統計データ
 */
function getAdminDashboardStats() {
  try {
    console.log('getAdminDashboardStats: Starting...');
    
    let totalCustomers = 0;
    let totalProjects = 0;
    let systemStatus = 'Normal';
    
    // 顧客データの取得を試行
    try {
      const customerData = DataLib.getAllData('customers', 'Customers');
      totalCustomers = customerData.length > 0 ? customerData.length - 1 : 0;
      console.log('Customer data loaded:', totalCustomers);
    } catch (error) {
      console.warn('Customer data loading failed:', error.message);
      systemStatus = 'Warning';
    }
    
    // プロジェクトデータの取得を試行
    try {
      const projectData = DataLib.getAllData('projects', 'Projects');
      totalProjects = projectData.length > 0 ? projectData.length - 1 : 0;
      console.log('Project data loaded:', totalProjects);
    } catch (error) {
      console.warn('Project data loading failed:', error.message);
      systemStatus = 'Warning';
    }
    
    const stats = {
      totalCustomers: totalCustomers,
      totalProjects: totalProjects,
      systemStatus: systemStatus,
      lastUpdated: new Date()
    };
    
    console.log('getAdminDashboardStats: Completed', stats);
    return stats;
    
  } catch (error) {
    console.error('getAdminDashboardStats critical error:', error);
    return {
      totalCustomers: 0,
      totalProjects: 0,
      systemStatus: 'Error: ' + error.message,
      lastUpdated: new Date()
    };
  }
}

/**
 * 顧客ダッシュボード統計データ取得
 * @param {string} customerId 顧客ID
 * @returns {Object} 統計データ
 */
function getCustomerDashboardStats(customerId) {
  try {
    const customerProjects = DataLib.findByColumn('projects', 'Projects', 'customerId', customerId);
    
    return {
      totalProjects: customerProjects.length,
      activeProjects: customerProjects.filter(p => p.status === 'active').length,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('getCustomerDashboardStats error:', error);
    return {
      totalProjects: 0,
      activeProjects: 0,
      lastUpdated: new Date()
    };
  }
}

/**
 * エラーページ生成
 * @param {string} title エラータイトル
 * @param {string} message エラーメッセージ
 * @returns {HtmlOutput} エラーページ
 */
function createErrorPage(title, message) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 50px; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; }
        .error h1 { color: #721c24; }
        .error p { color: #721c24; }
        .back-link { margin-top: 20px; }
        .back-link a { color: #007bff; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="error">
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="back-link">
          <a href="${ScriptApp.getService().getUrl()}">トップページに戻る</a>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html).setTitle(title);
}

/**
 * JSON レスポンス生成
 * @param {boolean} success 成功フラグ
 * @param {string} message メッセージ
 * @param {Object} data データ
 * @returns {ContentService.TextOutput} JSON応答
 */
function createJsonResponse(success, message, data = null) {
  const response = {
    success: success,
    message: message,
    timestamp: new Date(),
    data: data
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * エラーログ記録
 * @param {string} functionName 関数名
 * @param {Error} error エラーオブジェクト
 * @param {Object} context コンテキスト情報
 */
function logError(functionName, error, context) {
  try {
    const sheetId = Config.getSheetId('errorLog');
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('ErrorLogs');
    
    if (sheet) {
      const newRow = [
        new Date(),
        `Code.${functionName}`,
        error.message,
        error.stack || '',
        JSON.stringify(context)
      ];
      sheet.appendRow(newRow);
    }
  } catch (logError) {
    console.error('Error logging failed:', logError);
  }
}

/**
 * HTML ファイルの内容を取得（include 機能）
 * @param {string} filename ファイル名
 * @returns {string} ファイル内容
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 顧客管理ページをレンダリング
 * @returns {HtmlOutput} HTML出力
 */
function renderCustomersPage() {
  try {
    // 管理者認証チェック
    const authResult = AuthLib.authenticateUser();
    if (!authResult.authenticated || authResult.role !== 'admin') {
      return createErrorPage('アクセス権限エラー', '管理者としてログインしてください。');
    }
    
    const template = HtmlService.createTemplateFromFile('customers');
    template.appName = Config.getAppName();
    template.user = authResult.user;
    template.stats = getCustomersStats();
    
    return template.evaluate()
      .setTitle(Config.getAppName() + ' - 顧客管理')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('renderCustomersPage error:', error);
    return createErrorPage('ページエラー', '顧客管理ページの読み込みでエラーが発生しました。');
  }
}

/**
 * プロジェクト管理ページをレンダリング
 * @returns {HtmlOutput} HTML出力
 */
function renderProjectsPage() {
  try {
    // 管理者認証チェック
    const authResult = AuthLib.authenticateUser();
    if (!authResult.authenticated || authResult.role !== 'admin') {
      return createErrorPage('アクセス権限エラー', '管理者としてログインしてください。');
    }
    
    const template = HtmlService.createTemplateFromFile('projects');
    template.appName = Config.getAppName();
    template.user = authResult.user;
    template.stats = getProjectsStats();
    
    return template.evaluate()
      .setTitle(Config.getAppName() + ' - プロジェクト管理')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('renderProjectsPage error:', error);
    return createErrorPage('ページエラー', 'プロジェクト管理ページの読み込みでエラーが発生しました。');
  }
}

/**
 * 顧客統計データを取得
 * @returns {Object} 統計データ
 */
function getCustomersStats() {
  try {
    const result = CustomersAPI.getCustomerStats();
    return result.success ? result.data : {};
  } catch (error) {
    console.error('getCustomersStats error:', error);
    return {};
  }
}

/**
 * プロジェクト統計データを取得
 * @returns {Object} 統計データ
 */
function getProjectsStats() {
  try {
    const result = ProjectsAPI.getProjectStats();
    return result.success ? result.data : {};
  } catch (error) {
    console.error('getProjectsStats error:', error);
    return {};
  }
}

/**
 * 顧客データを読み込む（HTML画面用）
 * @returns {Object} 顧客データと統計
 */
function loadCustomersData() {
  try {
    const customersResult = CustomersAPI.getAllCustomers();
    const statsResult = CustomersAPI.getCustomerStats();
    
    return {
      success: true,
      data: customersResult.success ? customersResult.data : [],
      stats: statsResult.success ? statsResult.data : {},
      message: '顧客データを読み込みました'
    };
    
  } catch (error) {
    console.error('loadCustomersData error:', error);
    return {
      success: false,
      data: [],
      stats: {},
      message: 'データの読み込みに失敗しました: ' + error.message
    };
  }
}

/**
 * プロジェクトデータを読み込む（HTML画面用）
 * @returns {Object} プロジェクトデータと統計
 */
function loadProjectsData() {
  try {
    const projectsResult = ProjectsAPI.getAllProjects();
    const statsResult = ProjectsAPI.getProjectStats();
    
    return {
      success: true,
      data: projectsResult.success ? projectsResult.data : [],
      stats: statsResult.success ? statsResult.data : {},
      message: 'プロジェクトデータを読み込みました'
    };
    
  } catch (error) {
    console.error('loadProjectsData error:', error);
    return {
      success: false,
      data: [],
      stats: {},
      message: 'データの読み込みに失敗しました: ' + error.message
    };
  }
}

/**
 * 顧客データを作成（HTML画面用）
 * @param {Object} customerData 顧客データ
 * @returns {Object} 作成結果
 */
function createCustomerData(customerData) {
  try {
    return CustomersAPI.createCustomer(customerData);
  } catch (error) {
    console.error('createCustomerData error:', error);
    return {
      success: false,
      message: '顧客の作成に失敗しました: ' + error.message
    };
  }
}

/**
 * 顧客データを更新（HTML画面用）
 * @param {string} customerId 顧客ID
 * @param {Object} updateData 更新データ
 * @returns {Object} 更新結果
 */
function updateCustomerData(customerId, updateData) {
  try {
    return CustomersAPI.updateCustomer(customerId, updateData);
  } catch (error) {
    console.error('updateCustomerData error:', error);
    return {
      success: false,
      message: '顧客の更新に失敗しました: ' + error.message
    };
  }
}

/**
 * 顧客データを削除（HTML画面用）
 * @param {string} customerId 顧客ID
 * @returns {Object} 削除結果
 */
function deleteCustomerData(customerId) {
  try {
    return CustomersAPI.deleteCustomer(customerId);
  } catch (error) {
    console.error('deleteCustomerData error:', error);
    return {
      success: false,
      message: '顧客の削除に失敗しました: ' + error.message
    };
  }
}

/**
 * プロジェクトデータを作成（HTML画面用）
 * @param {Object} projectData プロジェクトデータ
 * @returns {Object} 作成結果
 */
function createProjectData(projectData) {
  try {
    return ProjectsAPI.createProject(projectData);
  } catch (error) {
    console.error('createProjectData error:', error);
    return {
      success: false,
      message: 'プロジェクトの作成に失敗しました: ' + error.message
    };
  }
}

/**
 * プロジェクトデータを更新（HTML画面用）
 * @param {string} projectId プロジェクトID
 * @param {Object} updateData 更新データ
 * @returns {Object} 更新結果
 */
function updateProjectData(projectId, updateData) {
  try {
    return ProjectsAPI.updateProject(projectId, updateData);
  } catch (error) {
    console.error('updateProjectData error:', error);
    return {
      success: false,
      message: 'プロジェクトの更新に失敗しました: ' + error.message
    };
  }
}

/**
 * プロジェクトデータを削除（HTML画面用）
 * @param {string} projectId プロジェクトID
 * @returns {Object} 削除結果
 */
function deleteProjectData(projectId) {
  try {
    return ProjectsAPI.deleteProject(projectId);
  } catch (error) {
    console.error('deleteProjectData error:', error);
    return {
      success: false,
      message: 'プロジェクトの削除に失敗しました: ' + error.message
    };
  }
}

/**
 * 測定データ管理ページをレンダリング
 * @returns {HtmlOutput} HTML出力
 */
function renderMeasurementsPage() {
  try {
    // 管理者認証チェック
    const authResult = AuthLib.authenticateUser();
    if (!authResult.authenticated || authResult.role !== 'admin') {
      return createErrorPage('アクセス権限エラー', '管理者としてログインしてください。');
    }
    
    const template = HtmlService.createTemplateFromFile('measurements');
    template.appName = Config.getAppName();
    template.user = authResult.user;
    template.stats = getMeasurementStats();
    
    return template.evaluate()
      .setTitle(Config.getAppName() + ' - 測定データ管理')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('renderMeasurementsPage error:', error);
    return createErrorPage('ページエラー', '測定データ管理ページの読み込みでエラーが発生しました。');
  }
}

/**
 * 分析ダッシュボードページをレンダリング
 * @returns {HtmlOutput} HTML出力
 */
function renderAnalyticsPage() {
  try {
    // 管理者認証チェック
    const authResult = AuthLib.authenticateUser();
    if (!authResult.authenticated || authResult.role !== 'admin') {
      return createErrorPage('アクセス権限エラー', '管理者としてログインしてください。');
    }
    
    const template = HtmlService.createTemplateFromFile('analytics');
    template.appName = Config.getAppName();
    template.user = authResult.user;
    
    return template.evaluate()
      .setTitle(Config.getAppName() + ' - 分析ダッシュボード')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('renderAnalyticsPage error:', error);
    return createErrorPage('ページエラー', '分析ダッシュボードページの読み込みでエラーが発生しました。');
  }
}

/**
 * 顧客のプロジェクト一覧を取得（顧客ダッシュボード用）
 * @param {string} customerId 顧客ID
 * @returns {Object} プロジェクト一覧
 */
function getCustomerProjects(customerId) {
  try {
    return ProjectsAPI.getProjectsByCustomer(customerId);
  } catch (error) {
    console.error('getCustomerProjects error:', error);
    return {
      success: false,
      data: [],
      message: 'プロジェクトデータの取得に失敗しました: ' + error.message
    };
  }
}

/**
 * Phase 2 機能テストの実行
 * @returns {Object} テスト結果
 */
function runPhase2Tests() {
  try {
    const results = {
      customers: runCustomersAPITests(),
      projects: runProjectsAPITests()
    };
    
    return {
      success: true,
      message: 'Phase 2 テストが完了しました',
      data: results
    };
    
  } catch (error) {
    console.error('runPhase2Tests error:', error);
    return {
      success: false,
      message: 'Phase 2 テストでエラーが発生しました: ' + error.message
    };
  }
}

/**
 * Phase 2 品質チェックの実行
 * @returns {Object} 品質チェック結果
 */
function runPhase2QualityCheck() {
  try {
    // Phase 2 特有の品質チェック項目
    const checks = {
      customersAPI: QualityLib.checkAPIQuality('CustomersAPI'),
      projectsAPI: QualityLib.checkAPIQuality('ProjectsAPI'),
      dataIntegrity: QualityLib.checkPhase2DataIntegrity(),
      performance: QualityLib.checkPhase2Performance()
    };
    
    const allPassed = Object.values(checks).every(check => check.status === 'PASS');
    
    return {
      success: true,
      message: 'Phase 2 品質チェックが完了しました',
      data: {
        overallStatus: allPassed ? 'PASS' : 'FAIL',
        checks: checks
      }
    };
    
  } catch (error) {
    console.error('runPhase2QualityCheck error:', error);
    return {
      success: false,
      message: 'Phase 2 品質チェックでエラーが発生しました: ' + error.message
    };
  }
}

/**
 * 測定データを読み込む（HTML画面用）
 * @returns {Object} 測定データ
 */
function loadMeasurementsData() {
  try {
    const measurementsResult = MeasurementsAPI.getAllMeasurements();
    
    return {
      success: true,
      data: measurementsResult.success ? measurementsResult.data : [],
      message: '測定データを読み込みました'
    };
    
  } catch (error) {
    console.error('loadMeasurementsData error:', error);
    return {
      success: false,
      data: [],
      message: 'データの読み込みに失敗しました: ' + error.message
    };
  }
}

/**
 * 測定データを作成（HTML画面用）
 * @param {Object} measurementData 測定データ
 * @returns {Object} 作成結果
 */
function createMeasurementData(measurementData) {
  try {
    return MeasurementsAPI.createMeasurement(measurementData);
  } catch (error) {
    console.error('createMeasurementData error:', error);
    return {
      success: false,
      message: '測定データの作成に失敗しました: ' + error.message
    };
  }
}

/**
 * 測定データを削除（HTML画面用）
 * @param {string} measurementId 測定データID
 * @returns {Object} 削除結果
 */
function deleteMeasurementData(measurementId) {
  try {
    return MeasurementsAPI.deleteMeasurement(measurementId);
  } catch (error) {
    console.error('deleteMeasurementData error:', error);
    return {
      success: false,
      message: '測定データの削除に失敗しました: ' + error.message
    };
  }
}

/**
 * 測定データ統計を取得
 * @returns {Object} 統計データ
 */
function getMeasurementStats() {
  try {
    const result = MeasurementsAPI.getMeasurementStats();
    return result.success ? result.data : {};
  } catch (error) {
    console.error('getMeasurementStats error:', error);
    return {};
  }
}

/**
 * 顧客の測定データ統計を取得
 * @param {string} customerId 顧客ID
 * @returns {Object} 統計データ
 */
function getCustomerMeasurementStats(customerId) {
  try {
    const result = MeasurementsAPI.getMeasurementStatsByCustomer(customerId);
    return result;
  } catch (error) {
    console.error('getCustomerMeasurementStats error:', error);
    return {
      success: false,
      data: {},
      message: '顧客測定データ統計の取得に失敗しました: ' + error.message
    };
  }
}

/**
 * 顧客の測定データを取得
 * @param {string} customerId 顧客ID
 * @returns {Object} 測定データ
 */
function getCustomerMeasurements(customerId) {
  try {
    const result = MeasurementsAPI.getMeasurementsByCustomer(customerId);
    return result;
  } catch (error) {
    console.error('getCustomerMeasurements error:', error);
    return {
      success: false,
      data: [],
      message: '顧客測定データの取得に失敗しました: ' + error.message
    };
  }
}

/**
 * CO2除去効率分析を取得（HTML画面用）
 * @param {string} projectId プロジェクトID
 * @param {string} period 分析期間
 * @returns {Object} 効率分析結果
 */
function getCO2RemovalEfficiency(projectId, period) {
  try {
    return AnalyticsAPI.getCO2RemovalEfficiency(projectId, period);
  } catch (error) {
    console.error('getCO2RemovalEfficiency error:', error);
    return {
      success: false,
      message: 'CO2除去効率分析に失敗しました: ' + error.message
    };
  }
}

/**
 * 環境データトレンド分析を取得（HTML画面用）
 * @param {string} projectId プロジェクトID
 * @param {string} metric 分析メトリック
 * @param {Object} options オプション
 * @returns {Object} トレンド分析結果
 */
function analyzeEnvironmentalTrends(projectId, metric, options) {
  try {
    return AnalyticsAPI.analyzeEnvironmentalTrends(projectId, metric, options);
  } catch (error) {
    console.error('analyzeEnvironmentalTrends error:', error);
    return {
      success: false,
      message: '環境データトレンド分析に失敗しました: ' + error.message
    };
  }
}

/**
 * プロジェクト比較分析を取得（HTML画面用）
 * @param {Array} projectIds プロジェクトIDの配列
 * @param {string} period 分析期間
 * @returns {Object} 比較分析結果
 */
function compareProjects(projectIds, period) {
  try {
    return AnalyticsAPI.compareProjects(projectIds, period);
  } catch (error) {
    console.error('compareProjects error:', error);
    return {
      success: false,
      message: 'プロジェクト比較分析に失敗しました: ' + error.message
    };
  }
}

/**
 * システムレポートを生成（HTML画面用）
 * @param {Object} options レポートオプション
 * @returns {Object} システムレポート
 */
function generateSystemReport(options) {
  try {
    return AnalyticsAPI.generateSystemReport(options);
  } catch (error) {
    console.error('generateSystemReport error:', error);
    return {
      success: false,
      message: 'システムレポート生成に失敗しました: ' + error.message
    };
  }
}