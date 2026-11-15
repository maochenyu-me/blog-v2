export interface EquipmentItem {
  name: string
  image: string
  link: string
  description: string
  specification: string
}

export interface EquipmentCategory {
  title: string
  description: string
  equipment_list: EquipmentItem[]
}

export const equipmentConfig = {
  title: '我的装备',
  englishTitle: 'Equipment',
  description: '记录日常使用的设备与工具，也分享它们带来的灵感。',
  noteKey: 'sourceNote',
  sourceUrl: 'https://blog.anheyu.com/equipment',
  bannerImage: 'https://upload-bbs.miyoushe.com/upload/2025/08/20/125766904/27160402b1840dbc85ccf9bec2665f0d_5042209802832493877.png',
  categories: [
    {
      title: '生产力',
      description: '提升自己生产效率的硬件设备',
      equipment_list: [
        {
          name: 'MacBook Pro 2021 16 英寸',
          image: 'https://upload-bbs.miyoushe.com/upload/2025/08/20/125766904/b95852537e96a482957b8e5ff647ff4c_764505066454514675.png',
          link: 'https://support.apple.com/zh-cn/111901',
          description: '屏幕显示效果好、色彩准确、对比度强、性能强劲、续航优秀。可以用来开发和设计。',
          specification: 'M1 Max 64G / 1TB',
        },
        {
          name: 'iPad 2020',
          image: 'https://upload-bbs.miyoushe.com/upload/2025/08/20/125766904/bf9219494c6da12fdfd844987a369360_291371561164874211.png',
          link: 'https://www.apple.com.cn/ipad-10.2/',
          description: '事事玩得转，买前生产力，买后爱奇艺。',
          specification: '深空灰 / 128G',
        },
        {
          name: 'iPhone 15 Pro Max',
          image: 'https://upload-bbs.miyoushe.com/upload/2023/11/06/125766904/89059eb5043ced7a38ddbe7d9141927e_6382001755098640538..png',
          link: 'https://www.apple.com.cn/iphone-15-pro/',
          description: '钛金属，坚固轻盈，Pro 得真材实料，人生第一台这么贵的手机，心疼的一批，不过确实好用，续航，大屏都很爽，缺点就是信号信号差。',
          specification: '白色 / 512G',
        },
        {
          name: 'iPhone 12 mini',
          image: 'https://upload-bbs.miyoushe.com/upload/2025/08/20/125766904/ca85003734c7ae16e0885de6ddf70edf_5092364343528935349.png',
          link: 'https://www.apple.com.cn/iphone-12/specs/',
          description: '超瓷晶面板，玻璃背板搭配铝金属边框，曲线优美的圆角设计，mini大小正好一只手就抓住，深得我心，唯一缺点大概就是续航不够。',
          specification: '绿色 / 128G',
        },
        {
          name: 'AirPods（第三代）',
          image: 'https://upload-bbs.miyoushe.com/upload/2025/08/20/125766904/e95d49a35c4ada2e347e148db21bd8b2_6597868370689784858.png',
          link: 'https://www.apple.com.cn/airpods-3rd-generation/',
          description: '第三代对比第二代提升很大，不喜欢入耳式耳机的可以入，空间音频等功能确实新颖，第一次使用有被惊艳到。',
          specification: '标准版',
        },
      ],
    },
    {
      title: '出行',
      description: '用来出行的实物及设备',
      equipment_list: [
        {
          name: 'Apple Watch Series 8',
          image: 'https://upload-bbs.miyoushe.com/upload/2025/08/20/125766904/3106e7079e4c2bacacc90d0511aa64a9_2946560183649110408.png',
          link: 'https://www.apple.com.cn/apple-watch-series-8/',
          description: '健康提醒和活动记录能帮助保持运动频率；续航仍是需要考虑的因素。',
          specification: '黑色',
        },
        {
          name: 'NATIONAL GEOGRAPHIC 双肩包',
          image: 'https://upload-bbs.miyoushe.com/upload/2025/08/20/125766904/35c080f680dc41ce62915f9f3ffa425c_7289389531712378214.png',
          link: 'https://item.jd.com/100011269828.html',
          description: '大容量背包，可装下 16 英寸 MacBook Pro；背负舒适，收纳口袋丰富。',
          specification: '黑色',
        },
        {
          name: 'NATIONAL GEOGRAPHIC 学生书包',
          image: 'https://upload-bbs.miyoushe.com/upload/2025/08/20/125766904/c56fc8e461a855f8fe1b040bec559f42_4252151225488526637.png',
          link: 'https://item.jd.com/100005889786.html',
          description: '轻便实用，配色醒目。',
          specification: '红白色',
        },
      ],
    },
  ] satisfies EquipmentCategory[],
} as const

export const equipmentCount = equipmentConfig.categories.reduce(
  (total, category) => total + category.equipment_list.length,
  0,
)
