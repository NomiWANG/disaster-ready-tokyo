// 防灾指南服务 - 管理各类灾害应对指南

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'disasterGuidelines:data:v1';

class DisasterGuidelinesService {
  constructor() {
    this.guidelines = [];
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      const cached = await this.loadFromCache();
      if (cached && cached.length > 0) {
        this.guidelines = cached;
        this.isInitialized = true;
        console.log(`📥 从缓存加载了 ${cached.length} 条指南`);
        return true;
      }

      await this.loadBuiltInGuidelines();
      await this.saveToCache(this.guidelines);

      this.isInitialized = true;
      console.log(`✅ 加载了 ${this.guidelines.length} 条防灾指南`);
      return true;
    } catch (error) {
      console.error('[Guidelines] 初始化失败:', error.message);
      return false;
    }
  }

  async loadBuiltInGuidelines() {
    this.guidelines = [
      {
        id: 'guideline-earthquake-1',
        title: '地震发生时的行动指南',
        titleEn: 'Earthquake Response Guidelines',
        category: 'earthquake',
        type: 'action',
        priority: 1,
        source: '内阁府防灾基本计划',
        content: {
          steps: [
            {
              phase: '地震发生时（1-2分钟）',
              actions: [
                '保护头部 立即躲到桌子下或坚固家具旁',
                '远离窗户 玻璃和悬挂物',
                '如在室外 远离建筑物 电线杆和自动售货机',
                '在电梯内时 按下所有楼层按钮 在最近楼层下',
                '驾车时 减速停车 打开危险警示灯',
              ],
            },
            {
              phase: '地震停止后（2-10分钟）',
              actions: [
                '检查周围是否有受伤人员',
                '检查煤气 水 电是否泄漏或损坏',
                '穿上鞋子 准备余震',
                '打开收音机或手机获取信息',
                '不要使用电梯',
              ],
            },
            {
              phase: '疏散准备（10-30分钟）',
              actions: [
                '准备应急包（水 食物 急救包）',
                '关闭煤气和电源总开关',
                '穿长袖长裤和结实的鞋子',
                '携带重要文件和现金',
                '通知家人和朋友你的位置',
              ],
            },
            {
              phase: '疏散行动（30分钟后）',
              actions: [
                '按指定疏散路线前往避难所',
                '步行前往 不要驾车',
                '帮助老人 儿童和残障人士',
                '遵守避难所规则',
                '定期与家人联系',
              ],
            },
          ],
        },
      },
      {
        id: 'guideline-earthquake-2',
        title: '地震预防检查清单',
        titleEn: 'Earthquake Prevention Checklist',
        category: 'earthquake',
        type: 'prevention',
        priority: 2,
        source: '东京防災手册',
        content: {
          checklist: [
            {
              category: '家具固定',
              items: [
                '书架和橱柜已固定在墙上',
                '重物放在低处',
                '电视和电器已固定',
                '镜子和画框已加固',
              ],
            },
            {
              category: '逃生路线',
              items: [
                '确认至少两条逃生路线',
                '清理走廊和楼梯的杂物',
                '知道最近避难所的位置',
                '家人约定集合地点',
              ],
            },
            {
              category: '应急物资',
              items: [
                '准备至少3天的饮用水（每人每天3升）',
                '准备至少3天的非易腐食品',
                '准备急救包和常用药品',
                '准备手电筒 收音机和备用电池',
                '准备现金（ATM可能无法使用）',
              ],
            },
          ],
        },
      },
      {
        id: 'guideline-typhoon-1',
        title: '台风应对指南',
        titleEn: 'Typhoon Response Guidelines',
        category: 'typhoon',
        type: 'action',
        priority: 1,
        source: '气象厅防灾指南',
        content: {
          steps: [
            {
              phase: '台风警报发布前（24-48小时）',
              actions: [
                '检查最新天气预报',
                '准备应急物资',
                '检查排水沟是否畅通',
                '固定或收起室外物品',
                '给手机和移动电源充电',
              ],
            },
            {
              phase: '台风警报发布后（6-24小时）',
              actions: [
                '储备饮用水',
                '准备食物（可能停电）',
                '关闭门窗 必要时贴胶带',
                '准备手电筒和蜡烛',
                '确认避难所位置',
              ],
            },
            {
              phase: '台风过境中',
              actions: [
                '待在室内 远离窗户',
                '不要外出 即使风雨减弱（可能是台风眼）',
                '关注气象信息',
                '如收到疏散命令 立即行动',
                '避免使用煤气和明火',
              ],
            },
            {
              phase: '台风过后',
              actions: [
                '确认官方宣布安全后再外出',
                '小心倒塌的树木和电线',
                '检查房屋损坏情况',
                '清理积水和杂物',
                '报告严重损坏给相关部门',
              ],
            },
          ],
        },
      },
      {
        id: 'guideline-tsunami-1',
        title: '海啸逃生指南',
        titleEn: 'Tsunami Evacuation Guidelines',
        category: 'tsunami',
        type: 'action',
        priority: 1,
        source: '内阁府海啸对策',
        content: {
          warningTexts: [
            '如果感到强烈地震 立即前往高地 不要等待海啸警报',
            '海啸警报发布后 立即疏散 不要返回取物品',
            '疏散到至少海拔10米以上或距海岸2公里以上',
            '如无法到达高地 前往坚固建筑物的3层以上',
          ],
          steps: [
            {
              phase: '地震后立即',
              actions: [
                '不要等待警报 立即前往高地',
                '大声呼喊"海啸！"警告他人',
                '帮助老人和儿童',
                '不要返回海边',
              ],
            },
            {
              phase: '听到海啸警报',
              actions: [
                '如已在高地 保持警惕',
                '如仍在低地 立即疏散',
                '远离河流和海岸',
                '不要去看海啸',
              ],
            },
            {
              phase: '第一波海啸后',
              actions: [
                '继续待在高地',
                '海啸可能有多波',
                '听从官方指示',
                '至少等待24小时再返回',
              ],
            },
          ],
        },
      },
      {
        id: 'guideline-fire-1',
        title: '火灾应对指南',
        titleEn: 'Fire Response Guidelines',
        category: 'fire',
        type: 'action',
        priority: 1,
        source: '消防厅防火指南',
        content: {
          steps: [
            {
              phase: '发现火灾',
              actions: [
                '大声喊"着火了！"',
                '立即拨打119',
                '如火势小 使用灭火器',
                '如火势大 立即疏散',
                '触摸门把手确认温度后再开门',
              ],
            },
            {
              phase: '疏散行动',
              actions: [
                '弯腰或爬行前进（烟雾上升）',
                '用湿毛巾捂住口鼻',
                '关闭身后的门（延缓火势）',
                '走楼梯 不要乘电梯',
                '到达安全地点后报告人数',
              ],
            },
          ],
        },
      },
      {
        id: 'guideline-family-plan',
        title: '家庭防灾计划模板',
        titleEn: 'Family Disaster Plan Template',
        category: 'general',
        type: 'planning',
        priority: 2,
        source: '内阁府防灾指南',
        content: {
          sections: [
            {
              title: '家庭成员信息',
              fields: [
                '姓名 年龄 血型',
                '过敏和慢性病情况',
                '常用药品',
                '工作/学校地址和电话',
                '紧急联系人',
              ],
            },
            {
              title: '集合地点',
              fields: [
                '附近的公园或广场（第一集合点）',
                '指定避难所（第二集合点）',
                '外地亲戚家地址（远程集合点）',
              ],
            },
            {
              title: '联系方式',
              fields: [
                '家庭成员手机号码',
                '工作单位电话',
                '外地联系人（中转联系）',
                '使用171灾害留言服务',
              ],
            },
            {
              title: '应急物资清单',
              fields: [
                '水（每人每天3升 至少3天）',
                '食物（非易腐 至少3天）',
                '急救包和常用药',
                '手电筒 收音机 电池',
                '现金 重要文件副本',
                '换洗衣物 卫生用品',
              ],
            },
          ],
        },
      },
    ];
  }

  getAllGuidelines() {
    return [...this.guidelines];
  }

  getGuidelinesByCategory(category) {
    return this.guidelines.filter(g => g.category === category);
  }

  getGuidelinesByType(type) {
    return this.guidelines.filter(g => g.type === type);
  }

  getHighPriorityGuidelines() {
    return this.guidelines
      .filter(g => g.priority === 1)
      .sort((a, b) => a.priority - b.priority);
  }

  searchGuidelines(query) {
    if (!query) return this.guidelines;

    const lowerQuery = query.toLowerCase();
    return this.guidelines.filter(g =>
      g.title.toLowerCase().includes(lowerQuery) ||
      g.titleEn.toLowerCase().includes(lowerQuery)
    );
  }

  async loadFromCache() {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached);
    } catch (error) {
      console.warn('[Guidelines] 读取缓存失败');
      return null;
    }
  }

  async saveToCache(guidelines) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(guidelines));
    } catch (error) {
      console.warn('[Guidelines] 保存缓存失败');
    }
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      guidelineCount: this.guidelines.length,
      categories: [...new Set(this.guidelines.map(g => g.category))],
      types: [...new Set(this.guidelines.map(g => g.type))],
    };
  }
}

export default new DisasterGuidelinesService();
