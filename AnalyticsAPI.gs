/**
 * データ分析機能
 * Phase 3: データ管理 - 測定データの分析・統計・可視化
 * CO2除去効率分析、トレンド分析、予測機能
 */

const AnalyticsAPI = {

  /**
   * プロジェクトのCO2除去効率分析を取得
   * @param {string} projectId プロジェクトID
   * @param {string} period 分析期間（'week', 'month', 'quarter', 'year'）
   * @returns {Object} 効率分析結果
   */
  getCO2RemovalEfficiency: function(projectId, period = 'month') {
    try {
      console.log(`CO2除去効率分析開始: projectId=${projectId}, period=${period}`);
      const startTime = new Date();
      
      // バリデーション
      if (!projectId) {
        throw new Error('プロジェクトIDが必要です');
      }
      
      const validPeriods = ['week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period)) {
        throw new Error('無効な期間指定です: ' + period);
      }
      
      // 期間の計算
      const endDate = new Date();
      const startDate = this.calculateStartDate(endDate, period);
      
      // プロジェクトデータ取得
      const projectResult = ProjectsAPI.getProject(projectId);
      if (!projectResult.success) {
        throw new Error('プロジェクトが見つかりません: ' + projectId);
      }
      
      const project = projectResult.data;
      
      // 測定データ取得（期間内）
      const measurementsResult = MeasurementsAPI.getMeasurementsByProject(projectId, {
        startDate: startDate,
        endDate: endDate,
        includeQualityCheck: true
      });
      
      if (!measurementsResult.success) {
        throw new Error('測定データの取得に失敗: ' + measurementsResult.message);
      }
      
      const measurements = measurementsResult.data;
      
      // 効率分析計算
      const efficiency = this.calculateEfficiencyMetrics(measurements, project);
      
      // トレンド分析
      const trends = this.calculateTrends(measurements, period);
      
      // 比較分析
      const comparison = this.calculateComparisonMetrics(measurements, project);
      
      const executionTime = new Date() - startTime;
      console.log(`CO2除去効率分析完了: ${executionTime}ms`);
      
      return {
        success: true,
        data: {
          projectId: projectId,
          project: {
            projectName: project.projectName,
            targetCO2Removal: project.targetCO2Removal,
            actualCO2Removal: project.actualCO2Removal
          },
          period: {
            type: period,
            startDate: startDate,
            endDate: endDate,
            days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
          },
          efficiency: efficiency,
          trends: trends,
          comparison: comparison,
          dataQuality: {
            totalMeasurements: measurements.length,
            validMeasurements: measurements.filter(m => m.qualityCheck && m.qualityCheck.grade !== 'D').length,
            averageQualityScore: this.calculateAverageQualityScore(measurements)
          },
          analysis: {
            summary: this.generateEfficiencySummary(efficiency, trends),
            recommendations: this.generateRecommendations(efficiency, trends, comparison)
          }
        },
        message: 'CO2除去効率分析が完了しました',
        executionTime: executionTime
      };
      
    } catch (error) {
      console.error('getCO2RemovalEfficiency error:', error);
      AuthLib.logError('AnalyticsAPI.getCO2RemovalEfficiency', error, { projectId, period });
      
      return {
        success: false,
        message: 'CO2除去効率分析でエラーが発生しました: ' + error.message,
        error: error.message
      };
    }
  },

  /**
   * 複数プロジェクトの比較分析
   * @param {Array} projectIds プロジェクトIDの配列
   * @param {string} period 分析期間
   * @returns {Object} 比較分析結果
   */
  compareProjects: function(projectIds, period = 'month') {
    try {
      console.log(`プロジェクト比較分析開始: ${projectIds.length}件`);
      const startTime = new Date();
      
      // バリデーション
      if (!Array.isArray(projectIds) || projectIds.length < 2) {
        throw new Error('比較には2つ以上のプロジェクトIDが必要です');
      }
      
      if (projectIds.length > 10) {
        throw new Error('比較できるプロジェクトは最大10件までです');
      }
      
      // 各プロジェクトの効率分析を取得
      const projectAnalyses = [];
      const errors = [];
      
      for (const projectId of projectIds) {
        try {
          const analysis = this.getCO2RemovalEfficiency(projectId, period);
          if (analysis.success) {
            projectAnalyses.push(analysis.data);
          } else {
            errors.push({ projectId, error: analysis.message });
          }
        } catch (error) {
          errors.push({ projectId, error: error.message });
        }
      }
      
      if (projectAnalyses.length < 2) {
        throw new Error('比較に必要な有効なプロジェクトデータが不足しています');
      }
      
      // 比較メトリクスの計算
      const comparison = this.calculateProjectComparison(projectAnalyses);
      
      // ランキング生成
      const rankings = this.generateProjectRankings(projectAnalyses);
      
      // ベンチマーク分析
      const benchmarks = this.calculateBenchmarks(projectAnalyses);
      
      const executionTime = new Date() - startTime;
      console.log(`プロジェクト比較分析完了: ${executionTime}ms`);
      
      return {
        success: true,
        data: {
          period: period,
          projectsAnalyzed: projectAnalyses.length,
          comparison: comparison,
          rankings: rankings,
          benchmarks: benchmarks,
          details: projectAnalyses,
          errors: errors.length > 0 ? errors : undefined
        },
        message: `${projectAnalyses.length}件のプロジェクト比較分析が完了しました`,
        executionTime: executionTime
      };
      
    } catch (error) {
      console.error('compareProjects error:', error);
      AuthLib.logError('AnalyticsAPI.compareProjects', error, { projectIds, period });
      
      return {
        success: false,
        message: 'プロジェクト比較分析でエラーが発生しました: ' + error.message,
        error: error.message
      };
    }
  },

  /**
   * 環境データのトレンド分析
   * @param {string} projectId プロジェクトID
   * @param {string} metric 分析対象メトリック（'ph', 'co2', 'temperature', 'flowRate', 'removal'）
   * @param {Object} options オプション設定
   * @returns {Object} トレンド分析結果
   */
  analyzeEnvironmentalTrends: function(projectId, metric = 'co2', options = {}) {
    try {
      console.log(`環境データトレンド分析開始: projectId=${projectId}, metric=${metric}`);
      const startTime = new Date();
      
      // デフォルト設定
      const defaultOptions = {
        period: 'month',
        smoothing: true,
        anomalyDetection: true,
        forecastDays: 30,
        confidenceLevel: 0.95
      };
      
      const config = { ...defaultOptions, ...options };
      
      // バリデーション
      if (!projectId) {
        throw new Error('プロジェクトIDが必要です');
      }
      
      const validMetrics = ['ph', 'co2', 'temperature', 'flowRate', 'removal'];
      if (!validMetrics.includes(metric)) {
        throw new Error('無効なメトリック指定です: ' + metric);
      }
      
      // 期間の計算
      const endDate = new Date();
      const startDate = this.calculateStartDate(endDate, config.period);
      
      // 測定データ取得
      const measurementsResult = MeasurementsAPI.getMeasurementsByProject(projectId, {
        startDate: startDate,
        endDate: endDate,
        sortBy: 'measurementDate',
        sortOrder: 'asc'
      });
      
      if (!measurementsResult.success) {
        throw new Error('測定データの取得に失敗: ' + measurementsResult.message);
      }
      
      const measurements = measurementsResult.data;
      
      if (measurements.length < 3) {
        throw new Error('トレンド分析には最低3つの測定データが必要です');
      }
      
      // メトリック値を抽出
      const timeSeriesData = this.extractTimeSeriesData(measurements, metric);
      
      // トレンド計算
      const trend = this.calculateTrendAnalysis(timeSeriesData, config);
      
      // 統計分析
      const statistics = this.calculateTimeSeriesStatistics(timeSeriesData);
      
      // 異常値検知
      const anomalies = config.anomalyDetection ? 
        this.detectAnomalies(timeSeriesData, config.confidenceLevel) : [];
      
      // 予測
      const forecast = config.forecastDays > 0 ? 
        this.generateForecast(timeSeriesData, config.forecastDays, config.confidenceLevel) : null;
      
      // 季節性分析
      const seasonality = this.analyzeSeasonality(timeSeriesData);
      
      const executionTime = new Date() - startTime;
      console.log(`環境データトレンド分析完了: ${executionTime}ms`);
      
      return {
        success: true,
        data: {
          projectId: projectId,
          metric: metric,
          period: {
            type: config.period,
            startDate: startDate,
            endDate: endDate,
            dataPoints: timeSeriesData.length
          },
          trend: trend,
          statistics: statistics,
          anomalies: anomalies,
          forecast: forecast,
          seasonality: seasonality,
          analysis: {
            summary: this.generateTrendSummary(trend, statistics, anomalies),
            insights: this.generateTrendInsights(trend, statistics, seasonality),
            alerts: this.generateTrendAlerts(trend, anomalies)
          }
        },
        message: '環境データトレンド分析が完了しました',
        executionTime: executionTime
      };
      
    } catch (error) {
      console.error('analyzeEnvironmentalTrends error:', error);
      AuthLib.logError('AnalyticsAPI.analyzeEnvironmentalTrends', error, { projectId, metric, options });
      
      return {
        success: false,
        message: '環境データトレンド分析でエラーが発生しました: ' + error.message,
        error: error.message
      };
    }
  },

  /**
   * 全体システム統計レポート生成
   * @param {Object} options レポートオプション
   * @returns {Object} 統計レポート
   */
  generateSystemReport: function(options = {}) {
    try {
      console.log('システム統計レポート生成開始');
      const startTime = new Date();
      
      // デフォルト設定
      const defaultOptions = {
        period: 'month',
        includeProjectDetails: true,
        includeEfficiencyAnalysis: true,
        includeTrendAnalysis: true,
        includeQualityMetrics: true
      };
      
      const config = { ...defaultOptions, ...options };
      
      // 期間計算
      const endDate = new Date();
      const startDate = this.calculateStartDate(endDate, config.period);
      
      // 基本統計データ取得
      const systemStats = this.getSystemStatistics(startDate, endDate);
      
      // プロジェクト統計
      const projectStats = config.includeProjectDetails ? 
        this.getProjectStatistics(startDate, endDate) : null;
      
      // 効率分析
      const efficiencyAnalysis = config.includeEfficiencyAnalysis ? 
        this.getSystemEfficiencyAnalysis(startDate, endDate) : null;
      
      // トレンド分析
      const trendAnalysis = config.includeTrendAnalysis ? 
        this.getSystemTrendAnalysis(startDate, endDate) : null;
      
      // 品質メトリクス
      const qualityMetrics = config.includeQualityMetrics ? 
        this.getSystemQualityMetrics(startDate, endDate) : null;
      
      // 環境影響評価
      const environmentalImpact = this.calculateEnvironmentalImpact(startDate, endDate);
      
      // レポート生成
      const report = {
        reportId: Utilities.getUuid(),
        generatedAt: new Date(),
        period: {
          type: config.period,
          startDate: startDate,
          endDate: endDate,
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        },
        systemStats: systemStats,
        projectStats: projectStats,
        efficiencyAnalysis: efficiencyAnalysis,
        trendAnalysis: trendAnalysis,
        qualityMetrics: qualityMetrics,
        environmentalImpact: environmentalImpact,
        summary: this.generateReportSummary(systemStats, efficiencyAnalysis, environmentalImpact),
        recommendations: this.generateSystemRecommendations(systemStats, efficiencyAnalysis, trendAnalysis)
      };
      
      // レポート保存
      this.saveReport(report);
      
      const executionTime = new Date() - startTime;
      console.log(`システム統計レポート生成完了: ${executionTime}ms`);
      
      return {
        success: true,
        data: report,
        message: 'システム統計レポートが生成されました',
        executionTime: executionTime
      };
      
    } catch (error) {
      console.error('generateSystemReport error:', error);
      AuthLib.logError('AnalyticsAPI.generateSystemReport', error, { options });
      
      return {
        success: false,
        message: 'システム統計レポート生成でエラーが発生しました: ' + error.message,
        error: error.message
      };
    }
  },

  /**
   * 期間開始日を計算
   * @param {Date} endDate 終了日
   * @param {string} period 期間タイプ
   * @returns {Date} 開始日
   */
  calculateStartDate: function(endDate, period) {
    const startDate = new Date(endDate);
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }
    
    return startDate;
  },

  /**
   * 効率メトリクスを計算
   * @param {Array} measurements 測定データ
   * @param {Object} project プロジェクトデータ
   * @returns {Object} 効率メトリクス
   */
  calculateEfficiencyMetrics: function(measurements, project) {
    if (measurements.length === 0) {
      return {
        averageEfficiency: 0,
        maxEfficiency: 0,
        minEfficiency: 0,
        totalCO2Removed: 0,
        targetProgress: 0,
        efficiencyTrend: 'stable'
      };
    }
    
    // CO2除去量の計算
    const co2RemovalAmounts = measurements
      .filter(m => m.co2RemovalAmount && m.co2RemovalAmount > 0)
      .map(m => parseFloat(m.co2RemovalAmount));
    
    const totalCO2Removed = co2RemovalAmounts.reduce((sum, amount) => sum + amount, 0);
    
    // 効率の計算（理論最大値に対する比率）
    const efficiencies = measurements
      .filter(m => m.efficiency && m.efficiency > 0)
      .map(m => parseFloat(m.efficiency));
    
    const averageEfficiency = efficiencies.length > 0 ? 
      efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length : 0;
    
    const maxEfficiency = efficiencies.length > 0 ? Math.max(...efficiencies) : 0;
    const minEfficiency = efficiencies.length > 0 ? Math.min(...efficiencies) : 0;
    
    // 目標に対する進捗
    const targetProgress = project.targetCO2Removal > 0 ? 
      (totalCO2Removed / project.targetCO2Removal) * 100 : 0;
    
    // 効率トレンド
    const efficiencyTrend = this.calculateSimpleTrend(efficiencies);
    
    return {
      averageEfficiency: Math.round(averageEfficiency * 100) / 100,
      maxEfficiency: Math.round(maxEfficiency * 100) / 100,
      minEfficiency: Math.round(minEfficiency * 100) / 100,
      totalCO2Removed: Math.round(totalCO2Removed * 100) / 100,
      targetProgress: Math.round(targetProgress * 100) / 100,
      efficiencyTrend: efficiencyTrend,
      measurementCount: measurements.length,
      validMeasurementCount: co2RemovalAmounts.length
    };
  },

  /**
   * トレンドを計算
   * @param {Array} measurements 測定データ
   * @param {string} period 期間
   * @returns {Object} トレンド情報
   */
  calculateTrends: function(measurements, period) {
    if (measurements.length < 2) {
      return {
        co2RemovalTrend: 'insufficient_data',
        efficiencyTrend: 'insufficient_data',
        qualityTrend: 'insufficient_data'
      };
    }
    
    // 日付順にソート
    const sortedMeasurements = measurements.sort((a, b) => 
      new Date(a.measurementDate) - new Date(b.measurementDate)
    );
    
    // CO2除去量のトレンド
    const co2Amounts = sortedMeasurements
      .filter(m => m.co2RemovalAmount && m.co2RemovalAmount > 0)
      .map(m => parseFloat(m.co2RemovalAmount));
    
    const co2RemovalTrend = this.calculateSimpleTrend(co2Amounts);
    
    // 効率のトレンド
    const efficiencies = sortedMeasurements
      .filter(m => m.efficiency && m.efficiency > 0)
      .map(m => parseFloat(m.efficiency));
    
    const efficiencyTrend = this.calculateSimpleTrend(efficiencies);
    
    // 品質のトレンド
    const qualityScores = sortedMeasurements
      .filter(m => m.qualityCheck && m.qualityCheck.score !== undefined)
      .map(m => m.qualityCheck.score);
    
    const qualityTrend = this.calculateSimpleTrend(qualityScores);
    
    return {
      co2RemovalTrend: co2RemovalTrend,
      efficiencyTrend: efficiencyTrend,
      qualityTrend: qualityTrend,
      dataPoints: {
        co2Removal: co2Amounts.length,
        efficiency: efficiencies.length,
        quality: qualityScores.length
      }
    };
  },

  /**
   * 簡単なトレンド計算
   * @param {Array} values 数値配列
   * @returns {string} トレンド（'improving', 'declining', 'stable', 'insufficient_data'）
   */
  calculateSimpleTrend: function(values) {
    if (values.length < 2) {
      return 'insufficient_data';
    }
    
    if (values.length < 5) {
      // データ点が少ない場合は最初と最後を比較
      const first = values[0];
      const last = values[values.length - 1];
      const change = (last - first) / first;
      
      if (Math.abs(change) < 0.05) return 'stable';
      return change > 0 ? 'improving' : 'declining';
    }
    
    // データ点が多い場合は線形回帰で傾向を見る
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    
    // 傾きを相対的な変化率に変換
    const relativeSlope = slope / avgY;
    
    if (Math.abs(relativeSlope) < 0.01) return 'stable';
    return relativeSlope > 0 ? 'improving' : 'declining';
  },

  /**
   * 比較メトリクスを計算
   * @param {Array} measurements 測定データ
   * @param {Object} project プロジェクトデータ
   * @returns {Object} 比較メトリクス
   */
  calculateComparisonMetrics: function(measurements, project) {
    // 業界平均値（固定値、実際は外部データベースから取得）
    const industryBenchmarks = {
      averageEfficiency: 75.0,
      averageCO2RemovalRate: 50.0, // tons/month
      averageQualityScore: 85.0
    };
    
    if (measurements.length === 0) {
      return {
        efficiencyVsBenchmark: 0,
        co2RemovalVsBenchmark: 0,
        qualityVsBenchmark: 0,
        industryBenchmarks: industryBenchmarks
      };
    }
    
    // 現在の平均値を計算
    const efficiencies = measurements
      .filter(m => m.efficiency && m.efficiency > 0)
      .map(m => parseFloat(m.efficiency));
    
    const currentEfficiency = efficiencies.length > 0 ? 
      efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length : 0;
    
    const co2Amounts = measurements
      .filter(m => m.co2RemovalAmount && m.co2RemovalAmount > 0)
      .map(m => parseFloat(m.co2RemovalAmount));
    
    const totalCO2Removed = co2Amounts.reduce((sum, amount) => sum + amount, 0);
    const monthlyAverage = totalCO2Removed; // 期間内の総量
    
    const qualityScores = measurements
      .filter(m => m.qualityCheck && m.qualityCheck.score !== undefined)
      .map(m => m.qualityCheck.score);
    
    const averageQuality = qualityScores.length > 0 ? 
      qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;
    
    // ベンチマークとの比較
    const efficiencyVsBenchmark = ((currentEfficiency - industryBenchmarks.averageEfficiency) / 
      industryBenchmarks.averageEfficiency) * 100;
    
    const co2RemovalVsBenchmark = ((monthlyAverage - industryBenchmarks.averageCO2RemovalRate) / 
      industryBenchmarks.averageCO2RemovalRate) * 100;
    
    const qualityVsBenchmark = ((averageQuality - industryBenchmarks.averageQualityScore) / 
      industryBenchmarks.averageQualityScore) * 100;
    
    return {
      efficiencyVsBenchmark: Math.round(efficiencyVsBenchmark * 100) / 100,
      co2RemovalVsBenchmark: Math.round(co2RemovalVsBenchmark * 100) / 100,
      qualityVsBenchmark: Math.round(qualityVsBenchmark * 100) / 100,
      industryBenchmarks: industryBenchmarks,
      currentValues: {
        efficiency: Math.round(currentEfficiency * 100) / 100,
        co2RemovalRate: Math.round(monthlyAverage * 100) / 100,
        qualityScore: Math.round(averageQuality * 100) / 100
      }
    };
  },

  /**
   * 平均品質スコアを計算
   * @param {Array} measurements 測定データ
   * @returns {number} 平均品質スコア
   */
  calculateAverageQualityScore: function(measurements) {
    const scores = measurements
      .filter(m => m.qualityCheck && m.qualityCheck.score !== undefined)
      .map(m => m.qualityCheck.score);
    
    return scores.length > 0 ? 
      Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100 : 0;
  },

  /**
   * 効率サマリーを生成
   * @param {Object} efficiency 効率メトリクス
   * @param {Object} trends トレンド情報
   * @returns {string} サマリー
   */
  generateEfficiencySummary: function(efficiency, trends) {
    let summary = `期間内の平均CO2除去効率は${efficiency.averageEfficiency}%です。`;
    
    if (trends.efficiencyTrend === 'improving') {
      summary += ' 効率は改善傾向にあります。';
    } else if (trends.efficiencyTrend === 'declining') {
      summary += ' 効率は低下傾向にあります。';
    } else {
      summary += ' 効率は安定しています。';
    }
    
    if (efficiency.targetProgress > 0) {
      summary += ` 目標に対する進捗は${efficiency.targetProgress}%です。`;
    }
    
    return summary;
  },

  /**
   * 推奨事項を生成
   * @param {Object} efficiency 効率メトリクス
   * @param {Object} trends トレンド情報
   * @param {Object} comparison 比較メトリクス
   * @returns {Array} 推奨事項リスト
   */
  generateRecommendations: function(efficiency, trends, comparison) {
    const recommendations = [];
    
    // 効率に基づく推奨
    if (efficiency.averageEfficiency < 70) {
      recommendations.push({
        type: 'efficiency',
        priority: 'high',
        title: '効率改善が必要',
        description: 'CO2除去効率が70%を下回っています。処理パラメータの最適化を検討してください。'
      });
    }
    
    // トレンドに基づく推奨
    if (trends.efficiencyTrend === 'declining') {
      recommendations.push({
        type: 'trend',
        priority: 'medium',
        title: '効率低下への対応',
        description: '効率が低下傾向にあります。設備のメンテナンスや運転条件の見直しを行ってください。'
      });
    }
    
    if (trends.qualityTrend === 'declining') {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        title: 'データ品質の改善',
        description: '測定データの品質が低下しています。センサーの校正や測定手順の見直しを行ってください。'
      });
    }
    
    // ベンチマークに基づく推奨
    if (comparison.efficiencyVsBenchmark < -10) {
      recommendations.push({
        type: 'benchmark',
        priority: 'high',
        title: '業界平均を下回る効率',
        description: '効率が業界平均を大きく下回っています。ベストプラクティスの導入を検討してください。'
      });
    }
    
    // 目標進捗に基づく推奨
    if (efficiency.targetProgress < 50) {
      recommendations.push({
        type: 'target',
        priority: 'medium',
        title: '目標達成への対策',
        description: '目標達成に向けてペースアップが必要です。運転時間の延長や効率改善を検討してください。'
      });
    }
    
    return recommendations;
  },

  /**
   * システム統計を取得
   * @param {Date} startDate 開始日
   * @param {Date} endDate 終了日
   * @returns {Object} システム統計
   */
  getSystemStatistics: function(startDate, endDate) {
    try {
      // 全プロジェクトを取得
      const projectsResult = ProjectsAPI.getAllProjects();
      const projects = projectsResult.success ? projectsResult.data : [];
      
      // アクティブなプロジェクト
      const activeProjects = projects.filter(p => p.status === 'active');
      
      // 期間内の測定データ数を概算
      let totalMeasurements = 0;
      let totalCO2Removed = 0;
      
      for (const project of activeProjects) {
        try {
          const measurementsResult = MeasurementsAPI.getMeasurementsByProject(project.projectId, {
            startDate: startDate,
            endDate: endDate
          });
          
          if (measurementsResult.success) {
            totalMeasurements += measurementsResult.data.length;
            totalCO2Removed += measurementsResult.data
              .filter(m => m.co2RemovalAmount)
              .reduce((sum, m) => sum + parseFloat(m.co2RemovalAmount || 0), 0);
          }
        } catch (error) {
          console.warn(`Failed to get measurements for project ${project.projectId}:`, error);
        }
      }
      
      return {
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        totalMeasurements: totalMeasurements,
        totalCO2Removed: Math.round(totalCO2Removed * 100) / 100,
        averageCO2PerProject: activeProjects.length > 0 ? 
          Math.round((totalCO2Removed / activeProjects.length) * 100) / 100 : 0,
        period: {
          startDate: startDate,
          endDate: endDate,
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        }
      };
      
    } catch (error) {
      console.error('getSystemStatistics error:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalMeasurements: 0,
        totalCO2Removed: 0,
        averageCO2PerProject: 0,
        error: error.message
      };
    }
  },

  /**
   * レポートを保存
   * @param {Object} report レポートデータ
   */
  saveReport: function(report) {
    try {
      const sheetId = Config.getSheetId('reports');
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Reports');
      
      if (sheet) {
        const newRow = [
          report.reportId,
          report.generatedAt,
          report.period.type,
          report.period.startDate,
          report.period.endDate,
          JSON.stringify(report.summary),
          'system_report'
        ];
        sheet.appendRow(newRow);
        console.log('レポートを保存しました:', report.reportId);
      }
    } catch (error) {
      console.error('レポート保存エラー:', error);
    }
  }
};

