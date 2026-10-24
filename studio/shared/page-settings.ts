import type { Field, Json, SettingsSchema } from './types.js';

const field = (path: string, label: string, value: Json = '', kind: Field['kind'] = 'text', hint?: string): Field => ({ path, label, default: value, kind, hint });
const group = (id: string, title: string, file: string, description: string, fields: Field[]): SettingsSchema => ({ id, title, file, description, fields });

// These groups are available from their page template, not in the global sidebar.
export const pageSettingsSchemas: SettingsSchema[] = [
  group('page-about-profile', '头像与个人信息', 'config.toml', '关于页头像、照片与性格卡片。头像也用于站点中的个人信息组件。', [
    field('extra.site.author.avatar', '头像'), field('extra.site.author.about_image', '个人照片'), field('extra.site.author.mbti', 'MBTI', 'enfp'),
    field('extra.about.hobby.loading_bar', '爱好卡片进度条背景'),
  ]),
  group('page-about-skills', '技能清单', 'data.toml', '关于页职业经历组件中的技能图标与名称。', [
    field('skill.svg_sprite', '默认 SVG 图标集', '/img/icons/sprite.svg'), field('skill.items', '技能', [], 'structured'),
  ]),
  group('page-about-reward', '赞赏名单', 'config.toml', '启用后在关于页正文下方显示赞赏组件。', [
    field('extra.about_reward.enable', '启用赞赏名单', false, 'boolean'), field('extra.about_reward.title', '标题'),
    field('extra.about_reward.content', '说明', '', 'textarea'), field('extra.about_reward.reward_number', '突出显示的金额门槛', 10, 'number'),
    field('extra.about_reward.reward', '赞赏按钮', { enable: false, enable_wz: true, name: '赞赏作者', wxPay: '', alipay: '' }, 'structured'),
    field('extra.about_reward.sponsors', '赞赏者', [], 'structured'),
  ]),
  group('page-equipment-header', '装备页横幅', 'config.toml', '装备页面顶部的图片、标题和跳转按钮。', [
    field('extra.equipment.background_img', '横幅图片'), field('extra.equipment.small_title', '小标题'), field('extra.equipment.big_title', '主标题'),
    field('extra.equipment.detail', '介绍', '', 'textarea'), field('extra.equipment.btn_title', '按钮文字'), field('extra.equipment.btn_url', '按钮链接'),
  ]),
  group('page-equipment-items', '设备清单', 'data.toml', '按分组维护设备名称、图片、型号、描述和详情链接。', [
    field('equipment.groups', '设备分组', [], 'structured'),
  ]),
  group('page-friends-layout', '友链页展示', 'config.toml', '动态模式使用 JSON 友链；静态模式使用 TOML 友链。标题由两种模式共享。', [
    field('extra.friend.small_title', '小标题'), field('extra.friend.big_title', '主标题'),
    field('extra.friend.dynamic_render', '使用动态友链', true, 'boolean'), field('extra.friend.prefer_local_logo', '优先使用本地图标', true, 'boolean'),
  ]),
  group('page-friends-static', '静态友链清单', 'data.toml', '关闭动态友链时生效；动态模式请编辑「动态友链清单」。', [
    field('friend.groups', '友链分组', [], 'structured'),
  ]),
  group('page-music', '音乐播放器', 'config.toml', '音乐页与导航音乐组件共用这一组歌单和音乐服务配置。', [
    field('extra.tool.nav_music.enable', '启用播放器', false, 'boolean'), field('extra.tool.nav_music.id', '歌单 ID'),
    field('extra.tool.nav_music.server', '音乐服务', 'tencent'), field('extra.tool.nav_music.all_playlist', '完整歌单链接'),
    field('extra.tool.nav_music.meting_api', 'Meting API 地址'),
  ]),
  group('page-wechat', '公众号名片', 'config.toml', '公众号页的二维码、头像、名称、简介和扫码帮助。留空的名称使用站点作者，头像使用站点 Logo。', [
    field('extra.wechat.qrcode', '公众号二维码', '/img/wechat/qr.jpg'), field('extra.wechat.avatar', '公众号头像'),
    field('extra.wechat.name', '公众号名称'), field('extra.wechat.description', '公众号简介', '跨界 无极限'),
    field('extra.wechat.tips', '二维码提示', '扫描二维码关注公众号'), field('extra.wechat.help_text', '帮助文字', '不会扫码？'),
    field('extra.wechat.help_url', '帮助链接', 'https://kf.qq.com/touch/wxappfaq/1208117b2mai141113jaqAnU.html?platform=14'),
  ]),
  group('page-archives', '归档页侧栏', 'config.toml', '归档正文自动汇总文章。以下侧栏配置与首页共用。', [
    field('extra.sidebar.widgets.indexWidget', '侧栏组件顺序', [], 'structured'),
    field('extra.sidebar.recent_posts_count', '最近文章数量', 4, 'number'), field('extra.sidebar.category_quantity', '分类数量', 0, 'number'),
    field('extra.sidebar.tag_quantity', '标签数量', 6, 'number'), field('extra.sidebar.archives_quantity', '归档数量', 0, 'number'),
  ]),
  group('page-subscribe', '订阅入口', 'config.toml', '用于正文中的 subscribe_list shortcode。修改订阅卡片不会改写正文内自行添加的链接。', [
    field('extra.subscribe.wechat_url', '公众号订阅链接', '/wechat/'), field('extra.subscribe.follow_url', 'Follow 订阅链接', 'https://app.follow.is/share/feeds/89889813571729408'),
    field('extra.subscribe.rss_url', 'RSS 订阅链接', '/rss.xml'), field('extra.feed.full_content_in_feed', 'Atom 输出全文', false, 'boolean'),
  ]),
];

