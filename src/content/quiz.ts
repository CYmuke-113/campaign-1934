export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'year',
    question: '飞夺泸定桥发生在哪一年？',
    options: ['1934 年', '1935 年', '1936 年', '1937 年'],
    correctIndex: 1,
    explanation: '飞夺泸定桥发生在 1935 年 5 月 29 日，是中央红军长征途中的关键战斗。',
  },
  {
    id: 'crossing',
    question: '红军突击队员攀踏什么越过泸定桥？',
    options: ['竹筏', '铁索', '浮桥', '木船'],
    correctIndex: 1,
    explanation: '守敌拆去了桥板，突击队员攀踏十三根铁索，在火力下向对岸前进。',
  },
  {
    id: 'heroes',
    question: '飞夺泸定桥的突击队有多少名勇士？',
    options: ['十七名', '二十二名', '三十名', '四十名'],
    correctIndex: 1,
    explanation: '二十二名突击队员组成的夺桥突击队，是飞夺泸定桥战斗中最著名的英雄群体之一。',
  },
  {
    id: 'river',
    question: '泸定桥横跨哪条河？',
    options: ['湘江', '赤水河', '大渡河', '金沙江'],
    correctIndex: 2,
    explanation: '泸定桥横跨大渡河，桥下水流湍急，是红军北上的必经通道。',
  },
  {
    id: 'significance',
    question: '飞夺泸定桥对长征的直接意义是什么？',
    options: [
      '突破湘江封锁线',
      '为红军北上打开通道',
      '完成三大主力会师',
      '建立陕北根据地',
    ],
    correctIndex: 1,
    explanation: '夺取泸定桥后，红军跳出了大渡河天险的围堵，为长征北上打开了通道。',
  },
];

export interface QuizResult {
  correct: number;
  total: number;
}

export function scoreQuiz(answers: number[]): QuizResult {
  const correct = answers.reduce(
    (count, answer, index) => count + (answer === QUIZ_QUESTIONS[index]?.correctIndex ? 1 : 0),
    0,
  );
  return { correct, total: QUIZ_QUESTIONS.length };
}
