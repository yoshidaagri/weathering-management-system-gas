/**
 * プロジェクト管理API - プロジェクトデータのCRUD操作と関連機能
 * Phase 2: コア機能 - プロジェクト管理
 * 
 * 主な機能:
 * - プロジェクトデータの作成・読取・更新・削除
 * - プロジェクト検索・フィルタリング
 * - ステータス管理
 * - 顧客-プロジェクト関連付け
 * - プロジェクト統計情報
 * - 進捗率計算
 */

/**
 * プロジェクト管理API メインオブジェクト
 */
const ProjectsAPI = {
  
  /**
   * 新しいプロジェクトを作成する
   * @param {Object} projectData プロジェクトデータ
   * @param {string} projectData.projectName プロジェクト名
   * @param {string} projectData.customerId 顧客ID
   * @param {string} projectData.description プロジェクト説明
   * @param {string} projectData.location 場所
   * @param {Date} projectData.startDate 開始日
   * @param {Date} projectData.endDate 終了予定日
   * @param {number} projectData.targetCO2Removal 目標CO2除去量（トン/年）
   * @param {string} projectData.status プロジェクトステータス
   * @returns {Object} 作成結果
   * @throws {Error} バリデーションエラー
   */
  createProject: function(projectData) {
    const startTime = new Date();
    
    try {
      // バリデーション
      const validation = this.validateProjectData(projectData);
      if (!validation.isValid) {
        throw new Error('バリデーションエラー: ' + validation.errors.join(', '));
      }
      
      // 顧客存在チェック
      const customerCheck = this.validateCustomerExists(projectData.customerId);
      if (!customerCheck.exists) {
        throw new Error('指定された顧客が見つかりません');
      }
      
      // プロジェクトID生成
      const projectId = this.generateProjectId();
      
      // プロジェクトデータ準備
      const newProject = {
        projectId: projectId,
        projectName: projectData.projectName,
        customerId: projectData.customerId,
        customerName: customerCheck.customerName,
        description: projectData.description || '',
        location: projectData.location || '',
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        targetCO2Removal: projectData.targetCO2Removal || 0,
        actualCO2Removal: 0,
        status: projectData.status || 'planning',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        notes: projectData.notes || ''
      };
      
      // データベースに挿入
      const insertResult = DataLib.insert('PROJECTS_SHEET_ID', 'Projects', [
        newProject.projectId,
        newProject.projectName,
        newProject.customerId,
        newProject.customerName,
        newProject.description,
        newProject.location,
        newProject.startDate,
        newProject.endDate,
        newProject.targetCO2Removal,
        newProject.actualCO2Removal,
        newProject.status,
        newProject.progress,
        newProject.createdAt,
        newProject.updatedAt,
        newProject.isActive,
        newProject.notes
      ]);
      
      if (!insertResult.success) {
        throw new Error('データベース挿入エラー: ' + insertResult.error);
      }
      
      // ログ記録
      this.logProjectAction('CREATE', projectId, newProject.projectName);
      
      // 実行時間監視
      const executionTime = new Date() - startTime;
      console.log(`createProject executed in ${executionTime}ms`);
      
      return {
        success: true,
        projectId: projectId,
        message: 'プロジェクトが正常に作成されました',
        data: newProject,
        executionTime: executionTime
      };
      
    } catch (error) {
      // エラーログ
      this.logError('createProject', error, projectData);
      throw error;
    }
  },
  
  /**
   * プロジェクト情報を取得する
   * @param {string} projectId プロジェクトID
   * @returns {Object} プロジェクトデータ
   */
  getProject: function(projectId) {
    const startTime = new Date();
    
    try {
      if (!projectId) {
        throw new Error('プロジェクトIDが指定されていません');
      }
      
      // データ取得
      const projects = DataLib.getAllData('PROJECTS_SHEET_ID', 'Projects');
      const project = projects.find(p => p[0] === projectId);
      
      if (!project) {
        return {
          success: false,
          message: 'プロジェクトが見つかりません',
          data: null
        };
      }
      
      // データ整形
      const projectData = this.formatProjectData(project);
      
      // 進捗率を計算
      projectData.calculatedProgress = this.calculateProgress(projectData);
      
      const executionTime = new Date() - startTime;
      console.log(`getProject executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: 'プロジェクトデータを取得しました',
        data: projectData,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('getProject', error, { projectId: projectId });
      throw error;
    }
  },
  
  /**
   * 全プロジェクト一覧を取得する
   * @param {Object} options フィルタ・ソートオプション
   * @param {string} options.customerId 顧客IDフィルタ
   * @param {string} options.status ステータスフィルタ
   * @param {string} options.sortBy ソート項目
   * @param {string} options.sortOrder ソート順序
   * @param {number} options.limit 取得件数制限
   * @returns {Object} プロジェクト一覧
   */
  getAllProjects: function(options = {}) {
    const startTime = new Date();
    
    try {
      // 全データ取得
      const rawData = DataLib.getAllData('PROJECTS_SHEET_ID', 'Projects');
      let projects = rawData.map(row => this.formatProjectData(row));
      
      // アクティブなプロジェクトのみ取得（デフォルト）
      if (options.includeInactive !== true) {
        projects = projects.filter(p => p.isActive);
      }
      
      // 顧客IDフィルタ
      if (options.customerId) {
        projects = projects.filter(p => p.customerId === options.customerId);
      }
      
      // ステータスフィルタ
      if (options.status) {
        projects = projects.filter(p => p.status === options.status);
      }
      
      // 検索フィルタ
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        projects = projects.filter(p => 
          p.projectName.toLowerCase().includes(searchTerm) ||
          p.customerName.toLowerCase().includes(searchTerm) ||
          p.location.toLowerCase().includes(searchTerm)
        );
      }
      
      // 進捗率計算
      projects.forEach(project => {
        project.calculatedProgress = this.calculateProgress(project);
      });
      
      // ソート
      if (options.sortBy) {
        projects = this.sortProjects(projects, options.sortBy, options.sortOrder);
      } else {
        // デフォルトソート（作成日降順）
        projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      
      // 件数制限
      if (options.limit && options.limit > 0) {
        projects = projects.slice(0, options.limit);
      }
      
      const executionTime = new Date() - startTime;
      console.log(`getAllProjects executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: `${projects.length}件のプロジェクトデータを取得しました`,
        data: projects,
        total: projects.length,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('getAllProjects', error, options);
      throw error;
    }
  },
  
  /**
   * 顧客別プロジェクト一覧を取得する
   * @param {string} customerId 顧客ID
   * @param {Object} options 追加オプション
   * @returns {Object} プロジェクト一覧
   */
  getProjectsByCustomer: function(customerId, options = {}) {
    const startTime = new Date();
    
    try {
      if (!customerId) {
        throw new Error('顧客IDが指定されていません');
      }
      
      // 顧客存在チェック
      const customerCheck = this.validateCustomerExists(customerId);
      if (!customerCheck.exists) {
        throw new Error('指定された顧客が見つかりません');
      }
      
      // 顧客のプロジェクト取得
      const projectOptions = {
        ...options,
        customerId: customerId
      };
      
      const result = this.getAllProjects(projectOptions);
      
      const executionTime = new Date() - startTime;
      console.log(`getProjectsByCustomer executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: `顧客 ${customerCheck.customerName} のプロジェクト ${result.data.length}件を取得しました`,
        data: result.data,
        total: result.data.length,
        customerName: customerCheck.customerName,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('getProjectsByCustomer', error, { customerId: customerId, options: options });
      throw error;
    }
  },
  
  /**
   * プロジェクト情報を更新する
   * @param {string} projectId プロジェクトID
   * @param {Object} updateData 更新データ
   * @returns {Object} 更新結果
   */
  updateProject: function(projectId, updateData) {
    const startTime = new Date();
    
    try {
      if (!projectId) {
        throw new Error('プロジェクトIDが指定されていません');
      }
      
      // 既存データ取得
      const existingResult = this.getProject(projectId);
      if (!existingResult.success) {
        throw new Error('更新対象のプロジェクトが見つかりません');
      }
      
      const existingProject = existingResult.data;
      
      // 更新データバリデーション
      const validation = this.validateUpdateData(updateData);
      if (!validation.isValid) {
        throw new Error('バリデーションエラー: ' + validation.errors.join(', '));
      }
      
      // 顧客IDが変更された場合の存在チェック
      if (updateData.customerId && updateData.customerId !== existingProject.customerId) {
        const customerCheck = this.validateCustomerExists(updateData.customerId);
        if (!customerCheck.exists) {
          throw new Error('指定された顧客が見つかりません');
        }
        updateData.customerName = customerCheck.customerName;
      }
      
      // 更新データ準備
      const updatedData = {
        ...existingProject,
        ...updateData,
        updatedAt: new Date()
      };
      
      // 進捗率再計算
      if (updateData.hasOwnProperty('actualCO2Removal') || updateData.hasOwnProperty('targetCO2Removal')) {
        updatedData.progress = this.calculateProgressFromData(updatedData);
      }
      
      // データベース更新
      const updateResult = DataLib.update('PROJECTS_SHEET_ID', 'Projects', projectId, [
        updatedData.projectId,
        updatedData.projectName,
        updatedData.customerId,
        updatedData.customerName,
        updatedData.description,
        updatedData.location,
        updatedData.startDate,
        updatedData.endDate,
        updatedData.targetCO2Removal,
        updatedData.actualCO2Removal,
        updatedData.status,
        updatedData.progress,
        updatedData.createdAt,
        updatedData.updatedAt,
        updatedData.isActive,
        updatedData.notes
      ]);
      
      if (!updateResult.success) {
        throw new Error('データベース更新エラー: ' + updateResult.error);
      }
      
      // ログ記録
      this.logProjectAction('UPDATE', projectId, updatedData.projectName);
      
      const executionTime = new Date() - startTime;
      console.log(`updateProject executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: 'プロジェクト情報が正常に更新されました',
        data: updatedData,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('updateProject', error, { projectId: projectId, updateData: updateData });
      throw error;
    }
  },
  
  /**
   * プロジェクトを削除する（論理削除）
   * @param {string} projectId プロジェクトID
   * @returns {Object} 削除結果
   */
  deleteProject: function(projectId) {
    const startTime = new Date();
    
    try {
      if (!projectId) {
        throw new Error('プロジェクトIDが指定されていません');
      }
      
      // 既存データ確認
      const existingResult = this.getProject(projectId);
      if (!existingResult.success) {
        throw new Error('削除対象のプロジェクトが見つかりません');
      }
      
      const project = existingResult.data;
      
      // 関連測定データチェック
      const measurementCheck = this.checkProjectMeasurements(projectId);
      if (measurementCheck.hasData) {
        // 測定データがある場合は警告だが削除は可能
        console.warn(`Project ${projectId} has measurement data. Proceeding with logical deletion.`);
      }
      
      // 論理削除実行
      const deleteResult = this.updateProject(projectId, {
        isActive: false,
        status: 'deleted',
        deletedAt: new Date()
      });
      
      if (!deleteResult.success) {
        throw new Error('プロジェクト削除に失敗しました');
      }
      
      // ログ記録
      this.logProjectAction('DELETE', projectId, project.projectName);
      
      const executionTime = new Date() - startTime;
      console.log(`deleteProject executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: 'プロジェクトが正常に削除されました',
        data: { projectId: projectId },
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('deleteProject', error, { projectId: projectId });
      throw error;
    }
  },
  
  /**
   * プロジェクト統計情報を取得する
   * @param {string} customerId 顧客ID（オプション）
   * @returns {Object} 統計データ
   */
  getProjectStats: function(customerId = null) {
    const startTime = new Date();
    
    try {
      const options = customerId ? { customerId: customerId, includeInactive: true } : { includeInactive: true };
      const allProjects = this.getAllProjects(options);
      const projects = allProjects.data;
      
      const stats = {
        total: projects.length,
        active: projects.filter(p => p.isActive).length,
        inactive: projects.filter(p => !p.isActive).length,
        byStatus: {},
        totalCO2Target: 0,
        totalCO2Actual: 0,
        averageProgress: 0,
        recentlyCreated: 0
      };
      
      // ステータス別統計
      projects.forEach(project => {
        const status = project.status || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        
        // CO2除去量集計
        stats.totalCO2Target += parseFloat(project.targetCO2Removal) || 0;
        stats.totalCO2Actual += parseFloat(project.actualCO2Removal) || 0;
      });
      
      // 平均進捗率計算
      const activeProjects = projects.filter(p => p.isActive);
      if (activeProjects.length > 0) {
        const totalProgress = activeProjects.reduce((sum, p) => sum + (p.progress || 0), 0);
        stats.averageProgress = Math.round(totalProgress / activeProjects.length);
      }
      
      // 最近作成されたプロジェクト（30日以内）
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      stats.recentlyCreated = projects.filter(p => 
        new Date(p.createdAt) > monthAgo
      ).length;
      
      // CO2除去効率
      stats.co2Efficiency = stats.totalCO2Target > 0 ? 
        Math.round((stats.totalCO2Actual / stats.totalCO2Target) * 100) : 0;
      
      const executionTime = new Date() - startTime;
      console.log(`getProjectStats executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: customerId ? '顧客別プロジェクト統計情報を取得しました' : 'プロジェクト統計情報を取得しました',
        data: stats,
        customerId: customerId,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('getProjectStats', error, { customerId: customerId });
      throw error;
    }
  },
  
  /**
   * プロジェクトデータをバリデーションする
   * @param {Object} projectData プロジェクトデータ
   * @returns {Object} バリデーション結果
   */
  validateProjectData: function(projectData) {
    const errors = [];
    
    // 必須項目チェック
    if (!projectData.projectName || projectData.projectName.trim() === '') {
      errors.push('プロジェクト名は必須です');
    }
    
    if (!projectData.customerId || projectData.customerId.trim() === '') {
      errors.push('顧客IDは必須です');
    }
    
    if (!projectData.startDate) {
      errors.push('開始日は必須です');
    }
    
    // 日付妥当性チェック
    if (projectData.startDate && projectData.endDate) {
      const startDate = new Date(projectData.startDate);
      const endDate = new Date(projectData.endDate);
      
      if (endDate <= startDate) {
        errors.push('終了日は開始日より後の日付を指定してください');
      }
    }
    
    // 数値妥当性チェック
    if (projectData.targetCO2Removal !== undefined) {
      const target = parseFloat(projectData.targetCO2Removal);
      if (isNaN(target) || target < 0) {
        errors.push('目標CO2除去量は0以上の数値を指定してください');
      }
    }
    
    // 文字数制限チェック
    if (projectData.projectName && projectData.projectName.length > 100) {
      errors.push('プロジェクト名は100文字以内で入力してください');
    }
    
    if (projectData.description && projectData.description.length > 500) {
      errors.push('プロジェクト説明は500文字以内で入力してください');
    }
    
    // ステータス妥当性チェック
    const validStatuses = ['planning', 'active', 'on-hold', 'completed', 'cancelled', 'deleted'];
    if (projectData.status && !validStatuses.includes(projectData.status)) {
      errors.push('無効なステータスが指定されています');
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
    if (updateData.hasOwnProperty('projectName')) {
      if (!updateData.projectName || updateData.projectName.trim() === '') {
        errors.push('プロジェクト名は必須です');
      } else if (updateData.projectName.length > 100) {
        errors.push('プロジェクト名は100文字以内で入力してください');
      }
    }
    
    if (updateData.hasOwnProperty('customerId')) {
      if (!updateData.customerId || updateData.customerId.trim() === '') {
        errors.push('顧客IDは必須です');
      }
    }
    
    if (updateData.hasOwnProperty('targetCO2Removal')) {
      const target = parseFloat(updateData.targetCO2Removal);
      if (isNaN(target) || target < 0) {
        errors.push('目標CO2除去量は0以上の数値を指定してください');
      }
    }
    
    if (updateData.hasOwnProperty('actualCO2Removal')) {
      const actual = parseFloat(updateData.actualCO2Removal);
      if (isNaN(actual) || actual < 0) {
        errors.push('実際CO2除去量は0以上の数値を指定してください');
      }
    }
    
    if (updateData.hasOwnProperty('progress')) {
      const progress = parseFloat(updateData.progress);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        errors.push('進捗率は0〜100の範囲で指定してください');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },
  
  /**
   * 顧客の存在をチェックする
   * @param {string} customerId 顧客ID
   * @returns {Object} 顧客存在チェック結果
   */
  validateCustomerExists: function(customerId) {
    try {
      // CustomersAPI.getCustomer を使用して顧客存在確認
      const customerResult = CustomersAPI.getCustomer(customerId);
      
      if (customerResult.success) {
        return {
          exists: true,
          customerName: customerResult.data.companyName,
          customer: customerResult.data
        };
      } else {
        return {
          exists: false,
          customerName: null,
          customer: null
        };
      }
      
    } catch (error) {
      this.logError('validateCustomerExists', error, { customerId: customerId });
      // エラーの場合は安全側に倒して存在しないとみなす
      return {
        exists: false,
        customerName: null,
        customer: null
      };
    }
  },
  
  /**
   * プロジェクトに関連する測定データをチェックする
   * @param {string} projectId プロジェクトID
   * @returns {Object} 測定データチェック結果
   */
  checkProjectMeasurements: function(projectId) {
    try {
      // MeasurementsAPI.gs が実装されるまで暫定実装
      // 実際の実装では MeasurementsAPI.getMeasurementsByProject() を使用
      
      return {
        hasData: false,
        measurementCount: 0
      };
      
    } catch (error) {
      this.logError('checkProjectMeasurements', error, { projectId: projectId });
      // エラーの場合は安全側に倒してデータありとみなす
      return {
        hasData: true,
        measurementCount: -1
      };
    }
  },
  
  /**
   * プロジェクトIDを生成する
   * @returns {string} 一意のプロジェクトID
   */
  generateProjectId: function() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `PROJ_${timestamp}_${random}`;
  },
  
  /**
   * 生データをプロジェクトオブジェクトに整形する
   * @param {Array} row スプレッドシートの行データ
   * @returns {Object} 整形されたプロジェクトデータ
   */
  formatProjectData: function(row) {
    return {
      projectId: row[0] || '',
      projectName: row[1] || '',
      customerId: row[2] || '',
      customerName: row[3] || '',
      description: row[4] || '',
      location: row[5] || '',
      startDate: row[6] || null,
      endDate: row[7] || null,
      targetCO2Removal: parseFloat(row[8]) || 0,
      actualCO2Removal: parseFloat(row[9]) || 0,
      status: row[10] || 'planning',
      progress: parseFloat(row[11]) || 0,
      createdAt: row[12] || new Date(),
      updatedAt: row[13] || new Date(),
      isActive: row[14] !== false,
      notes: row[15] || ''
    };
  },
  
  /**
   * プロジェクト進捗率を計算する
   * @param {Object} project プロジェクトデータ
   * @returns {number} 進捗率（0-100）
   */
  calculateProgress: function(project) {
    return this.calculateProgressFromData(project);
  },
  
  /**
   * データから進捗率を計算する
   * @param {Object} data プロジェクトデータ
   * @returns {number} 進捗率（0-100）
   */
  calculateProgressFromData: function(data) {
    // CO2除去量ベースの進捗率計算
    if (data.targetCO2Removal > 0 && data.actualCO2Removal >= 0) {
      const progress = (data.actualCO2Removal / data.targetCO2Removal) * 100;
      return Math.min(Math.round(progress), 100);
    }
    
    // 日付ベースの進捗率計算（CO2データがない場合）
    if (data.startDate && data.endDate) {
      const now = new Date();
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      
      if (now <= start) return 0;
      if (now >= end) return 100;
      
      const totalDuration = end - start;
      const elapsedDuration = now - start;
      const progress = (elapsedDuration / totalDuration) * 100;
      
      return Math.min(Math.max(Math.round(progress), 0), 100);
    }
    
    // 既存の進捗率を返す
    return data.progress || 0;
  },
  
  /**
   * プロジェクトデータをソートする
   * @param {Array} projects プロジェクト配列
   * @param {string} sortBy ソート項目
   * @param {string} sortOrder ソート順序
   * @returns {Array} ソート済みプロジェクト配列
   */
  sortProjects: function(projects, sortBy, sortOrder = 'asc') {
    return projects.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      // 日付フィールドの処理
      if (sortBy === 'startDate' || sortBy === 'endDate' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }
      
      // 数値フィールドの処理
      if (sortBy === 'targetCO2Removal' || sortBy === 'actualCO2Removal' || sortBy === 'progress') {
        valueA = parseFloat(valueA) || 0;
        valueB = parseFloat(valueB) || 0;
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
   * プロジェクト操作ログを記録する
   * @param {string} action 操作タイプ
   * @param {string} projectId プロジェクトID
   * @param {string} projectName プロジェクト名
   */
  logProjectAction: function(action, projectId, projectName) {
    try {
      const logData = {
        timestamp: new Date(),
        action: action,
        resourceType: 'PROJECT',
        resourceId: projectId,
        resourceName: projectName,
        userId: Session.getActiveUser().getEmail(),
        details: `Project ${action}: ${projectName} (ID: ${projectId})`
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
      console.error('Failed to log project action:', error);
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
        functionName: 'ProjectsAPI.' + functionName,
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
      
      console.error(`ProjectsAPI.${functionName} error:`, error);
      
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
};

/**
 * プロジェクト管理APIのテスト関数群
 * TestLib.gs から呼び出される
 */

/**
 * プロジェクト作成のテスト
 */
function testCreateProject() {
  TestLib.addTest(
    'ProjectsAPI.createProject - valid data',
    function() {
      // テスト用顧客を先に作成
      const customerData = {
        companyName: 'テストプロジェクト株式会社',
        contactName: 'プロジェクト太郎',
        email: 'project@example.com'
      };
      const customerResult = CustomersAPI.createCustomer(customerData);
      
      if (!customerResult.success) {
        return false;
      }
      
      const projectData = {
        projectName: '風化促進CO2除去テストプロジェクト',
        customerId: customerResult.customerId,
        description: 'テスト用プロジェクト',
        location: '北海道テスト鉱山',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年後
        targetCO2Removal: 1000,
        status: 'planning'
      };
      
      const result = ProjectsAPI.createProject(projectData);
      return result.success && result.projectId;
    },
    true,
    'project'
  );
  
  TestLib.addTest(
    'ProjectsAPI.createProject - missing required field',
    function() {
      try {
        ProjectsAPI.createProject({ projectName: 'テストプロジェクト' }); // customerIdなし
        return false; // エラーが発生すべき
      } catch (error) {
        return error.message.includes('バリデーションエラー');
      }
    },
    true,
    'project'
  );
}

/**
 * プロジェクト取得のテスト
 */
function testGetProject() {
  TestLib.addTest(
    'ProjectsAPI.getAllProjects',
    function() {
      const result = ProjectsAPI.getAllProjects();
      return result.success && Array.isArray(result.data);
    },
    true,
    'project'
  );
  
  TestLib.addTest(
    'ProjectsAPI.getProjectStats',
    function() {
      const result = ProjectsAPI.getProjectStats();
      return result.success && typeof result.data.total === 'number';
    },
    true,
    'project'
  );
}

/**
 * Phase 2 プロジェクト管理APIテストの実行
 */
function runProjectsAPITests() {
  testCreateProject();
  testGetProject();
  
  const results = TestLib.runCategoryTests('project');
  return results;
}