/**
 * Phase 3 分析機能テスト実行
 * @returns {Object} テスト結果
 */
function runAnalyticsTests() {
  console.log('=== Analytics API テスト開始 ===');
  
  const testResults = [];
  const startTime = new Date();
  
  try {
    // テスト用プロジェクトIDを取得（実際の環境では既存のプロジェクトIDを使用）
    const testProjectId = 'test-project-001';
    
    // 1. CO2除去効率分析テスト
    console.log('1. CO2除去効率分析テスト');
    try {
      const efficiencyResult = AnalyticsAPI.getCO2RemovalEfficiency(testProjectId, 'month');
      testResults.push({
        test: 'CO2除去効率分析',
        status: efficiencyResult.success ? 'PASS' : 'FAIL',
        message: efficiencyResult.message,
        executionTime: efficiencyResult.executionTime
      });
    } catch (error) {
      testResults.push({
        test: 'CO2除去効率分析',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // 2. 環境データトレンド分析テスト
    console.log('2. 環境データトレンド分析テスト');
    try {
      const trendResult = AnalyticsAPI.analyzeEnvironmentalTrends(testProjectId, 'co2');
      testResults.push({
        test: '環境データトレンド分析',
        status: trendResult.success ? 'PASS' : 'FAIL',
        message: trendResult.message,
        executionTime: trendResult.executionTime
      });
    } catch (error) {
      testResults.push({
        test: '環境データトレンド分析',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // 3. システムレポート生成テスト
    console.log('3. システムレポート生成テスト');
    try {
      const reportResult = AnalyticsAPI.generateSystemReport({ period: 'week' });
      testResults.push({
        test: 'システムレポート生成',
        status: reportResult.success ? 'PASS' : 'FAIL',
        message: reportResult.message,
        executionTime: reportResult.executionTime
      });
    } catch (error) {
      testResults.push({
        test: 'システムレポート生成',
        status: 'FAIL',
        error: error.message
      });
    }
    
    const totalTime = new Date() - startTime;
    const passedTests = testResults.filter(t => t.status === 'PASS').length;
    
    console.log('=== Analytics API テスト完了 ===');
    console.log(`成功: ${passedTests}/${testResults.length}`);
    console.log(`実行時間: ${totalTime}ms`);
    
    return {
      success: true,
      summary: {
        total: testResults.length,
        passed: passedTests,
        failed: testResults.length - passedTests,
        passRate: `${Math.round((passedTests / testResults.length) * 100)}%`,
        totalTime: totalTime
      },
      results: testResults
    };
    
  } catch (error) {
    console.error('Analytics API テストエラー:', error);
    return {
      success: false,
      error: error.message,
      results: testResults
    };
  }
}