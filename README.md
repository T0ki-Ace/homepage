# T0ki-Ace/homepage

一个轻量级的个人主页，支持前后台分离管理，黑白配色，基于 PHP + MySQL 构建。

本项目所有代码均由DeepSeek-V4-Pro生成，所有功能实测可以跑通，但某些功能可能是以奇怪的方式实现的。

## 项目特点

- **前后台分离**：前台展示 / 后台管理完全独立
- **单文件 API**：`api.php` 承载全部后端逻辑，零框架依赖
- **灵活的内容管理**：分类、卡片、公告、社交链接、页脚信息均可后台编辑
- **流光文字特效**：标题后半部分支持双色渐变流光动画，速度、粗细、颜色均可自定义
- **Markdown 公告**：前台右上角悬浮公告，支持 Markdown 渲染
- **社交链接**：前台头部圆形图标按钮，可自定义图标和链接
- **密码防爆破**：后台登录连续 3 次错误锁定 60 秒
- **响应式布局**：卡片自适应 1-4 列，移动端友好
- **备案合规**：页脚可配置 ICP 备案号和公安备案号，自动跳转备案查询网站
- **Noto Sans SC 全局字体**：Google Fonts 加载，覆盖所有设备

## 技术栈

| 组件 | 要求 |
|------|------|
| PHP | >= 7.0（推荐 8.0+） |
| MySQL | >= 5.5.3（需要 utf8mb4 和 InnoDB） |
| Nginx / Apache | 任意版本，需支持 PHP-FPM |
| 前端 | 原生 HTML/CSS/JS，marked.js（CDN） |

## 项目结构

```
homepage-main/
├── index.html          # 前台主页
├── admin.html          # 后台管理
├── api.php             # 单文件后端 API
├── config.php          # 数据库配置（初始化时自动生成）
├── css/
│   ├── style.css       # 前台样式
│   └── admin.css       # 后台样式
├── js/
│   ├── app.js          # 前台逻辑
│   └── admin.js        # 后台交互
├── admin/
│   └── index.php       # /admin 跳转到 /admin.html
└── README.md
```

## 数据库表

| 表名 | 用途 |
|------|------|
| `settings` | 站点设置（标题、页脚、备案号、密码等） |
| `categories` | 卡片分类 |
| `links` | 链接卡片 |
| `announcements` | 公告通知 |
| `social_links` | 社交链接 |
| `nav_links` | 导航链接（历史遗留，前台已不再使用） |

## 部署方式

### 方式一：宝塔面板（推荐）

1. 宝塔面板新建网站，设置 PHP + MySQL
2. 上传所有文件到网站根目录
3. 宝塔 → 数据库 → 新建数据库（记下库名和密码）
4. 设置网站目录所有者为 `www`：`chown -R www:www /www/wwwroot/你的目录`
5. 访问 `http://你的域名/admin.html` 进行初始化
6. 按提示手动创建 `config.php`

### 方式二：手动部署（AI生成，仅供参考）

```bash
# 启动 PHP 内置服务器（仅开发测试）
cd homepage-main
php -S localhost:8080
```

Nginx 配置（非必须，宝塔会自动生成）：

```nginx
server {
    listen 80;
    server_name 你的域名;
    root /www/wwwroot/homepage-main;
    index index.html index.php;

    location /css/ { expires 7d; }
    location /js/  { expires 7d; }

    location ~ \.php$ {
        fastcgi_pass unix:/tmp/php-cgi-82.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

## 初始化流程

1. 宝塔面板/服务器先创建 MySQL 数据库
2. 访问 `admin.html`，填写数据库连接信息和管理员密码
3. 系统自动建表，返回 `config.php` 内容
4. 手动复制保存为网站根目录下的 `config.php`
5. 用管理员密码登录后台，开始管理内容

## API 接口

所有接口通过 `api.php?action=xxx` 调用：

| 接口 | 说明 | 认证 |
|------|------|------|
| `check_setup` | 检查初始化状态 | 公开 |
| `setup` | 执行初始化 | 公开 |
| `get_all` | 获取全部前台数据 | 公开 |
| `login` | 管理员登录 | 公开 |
| `logout` | 退出登录 | 公开 |
| `check_auth` | 检查登录状态 | 公开 |
| `get_settings` | 获取设置 | 需登录 |
| `save_settings` | 保存设置 | 需登录 |
| `get_categories` | 获取分类 | 需登录 |
| `save_category` | 新增/编辑分类 | 需登录 |
| `delete_category` | 删除分类 | 需登录 |
| `get_links` | 获取卡片 | 需登录 |
| `save_link` | 新增/编辑卡片 | 需登录 |
| `delete_link` | 删除卡片 | 需登录 |
| `get_announcements` | 获取公告 | 需登录 |
| `save_announcement` | 新增/编辑公告 | 需登录 |
| `delete_announcement` | 删除公告 | 需登录 |
| `get_social_links` | 获取社交链接 | 需登录 |
| `save_social_link` | 新增/编辑社交链接 | 需登录 |
| `delete_social_link` | 删除社交链接 | 需登录 |
