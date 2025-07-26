/**
 * データアクセス層
 * Phase 1: 基盤構築 - Google Sheetsデータベース基盤
 * 基本CRUD操作、データ整合性チェック
 */

const DataLib = {

  /**
   * スプレッドシートとシートの取得（共通処理）
   * @param {string} sheetType スプレッドシートタイプ
   * @param {string} sheetName シート名
   * @returns {Object} シートオブジェクト
   */
  getSheet: function(sheetType, sheetName) {
    try {
      const sheetId = Config.getSheetId(sheetType);
      const spreadsheet = SpreadsheetApp.openById(sheetId);
      const sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        throw new Error(`シート「${sheetName}」が見つかりません（${sheetType}）`);
      }
      
      return sheet;
    } catch (error) {
      console.error(`getSheet error: ${sheetType}/${sheetName}`, error);
      throw error;
    }
  },

  /**
   * データの全件取得
   * @param {string} sheetType スプレッドシートタイプ
   * @param {string} sheetName シート名
   * @returns {Array} データ配列（ヘッダー含む）
   */
  getAllData: function(sheetType, sheetName) {
    try {
      const startTime = new Date();
      const sheet = this.getSheet(sheetType, sheetName);
      const data = sheet.getDataRange().getValues();
      
      const executionTime = new Date() - startTime;
      console.log(`getAllData (${sheetType}/${sheetName}) executed in ${executionTime}ms`);
      
      if (executionTime > 5000) {
        console.warn(`getAllData took ${executionTime}ms - consider optimization`);
      }
      
      return data;
    } catch (error) {
      console.error(`getAllData error: ${sheetType}/${sheetName}`, error);
      this.logError('getAllData', error, { sheetType, sheetName });
      throw error;
    }
  },

  /**
   * データ検索（条件指定）
   * @param {string} sheetType スプレッドシートタイプ
   * @param {string} sheetName シート名
   * @param {string} columnName 検索対象列名
   * @param {any} value 検索値
   * @returns {Array} 検索結果の行データ配列
   */
  findByColumn: function(sheetType, sheetName, columnName, value) {
    try {
      const data = this.getAllData(sheetType, sheetName);
      if (data.length === 0) return [];
      
      const headers = data[0];
      const columnIndex = headers.indexOf(columnName);
      
      if (columnIndex === -1) {
        throw new Error(`列「${columnName}」が見つかりません`);
      }
      
      const results = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][columnIndex] === value) {
          // ヘッダーと対応付けたオブジェクト形式で返す
          const row = {};
          headers.forEach((header, index) => {
            row[header] = data[i][index];
          });
          results.push(row);
        }
      }
      
      return results;
    } catch (error) {
      console.error(`findByColumn error: ${sheetType}/${sheetName}`, error);
      this.logError('findByColumn', error, { sheetType, sheetName, columnName, value });
      throw error;
    }
  },

  /**
   * データの一件取得（ID指定）
   * @param {string} sheetType スプレッドシートタイプ
   * @param {string} sheetName シート名
   * @param {string} id 取得対象のID
   * @param {string} idColumnName ID列名（デフォルト：最初の列）
   * @returns {Object|null} データオブジェクトまたはnull
   */
  findById: function(sheetType, sheetName, id, idColumnName = null) {
    try {
      const data = this.getAllData(sheetType, sheetName);
      if (data.length === 0) return null;
      
      const headers = data[0];
      const columnIndex = idColumnName ? headers.indexOf(idColumnName) : 0;
      
      if (columnIndex === -1) {
        throw new Error(`ID列「${idColumnName}」が見つかりません`);
      }
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][columnIndex] === id) {
          const row = {};
          headers.forEach((header, index) => {
            row[header] = data[i][index];
          });
          return row;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`findById error: ${sheetType}/${sheetName}`, error);
      this.logError('findById', error, { sheetType, sheetName, id, idColumnName });
      throw error;
    }
  },

  /**
   * データの挿入
   * @param {string} sheetType スプレッドシートタイプ
   * @param {string} sheetName シート名
   * @param {Object} data 挿入データ
   * @returns {string} 挿入されたデータのID
   */
  insert: function(sheetType, sheetName, data) {
    if (!data || typeof data !== 'object') {
      throw new Error('挿入データが無効です');
    }
    
    try {
      const startTime = new Date();
      const sheet = this.getSheet(sheetType, sheetName);
      const allData = sheet.getDataRange().getValues();
      
      if (allData.length === 0) {
        throw new Error('ヘッダー行が設定されていません');
      }
      
      const headers = allData[0];
      const newRow = [];
      
      // データを列順序に合わせて配列に変換
      headers.forEach(header => {
        newRow.push(data[header] || '');
      });
      
      // IDが設定されていない場合は自動生成
      if (!data[headers[0]] || data[headers[0]] === '') {
        newRow[0] = Utilities.getUuid();
      }
      
      sheet.appendRow(newRow);
      
      const executionTime = new Date() - startTime;
      console.log(`insert (${sheetType}/${sheetName}) executed in ${executionTime}ms`);
      
      return newRow[0]; // 挿入されたデータのID
      
    } catch (error) {
      console.error(`insert error: ${sheetType}/${sheetName}`, error);
      this.logError('insert', error, { sheetType, sheetName, data });
      throw error;
    }
  },

  /**
   * データの更新
   * @param {string} sheetType スプレッドシートタイプ
   * @param {string} sheetName シート名
   * @param {string} id 更新対象のID
   * @param {Object} updateData 更新データ
   * @param {string} idColumnName ID列名（デフォルト：最初の列）
   * @returns {boolean} 更新成功の場合true
   */
  update: function(sheetType, sheetName, id, updateData, idColumnName = null) {
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('更新データが無効です');
    }
    
    try {
      const startTime = new Date();
      const sheet = this.getSheet(sheetType, sheetName);
      const data = sheet.getDataRange().getValues();
      
      if (data.length === 0) {
        throw new Error('データが存在しません');
      }
      
      const headers = data[0];
      const columnIndex = idColumnName ? headers.indexOf(idColumnName) : 0;
      
      if (columnIndex === -1) {
        throw new Error(`ID列「${idColumnName}」が見つかりません`);
      }
      
      // 対象行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][columnIndex] === id) {
          // 更新データを行に反映
          headers.forEach((header, index) => {
            if (updateData.hasOwnProperty(header)) {
              sheet.getRange(i + 1, index + 1).setValue(updateData[header]);
            }
          });
          
          // updatedAt列があれば現在日時を設定
          const updatedAtIndex = headers.indexOf('updatedAt');
          if (updatedAtIndex !== -1) {
            sheet.getRange(i + 1, updatedAtIndex + 1).setValue(new Date());
          }
          
          const executionTime = new Date() - startTime;
          console.log(`update (${sheetType}/${sheetName}) executed in ${executionTime}ms`);
          
          return true;
        }
      }
      
      throw new Error(`ID「${id}」のデータが見つかりません`);
      
    } catch (error) {
      console.error(`update error: ${sheetType}/${sheetName}`, error);
      this.logError('update', error, { sheetType, sheetName, id, updateData });
      throw error;
    }
  },

  /**
   * データの削除（論理削除）
   * @param {string} sheetType スプレッドシートタイプ
   * @param {string} sheetName シート名
   * @param {string} id 削除対象のID
   * @param {string} idColumnName ID列名（デフォルト：最初の列）
   * @returns {boolean} 削除成功の場合true
   */
  softDelete: function(sheetType, sheetName, id, idColumnName = null) {
    try {
      const updateData = { 
        isActive: false,
        deletedAt: new Date()
      };
      return this.update(sheetType, sheetName, id, updateData, idColumnName);
    } catch (error) {
      console.error(`softDelete error: ${sheetType}/${sheetName}`, error);
      this.logError('softDelete', error, { sheetType, sheetName, id });
      throw error;
    }
  },

  /**
   * データの物理削除
   * @param {string} sheetType スプレッドシートタイプ
   * @param {string} sheetName シート名
   * @param {string} id 削除対象のID
   * @param {string} idColumnName ID列名（デフォルト：最初の列）
   * @returns {boolean} 削除成功の場合true
   */
  hardDelete: function(sheetType, sheetName, id, idColumnName = null) {
    try {
      const startTime = new Date();
      const sheet = this.getSheet(sheetType, sheetName);
      const data = sheet.getDataRange().getValues();
      
      if (data.length === 0) {
        throw new Error('データが存在しません');
      }
      
      const headers = data[0];
      const columnIndex = idColumnName ? headers.indexOf(idColumnName) : 0;
      
      if (columnIndex === -1) {
        throw new Error(`ID列「${idColumnName}」が見つかりません`);
      }
      
      // 対象行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][columnIndex] === id) {
          sheet.deleteRow(i + 1);
          
          const executionTime = new Date() - startTime;
          console.log(`hardDelete (${sheetType}/${sheetName}) executed in ${executionTime}ms`);
          
          return true;
        }
      }
      
      throw new Error(`ID「${id}」のデータが見つかりません`);
      
    } catch (error) {
      console.error(`hardDelete error: ${sheetType}/${sheetName}`, error);
      this.logError('hardDelete', error, { sheetType, sheetName, id });
      throw error;
    }
  },

  /**
   * データ整合性チェック
   * @param {string} sheetType スプレッドシートタイプ
   * @param {string} sheetName シート名
   * @param {Array} expectedColumns 期待される列名配列
   * @returns {Object} チェック結果
   */
  validateDataIntegrity: function(sheetType, sheetName, expectedColumns) {
    try {
      const sheet = this.getSheet(sheetType, sheetName);
      const data = sheet.getDataRange().getValues();
      
      if (data.length === 0) {
        return {
          isValid: false,
          error: 'データが存在しません',
          expected: expectedColumns,
          actual: []
        };
      }
      
      const headers = data[0];
      const missingColumns = expectedColumns.filter(col => !headers.includes(col));
      const extraColumns = headers.filter(col => !expectedColumns.includes(col));
      
      return {
        isValid: missingColumns.length === 0,
        missing: missingColumns,
        extra: extraColumns,
        expected: expectedColumns,
        actual: headers,
        rowCount: data.length - 1 // ヘッダー除く
      };
      
    } catch (error) {
      console.error(`validateDataIntegrity error: ${sheetType}/${sheetName}`, error);
      return {
        isValid: false,
        error: error.message,
        expected: expectedColumns,
        actual: []
      };
    }
  },

  /**
   * バッチ挿入（高速処理）
   * @param {string} sheetType スプレッドシートタイプ
   * @param {string} sheetName シート名
   * @param {Array} dataArray 挿入データ配列
   * @returns {Array} 挿入されたIDの配列
   */
  batchInsert: function(sheetType, sheetName, dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error('挿入データ配列が無効です');
    }
    
    try {
      const startTime = new Date();
      const sheet = this.getSheet(sheetType, sheetName);
      const allData = sheet.getDataRange().getValues();
      
      if (allData.length === 0) {
        throw new Error('ヘッダー行が設定されていません');
      }
      
      const headers = allData[0];
      const newRows = [];
      const insertedIds = [];
      
      dataArray.forEach(data => {
        const newRow = [];
        headers.forEach(header => {
          newRow.push(data[header] || '');
        });
        
        // IDが設定されていない場合は自動生成
        if (!data[headers[0]] || data[headers[0]] === '') {
          newRow[0] = Utilities.getUuid();
        }
        
        newRows.push(newRow);
        insertedIds.push(newRow[0]);
      });
      
      // 一括挿入
      const range = sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length);
      range.setValues(newRows);
      
      const executionTime = new Date() - startTime;
      console.log(`batchInsert (${sheetType}/${sheetName}) ${dataArray.length} rows executed in ${executionTime}ms`);
      
      return insertedIds;
      
    } catch (error) {
      console.error(`batchInsert error: ${sheetType}/${sheetName}`, error);
      this.logError('batchInsert', error, { sheetType, sheetName, count: dataArray.length });
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
          `DataLib.${functionName}`,
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
 * データアクセステスト用の関数群
 */
function testDataOperations() {
  try {
    console.log('=== データアクセステスト開始 ===');
    
    // 1. データ整合性チェック
    const expectedCustomerColumns = ['customerId', 'companyName', 'contactName', 'email', 'phone', 'address', 'contractDate', 'status', 'createdAt', 'updatedAt'];
    const integrityCheck = DataLib.validateDataIntegrity('customers', 'Customers', expectedCustomerColumns);
    console.log('顧客データ整合性チェック:', integrityCheck);
    
    // 2. 全データ取得テスト
    const allCustomers = DataLib.getAllData('customers', 'Customers');
    console.log('顧客データ件数:', allCustomers.length - 1); // ヘッダー除く
    
    // 3. 検索テスト（ステータスactive）
    const activeCustomers = DataLib.findByColumn('customers', 'Customers', 'status', 'active');
    console.log('アクティブ顧客数:', activeCustomers.length);
    
    console.log('=== データアクセステスト完了 ===');
    return { 
      success: true, 
      integrityCheck: integrityCheck,
      totalCustomers: allCustomers.length - 1,
      activeCustomers: activeCustomers.length
    };
    
  } catch (error) {
    console.error('データアクセステストエラー:', error);
    return { success: false, error: error.message };
  }
}