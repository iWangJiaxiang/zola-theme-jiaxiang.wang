import type { Field, Json, SettingsSchema } from './types.js';
const field = (path: string, label: string, value: Json = '', kind: Field['kind'] = 'text', hint?: string): Field => ({ path, label, default: value, kind, hint });

export const settingsSchemas: SettingsSchema[] = [
  { id: 'site', title: '站点信息', description: '让读者认识你的站点。修改会写入 config.toml 对应字段。', file: 'config.toml', fields: [
    field('title', '站点名称'), field('description', '站点简介', '', 'textarea'), field('author', '作者'),
    field('base_url', '站点地址', '/', 'text', '正式站点完整地址，例如 https://blog.example.com'),
    field('default_language', '默认语言', 'zh'), field('extra.site.seo', 'SEO 描述', '', 'textarea'),
    field('extra.site.logo', 'Logo 地址'), field('extra.site.favicon', 'Favicon 地址'), field('extra.site.default_cover', '默认封面'),
    field('extra.site.email', '联系邮箱'), field('extra.site.start_year', '建站年份'), field('extra.site.compliance_icp', 'ICP备案号'),
    field('extra.site.compliance_security', '公安备案号'), field('extra.site.compliance_security_link', '公安备案链接'),
    field('extra.site.author.avatar', '作者头像'), field('extra.site.author.about_image', '关于页横幅'),
  ] },
  { id: 'navigation', title: '导航菜单', description: '管理顶部、折叠菜单和页脚链接；可以添加、删除和调整顺序。', file: 'data.toml', fields: [
    field('menu.nav_menu', '顶部导航', [], 'structured'), field('menu.nav_left_menu', '左侧折叠菜单', [], 'structured'),
    field('menu.footer_menu', '页脚菜单', [], 'structured'),
  ] },
  { id: 'taxonomies', title: '标签与分类', description: '管理站点中的标签与分类名称。删除字典条目不会自动改写文章里的已有标签。', file: 'data.toml', fields: [
    field('post.tags', '标签', [], 'structured'), field('post.categories', '分类', [], 'structured'),
  ] },
  { id: 'recommendations', title: '首页推荐', description: '管理主站首页推荐内容与今日推荐卡片。', file: 'data.toml', fields: [
    field('post.recommend_posts', '推荐文章', [], 'structured'), field('post.today_recommend.post_path', '今日推荐文章'),
    field('post.today_recommend.url', '今日推荐链接'), field('post.today_recommend.title', '今日推荐标题'),
    field('post.today_recommend.small_title', '今日推荐副标题'), field('post.today_recommend.cover', '今日推荐封面'),
  ] },
  { id: 'about', title: '关于页设置', description: '维护个人介绍和关于页组件。页面正文可在「页面」中编辑。', file: 'config.toml', fields: [
    field('extra.about.hello', '问候语'), field('extra.about.content', '个人介绍 HTML', '', 'textarea'),
    field('extra.about.idea', '创作方向 HTML', '', 'textarea'), field('extra.about.widget_list', '组件顺序', [], 'structured'),
    field('extra.about.author_info_left_tags', '左侧个人标签', [], 'structured'), field('extra.about.author_info_right_tags', '右侧个人标签', [], 'structured'),
    field('extra.about.photos', '照片', [], 'structured'), field('extra.about.careers', '职业经历', {}, 'structured'),
    field('extra.about.textarea_left', '左侧文字卡片', {}, 'structured'), field('extra.about.textarea_right', '右侧文字卡片', {}, 'structured'),
    field('extra.about.hobbies', '兴趣爱好', [], 'structured'), field('extra.about.like', '关注偏好', {}, 'structured'),
    field('extra.about.music', '音乐偏好', {}, 'structured'), field('extra.about.map', '个人信息', {}, 'structured'),
  ] },
  { id: 'appearance', title: '外观样式', description: '沿用主站的主题色、字体和明暗模式。管理中心将在保存后同步应用。', file: 'config.toml', fields: [
    field('extra.style.theme_light_skin', '浅色主题色', '#425AEF'), field('extra.style.theme_dark_skin', '深色主题色', '#f2b94b'),
    field('extra.style.color_scheme', '默认颜色模式', 'system', 'text', '跟随设备设置，或固定为浅色 / 深色'),
    field('extra.style.font_family', '字体', 'PingFang SC'), field('extra.style.universe', '深色模式粒子效果', true, 'boolean'),
  ] },
  { id: 'friends', title: '友链管理', description: '维护友链分组、站点介绍、地址和图标。', file: 'static/data/friends.json', fields: [
    field('groups', '友链分组', [], 'structured'),
  ] },
];

export const documentFields: Field[] = [
  field('title', '标题'), field('description', '摘要', '', 'textarea'), field('path', '公开 URL 路径'),
  field('date', '发布时间'), field('updated', '更新时间'), field('draft', '草稿', true, 'boolean'),
  field('taxonomies.tags', '标签', [], 'structured'), field('taxonomies.categories', '分类', [], 'structured'),
  field('extra.tags', '合集展示标签', [], 'structured'),
  field('extra.cover', '文章封面'), field('extra.global_cover', '公共封面'),
  field('weight', '排序权重', 0, 'number'), field('template', '页面模板'),
  field('extra.wechat_url', '微信公众号链接'),
  field('extra.disable_comment', '关闭本页评论', false, 'boolean'),
  field('page_template', '合集章节模板'), field('render', '生成合集页面', true, 'boolean'),
  field('insert_anchor_links', '标题锚点位置', 'heading'),
];

export const fieldLabels: Record<string, string> = {
  name: '名称', id: '标识', index: '顺序', title: '标题', description: '描述', href: '链接', url: '地址',
  icon: '图标', target: '打开方式', menus: '子菜单', is_vertical: '纵向排列', display_name: '名称',
  display_style: '展示样式', links: '链接列表', logo: '图标地址', local_logo: '本地图标', enable: '启用',
  content: '内容', image: '图片', cover: '封面', subtitle: '副标题', tips: '提示', color: '颜色',
  authorInfo: '个人信息', authorInfoTitle: '项目', authorInfoContent: '内容', authorInfoColor: '颜色',
  items: '清单', img: '图片', model: '型号', button_title: '按钮文字', button_url: '按钮链接',
  svg_symbol_id: 'SVG 图标标识', svg_sprite: 'SVG 图标集', bg_color: '背景色', widget: '组件',
  amount: '金额', date: '日期', avatar: '头像', occupation: '职业', background: '背景', bg: '背景图片',
  tittle: '标题', textarea_up: '上方文字', textarea_down: '下方文字', bottom: '底部文字',
  wxPay: '微信收款码', alipay: '支付宝收款码', enable_wz: '显示赞赏文字', StrengthenTitle: '居住地', backgroundDark: '深色地图背景', link: '链接', class: '卡片样式', uid: '账号标识', tags: '职业标签',
};
