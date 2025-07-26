/**
 * テストフレームワーク
 * Phase 1: 基盤構築 - 自動テスト機能
 * 単体テスト、統合テスト、パフォーマンステスト
 */

const TestLib = {
  testSuite: [],
  
  /**
   * テストケースを追加
   * @param {string} testName テスト名
   * @param {Function} testFunction テスト関数
   * @param {any} expectedResult 期待される結果
   * @param {string} category テストカテゴリ（unit, integration, performance）
   */
  addTest: function(testName, testFunction, expectedResult, category = 'unit') {
    this.testSuite.push({
      name: testName,
      function: testFunction,
      expected: expectedResult,
      category: category,
      status: 'PENDING'
    });
  },
  
  /**
   * 全テストを実行
   * @returns {Object} テスト結果
   */
  runAllTests: function() {
    console.log('=== 全テスト実行開始 ===');
    const startTime = new Date();
    const results = [];
    
    this.testSuite.forEach((test, index) => {
      console.log(`実行中: ${test.name} (${index + 1}/${this.testSuite.length})`);
      
      try {
        const testStartTime = new Date();
        const actual = test.function();
        const testExecutionTime = new Date() - testStartTime;
        
        let passed = false;
        let comparisonResult = '';
        
        // 結果の比較
        if (typeof test.expected === 'string' && test.expected === 'object') {
          // オブジェクト型の期待値の場合
          passed = typeof actual === 'object';
          comparisonResult = `型チェック: ${typeof actual}`;
        } else if (typeof test.expected === 'string' && test.expected === 'boolean') {
          // ブール型の期待値の場合
          passed = typeof actual === 'boolean';
          comparisonResult = `型チェック: ${typeof actual}`;
        } else if (typeof test.expected === 'string' && test.expected === 'string') {
          // 文字列型の期待値の場合
          passed = typeof actual === 'string';
          comparisonResult = `型チェック: ${typeof actual}`;
        } else {
          // 値の完全一致
          passed = JSON.stringify(actual) === JSON.stringify(test.expected);
          comparisonResult = `期待値: ${JSON.stringify(test.expected)}, 実際: ${JSON.stringify(actual)}`;
        }
        
        results.push({
          name: test.name,
          category: test.category,
          status: passed ? 'PASS' : 'FAIL',
          executionTime: testExecutionTime,
          expected: test.expected,
          actual: actual,
          comparison: comparisonResult
        });
        
      } catch (error) {
        results.push({
          name: test.name,
          category: test.category,
          status: 'ERROR',
          executionTime: 0,
          error: error.message,
          stack: error.stack
        });
      }
    });
    
    const totalExecutionTime = new Date() - startTime;
    console.log(`=== 全テスト実行完了 (${totalExecutionTime}ms) ===`);
    
    return this.generateReport(results, totalExecutionTime);
  },
  
  /**
   * カテゴリ別テスト実行
   * @param {string} category テストカテゴリ
   * @returns {Object} テスト結果
   */
  runTestsByCategory: function(category) {
    console.log(`=== ${category}テスト実行開始 ===`);
    const startTime = new Date();
    const results = [];
    
    const categoryTests = this.testSuite.filter(test => test.category === category);
    
    categoryTests.forEach((test, index) => {
      console.log(`実行中: ${test.name} (${index + 1}/${categoryTests.length})`);
      
      try {
        const testStartTime = new Date();
        const actual = test.function();
        const testExecutionTime = new Date() - testStartTime;
        
        const passed = JSON.stringify(actual) === JSON.stringify(test.expected);
        
        results.push({
          name: test.name,
          category: test.category,
          status: passed ? 'PASS' : 'FAIL',
          executionTime: testExecutionTime,
          expected: test.expected,
          actual: actual
        });
        
      } catch (error) {
        results.push({
          name: test.name,
          category: test.category,
          status: 'ERROR',
          executionTime: 0,
          error: error.message
        });
      }
    });
    
    const totalExecutionTime = new Date() - startTime;
    console.log(`=== ${category}テスト実行完了 (${totalExecutionTime}ms) ===`);
    
    return this.generateReport(results, totalExecutionTime);
  },
  
  /**
   * テストレポートを生成
   * @param {Array} results テスト結果配列
   * @param {number} totalExecutionTime 総実行時間
   * @returns {Object} テストレポート
   */
  generateReport: function(results, totalExecutionTime) {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'PASS').length;
    const failedTests = results.filter(r => r.status === 'FAIL').length;
    const errorTests = results.filter(r => r.status === 'ERROR').length;
    
    const categoryStats = {};
    results.forEach(result => {
      if (!categoryStats[result.category]) {
        categoryStats[result.category] = { total: 0, passed: 0, failed: 0, errors: 0 };
      }
      categoryStats[result.category].total++;
      if (result.status === 'PASS') categoryStats[result.category].passed++;
      else if (result.status === 'FAIL') categoryStats[result.category].failed++;
      else if (result.status === 'ERROR') categoryStats[result.category].errors++;
    });
    
    const report = {
      timestamp: new Date(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        errors: errorTests,
        passRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) + '%' : '0%',
        totalExecutionTime: totalExecutionTime
      },
      categoryStats: categoryStats,
      details: results,
      status: (failedTests === 0 && errorTests === 0) ? 'PASS' : 'FAIL'
    };
    
    // テストレポートをスプレッドシートに保存
    this.saveTestReport(report);
    
    return report;
  },
  
  /**
   * テストレポートをスプレッドシートに保存
   * @param {Object} report テストレポート
   */
  saveTestReport: function(report) {
    try {
      const sheetId = Config.getSheetId('qualityReport');
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('QualityReports');
      
      if (sheet) {
        const newRow = [
          report.timestamp,
          'Phase1-Test',
          report.status,
          report.summary.passRate,
          JSON.stringify(report.summary),
          JSON.stringify(report.categoryStats),
          JSON.stringify(report.details)
        ];
        sheet.appendRow(newRow);
        console.log('テストレポートを保存しました');
      }
    } catch (error) {
      console.error('テストレポート保存エラー:', error);
    }
  },
  
  /**
   * パフォーマンステスト用のヘルパー
   * @param {Function} testFunction テスト対象関数
   * @param {number} iterations 実行回数
   * @param {number} timeoutMs タイムアウト時間（ミリ秒）
   * @returns {Object} パフォーマンス結果
   */
  performanceTest: function(testFunction, iterations = 10, timeoutMs = 30000) {
    const results = [];
    const startTime = new Date();
    
    for (let i = 0; i < iterations; i++) {
      const iterationStart = new Date();
      
      try {
        const result = testFunction();
        const executionTime = new Date() - iterationStart;
        
        if (executionTime > timeoutMs) {
          throw new Error(`タイムアウト: ${executionTime}ms > ${timeoutMs}ms`);
        }
        
        results.push({
          iteration: i + 1,
          executionTime: executionTime,
          success: true,
          result: result
        });
        
      } catch (error) {
        results.push({
          iteration: i + 1,
          executionTime: new Date() - iterationStart,
          success: false,
          error: error.message
        });
      }
    }
    
    const totalTime = new Date() - startTime;
    const successfulRuns = results.filter(r => r.success);
    const executionTimes = successfulRuns.map(r => r.executionTime);
    
    return {
      totalIterations: iterations,
      successfulRuns: successfulRuns.length,
      failedRuns: iterations - successfulRuns.length,
      totalTime: totalTime,
      averageTime: executionTimes.length > 0 ? 
        (executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length).toFixed(2) : 0,
      minTime: executionTimes.length > 0 ? Math.min(...executionTimes) : 0,
      maxTime: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
      results: results
    };
  },
  
  /**
   * テストスイートをクリア
   */
  clearTests: function() {
    this.testSuite = [];
    console.log('テストスイートをクリアしました');
  }
};

