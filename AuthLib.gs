/**
 * 認証ライブラリ
 * Phase 1: 基盤構築 - 認証システム
 * Google Account認証、管理者・顧客ユーザー管理、セッション管理、権限チェック
 */

const AuthLib = {

  /**
   * 現在のユーザー情報を取得
   * @returns {Object|null} ユーザー情報またはnull（未ログイン）
   */
  getCurrentUser: function() {
    try {
      const user = Session.getActiveUser();
      if (!user || !user.getEmail()) {
        return null;
      }

      return {
        email: user.getEmail(),
        name: user.getEmail().split('@')[0] // 簡易名前取得
      };
    } catch (error) {
      console.error('getCurrentUser error:', error);
      return null;
    }
  },

  /**
   * 管理者ユーザーかチェック
   * @param {string} email ユーザーのメールアドレス
   * @returns {boolean} 管理者ユーザーの場合true
   */
  isAdminUser: function(email) {
    if (!email) return false;

    try {
      const sheetId = Config.getSheetId('adminUsers');
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('AdminUsers');
      
      if (!sheet) {
        throw new Error('AdminUsersシートが見つかりません');
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const emailIndex = headers.indexOf('email');
      const isActiveIndex = headers.indexOf('isActive');

      if (emailIndex === -1 || isActiveIndex === -1) {
        throw new Error('AdminUsersシートのヘッダーが正しくありません');
      }

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[emailIndex] === email && row[isActiveIndex] === true) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('isAdminUser error:', error);
      this.logError('isAdminUser', error, { email: email });
      return false;
    }
  },

  /**
   * 顧客ユーザー情報を取得
   * @param {string} email ユーザーのメールアドレス
   * @returns {Object|null} 顧客ユーザー情報またはnull
   */
  getCustomerUser: function(email) {
    if (!email) return null;

    try {
      const sheetId = Config.getSheetId('customerUsers');
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('CustomerUsers');
      
      if (!sheet) {
        throw new Error('CustomerUsersシートが見つかりません');
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const emailIndex = headers.indexOf('email');
      const isActiveIndex = headers.indexOf('isActive');
      const customerIdIndex = headers.indexOf('customerId');
      const companyNameIndex = headers.indexOf('companyName');

      if (emailIndex === -1 || isActiveIndex === -1 || customerIdIndex === -1) {
        throw new Error('CustomerUsersシートのヘッダーが正しくありません');
      }

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[emailIndex] === email && row[isActiveIndex] === true) {
          return {
            userId: row[0], // 最初の列はuserId
            email: row[emailIndex],
            name: row[headers.indexOf('name')] || '',
            customerId: row[customerIdIndex],
            companyName: row[companyNameIndex] || ''
          };
        }
      }

      return null;
    } catch (error) {
      console.error('getCustomerUser error:', error);
      this.logError('getCustomerUser', error, { email: email });
      return null;
    }
  },

  /**
   * ユーザー認証とロール判定
   * @returns {Object} 認証結果
   */
  authenticateUser: function() {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        return {
          authenticated: false,
          role: null,
          user: null,
          error: 'ユーザーがログインしていません'
        };
      }

      const email = currentUser.email;

      // 管理者チェック
      if (this.isAdminUser(email)) {
        this.updateLastLogin(email, 'admin');
        return {
          authenticated: true,
          role: 'admin',
          user: {
            email: email,
            name: currentUser.name,
            type: 'admin'
          }
        };
      }

      // 顧客ユーザーチェック
      const customerUser = this.getCustomerUser(email);
      if (customerUser) {
        this.updateLastLogin(email, 'customer');
        return {
          authenticated: true,
          role: 'customer',
          user: {
            email: customerUser.email,
            name: customerUser.name,
            customerId: customerUser.customerId,
            companyName: customerUser.companyName,
            type: 'customer'
          }
        };
      }

      return {
        authenticated: false,
        role: null,
        user: null,
        error: 'アクセス権限がありません'
      };

    } catch (error) {
      console.error('authenticateUser error:', error);
      this.logError('authenticateUser', error, {});
      return {
        authenticated: false,
        role: null,
        user: null,
        error: '認証エラーが発生しました'
      };
    }
  },

  /**
   * 権限チェック
   * @param {string} email ユーザーのメールアドレス
   * @param {string} resource リソース名
   * @param {string} action アクション名（read, write, delete等）
   * @returns {boolean} アクセス許可の場合true
   */
  hasPermission: function(email, resource, action = 'read') {
    try {
      if (!email || !resource) return false;

      const isAdmin = this.isAdminUser(email);
      const customerUser = this.getCustomerUser(email);

      // 管理者は全てのリソースにアクセス可能
      if (isAdmin) {
        return true;
      }

      // 顧客ユーザーの権限チェック
      if (customerUser) {
        switch (resource) {
          case 'customers':
            // 顧客は自社データのみ読み取り可能
            return action === 'read';
          
          case 'projects':
            // 顧客は自社プロジェクトのみアクセス可能
            return action === 'read';
          
          case 'measurements':
            // 顧客は自社測定データのみアクセス可能
            return action === 'read';
          
          case 'reports':
            // 顧客は自社レポートのみアクセス可能
            return action === 'read';
          
          case 'admin':
          case 'system':
            // 管理者専用リソースはアクセス不可
            return false;
          
          default:
            return false;
        }
      }

      return false;
    } catch (error) {
      console.error('hasPermission error:', error);
      this.logError('hasPermission', error, { email: email, resource: resource, action: action });
      return false;
    }
  },

  /**
   * 最終ログイン日時を更新
   * @param {string} email ユーザーのメールアドレス
   * @param {string} userType ユーザータイプ（admin, customer）
   */
  updateLastLogin: function(email, userType) {
    try {
      const sheetType = userType === 'admin' ? 'adminUsers' : 'customerUsers';
      const sheetName = userType === 'admin' ? 'AdminUsers' : 'CustomerUsers';
      const sheetId = Config.getSheetId(sheetType);
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
      
      if (!sheet) {
        throw new Error(`${sheetName}シートが見つかりません`);
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const emailIndex = headers.indexOf('email');
      const lastLoginIndex = headers.indexOf('lastLogin');

      if (emailIndex === -1 || lastLoginIndex === -1) {
        throw new Error(`${sheetName}シートのヘッダーが正しくありません`);
      }

      for (let i = 1; i < data.length; i++) {
        if (data[i][emailIndex] === email) {
          sheet.getRange(i + 1, lastLoginIndex + 1).setValue(new Date());
          break;
        }
      }
    } catch (error) {
      console.error('updateLastLogin error:', error);
      this.logError('updateLastLogin', error, { email: email, userType: userType });
    }
  },

  /**
   * 新規管理者ユーザー作成
   * @param {Object} adminData 管理者データ
   * @returns {string} 作成された管理者ID
   */
  createAdminUser: function(adminData) {
    if (!adminData || !adminData.email || !adminData.name) {
      throw new Error('必須パラメータが不足しています: email, name');
    }

    try {
      const sheetId = Config.getSheetId('adminUsers');
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('AdminUsers');
      
      if (!sheet) {
        throw new Error('AdminUsersシートが見つかりません');
      }

      // 重複チェック
      if (this.isAdminUser(adminData.email)) {
        throw new Error('既に登録済みの管理者です');
      }

      const adminId = Utilities.getUuid();
      const newRow = [
        adminId,
        adminData.email,
        adminData.name,
        true, // isActive
        null, // lastLogin
        new Date() // createdAt
      ];

      sheet.appendRow(newRow);
      return adminId;

    } catch (error) {
      console.error('createAdminUser error:', error);
      this.logError('createAdminUser', error, { adminData: adminData });
      throw error;
    }
  },

  /**
   * 新規顧客ユーザー作成
   * @param {Object} customerUserData 顧客ユーザーデータ
   * @returns {string} 作成されたユーザーID
   */
  createCustomerUser: function(customerUserData) {
    if (!customerUserData || !customerUserData.email || !customerUserData.customerId) {
      throw new Error('必須パラメータが不足しています: email, customerId');
    }

    try {
      const sheetId = Config.getSheetId('customerUsers');
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('CustomerUsers');
      
      if (!sheet) {
        throw new Error('CustomerUsersシートが見つかりません');
      }

      // 重複チェック
      if (this.getCustomerUser(customerUserData.email)) {
        throw new Error('既に登録済みの顧客ユーザーです');
      }

      const userId = Utilities.getUuid();
      const newRow = [
        userId,
        customerUserData.email,
        customerUserData.name || '',
        customerUserData.customerId,
        customerUserData.companyName || '',
        true, // isActive
        null, // lastLogin
        new Date() // createdAt
      ];

      sheet.appendRow(newRow);
      return userId;

    } catch (error) {
      console.error('createCustomerUser error:', error);
      this.logError('createCustomerUser', error, { customerUserData: customerUserData });
      throw error;
    }
  },

  /**
   * エラーログ記録
   * @param {string} functionName 関数名
   * @param {Error} error エラーオブジェクト
   * @param {Object} context コンテキスト情報
   */
  logError: function(functionName, error, context) {
    try {
      const sheetId = Config.getSheetId('errorLog');
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('ErrorLogs');
      
      if (sheet) {
        const newRow = [
          new Date(),
          `AuthLib.${functionName}`,
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
};

/**
 * 認証テスト用の関数群
 */
function testAuthenticationFlow() {
  try {
    console.log('=== 認証フローテスト開始 ===');
    
    // 1. 現在のユーザー取得テスト
    const currentUser = AuthLib.getCurrentUser();
    console.log('現在のユーザー:', currentUser);
    
    // 2. 認証テスト
    const authResult = AuthLib.authenticateUser();
    console.log('認証結果:', authResult);
    
    // 3. 権限テスト（現在のユーザーで）
    if (currentUser) {
      const permissions = {
        customers: AuthLib.hasPermission(currentUser.email, 'customers'),
        projects: AuthLib.hasPermission(currentUser.email, 'projects'),
        admin: AuthLib.hasPermission(currentUser.email, 'admin')
      };
      console.log('権限チェック結果:', permissions);
    }
    
    console.log('=== 認証フローテスト完了 ===');
    return { success: true, authResult: authResult };
    
  } catch (error) {
    console.error('認証フローテストエラー:', error);
    return { success: false, error: error.message };
  }
}