export interface PageProfile { label: string; description: string; groups: { id: string; label: string }[] }
const profiles: Record<string, PageProfile> = {
  'page/about.html': { label: '关于页', description: '正文和关于页组件分别维护；组件位置由「组件顺序」控制。', groups: [
    { id: 'about', label: '介绍与组件' }, { id: 'page-about-profile', label: '个人信息' }, { id: 'page-about-skills', label: '技能清单' }, { id: 'page-about-reward', label: '赞赏名单' },
  ] },
  'page/equipment.html': { label: '装备页', description: '横幅从站点配置读取，设备清单从数据文件读取；此模板不显示 Markdown 正文。', groups: [
    { id: 'page-equipment-header', label: '横幅' }, { id: 'page-equipment-items', label: '设备清单' },
  ] },
  'page/friends.html': { label: '友链页', description: '友链清单与正文中的申请说明分别维护。请选择与渲染模式对应的清单。', groups: [
    { id: 'page-friends-layout', label: '展示方式' }, { id: 'friends', label: '动态友链清单' }, { id: 'page-friends-static', label: '静态友链清单' },
  ] },
  'page/music.html': { label: '音乐页', description: '页面显示歌单播放器，页面标题来自文稿标题；此模板不显示 Markdown 正文。', groups: [{ id: 'page-music', label: '播放器' }] },
  'page/wechat.html': { label: '公众号页', description: '页面显示公众号名片；此模板不显示 Markdown 正文。', groups: [{ id: 'page-wechat', label: '公众号名片' }] },
  'page/archives.html': { label: '归档页', description: '文章列表自动生成，无需填写正文；标签名称在「标签与分类」中统一维护。', groups: [
    { id: 'page-archives', label: '侧栏' }, { id: 'taxonomies', label: '标签与分类' },
  ] },
  'page/empty.html': { label: '普通页面', description: '本页由 Markdown 正文生成，没有独立的模板配置。隐私政策、版权说明等请直接编辑正文。', groups: [] },
};

export const pageTemplateChoices = Object.entries(profiles).map(([value, profile]) => ({ value, label: profile.label }));
export function pageProfile(template: string, body = ''): PageProfile {
  const profile = profiles[template || 'page/empty.html'] || { label: '自定义模板', description: '此模板尚未登记专属配置表单；可编辑页面正文与属性。', groups: [] };
  if (/\{\{\s*subscribe_list\s*\(/.test(body)) return { ...profile, groups: [...profile.groups, { id: 'page-subscribe', label: '订阅入口' }] };
  return profile;
}
