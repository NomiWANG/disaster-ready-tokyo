// 地图服务 - 管理地图标记和显示区域

import TokyoShelterService from './TokyoShelterService';

const MapService = {
  // 默认显示区域 - 东京市中心
  getInitialRegion() {
    return {
      latitude: 35.6762,
      longitude: 139.6503,
      latitudeDelta: 0.15,
      longitudeDelta: 0.15,
    };
  },

  // 数据转换为地图标记
  toMarkers(rawData = []) {
    return rawData.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      coordinate: {
        latitude: item.latitude,
        longitude: item.longitude,
      },
    }));
  },

  // 获取避难所标记
  async getShelterMarkers() {
    await TokyoShelterService.initialize();

    const shelters = TokyoShelterService.getAllShelters();

    return shelters.map(shelter => ({
      id: shelter.id,
      name: shelter.name,
      nameEn: shelter.nameEn,
      latitude: shelter.latitude,
      longitude: shelter.longitude,
      area: shelter.ward,
      type: 'shelter',
      tags: ['shelter', 'evacuation', 'official'],
      capacity: shelter.capacity,
      facilities: shelter.facilities,
      accessible: shelter.accessible,
      phone: shelter.phone,
      address: shelter.address,
    }));
  },

  async getNearestShelters(latitude, longitude, maxCount = 5) {
    await TokyoShelterService.initialize();
    return TokyoShelterService.findNearestShelters(latitude, longitude, maxCount);
  },

  // 获取求助请求标记
  getHelpRequestMarkers() {
    return [
      {
        id: 'help-1',
        user: 'User A',
        content: 'Need medical help, elderly person injured at home',
        latitude: 35.7350,
        longitude: 139.7850,
        area: 'Arakawa',
        time: 5,
        urgent: true,
        type: 'help'
      },
      {
        id: 'help-2',
        user: 'User B',
        content: 'Need food and water, trapped at home',
        latitude: 35.7250,
        longitude: 139.7800,
        area: 'Taito',
        time: 12,
        urgent: false,
        type: 'help'
      },
      {
        id: 'help-3',
        user: 'User C',
        content: 'Need help evacuating, mobility impaired',
        latitude: 35.7380,
        longitude: 139.7880,
        area: 'Arakawa',
        time: 20,
        urgent: true,
        type: 'help'
      },
      {
        id: 'help-4',
        user: 'User D',
        content: 'Looking for missing family members',
        latitude: 35.7200,
        longitude: 139.7750,
        area: 'Taito',
        time: 30,
        urgent: false,
        type: 'help'
      },
    ];
  },
};

export default MapService;


