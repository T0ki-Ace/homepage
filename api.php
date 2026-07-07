<?php
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);

try {

@session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$configFile = __DIR__ . '/config.php';
$config = file_exists($configFile) ? require $configFile : null;

function getDB($cfg) {
    $dsn = "mysql:host={$cfg['db_host']};port={$cfg['db_port']};dbname={$cfg['db_name']};charset=utf8mb4";
    return new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
}

function json($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function error($msg, $code = 400) {
    json(['error' => $msg], $code);
}

function getInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

function requireAuth($cfg) {
    if (empty($_SESSION['admin_logged_in'])) {
        error('未登录', 401);
    }
}

function requireSetup($cfg) {
    if (!$cfg || empty($cfg['setup_complete'])) {
        error('系统未初始化，请先完成设置', 400);
    }
}

function handleAdminAction($action, $db) {
    switch ($action) {

        case 'get_settings':
            $rows = $db->query("SELECT setting_key, setting_value FROM settings")->fetchAll();
            $settings = [];
            foreach ($rows as $row) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            unset($settings['admin_password']);
            json($settings);

        case 'save_settings':
            $input = getInput();
            $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");

            $allowed = ['site_title', 'profile_title_prefix', 'profile_title_name', 'profile_name_color1', 'profile_name_color2', 'profile_anim_speed', 'profile_anim_width', 'profile_bio', 'footer_powered',
                        'footer_copyright', 'icp_number', 'icp_url', 'police_number', 'police_url'];
            foreach ($allowed as $key) {
                if (array_key_exists($key, $input)) {
                    $stmt->execute([$key, $input[$key]]);
                }
            }

            if (!empty($input['admin_password'])) {
                $hashed = password_hash($input['admin_password'], PASSWORD_BCRYPT);
                $stmt->execute(['admin_password', $hashed]);
            }

            json(['success' => true]);

            json(['success' => true]);

        case 'get_categories':
            json($db->query("SELECT id, title, title_en, sort_order FROM categories ORDER BY sort_order ASC, id ASC")->fetchAll());

        case 'save_category':
            $input = getInput();
            $id = $input['id'] ?? null;
            if ($id) {
                $stmt = $db->prepare("UPDATE categories SET title=?, title_en=?, sort_order=? WHERE id=?");
                $stmt->execute([$input['title'], $input['title_en'] ?? '', $input['sort_order'] ?? 0, $id]);
            } else {
                $stmt = $db->prepare("INSERT INTO categories (title, title_en, sort_order) VALUES (?, ?, ?)");
                $stmt->execute([$input['title'], $input['title_en'] ?? '', $input['sort_order'] ?? 0]);
            }
            json(['success' => true]);

        case 'delete_category':
            $input = getInput();
            $stmt = $db->prepare("DELETE FROM categories WHERE id=?");
            $stmt->execute([$input['id']]);
            json(['success' => true]);

        case 'get_links':
            $categoryId = $_GET['category_id'] ?? null;
            if ($categoryId) {
                $stmt = $db->prepare("SELECT l.id, l.category_id, l.title, l.logo, l.description, l.url, l.sort_order, c.title AS category_name FROM links l LEFT JOIN categories c ON l.category_id = c.id WHERE l.category_id=? ORDER BY l.sort_order ASC, l.id ASC");
                $stmt->execute([$categoryId]);
                json($stmt->fetchAll());
            } else {
                json($db->query("SELECT l.id, l.category_id, l.title, l.logo, l.description, l.url, l.sort_order, c.title AS category_name FROM links l LEFT JOIN categories c ON l.category_id = c.id ORDER BY l.sort_order ASC, l.id ASC")->fetchAll());
            }

        case 'save_link':
            $input = getInput();
            $id = $input['id'] ?? null;
            if ($id) {
                $stmt = $db->prepare("UPDATE links SET category_id=?, title=?, logo=?, description=?, url=?, sort_order=? WHERE id=?");
                $stmt->execute([$input['category_id'], $input['title'], $input['logo'] ?? '', $input['description'] ?? '', $input['url'] ?? '', $input['sort_order'] ?? 0, $id]);
            } else {
                $stmt = $db->prepare("INSERT INTO links (category_id, title, logo, description, url, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$input['category_id'], $input['title'], $input['logo'] ?? '', $input['description'] ?? '', $input['url'] ?? '', $input['sort_order'] ?? 0]);
            }
            json(['success' => true]);

        case 'delete_link':
            $input = getInput();
            $stmt = $db->prepare("DELETE FROM links WHERE id=?");
            $stmt->execute([$input['id']]);
            json(['success' => true]);

        case 'get_announcements':
            json($db->query("SELECT id, title, content, is_active, sort_order, created_at FROM announcements ORDER BY sort_order ASC, id DESC")->fetchAll());

        case 'save_announcement':
            $input = getInput();
            $id = $input['id'] ?? null;
            $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;
            if ($id) {
                $stmt = $db->prepare("UPDATE announcements SET title=?, content=?, is_active=?, sort_order=? WHERE id=?");
                $stmt->execute([$input['title'], $input['content'] ?? '', $isActive, $input['sort_order'] ?? 0, $id]);
            } else {
                $stmt = $db->prepare("INSERT INTO announcements (title, content, is_active, sort_order) VALUES (?, ?, ?, ?)");
                $stmt->execute([$input['title'], $input['content'] ?? '', $isActive, $input['sort_order'] ?? 0]);
            }
            json(['success' => true]);

        case 'delete_announcement':
            $input = getInput();
            $stmt = $db->prepare("DELETE FROM announcements WHERE id=?");
            $stmt->execute([$input['id']]);
            json(['success' => true]);

        case 'get_social_links':
            json($db->query("SELECT id, title, logo, url, sort_order FROM social_links ORDER BY sort_order ASC, id ASC")->fetchAll());

        case 'save_social_link':
            $input = getInput();
            $id = $input['id'] ?? null;
            if ($id) {
                $stmt = $db->prepare("UPDATE social_links SET title=?, logo=?, url=?, sort_order=? WHERE id=?");
                $stmt->execute([$input['title'], $input['logo'] ?? '', $input['url'] ?? '', $input['sort_order'] ?? 0, $id]);
            } else {
                $stmt = $db->prepare("INSERT INTO social_links (title, logo, url, sort_order) VALUES (?, ?, ?, ?)");
                $stmt->execute([$input['title'], $input['logo'] ?? '', $input['url'] ?? '', $input['sort_order'] ?? 0]);
            }
            json(['success' => true]);

        case 'delete_social_link':
            $input = getInput();
            $stmt = $db->prepare("DELETE FROM social_links WHERE id=?");
            $stmt->execute([$input['id']]);
            json(['success' => true]);

        default:
            error('未知操作: ' . $action, 404);
    }
}

$action = $_GET['action'] ?? '';

switch ($action) {

    case 'check_setup':
        json([
            'setup_complete' => ($config && !empty($config['setup_complete']))
        ]);
        break;

    case 'setup':
        $input = getInput();
        $dbHost = $input['db_host'] ?? 'localhost';
        $dbPort = $input['db_port'] ?? '3306';
        $dbUser = $input['db_user'] ?? '';
        $dbPass = $input['db_pass'] ?? '';
        $dbName = $input['db_name'] ?? '';
        $adminPassword = $input['admin_password'] ?? '';

        if (empty($dbUser) || empty($dbName) || empty($adminPassword)) {
            error('数据库用户名、数据库名和管理员密码不能为空');
        }

        try {
            $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $db = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);
        } catch (PDOException $e) {
            error('数据库连接失败，请确认已在宝塔面板创建数据库且用户名密码正确：' . $e->getMessage());
        }

        // 创建表
        $db->exec("CREATE TABLE IF NOT EXISTS `settings` (`setting_key` VARCHAR(100) NOT NULL PRIMARY KEY, `setting_value` TEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $db->exec("CREATE TABLE IF NOT EXISTS `nav_links` (`id` INT AUTO_INCREMENT PRIMARY KEY, `title` VARCHAR(100) NOT NULL, `url` VARCHAR(500) NOT NULL DEFAULT '', `sort_order` INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $db->exec("CREATE TABLE IF NOT EXISTS `categories` (`id` INT AUTO_INCREMENT PRIMARY KEY, `title` VARCHAR(200) NOT NULL, `title_en` VARCHAR(200) NOT NULL DEFAULT '', `sort_order` INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $db->exec("CREATE TABLE IF NOT EXISTS `links` (`id` INT AUTO_INCREMENT PRIMARY KEY, `category_id` INT NOT NULL, `title` VARCHAR(200) NOT NULL, `logo` VARCHAR(500) NOT NULL DEFAULT '', `description` TEXT, `url` VARCHAR(500) NOT NULL DEFAULT '', `sort_order` INT NOT NULL DEFAULT 0, FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $db->exec("CREATE TABLE IF NOT EXISTS `announcements` (`id` INT AUTO_INCREMENT PRIMARY KEY, `title` VARCHAR(200) NOT NULL, `content` TEXT, `is_active` TINYINT(1) NOT NULL DEFAULT 1, `sort_order` INT NOT NULL DEFAULT 0, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $db->exec("CREATE TABLE IF NOT EXISTS `social_links` (`id` INT AUTO_INCREMENT PRIMARY KEY, `title` VARCHAR(100) NOT NULL, `logo` VARCHAR(500) NOT NULL DEFAULT '', `url` VARCHAR(500) NOT NULL DEFAULT '', `sort_order` INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // 兼容旧表
        try { @$db->exec("ALTER TABLE `links` ADD COLUMN `logo` VARCHAR(500) NOT NULL DEFAULT '' AFTER `title`"); } catch (Exception $e) {}
        try { @$db->exec("CREATE TABLE IF NOT EXISTS `announcements` (`id` INT AUTO_INCREMENT PRIMARY KEY, `title` VARCHAR(200) NOT NULL, `content` TEXT, `is_active` TINYINT(1) NOT NULL DEFAULT 1, `sort_order` INT NOT NULL DEFAULT 0, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Exception $e) {}
        try { @$db->exec("CREATE TABLE IF NOT EXISTS `social_links` (`id` INT AUTO_INCREMENT PRIMARY KEY, `title` VARCHAR(100) NOT NULL, `logo` VARCHAR(500) NOT NULL DEFAULT '', `url` VARCHAR(500) NOT NULL DEFAULT '', `sort_order` INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Exception $e) {}

        // 写入默认设置
        $hashedPassword = password_hash($adminPassword, PASSWORD_BCRYPT);
        $defaultSettings = [
            'site_title' => 'T0KI HOME',
            'profile_title_prefix' => 'Hi, Here is ',
            'profile_title_name' => 'T0KI',
            'profile_name_color1' => '#1A1A1A',
            'profile_name_color2' => '#666666',
            'profile_anim_speed' => '5',
            'profile_anim_width' => '16',
            'profile_bio' => 'A collection of interesting services.',
            'footer_powered' => 'Powered by T0ki',
            'footer_copyright' => 'Copyright 2026 T0ki. All Rights Reserved.',
            'icp_number' => 'xxxxxxxxx',
            'icp_url' => 'https://beian.miit.gov.cn/',
            'police_number' => 'xxxxxxxxx',
            'police_url' => 'http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=xxxxxxxxx',
            'admin_password' => $hashedPassword
        ];

        $stmt = $db->prepare("INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)");
        foreach ($defaultSettings as $key => $value) {
            $stmt->execute([$key, $value]);
        }

        $configContent = "<?php\nreturn " . var_export([
            'db_host' => $dbHost,
            'db_port' => $dbPort,
            'db_name' => $dbName,
            'db_user' => $dbUser,
            'db_pass' => $dbPass,
            'setup_complete' => true
        ], true) . ";\n";

        json(['success' => true, 'message' => '数据库初始化成功', 'config_code' => $configContent]);
        break;

    case 'get_all':
        requireSetup($config);
        $db = getDB($config);
        $settings = [];
        $rows = $db->query("SELECT setting_key, setting_value FROM settings")->fetchAll();
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        unset($settings['admin_password']);

        $navLinks = $db->query("SELECT id, title, url, sort_order FROM nav_links ORDER BY sort_order ASC, id ASC")->fetchAll();
        $categories = $db->query("SELECT id, title, title_en, sort_order FROM categories ORDER BY sort_order ASC, id ASC")->fetchAll();
        $links = $db->query("SELECT id, category_id, title, logo, description, url, sort_order FROM links ORDER BY sort_order ASC, id ASC")->fetchAll();
        $announcements = $db->query("SELECT id, title, content, is_active FROM announcements WHERE is_active = 1 ORDER BY sort_order ASC, id DESC")->fetchAll();
        $socialLinks = $db->query("SELECT id, title, logo, url, sort_order FROM social_links ORDER BY sort_order ASC, id ASC")->fetchAll();

        json([
            'settings' => $settings,
            'nav_links' => $navLinks,
            'categories' => $categories,
            'links' => $links,
            'announcements' => $announcements,
            'social_links' => $socialLinks
        ]);
        break;

    case 'login':
        requireSetup($config);

        // 检查是否被锁定
        $now = time();
        $lockUntil = $_SESSION['login_lockout_until'] ?? 0;
        if ($lockUntil > $now) {
            $remain = $lockUntil - $now;
            json(['error' => '请等待 ' . $remain . ' 秒后再试', 'lockout' => $remain], 429);
        }

        $input = getInput();
        $password = $input['password'] ?? '';
        $db = getDB($config);
        $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'admin_password'");
        $stmt->execute();
        $row = $stmt->fetch();
        if (!$row || !password_verify($password, $row['setting_value'])) {
            $attempts = ($_SESSION['login_attempts'] ?? 0) + 1;
            $_SESSION['login_attempts'] = $attempts;
            if ($attempts >= 3) {
                $_SESSION['login_lockout_until'] = $now + 60;
                $_SESSION['login_attempts'] = 0;
                json(['error' => '密码连续错误 3 次，请 60 秒后再试', 'lockout' => 60], 429);
            }
            error('密码错误，还剩 ' . (3 - $attempts) . ' 次机会', 401);
        }
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['login_attempts'] = 0;
        $_SESSION['login_lockout_until'] = 0;
        json(['success' => true]);
        break;

    case 'logout':
        session_destroy();
        json(['success' => true]);
        break;

    case 'check_auth':
        requireSetup($config);
        json(['logged_in' => !empty($_SESSION['admin_logged_in'])]);
        break;

    default:
        requireSetup($config);
        requireAuth($config);
        $db = getDB($config);
        handleAdminAction($action, $db);
}

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => '服务器内部错误: ' . $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
