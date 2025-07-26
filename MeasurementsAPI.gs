/**
 * 測定データ管理API - 測定データのCRUD操作と分析機能
 * Phase 3: データ管理 - 測定データ・分析
 * 
 * 主な機能:
 * - 測定データの作成・読取・更新・削除
 * - データバリデーション（pH、CO2濃度等）
 * - 時系列データ処理
 * - データ品質チェック
 * - 統計計算・トレンド分析
 * - アラート条件チェック
 */

/**
 * 測定データ管理API メインオブジェクト
 */
const MeasurementsAPI = {
  
  /**
   * 新しい測定データを作成する
   * @param {Object} measurementData 測定データ
   * @param {string} measurementData.projectId プロジェクトID
   * @param {Date} measurementData.measurementDate 測定日時
   * @param {number} measurementData.pH pH値
   * @param {number} measurementData.co2Concentration CO2濃度 (ppm)
   * @param {number} measurementData.temperature 温度 (°C)
   * @param {number} measurementData.flowRate 流量 (L/min)
   * @param {number} measurementData.co2RemovalAmount CO2除去量 (kg/day)
   * @param {string} measurementData.location 測定場所
   * @param {string} measurementData.operator 測定者
   * @returns {Object} 作成結果
   * @throws {Error} バリデーションエラー
   */
  createMeasurement: function(measurementData) {
    const startTime = new Date();
    
    try {
      // バリデーション
      const validation = this.validateMeasurementData(measurementData);
      if (!validation.isValid) {
        throw new Error('バリデーションエラー: ' + validation.errors.join(', '));
      }
      
      // プロジェクト存在チェック
      const projectCheck = this.validateProjectExists(measurementData.projectId);
      if (!projectCheck.exists) {
        throw new Error('指定されたプロジェクトが見つかりません');
      }
      
      // 測定データID生成
      const measurementId = this.generateMeasurementId();
      
      // データ品質チェック
      const qualityCheck = this.checkDataQuality(measurementData);
      
      // 測定データ準備
      const newMeasurement = {
        measurementId: measurementId,
        projectId: measurementData.projectId,
        projectName: projectCheck.projectName,
        customerId: projectCheck.customerId,
        customerName: projectCheck.customerName,
        measurementDate: measurementData.measurementDate,
        pH: parseFloat(measurementData.pH) || null,
        co2Concentration: parseFloat(measurementData.co2Concentration) || null,
        temperature: parseFloat(measurementData.temperature) || null,
        flowRate: parseFloat(measurementData.flowRate) || null,
        co2RemovalAmount: parseFloat(measurementData.co2RemovalAmount) || 0,
        efficiency: this.calculateEfficiency(measurementData),
        location: measurementData.location || '',
        operator: measurementData.operator || '',
        equipmentId: measurementData.equipmentId || '',
        notes: measurementData.notes || '',
        dataQuality: qualityCheck.score,
        alertFlags: qualityCheck.alerts,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };
      
      // データベースに挿入
      const insertResult = DataLib.insert('MEASUREMENTS_SHEET_ID', 'Measurements', [
        newMeasurement.measurementId,
        newMeasurement.projectId,
        newMeasurement.projectName,
        newMeasurement.customerId,
        newMeasurement.customerName,
        newMeasurement.measurementDate,
        newMeasurement.pH,
        newMeasurement.co2Concentration,
        newMeasurement.temperature,
        newMeasurement.flowRate,
        newMeasurement.co2RemovalAmount,
        newMeasurement.efficiency,
        newMeasurement.location,
        newMeasurement.operator,
        newMeasurement.equipmentId,
        newMeasurement.notes,
        newMeasurement.dataQuality,
        JSON.stringify(newMeasurement.alertFlags),
        newMeasurement.createdAt,
        newMeasurement.updatedAt,
        newMeasurement.isActive
      ]);
      
      if (!insertResult.success) {
        throw new Error('データベース挿入エラー: ' + insertResult.error);
      }
      
      // プロジェクトの実際CO2除去量を更新
      this.updateProjectCO2Amount(measurementData.projectId);
      
      // アラートチェック
      if (qualityCheck.alerts.length > 0) {
        this.processAlerts(measurementId, qualityCheck.alerts);
      }
      
      // ログ記録
      this.logMeasurementAction('CREATE', measurementId, measurementData.projectId);
      
      // 実行時間監視
      const executionTime = new Date() - startTime;
      console.log(`createMeasurement executed in ${executionTime}ms`);
      
      return {
        success: true,
        measurementId: measurementId,
        message: '測定データが正常に作成されました',
        data: newMeasurement,
        warnings: qualityCheck.alerts,
        executionTime: executionTime
      };
      
    } catch (error) {
      // エラーログ
      this.logError('createMeasurement', error, measurementData);
      throw error;
    }
  },
  
  /**
   * 測定データを取得する
   * @param {string} measurementId 測定データID
   * @returns {Object} 測定データ
   */
  getMeasurement: function(measurementId) {
    const startTime = new Date();
    
    try {
      if (!measurementId) {
        throw new Error('測定データIDが指定されていません');
      }
      
      // データ取得
      const measurements = DataLib.getAllData('MEASUREMENTS_SHEET_ID', 'Measurements');
      const measurement = measurements.find(m => m[0] === measurementId);
      
      if (!measurement) {
        return {
          success: false,
          message: '測定データが見つかりません',
          data: null
        };
      }
      
      // データ整形
      const measurementData = this.formatMeasurementData(measurement);
      
      const executionTime = new Date() - startTime;
      console.log(`getMeasurement executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: '測定データを取得しました',
        data: measurementData,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('getMeasurement', error, { measurementId: measurementId });
      throw error;
    }
  },
  
  /**
   * プロジェクト別測定データ一覧を取得する
   * @param {string} projectId プロジェクトID
   * @param {Object} options フィルタ・ソートオプション
   * @param {Date} options.startDate 開始日
   * @param {Date} options.endDate 終了日
   * @param {string} options.sortBy ソート項目
   * @param {string} options.sortOrder ソート順序
   * @param {number} options.limit 取得件数制限
   * @returns {Object} 測定データ一覧
   */
  getMeasurementsByProject: function(projectId, options = {}) {
    const startTime = new Date();
    
    try {
      if (!projectId) {
        throw new Error('プロジェクトIDが指定されていません');
      }
      
      // 全データ取得
      const rawData = DataLib.getAllData('MEASUREMENTS_SHEET_ID', 'Measurements');
      let measurements = rawData
        .filter(row => row[1] === projectId && row[20] !== false) // プロジェクトID & アクティブ
        .map(row => this.formatMeasurementData(row));
      
      // 日付フィルタ
      if (options.startDate) {
        const startDate = new Date(options.startDate);
        measurements = measurements.filter(m => new Date(m.measurementDate) >= startDate);
      }
      
      if (options.endDate) {
        const endDate = new Date(options.endDate);
        measurements = measurements.filter(m => new Date(m.measurementDate) <= endDate);
      }
      
      // ソート
      if (options.sortBy) {
        measurements = this.sortMeasurements(measurements, options.sortBy, options.sortOrder);
      } else {
        // デフォルトソート（測定日時降順）
        measurements.sort((a, b) => new Date(b.measurementDate) - new Date(a.measurementDate));
      }
      
      // 件数制限
      if (options.limit && options.limit > 0) {
        measurements = measurements.slice(0, options.limit);
      }
      
      const executionTime = new Date() - startTime;
      console.log(`getMeasurementsByProject executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: `${measurements.length}件の測定データを取得しました`,
        data: measurements,
        total: measurements.length,
        projectId: projectId,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('getMeasurementsByProject', error, { projectId: projectId, options: options });
      throw error;
    }
  },
  
  /**
   * 測定データを更新する
   * @param {string} measurementId 測定データID
   * @param {Object} updateData 更新データ
   * @returns {Object} 更新結果
   */
  updateMeasurement: function(measurementId, updateData) {
    const startTime = new Date();
    
    try {
      if (!measurementId) {
        throw new Error('測定データIDが指定されていません');
      }
      
      // 既存データ取得
      const existingResult = this.getMeasurement(measurementId);
      if (!existingResult.success) {
        throw new Error('更新対象の測定データが見つかりません');
      }
      
      const existingMeasurement = existingResult.data;
      
      // 更新データバリデーション
      const validation = this.validateUpdateData(updateData);
      if (!validation.isValid) {
        throw new Error('バリデーションエラー: ' + validation.errors.join(', '));
      }
      
      // データ品質チェック
      const qualityCheck = this.checkDataQuality({
        ...existingMeasurement,
        ...updateData
      });
      
      // 更新データ準備
      const updatedData = {
        ...existingMeasurement,
        ...updateData,
        efficiency: this.calculateEfficiency({
          ...existingMeasurement,
          ...updateData
        }),
        dataQuality: qualityCheck.score,
        alertFlags: qualityCheck.alerts,
        updatedAt: new Date()
      };
      
      // データベース更新
      const updateResult = DataLib.update('MEASUREMENTS_SHEET_ID', 'Measurements', measurementId, [
        updatedData.measurementId,
        updatedData.projectId,
        updatedData.projectName,
        updatedData.customerId,
        updatedData.customerName,
        updatedData.measurementDate,
        updatedData.pH,
        updatedData.co2Concentration,
        updatedData.temperature,
        updatedData.flowRate,
        updatedData.co2RemovalAmount,
        updatedData.efficiency,
        updatedData.location,
        updatedData.operator,
        updatedData.equipmentId,
        updatedData.notes,
        updatedData.dataQuality,
        JSON.stringify(updatedData.alertFlags),
        updatedData.createdAt,
        updatedData.updatedAt,
        updatedData.isActive
      ]);
      
      if (!updateResult.success) {
        throw new Error('データベース更新エラー: ' + updateResult.error);
      }
      
      // プロジェクトの実際CO2除去量を更新
      this.updateProjectCO2Amount(updatedData.projectId);
      
      // ログ記録
      this.logMeasurementAction('UPDATE', measurementId, updatedData.projectId);
      
      const executionTime = new Date() - startTime;
      console.log(`updateMeasurement executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: '測定データが正常に更新されました',
        data: updatedData,
        warnings: qualityCheck.alerts,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('updateMeasurement', error, { measurementId: measurementId, updateData: updateData });
      throw error;
    }
  },
  
  /**
   * 測定データを削除する（論理削除）
   * @param {string} measurementId 測定データID
   * @returns {Object} 削除結果
   */
  deleteMeasurement: function(measurementId) {
    const startTime = new Date();
    
    try {
      if (!measurementId) {
        throw new Error('測定データIDが指定されていません');
      }
      
      // 既存データ確認
      const existingResult = this.getMeasurement(measurementId);
      if (!existingResult.success) {
        throw new Error('削除対象の測定データが見つかりません');
      }
      
      const measurement = existingResult.data;
      
      // 論理削除実行
      const deleteResult = this.updateMeasurement(measurementId, {
        isActive: false,
        deletedAt: new Date()
      });
      
      if (!deleteResult.success) {
        throw new Error('測定データ削除に失敗しました');
      }
      
      // プロジェクトの実際CO2除去量を更新
      this.updateProjectCO2Amount(measurement.projectId);
      
      // ログ記録
      this.logMeasurementAction('DELETE', measurementId, measurement.projectId);
      
      const executionTime = new Date() - startTime;
      console.log(`deleteMeasurement executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: '測定データが正常に削除されました',
        data: { measurementId: measurementId },
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('deleteMeasurement', error, { measurementId: measurementId });
      throw error;
    }
  },
  
  /**
   * 測定データ統計情報を取得する
   * @param {string} projectId プロジェクトID（オプション）
   * @param {Object} options 統計オプション
   * @returns {Object} 統計データ
   */
  getMeasurementStats: function(projectId = null, options = {}) {
    const startTime = new Date();
    
    try {
      const measurementOptions = projectId ? { projectId: projectId } : {};
      const measurements = projectId ? 
        this.getMeasurementsByProject(projectId).data : 
        this.getAllMeasurements(measurementOptions).data;
      
      const stats = {
        total: measurements.length,
        averages: {},
        ranges: {},
        trends: {},
        alerts: {
          total: 0,
          byType: {}
        },
        recentMeasurements: 0
      };
      
      if (measurements.length === 0) {
        return {
          success: true,
          message: '統計計算完了（データなし）',
          data: stats
        };
      }
      
      // 平均値計算
      const numericFields = ['pH', 'co2Concentration', 'temperature', 'flowRate', 'co2RemovalAmount', 'efficiency'];
      numericFields.forEach(field => {
        const values = measurements
          .map(m => parseFloat(m[field]))
          .filter(v => !isNaN(v) && v !== null);
        
        if (values.length > 0) {
          stats.averages[field] = {
            value: values.reduce((sum, val) => sum + val, 0) / values.length,
            count: values.length
          };
          
          stats.ranges[field] = {
            min: Math.min(...values),
            max: Math.max(...values)
          };
        }
      });
      
      // アラート統計
      measurements.forEach(measurement => {
        if (measurement.alertFlags && measurement.alertFlags.length > 0) {
          stats.alerts.total += measurement.alertFlags.length;
          measurement.alertFlags.forEach(alert => {
            stats.alerts.byType[alert.type] = (stats.alerts.byType[alert.type] || 0) + 1;
          });
        }
      });
      
      // 最近の測定（7日以内）
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      stats.recentMeasurements = measurements.filter(m => 
        new Date(m.measurementDate) > weekAgo
      ).length;
      
      // トレンド分析（簡易版）
      if (measurements.length >= 2) {
        const sortedMeasurements = measurements.sort((a, b) => 
          new Date(a.measurementDate) - new Date(b.measurementDate)
        );
        
        numericFields.forEach(field => {
          const values = sortedMeasurements
            .map(m => parseFloat(m[field]))
            .filter(v => !isNaN(v) && v !== null);
          
          if (values.length >= 2) {
            const firstHalf = values.slice(0, Math.floor(values.length / 2));
            const secondHalf = values.slice(Math.floor(values.length / 2));
            
            const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
            
            stats.trends[field] = {
              direction: secondAvg > firstAvg ? 'increasing' : secondAvg < firstAvg ? 'decreasing' : 'stable',
              change: ((secondAvg - firstAvg) / firstAvg * 100).toFixed(2)
            };
          }
        });
      }
      
      const executionTime = new Date() - startTime;
      console.log(`getMeasurementStats executed in ${executionTime}ms`);
      
      return {
        success: true,
        message: '測定データ統計情報を取得しました',
        data: stats,
        projectId: projectId,
        executionTime: executionTime
      };
      
    } catch (error) {
      this.logError('getMeasurementStats', error, { projectId: projectId, options: options });
      throw error;
    }
  },
  
  /**
   * 測定データをバリデーションする
   * @param {Object} measurementData 測定データ
   * @returns {Object} バリデーション結果
   */
  validateMeasurementData: function(measurementData) {
    const errors = [];
    
    // 必須項目チェック
    if (!measurementData.projectId || measurementData.projectId.trim() === '') {
      errors.push('プロジェクトIDは必須です');
    }
    
    if (!measurementData.measurementDate) {
      errors.push('測定日時は必須です');
    }
    
    // 数値範囲チェック
    if (measurementData.pH !== undefined && measurementData.pH !== null) {
      const ph = parseFloat(measurementData.pH);
      if (isNaN(ph) || ph < 0 || ph > 14) {
        errors.push('pH値は0-14の範囲で入力してください');
      }
    }
    
    if (measurementData.co2Concentration !== undefined && measurementData.co2Concentration !== null) {
      const co2 = parseFloat(measurementData.co2Concentration);
      if (isNaN(co2) || co2 < 0) {
        errors.push('CO2濃度は0以上の数値を入力してください');
      }
    }
    
    if (measurementData.temperature !== undefined && measurementData.temperature !== null) {
      const temp = parseFloat(measurementData.temperature);
      if (isNaN(temp) || temp < -50 || temp > 100) {
        errors.push('温度は-50°C〜100°Cの範囲で入力してください');
      }
    }
    
    if (measurementData.flowRate !== undefined && measurementData.flowRate !== null) {
      const flow = parseFloat(measurementData.flowRate);
      if (isNaN(flow) || flow < 0) {
        errors.push('流量は0以上の数値を入力してください');
      }
    }
    
    if (measurementData.co2RemovalAmount !== undefined && measurementData.co2RemovalAmount !== null) {
      const removal = parseFloat(measurementData.co2RemovalAmount);
      if (isNaN(removal) || removal < 0) {
        errors.push('CO2除去量は0以上の数値を入力してください');
      }
    }
    
    // 日付妥当性チェック
    if (measurementData.measurementDate) {
      const measurementDate = new Date(measurementData.measurementDate);
      const now = new Date();
      
      if (measurementDate > now) {
        errors.push('測定日時は現在時刻より過去である必要があります');
      }
      
      // 30日以上前は警告
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      if (measurementDate < monthAgo) {
        errors.push('測定日時が30日以上前です（警告）');
      }
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
    
    // 各フィールドのバリデーション（必須チェックは除く）
    if (updateData.hasOwnProperty('pH') && updateData.pH !== null) {
      const ph = parseFloat(updateData.pH);
      if (isNaN(ph) || ph < 0 || ph > 14) {
        errors.push('pH値は0-14の範囲で入力してください');
      }
    }
    
    if (updateData.hasOwnProperty('co2Concentration') && updateData.co2Concentration !== null) {
      const co2 = parseFloat(updateData.co2Concentration);
      if (isNaN(co2) || co2 < 0) {
        errors.push('CO2濃度は0以上の数値を入力してください');
      }
    }
    
    if (updateData.hasOwnProperty('temperature') && updateData.temperature !== null) {
      const temp = parseFloat(updateData.temperature);
      if (isNaN(temp) || temp < -50 || temp > 100) {
        errors.push('温度は-50°C〜100°Cの範囲で入力してください');
      }
    }
    
    if (updateData.hasOwnProperty('flowRate') && updateData.flowRate !== null) {
      const flow = parseFloat(updateData.flowRate);
      if (isNaN(flow) || flow < 0) {
        errors.push('流量は0以上の数値を入力してください');
      }
    }
    
    if (updateData.hasOwnProperty('co2RemovalAmount') && updateData.co2RemovalAmount !== null) {
      const removal = parseFloat(updateData.co2RemovalAmount);
      if (isNaN(removal) || removal < 0) {
        errors.push('CO2除去量は0以上の数値を入力してください');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },
  
  /**
   * プロジェクトの存在をチェックする
   * @param {string} projectId プロジェクトID
   * @returns {Object} プロジェクト存在チェック結果
   */
  validateProjectExists: function(projectId) {
    try {
      // ProjectsAPI.getProject を使用してプロジェクト存在確認
      const projectResult = ProjectsAPI.getProject(projectId);
      
      if (projectResult.success) {
        return {
          exists: true,
          projectName: projectResult.data.projectName,
          customerId: projectResult.data.customerId,
          customerName: projectResult.data.customerName,
          project: projectResult.data
        };
      } else {
        return {
          exists: false,
          projectName: null,
          customerId: null,
          customerName: null,
          project: null
        };
      }
      
    } catch (error) {
      this.logError('validateProjectExists', error, { projectId: projectId });
      // エラーの場合は安全側に倒して存在しないとみなす
      return {
        exists: false,
        projectName: null,
        customerId: null,
        customerName: null,
        project: null
      };
    }
  },
  
  /**
   * データ品質をチェックする
   * @param {Object} measurementData 測定データ
   * @returns {Object} 品質チェック結果
   */
  checkDataQuality: function(measurementData) {
    const alerts = [];
    let score = 100;
    
    // pH値チェック
    if (measurementData.pH !== undefined && measurementData.pH !== null) {
      const ph = parseFloat(measurementData.pH);
      if (ph < 6.5 || ph > 8.5) {
        alerts.push({
          type: 'pH_ABNORMAL',
          message: `pH値が正常範囲外です: ${ph}`,
          severity: ph < 5 || ph > 9 ? 'HIGH' : 'MEDIUM'
        });
        score -= 15;
      }
    }
    
    // CO2濃度チェック
    if (measurementData.co2Concentration !== undefined && measurementData.co2Concentration !== null) {
      const co2 = parseFloat(measurementData.co2Concentration);
      if (co2 > 1000) {
        alerts.push({
          type: 'CO2_HIGH',
          message: `CO2濃度が高値です: ${co2} ppm`,
          severity: co2 > 5000 ? 'HIGH' : 'MEDIUM'
        });
        score -= 10;
      }
    }
    
    // 温度チェック
    if (measurementData.temperature !== undefined && measurementData.temperature !== null) {
      const temp = parseFloat(measurementData.temperature);
      if (temp < 0 || temp > 40) {
        alerts.push({
          type: 'TEMPERATURE_ABNORMAL',
          message: `温度が異常値です: ${temp}°C`,
          severity: temp < -10 || temp > 50 ? 'HIGH' : 'MEDIUM'
        });
        score -= 10;
      }
    }
    
    // 流量チェック
    if (measurementData.flowRate !== undefined && measurementData.flowRate !== null) {
      const flow = parseFloat(measurementData.flowRate);
      if (flow < 1) {
        alerts.push({
          type: 'FLOW_LOW',
          message: `流量が低下しています: ${flow} L/min`,
          severity: flow === 0 ? 'HIGH' : 'LOW'
        });
        score -= 5;
      }
    }
    
    // 効率チェック
    const efficiency = this.calculateEfficiency(measurementData);
    if (efficiency < 50) {
      alerts.push({
        type: 'EFFICIENCY_LOW',
        message: `処理効率が低下しています: ${efficiency}%`,
        severity: efficiency < 25 ? 'HIGH' : 'MEDIUM'
      });
      score -= 20;
    }
    
    return {
      score: Math.max(score, 0),
      alerts: alerts,
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D'
    };
  },
  
  /**
   * 処理効率を計算する
   * @param {Object} measurementData 測定データ
   * @returns {number} 効率（%）
   */
  calculateEfficiency: function(measurementData) {
    // 簡易効率計算式（実際のプロジェクトでは化学的な計算式を使用）
    const co2Concentration = parseFloat(measurementData.co2Concentration) || 0;
    const flowRate = parseFloat(measurementData.flowRate) || 0;
    const co2RemovalAmount = parseFloat(measurementData.co2RemovalAmount) || 0;
    
    if (co2Concentration === 0 || flowRate === 0) {
      return 0;
    }
    
    // 理論的最大除去量計算
    const theoreticalMaxRemoval = (co2Concentration * flowRate * 24 * 60) / 1000000; // kg/day
    
    if (theoreticalMaxRemoval === 0) {
      return 0;
    }
    
    const efficiency = (co2RemovalAmount / theoreticalMaxRemoval) * 100;
    return Math.min(Math.round(efficiency), 100);
  },
  
  /**
   * 測定データIDを生成する
   * @returns {string} 一意の測定データID
   */
  generateMeasurementId: function() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `MEAS_${timestamp}_${random}`;
  },
  
  /**
   * 生データを測定データオブジェクトに整形する
   * @param {Array} row スプレッドシートの行データ
   * @returns {Object} 整形された測定データ
   */
  formatMeasurementData: function(row) {
    return {
      measurementId: row[0] || '',
      projectId: row[1] || '',
      projectName: row[2] || '',
      customerId: row[3] || '',
      customerName: row[4] || '',
      measurementDate: row[5] || null,
      pH: parseFloat(row[6]) || null,
      co2Concentration: parseFloat(row[7]) || null,
      temperature: parseFloat(row[8]) || null,
      flowRate: parseFloat(row[9]) || null,
      co2RemovalAmount: parseFloat(row[10]) || 0,
      efficiency: parseFloat(row[11]) || 0,
      location: row[12] || '',
      operator: row[13] || '',
      equipmentId: row[14] || '',
      notes: row[15] || '',
      dataQuality: parseFloat(row[16]) || 0,
      alertFlags: this.parseAlertFlags(row[17]),
      createdAt: row[18] || new Date(),
      updatedAt: row[19] || new Date(),
      isActive: row[20] !== false
    };
  },
  
  /**
   * アラートフラグを解析する
   * @param {string} alertFlagsJson JSON文字列
   * @returns {Array} アラートフラグ配列
   */
  parseAlertFlags: function(alertFlagsJson) {
    try {
      return alertFlagsJson ? JSON.parse(alertFlagsJson) : [];
    } catch (error) {
      return [];
    }
  },
  
  /**
   * 測定データをソートする
   * @param {Array} measurements 測定データ配列
   * @param {string} sortBy ソート項目
   * @param {string} sortOrder ソート順序
   * @returns {Array} ソート済み測定データ配列
   */
  sortMeasurements: function(measurements, sortBy, sortOrder = 'desc') {
    return measurements.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      // 日付フィールドの処理
      if (sortBy === 'measurementDate' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }
      
      // 数値フィールドの処理
      if (['pH', 'co2Concentration', 'temperature', 'flowRate', 'co2RemovalAmount', 'efficiency', 'dataQuality'].includes(sortBy)) {
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
      
      return sortOrder === 'asc' ? comparison : comparison * -1;
    });
  },
  
  /**
   * プロジェクトの実際CO2除去量を更新する
   * @param {string} projectId プロジェクトID
   */
  updateProjectCO2Amount: function(projectId) {
    try {
      // プロジェクトの全測定データを取得
      const measurements = this.getMeasurementsByProject(projectId).data;
      
      // 合計CO2除去量を計算
      const totalCO2Removal = measurements.reduce((total, measurement) => {
        return total + (parseFloat(measurement.co2RemovalAmount) || 0);
      }, 0);
      
      // プロジェクトの実際CO2除去量を更新
      ProjectsAPI.updateProject(projectId, {
        actualCO2Removal: totalCO2Removal
      });
      
    } catch (error) {
      console.error('updateProjectCO2Amount error:', error);
    }
  },
  
  /**
   * アラートを処理する
   * @param {string} measurementId 測定データID
   * @param {Array} alerts アラート配列
   */
  processAlerts: function(measurementId, alerts) {
    try {
      const highPriorityAlerts = alerts.filter(alert => alert.severity === 'HIGH');
      
      if (highPriorityAlerts.length > 0) {
        // 高優先度アラートの場合は即座にログ記録
        console.warn(`High priority alerts for measurement ${measurementId}:`, highPriorityAlerts);
        
        // 実際の実装では、メール通知やSMS通知などを行う
        // 例: NotificationService.sendAlert(measurementId, highPriorityAlerts);
      }
      
    } catch (error) {
      console.error('processAlerts error:', error);
    }
  },
  
  /**
   * 全測定データを取得する
   * @param {Object} options フィルタオプション
   * @returns {Object} 測定データ一覧
   */
  getAllMeasurements: function(options = {}) {
    try {
      const rawData = DataLib.getAllData('MEASUREMENTS_SHEET_ID', 'Measurements');
      let measurements = rawData
        .filter(row => row[20] !== false) // アクティブなデータのみ
        .map(row => this.formatMeasurementData(row));
      
      // 顧客IDフィルタ
      if (options.customerId) {
        measurements = measurements.filter(m => m.customerId === options.customerId);
      }
      
      return {
        success: true,
        data: measurements,
        total: measurements.length
      };
      
    } catch (error) {
      this.logError('getAllMeasurements', error, options);
      return {
        success: false,
        data: [],
        total: 0,
        message: 'データ取得に失敗しました: ' + error.message
      };
    }
  },
  
  /**
   * 測定操作ログを記録する
   * @param {string} action 操作タイプ
   * @param {string} measurementId 測定データID
   * @param {string} projectId プロジェクトID
   */
  logMeasurementAction: function(action, measurementId, projectId) {
    try {
      const logData = {
        timestamp: new Date(),
        action: action,
        resourceType: 'MEASUREMENT',
        resourceId: measurementId,
        resourceName: `Measurement for Project ${projectId}`,
        userId: Session.getActiveUser().getEmail(),
        details: `Measurement ${action}: ${measurementId} (Project: ${projectId})`
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
      console.error('Failed to log measurement action:', error);
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
        functionName: 'MeasurementsAPI.' + functionName,
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
      
      console.error(`MeasurementsAPI.${functionName} error:`, error);
      
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
};

/**
 * 測定データ管理APIのテスト関数群
 * TestLib.gs から呼び出される
 */

/**
 * 測定データ作成のテスト
 */
function testCreateMeasurement() {
  TestLib.addTest(
    'MeasurementsAPI.createMeasurement - valid data',
    function() {
      // テスト用プロジェクトを取得（Phase 2で作成済み）
      const projects = ProjectsAPI.getAllProjects({ limit: 1 });
      if (!projects.success || projects.data.length === 0) {
        return false; // テスト用プロジェクトが必要
      }
      
      const testData = {
        projectId: projects.data[0].projectId,
        measurementDate: new Date(),
        pH: 7.2,
        co2Concentration: 400,
        temperature: 25.0,
        flowRate: 10.5,
        co2RemovalAmount: 5.2,
        location: 'テスト測定地点A',
        operator: 'テスト測定者'
      };
      
      const result = MeasurementsAPI.createMeasurement(testData);
      return result.success && result.measurementId;
    },
    true,
    'measurement'
  );
  
  TestLib.addTest(
    'MeasurementsAPI.createMeasurement - invalid pH',
    function() {
      try {
        const projects = ProjectsAPI.getAllProjects({ limit: 1 });
        if (!projects.success || projects.data.length === 0) {
          return true; // プロジェクトがない場合はスキップ
        }
        
        MeasurementsAPI.createMeasurement({
          projectId: projects.data[0].projectId,
          measurementDate: new Date(),
          pH: 15 // 無効なpH値
        });
        return false; // エラーが発生すべき
      } catch (error) {
        return error.message.includes('バリデーションエラー');
      }
    },
    true,
    'measurement'
  );
}

/**
 * 測定データ取得のテスト
 */
function testGetMeasurement() {
  TestLib.addTest(
    'MeasurementsAPI.getMeasurementStats',
    function() {
      const result = MeasurementsAPI.getMeasurementStats();
      return result.success && typeof result.data.total === 'number';
    },
    true,
    'measurement'
  );
}

/**
 * Phase 3 測定データAPIテストの実行
 */
function runMeasurementsAPITests() {
  testCreateMeasurement();
  testGetMeasurement();
  
  const results = TestLib.runCategoryTests('measurement');
  return results;
}