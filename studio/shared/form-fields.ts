import type { Choice } from './choices.js';
import type { Json } from './types.js';

const choices = (values: string[], labels = values): Choice[] => values.map((value, i) => ({ value, label: labels[i] }));
export const aboutWidgets = choices(['about-reward', 'author-career', 'content-idea', 'hobby', 'hello-about', 'like-music', 'personalities-photo', 'statistics-map', 'textarea'], ['赞赏', '职业与技能', '创作方向', '兴趣爱好', '个人介绍', '音乐偏好', '性格与照片', '统计与地图', '文字卡片']);
export const sidebarWidgets = choices(['adbox', 'archives', 'categories', 'comments', 'custom_html', 'friend-link', 'music', 'power', 'profile', 'recent-posts', 'stat', 'steam', 'tags-stat', 'tags', 'toc', 'visit-posts', 'wechat'], ['广告', '归档', '分类', '最新评论', '自定义 HTML', '通讯录', '音乐', '赞助', '个人卡片', '最近文章', '统计', 'Steam', '标签与归档统计', '标签', '目录', '热门文章', '公众号']);
export function fieldChoices(path: string): Choice[] | undefined {
  const key = path.split('.').at(-1);
  if (key === 'color_scheme') return choices(['system', 'light', 'dark'], ['跟随系统', '浅色', '深色']);
  if (key === 'target') return choices(['_self', '_blank'], ['当前窗口', '新窗口']);
  if (key === 'display_style') return choices(['beautify', 'default'], ['卡片', '简洁']);
  if (key === 'mbti') return choices(['intj','intp','entj','entp','infj','infp','enfj','enfp','istj','isfj','estj','esfj','istp','isfp','estp','esfp'], ['INTJ 建筑师','INTP 逻辑学家','ENTJ 指挥官','ENTP 辩论家','INFJ 提倡者','INFP 调停者','ENFJ 主人公','ENFP 竞选者','ISTJ 物流师','ISFJ 守卫者','ESTJ 总经理','ESFJ 执政官','ISTP 鉴赏家','ISFP 探险家','ESTP 企业家','ESFP 表演者']);
  if (path === 'extra.tool.nav_music.server') return choices(['tencent', 'netease', 'kugou', 'kuwo', 'baidu'], ['QQ 音乐', '网易云音乐', '酷狗', '酷我', '百度音乐']);
  if (path === 'extra.style.font_family') return choices(['PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'system-ui', 'sans-serif'], ['苹方', '微软雅黑', '思源黑体', '系统字体', '无衬线字体']);
  if (/^extra\.about\.widget_list\.\d+$/.test(path)) return aboutWidgets;
  if (/^extra\.sidebar\.widgets\..*\.widget$/.test(path)) return sidebarWidgets;
  if (/^extra\.about\.hobbies\.\d+\.class$/.test(path)) return choices(['game-lol', 'game-wolf', 'comic-content'], ['游戏卡片', '兴趣卡片', '动漫卡片']);
}
export function fieldControl(path: string): 'color' | 'date' | 'icon' | 'symbol' | 'emoji' | 'text' {
  const key = path.split('.').at(-1) || '';
  if (['date', 'updated', 'start_date', 'end_date'].includes(key)) return 'date';
  if (key.endsWith('_skin') || ['color', 'bg_color', 'authorInfoColor'].includes(key) || /^extra\.about\.careers\.tags\.\d+\.background$/.test(path)) return 'color';
  if (key === 'icon') return 'icon';
  if (key === 'svg_symbol_id') return 'symbol';
  if (key === 'emoji' || /^extra\.about\.author_info_(left|right)_tags\.\d+$/.test(path)) return 'emoji';
  return 'text';
}
export const isPostReference = (path: string) => path === 'post.today_recommend.post_path' || /^post\.recommend_posts\.\d+$/.test(path);
export const isLinkField = (path: string) => /(?:^|\.)(?:href|url|link|button_url|btn_url|wechat_url|follow_url)$/.test(path);

// Only fill absent keys. Explicit false, zero and empty values always win.
export function mergeDefaults(value: Json | undefined, defaults: Json): Json {
  if (value === undefined || value === null) return structuredClone(defaults);
  if (typeof value !== 'object' || Array.isArray(value) || typeof defaults !== 'object' || !defaults || Array.isArray(defaults)) return value;
  return { ...Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, mergeDefaults(value[key], fallback)])), ...Object.fromEntries(Object.entries(value).filter(([key]) => !Object.hasOwn(defaults, key))) };
}
export function newItem(path: string, today: string, example?: Json): Json {
  if (path === 'extra.about.widget_list') return 'hello-about';
  if (path === 'equipment.groups') return { name: '新分组', description: '', items: [] };
  if (/^equipment\.groups\.\d+\.items$/.test(path)) return { name: '', img: '', model: '', description: '', button_title: '详情', button_url: '' };
  if (path === 'friend.groups' || path === 'groups') return { display_name: '新分组', description: '', display_style: 'beautify', [path === 'groups' ? 'links' : 'items']: [] };
  if (/^(friend\.groups\.\d+\.items|groups\.\d+\.links)$/.test(path)) return { display_name: '', description: '', url: '', logo: '' };
  if (path === 'skill.items') return { name: '', bg_color: '#425AEF', svg_symbol_id: '' };
  if (path === 'extra.about_reward.sponsors') return { name: '', amount: 0, date: today, avatar: '' };
  if (/^extra\.sidebar\.widgets\./.test(path)) return { widget: 'recent-posts' };
  if (path.startsWith('menu.') && !path.endsWith('menus')) return { name: '新分组', menus: [] };
  if (path.endsWith('menus')) return { name: '', href: '/', icon: '', target: '_self' };
  if (path === 'post.tags' || path === 'post.categories') return { id: '', name: '', index: 0 };
  if (path === 'extra.about.photos') return { url: '', description: '' };
  if (path === 'extra.about.careers.tags') return { background: '#425AEF', occupation: '' };
  if (path === 'extra.about.hobbies') return { tips: '', title: '', uid: '', class: 'game-lol', url: '' };
  if (path === 'extra.about.map.authorInfo') return { authorInfoTitle: '', authorInfoContent: '', authorInfoColor: '#425AEF' };
  return blankItem(example);
}
function blankItem(value: Json | undefined): Json {
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, blankItem(item)]));
  return typeof value === 'number' ? 0 : typeof value === 'boolean' ? false : '';
}
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function dateParts(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})(?:([Tt ])(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)([Zz]|[+-]\d{2}:\d{2})?)?$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match[1].split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (!year || month < 1 || month > 12 || day < 1 || day > [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]) return null;
  if (match[3]) { const [hour, minute, second = 0] = match[3].split(':').map(Number); if (hour > 23 || minute > 59 || second >= 60) return null; }
  if (match[4] && !/^[Zz]$/.test(match[4])) { const [hour, minute] = match[4].slice(1).split(':').map(Number); if (hour > 23 || minute > 59) return null; }
  return { date: match[1], separator: match[2] || 'T', time: match[3] || '', zone: match[4] || '' };
}
export function updateDate(value: string, part: 'date' | 'time', next: string): string {
  const current = dateParts(value);
  if (part === 'date') return next ? next + (current?.time ? current.separator + current.time + current.zone : '') : '';
  if (!current?.date) return value;
  return next ? current.date + current.separator + next + current.zone : current.date;
}