/**
 * Phase 1用のテストケースを設定
 */
function setupPhase1Tests() {
  console.log('=== Phase 1テストケース設定開始 ===');
  
  // テストスイートをクリア
  TestLib.clearTests();
  
  // 1. Config関連テスト
  TestLib.addTest(
    'Config設定チェック',
    () => {
      try {
        const validation = Config.validateConfiguration();
        return validation.isValid;
      } catch (error) {
        return false;
      }
    },
    true,
    'unit'
  );
  
  TestLib.addTest(
    'スプレッドシートID取得',
    () => {
      try {
        const customersId = Config.getSheetId('customers');
        return typeof customersId === 'string' && customersId.length > 0;
      } catch (error) {
        return false;
      }
    },
    true,
    'unit'
  );
  
  // 2. AuthLib関連テスト
  TestLib.addTest(
    '現在ユーザー取得',
    () => {
      try {
        const user = AuthLib.getCurrentUser();
        return user !== null;
      } catch (error) {
        return false;
      }
    },
    true,
    'integration'
  );
  
  TestLib.addTest(
    '認証フロー実行',
    () => {
      try {
        const authResult = AuthLib.authenticateUser();
        return typeof authResult === 'object' && authResult.hasOwnProperty('authenticated');
      } catch (error) {
        return false;
      }
    },
    true,
    'integration'
  );
  
  // 3. DataLib関連テスト
  TestLib.addTest(
    'データ整合性チェック',
    () => {
      try {
        const expectedColumns = ['customerId', 'companyName', 'contactName', 'email'];
        const result = DataLib.validateDataIntegrity('customers', 'Customers', expectedColumns);
        return typeof result === 'object' && result.hasOwnProperty('isValid');
      } catch (error) {
        return false;
      }
    },
    true,
    'integration'
  );
  
  TestLib.addTest(
    'データ取得テスト',
    () => {
      try {
        const data = DataLib.getAllData('customers', 'Customers');
        return Array.isArray(data) && data.length > 0;
      } catch (error) {
        return false;
      }
    },
    true,
    'integration'
  );
  
  // 4. パフォーマンステスト
  TestLib.addTest(
    'Config初期化パフォーマンス',
    () => {
      const perfResult = TestLib.performanceTest(() => {
        return Config.validateConfiguration();
      }, 5, 5000);
      return perfResult.averageTime < 1000; // 1秒以内
    },
    true,
    'performance'
  );
  
  TestLib.addTest(
    'データ取得パフォーマンス',
    () => {
      const perfResult = TestLib.performanceTest(() => {
        return DataLib.getAllData('customers', 'Customers');
      }, 3, 10000);
      return perfResult.averageTime < 5000; // 5秒以内
    },
    true,
    'performance'
  );
  
  console.log(`Phase 1テストケース設定完了: ${TestLib.testSuite.length}件`);
  return TestLib.testSuite.length;
}

/**
 * Phase 1統合テスト実行
 */
function runPhase1Tests() {
  console.log('=== Phase 1統合テスト実行 ===');
  
  // テストケース設定
  setupPhase1Tests();
  
  // 全テスト実行
  const report = TestLib.runAllTests();
  
  console.log('=== Phase 1テスト結果サマリー ===');
  console.log(`総テスト数: ${report.summary.total}`);
  console.log(`成功: ${report.summary.passed}`);
  console.log(`失敗: ${report.summary.failed}`);
  console.log(`エラー: ${report.summary.errors}`);
  console.log(`成功率: ${report.summary.passRate}`);
  console.log(`実行時間: ${report.summary.totalExecutionTime}ms`);
  console.log(`総合結果: ${report.status}`);
  
  return report;
}