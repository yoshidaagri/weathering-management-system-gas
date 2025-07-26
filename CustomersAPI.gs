/**
 * 顧客管理API - 顧客データのCRUD操作と関連機能
 * Phase 2: コア機能 - 顧客管理
 * 
 * 主な機能:
 * - 顧客データの作成・読取・更新・削除
 * - 顧客検索・フィルタリング
 * - データバリデーション
 * - 契約状況管理
 * - 顧客統計情報
 */

/**
 * 顧客管理API メインオブジェクト
 */
const CustomersAPI = {
  
  /**
   * 新しい顧客を作成する
   * @param {Object} customerData 顧客データ
   * @param {string} customerData.companyName 会社名
   * @param {string} customerData.contactName 担当者名
   * @param {string} customerData.email メールアドレス
   * @param {string} customerData.phone 電話番号
   * @param {string} customerData.address 住所
   * @param {string} customerData.industry 業界
   * @param {string} customerData.contractStatus 契約状況
   * @returns {Object} 作成結果
   * @throws {Error} バリデーションエラー
   */
  createCustomer: function(customerData) {
    const startTime = new Date();
    
    try {
      // バリデーション
      const validation = this.validateCustomerData(customerData);
      if (!validation.isValid) {
        throw new Error('バリデーションエラー: ' + validation.errors.join(', '));
      }
      
      // 重複チェック
      const duplicateCheck = this.checkDuplicateCustomer(customerData.email, customerData.companyName);
      if (duplicateCheck.exists) {
        throw new Error('顧客が既に存在します: ' + duplicateCheck.field);
      }
      
      // 顧客ID生成
      const customerId = this.generateCustomerId();
      
      // 顧客データ準備
      const newCustomer = {
        customerId: customerId,
        companyName: customerData.companyName,
        contactName: customerData.contactName || '',
        email: customerData.email,
        phone: customerData.phone || '',
        address: customerData.address || '',
        industry: customerData.industry || '',
        contractStatus: customerData.contractStatus || 'prospect',
        contractDate: customerData.contractDate || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        notes: customerData.notes || ''
      };
      
      // データベースに挿入
      const insertResult = DataLib.insert('CUSTOMERS_SHEET_ID', 'Customers', [
        newCustomer.customerId,
        newCustomer.companyName,
        newCustomer.contactName,
        newCustomer.email,
        newCustomer.phone,
        newCustomer.address,
        newCustomer.industry,
        newCustomer.contractStatus,
        newCustomer.contractDate,
        newCustomer.createdAt,
        newCustomer.updatedAt,
        newCustomer.isActive,
        newCustomer.notes
      ]);
      
      if (!insertResult.success) {
        throw new Error('データベース挿入エラー: ' + insertResult.error);
      }
      
      // ログ記録
      this.logCustomerAction('CREATE', customerId, customerData.companyName);
      
      // 実行時間監視
      const executionTime = new Date() - startTime;
      console.log(`createCustomer executed in ${executionTime}ms`);
      
      return {
        success: true,
        customerId: customerId,
        message: '顧客が正常に作成されました',
        data: newCustomer,
        executionTime: executionTime
      };
      
    } catch (error) {
      // エラーログ
      this.logError('createCustomer', error, customerData);
      throw error;
    }
  },
  
  /**
   * 顧客情報を取得する
   * @param {string} customerId 顧客ID
   * @returns {Object} 顧客データ
   */
  getCustomer: function(customerId) {
    const startTime = new Date();
    
    try {
      if (!customerId) {
        throw new Error('顧客IDが指定されていません');
      }
      
      // データ取得
      const customers = DataLib.getAllData('CUSTOMERS_SHEET_ID', 'Customers');
      const customer = customers.find(c => c[0] === customerId);
      
      if (!customer) {
        return {
          success: false,
          message: '顧客が見つかりません',
          data: null
        };
      }
      
      // データ整形
      const customerData = this.formatCustomerData(customer);
      
      const executionTime = new Date() - startTime;
      console.log(`getCustomer executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: '顧客データを取得しました',
        data: customerData,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('getCustomer', error, { customerId: customerId });
      throw error;
    }
  },
  
  /**
   * 全顧客一覧を取得する
   * @param {Object} options フィルタ・ソートオプション
   * @param {string} options.status 契約状況フィルタ
   * @param {string} options.industry 業界フィルタ
   * @param {string} options.sortBy ソート項目
   * @param {string} options.sortOrder ソート順序
   * @param {number} options.limit 取得件数制限
   * @returns {Object} 顧客一覧
   */
  getAllCustomers: function(options = {}) {
    const startTime = new Date();
    
    try {
      // 全データ取得
      const rawData = DataLib.getAllData('CUSTOMERS_SHEET_ID', 'Customers');
      let customers = rawData.map(row => this.formatCustomerData(row));
      
      // アクティブな顧客のみ取得（デフォルト）
      if (options.includeInactive !== true) {
        customers = customers.filter(c => c.isActive);
      }
      
      // 契約状況フィルタ
      if (options.status) {
        customers = customers.filter(c => c.contractStatus === options.status);
      }
      
      // 業界フィルタ
      if (options.industry) {
        customers = customers.filter(c => c.industry === options.industry);
      }
      
      // 検索フィルタ
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        customers = customers.filter(c => 
          c.companyName.toLowerCase().includes(searchTerm) ||
          c.contactName.toLowerCase().includes(searchTerm) ||
          c.email.toLowerCase().includes(searchTerm)
        );
      }
      
      // ソート
      if (options.sortBy) {
        customers = this.sortCustomers(customers, options.sortBy, options.sortOrder);
      } else {
        // デフォルトソート（会社名昇順）
        customers.sort((a, b) => a.companyName.localeCompare(b.companyName));
      }
      
      // 件数制限
      if (options.limit && options.limit > 0) {
        customers = customers.slice(0, options.limit);
      }
      
      const executionTime = new Date() - startTime;
      console.log(`getAllCustomers executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: `${customers.length}件の顧客データを取得しました`,
        data: customers,
        total: customers.length,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('getAllCustomers', error, options);
      throw error;
    }
  },
  
  /**
   * 顧客情報を更新する
   * @param {string} customerId 顧客ID
   * @param {Object} updateData 更新データ
   * @returns {Object} 更新結果
   */
  updateCustomer: function(customerId, updateData) {
    const startTime = new Date();
    
    try {
      if (!customerId) {
        throw new Error('顧客IDが指定されていません');
      }
      
      // 既存データ取得
      const existingResult = this.getCustomer(customerId);
      if (!existingResult.success) {
        throw new Error('更新対象の顧客が見つかりません');
      }
      
      const existingCustomer = existingResult.data;
      
      // 更新データバリデーション
      const validation = this.validateUpdateData(updateData);
      if (!validation.isValid) {
        throw new Error('バリデーションエラー: ' + validation.errors.join(', '));
      }
      
      // 重複チェック（メール・会社名が変更された場合）
      if (updateData.email && updateData.email !== existingCustomer.email) {
        const duplicateCheck = this.checkDuplicateCustomer(updateData.email, null, customerId);
        if (duplicateCheck.exists) {
          throw new Error('メールアドレスが既に使用されています');
        }
      }
      
      if (updateData.companyName && updateData.companyName !== existingCustomer.companyName) {
        const duplicateCheck = this.checkDuplicateCustomer(null, updateData.companyName, customerId);
        if (duplicateCheck.exists) {
          throw new Error('会社名が既に登録されています');
        }
      }
      
      // 更新データ準備
      const updatedData = {
        ...existingCustomer,
        ...updateData,
        updatedAt: new Date()
      };
      
      // データベース更新
      const updateResult = DataLib.update('CUSTOMERS_SHEET_ID', 'Customers', customerId, [
        updatedData.customerId,
        updatedData.companyName,
        updatedData.contactName,
        updatedData.email,
        updatedData.phone,
        updatedData.address,
        updatedData.industry,
        updatedData.contractStatus,
        updatedData.contractDate,
        updatedData.createdAt,
        updatedData.updatedAt,
        updatedData.isActive,
        updatedData.notes
      ]);
      
      if (!updateResult.success) {
        throw new Error('データベース更新エラー: ' + updateResult.error);
      }
      
      // ログ記録
      this.logCustomerAction('UPDATE', customerId, updatedData.companyName);
      
      const executionTime = new Date() - startTime;
      console.log(`updateCustomer executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: '顧客情報が正常に更新されました',
        data: updatedData,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('updateCustomer', error, { customerId: customerId, updateData: updateData });
      throw error;
    }
  },
  
  /**
   * 顧客を削除する（論理削除）
   * @param {string} customerId 顧客ID
   * @returns {Object} 削除結果
   */
  deleteCustomer: function(customerId) {
    const startTime = new Date();
    
    try {
      if (!customerId) {
        throw new Error('顧客IDが指定されていません');
      }
      
      // 既存データ確認
      const existingResult = this.getCustomer(customerId);
      if (!existingResult.success) {
        throw new Error('削除対象の顧客が見つかりません');
      }
      
      const customer = existingResult.data;
      
      // 関連プロジェクトチェック
      const projectCheck = this.checkCustomerProjects(customerId);
      if (projectCheck.hasActiveProjects) {
        throw new Error('アクティブなプロジェクトがあるため削除できません');
      }
      
      // 論理削除実行
      const deleteResult = this.updateCustomer(customerId, {
        isActive: false,
        deletedAt: new Date()
      });
      
      if (!deleteResult.success) {
        throw new Error('顧客削除に失敗しました');
      }
      
      // ログ記録
      this.logCustomerAction('DELETE', customerId, customer.companyName);
      
      const executionTime = new Date() - startTime;
      console.log(`deleteCustomer executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: '顧客が正常に削除されました',
        data: { customerId: customerId },
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('deleteCustomer', error, { customerId: customerId });
      throw error;
    }
  },
  
  /**
   * 顧客統計情報を取得する
   * @returns {Object} 統計データ
   */
  getCustomerStats: function() {
    const startTime = new Date();
    
    try {
      const allCustomers = this.getAllCustomers({ includeInactive: true });
      const customers = allCustomers.data;
      
      const stats = {
        total: customers.length,
        active: customers.filter(c => c.isActive).length,
        inactive: customers.filter(c => !c.isActive).length,
        byStatus: {},
        byIndustry: {},
        recentlyAdded: 0
      };
      
      // 契約状況別統計
      customers.forEach(customer => {
        const status = customer.contractStatus || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        
        const industry = customer.industry || 'unknown';
        stats.byIndustry[industry] = (stats.byIndustry[industry] || 0) + 1;
      });
      
      // 最近追加された顧客（7日以内）
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      stats.recentlyAdded = customers.filter(c => 
        new Date(c.createdAt) > weekAgo
      ).length;
      
      const executionTime = new Date() - startTime;
      console.log(`getCustomerStats executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: '顧客統計情報を取得しました',
        data: stats,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('getCustomerStats', error, {});
      throw error;
    }
  },
  
  /**
   * 顧客データをバリデーションする
   * @param {Object} customerData 顧客データ
   * @returns {Object} バリデーション結果
   */
  validateCustomerData: function(customerData) {
    const errors = [];
    
    // 必須項目チェック
    if (!customerData.companyName || customerData.companyName.trim() === '') {
      errors.push('会社名は必須です');
    }
    
    if (!customerData.email || customerData.email.trim() === '') {
      errors.push('メールアドレスは必須です');
    }
    
    // メールアドレス形式チェック
    if (customerData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerData.email)) {
        errors.push('メールアドレスの形式が正しくありません');
      }
    }
    
    // 電話番号形式チェック（入力がある場合）
    if (customerData.phone && customerData.phone.trim() !== '') {
      const phoneRegex = /^[\d\-\(\)\+\s]+$/;
      if (!phoneRegex.test(customerData.phone)) {
        errors.push('電話番号の形式が正しくありません');
      }
    }
    
    // 文字数制限チェック
    if (customerData.companyName && customerData.companyName.length > 100) {
      errors.push('会社名は100文字以内で入力してください');
    }
    
    if (customerData.contactName && customerData.contactName.length > 50) {
      errors.push('担当者名は50文字以内で入力してください');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },
  
  /**
   * 更新データをバリデーションする
   * @param {Object} updateData 更新データ
   * @returns {Object} バリデーション結果
   */
  validateUpdateData: function(updateData) {
    const errors = [];
    
    // 空の更新データチェック
    if (!updateData || Object.keys(updateData).length === 0) {
      errors.push('更新データが指定されていません');
      return { isValid: false, errors: errors };
    }
    
    // 各フィールドのバリデーション
    if (updateData.hasOwnProperty('companyName')) {
      if (!updateData.companyName || updateData.companyName.trim() === '') {
        errors.push('会社名は必須です');
      } else if (updateData.companyName.length > 100) {
        errors.push('会社名は100文字以内で入力してください');
      }
    }
    
    if (updateData.hasOwnProperty('email')) {
      if (!updateData.email || updateData.email.trim() === '') {
        errors.push('メールアドレスは必須です');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          errors.push('メールアドレスの形式が正しくありません');
        }
      }
    }
    
    if (updateData.hasOwnProperty('phone') && updateData.phone.trim() !== '') {
      const phoneRegex = /^[\d\-\(\)\+\s]+$/;
      if (!phoneRegex.test(updateData.phone)) {
        errors.push('電話番号の形式が正しくありません');
      }
    }
    
    if (updateData.hasOwnProperty('contactName') && updateData.contactName.length > 50) {
      errors.push('担当者名は50文字以内で入力してください');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },
  
  /**
   * 重複顧客をチェックする
   * @param {string} email メールアドレス
   * @param {string} companyName 会社名
   * @param {string} excludeId 除外する顧客ID
   * @returns {Object} 重複チェック結果
   */
  checkDuplicateCustomer: function(email, companyName, excludeId = null) {
    try {
      const customers = DataLib.getAllData('CUSTOMERS_SHEET_ID', 'Customers');
      
      for (const customer of customers) {
        const customerId = customer[0];
        const customerEmail = customer[3];
        const customerCompanyName = customer[1];
        const isActive = customer[11];
        
        // 除外IDのスキップ
        if (excludeId && customerId === excludeId) {
          continue;
        }
        
        // アクティブな顧客のみチェック
        if (!isActive) {
          continue;
        }
        
        // メールアドレス重複チェック
        if (email && customerEmail === email) {
          return {
            exists: true,
            field: 'email',
            existingCustomerId: customerId
          };
        }
        
        // 会社名重複チェック
        if (companyName && customerCompanyName === companyName) {
          return {
            exists: true,
            field: 'companyName',
            existingCustomerId: customerId
          };
        }
      }
      
      return { exists: false };
      
    } catch (error) {
      this.logError('checkDuplicateCustomer', error, { email: email, companyName: companyName });
      throw error;
    }
  },
  
  /**
   * 顧客に関連するプロジェクトをチェックする
   * @param {string} customerId 顧客ID
   * @returns {Object} プロジェクトチェック結果
   */
  checkCustomerProjects: function(customerId) {
    try {
      // ProjectsAPI.gs が実装されるまで暫定実装
      // 実際の実装では ProjectsAPI.getProjectsByCustomer() を使用
      
      return {
        hasActiveProjects: false,
        activeProjectCount: 0,
        totalProjectCount: 0
      };
      
    } catch (error) {
      this.logError('checkCustomerProjects', error, { customerId: customerId });
      // エラーが発生した場合は安全側に倒して削除を防ぐ
      return {
        hasActiveProjects: true,
        activeProjectCount: -1,
        totalProjectCount: -1
      };
    }
  },
  
  /**
   * 顧客IDを生成する
   * @returns {string} 一意の顧客ID
   */
  generateCustomerId: function() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `CUST_${timestamp}_${random}`;
  },
  
  /**
   * 生データを顧客オブジェクトに整形する
   * @param {Array} row スプレッドシートの行データ
   * @returns {Object} 整形された顧客データ
   */
  formatCustomerData: function(row) {
    return {
      customerId: row[0] || '',
      companyName: row[1] || '',
      contactName: row[2] || '',
      email: row[3] || '',
      phone: row[4] || '',
      address: row[5] || '',
      industry: row[6] || '',
      contractStatus: row[7] || 'prospect',
      contractDate: row[8] || null,
      createdAt: row[9] || new Date(),
      updatedAt: row[10] || new Date(),
      isActive: row[11] !== false,
      notes: row[12] || ''
    };
  },
  
  /**
   * 顧客データをソートする
   * @param {Array} customers 顧客配列
   * @param {string} sortBy ソート項目
   * @param {string} sortOrder ソート順序
   * @returns {Array} ソート済み顧客配列
   */
  sortCustomers: function(customers, sortBy, sortOrder = 'asc') {
    return customers.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      // 日付フィールドの処理
      if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'contractDate') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }
      
      // 文字列フィールドの処理
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      let comparison = 0;
      if (valueA > valueB) {
        comparison = 1;
      } else if (valueA < valueB) {
        comparison = -1;
      }
      
      return sortOrder === 'desc' ? comparison * -1 : comparison;
    });
  },
  
  /**
   * 顧客操作ログを記録する
   * @param {string} action 操作タイプ
   * @param {string} customerId 顧客ID
   * @param {string} companyName 会社名
   */
  logCustomerAction: function(action, customerId, companyName) {
    try {
      const logData = {
        timestamp: new Date(),
        action: action,
        resourceType: 'CUSTOMER',
        resourceId: customerId,
        resourceName: companyName,
        userId: Session.getActiveUser().getEmail(),
        details: `Customer ${action}: ${companyName} (ID: ${customerId})`
      };
      
      // システムログに記録
      DataLib.insert('ERROR_LOG_SHEET_ID', 'SystemLogs', [
        logData.timestamp,
        logData.action,
        logData.resourceType,
        logData.resourceId,
        logData.resourceName,
        logData.userId,
        logData.details
      ]);
      
    } catch (error) {
      console.error('Failed to log customer action:', error);
    }
  },
  
  /**
   * エラーログを記録する
   * @param {string} functionName 関数名
   * @param {Error} error エラーオブジェクト
   * @param {Object} context エラーコンテキスト
   */
  logError: function(functionName, error, context) {
    try {
      const errorData = {
        timestamp: new Date(),
        functionName: 'CustomersAPI.' + functionName,
        errorMessage: error.message,
        errorStack: error.stack,
        context: JSON.stringify(context),
        userId: Session.getActiveUser().getEmail()
      };
      
      DataLib.insert('ERROR_LOG_SHEET_ID', 'ErrorLogs', [
        errorData.timestamp,
        errorData.functionName,
        errorData.errorMessage,
        errorData.errorStack,
        errorData.context,
        errorData.userId
      ]);
      
      console.error(`CustomersAPI.${functionName} error:`, error);
      
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
};

/**
 * 顧客管理APIのテスト関数群
 * TestLib.gs から呼び出される
 */

/**
 * 顧客作成のテスト
 */
function testCreateCustomer() {
  TestLib.addTest(
    'CustomersAPI.createCustomer - valid data',
    function() {
      const testData = {
        companyName: 'テスト株式会社',
        contactName: 'テスト太郎',
        email: 'test@example.com',
        phone: '03-1234-5678',
        industry: '製造業',
        contractStatus: 'prospect'
      };
      
      const result = CustomersAPI.createCustomer(testData);
      return result.success && result.customerId;
    },
    true,
    'customer'
  );
  
  TestLib.addTest(
    'CustomersAPI.createCustomer - missing required field',
    function() {
      try {
        CustomersAPI.createCustomer({ companyName: 'テスト会社' }); // emailなし
        return false; // エラーが発生すべき
      } catch (error) {
        return error.message.includes('バリデーションエラー');
      }
    },
    true,
    'customer'
  );
}

/**
 * 顧客取得のテスト
 */
function testGetCustomer() {
  TestLib.addTest(
    'CustomersAPI.getAllCustomers',
    function() {
      const result = CustomersAPI.getAllCustomers();
      return result.success && Array.isArray(result.data);
    },
    true,
    'customer'
  );
  
  TestLib.addTest(
    'CustomersAPI.getCustomerStats',
    function() {
      const result = CustomersAPI.getCustomerStats();
      return result.success && typeof result.data.total === 'number';
    },
    true,
    'customer'
  );
}

/**
 * Phase 2 顧客管理APIテストの実行
 */
function runCustomersAPITests() {
  testCreateCustomer();
  testGetCustomer();
  
  const results = TestLib.runCategoryTests('customer');
  return results;
}