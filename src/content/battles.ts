export interface BattleCardData {
  id: string;
  name: string;
  time: string;
  place: string;
  description: string;
  playable: boolean;
  tone: string;
}

export const BATTLES: BattleCardData[] = [
  {
    id: 'xiangjiang',
    name: '血战湘江',
    time: '1934 年 11 月—12 月',
    place: '广西全州、兴安一带',
    description: '中央红军突破湘江封锁线，付出巨大牺牲。',
    playable: false,
    tone: 'tone-xiangjiang',
  },
  {
    id: 'chishui',
    name: '四渡赤水',
    time: '1935 年 1 月—3 月',
    place: '川黔滇边',
    description: '红军四次渡过赤水河，摆脱敌军围追堵截。',
    playable: false,
    tone: 'tone-chishui',
  },
  {
    id: 'jinsha',
    name: '巧渡金沙江',
    time: '1935 年 5 月',
    place: '云南皎平渡',
    description: '红军以少量船只从容渡过金沙江，跳出包围圈。',
    playable: false,
    tone: 'tone-jinsha',
  },
  {
    id: 'dadou',
    name: '强渡大渡河',
    time: '1935 年 5 月',
    place: '四川安顺场',
    description: '十七勇士强渡大渡河，为红军北上打开缺口。',
    playable: false,
    tone: 'tone-dadou',
  },
  {
    id: 'luding',
    name: '飞夺泸定桥',
    time: '1935 年 5 月 29 日',
    place: '四川泸定',
    description: '二十二名勇士攀踏铁索，夺取泸定桥。',
    playable: true,
    tone: 'tone-luding',
  },
  {
    id: 'lazikou',
    name: '突破腊子口',
    time: '1935 年 9 月',
    place: '甘肃迭部',
    description: '红军攻克天险腊子口，打开北上通道。',
    playable: false,
    tone: 'tone-lazikou',
  },
];
