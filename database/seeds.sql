-- Seed data for A/B Test Monitoring Service
-- Password for admin user is: admin123 (hashed with bcrypt)

-- Insert admin user
INSERT INTO admin_users (username, email, password_hash) VALUES
('admin', 'admin@ablogger.com', '$2b$10$rX9ZJvhBjZKzV7YGK3xWh.DqBqP0QQnBqUvKzFHxYL7YvHJGKJg5O');

-- Insert browser configurations
INSERT INTO browser_configurations (browser_name, browser_version, device_type, operating_system, viewport_width, viewport_height, user_agent, is_active) VALUES
('Chrome', '120', 'desktop', 'Windows', 1920, 1080, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', TRUE),
('Chrome', '120', 'mobile', 'Android', 375, 667, 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', TRUE),
('Safari', '17', 'desktop', 'macOS', 1920, 1080, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', TRUE),
('Safari', '17', 'mobile', 'iOS', 375, 667, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', TRUE),
('Firefox', '121', 'desktop', 'Windows', 1920, 1080, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0', TRUE);

-- Insert sample clients
INSERT INTO clients (client_name, company_name, email, contact_person, is_active, notes) VALUES
('Acme Corporation', 'Acme Corp', 'contact@acme.com', 'John Doe', TRUE, 'E-commerce client running checkout flow tests'),
('TechStart Inc', 'TechStart', 'hello@techstart.io', 'Jane Smith', TRUE, 'SaaS platform testing signup variants'),
('RetailHub', 'RetailHub LLC', 'support@retailhub.com', 'Mike Johnson', TRUE, 'Online retail with product page tests'),
('FinanceApp', 'FinanceApp Co', 'dev@financeapp.com', 'Sarah Williams', FALSE, 'Paused monitoring temporarily'),
('MediaStream', 'MediaStream Ltd', 'tech@mediastream.tv', 'David Chen', TRUE, 'Video platform testing player variants');

-- Insert monitored URLs
INSERT INTO monitored_urls (client_id, url, url_label, is_active, has_active_test, notes) VALUES
-- Acme Corporation URLs
(1, 'https://acme.example.com', 'Homepage', TRUE, TRUE, 'Testing hero section variants'),
(1, 'https://acme.example.com/checkout', 'Checkout Page', TRUE, TRUE, 'One-step vs two-step checkout test'),
(1, 'https://acme.example.com/products', 'Product Listing', TRUE, FALSE, 'No active tests currently'),

-- TechStart Inc URLs
(2, 'https://techstart.example.io', 'Landing Page', TRUE, TRUE, 'CTA button color test'),
(2, 'https://techstart.example.io/signup', 'Signup Flow', TRUE, TRUE, 'Form layout variants'),
(2, 'https://techstart.example.io/pricing', 'Pricing Page', TRUE, TRUE, 'Pricing table design test'),

-- RetailHub URLs
(3, 'https://retailhub.example.com', 'Main Store', TRUE, TRUE, 'Navigation menu test'),
(3, 'https://retailhub.example.com/product/12345', 'Product Detail', TRUE, TRUE, 'Add to cart button variants'),
(3, 'https://retailhub.example.com/cart', 'Shopping Cart', FALSE, TRUE, 'URL temporarily disabled'),

-- FinanceApp URLs
(4, 'https://financeapp.example.com', 'Dashboard', FALSE, FALSE, 'Client paused'),

-- MediaStream URLs
(5, 'https://mediastream.example.tv', 'Home', TRUE, TRUE, 'Video player layout test'),
(5, 'https://mediastream.example.tv/watch', 'Watch Page', TRUE, TRUE, 'Autoplay behavior test'),
(5, 'https://mediastream.example.tv/subscribe', 'Subscribe Page', TRUE, FALSE, 'Test completed');

-- Insert sample monitoring runs
INSERT INTO monitoring_runs (started_at, completed_at, total_urls_checked, total_errors_found, status, triggered_by) VALUES
(DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 15 MINUTE, 10, 3, 'completed', 'cron'),
(DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 12 MINUTE, 10, 1, 'completed', 'cron'),
(DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 14 MINUTE, 10, 5, 'completed', 'manual');

-- Insert sample URL checks
INSERT INTO url_checks (run_id, url_id, config_id, checked_at, page_load_time_ms, cookie_found, error_detected, check_status) VALUES
-- Run 1 checks
(1, 1, 1, DATE_SUB(NOW(), INTERVAL 1 DAY), 1234, FALSE, FALSE, 'success'),
(1, 2, 1, DATE_SUB(NOW(), INTERVAL 1 DAY), 2156, TRUE, TRUE, 'success'),
(1, 4, 2, DATE_SUB(NOW(), INTERVAL 1 DAY), 1876, TRUE, TRUE, 'success'),
(1, 5, 1, DATE_SUB(NOW(), INTERVAL 1 DAY), 1543, FALSE, FALSE, 'success'),
(1, 7, 3, DATE_SUB(NOW(), INTERVAL 1 DAY), 2234, TRUE, TRUE, 'success'),

-- Run 2 checks
(2, 1, 1, DATE_SUB(NOW(), INTERVAL 2 DAY), 1345, FALSE, FALSE, 'success'),
(2, 2, 2, DATE_SUB(NOW(), INTERVAL 2 DAY), 2987, TRUE, TRUE, 'success'),

-- Run 3 checks
(3, 4, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), 1654, TRUE, TRUE, 'success'),
(3, 5, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), 1987, TRUE, TRUE, 'success'),
(3, 7, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), 2123, TRUE, TRUE, 'success');

-- Insert sample detected failures
INSERT INTO detected_failures (check_id, url_id, client_id, test_id, variant, error_type, error_message, browser_from_cookie, timestamp_from_cookie, detected_at, resolution_status, resolved_by, resolution_notes) VALUES
-- Recent failures
(2, 2, 1, 'checkout_flow_test', 'variant_b', 'js_error', 'Cannot read property ''click'' of null', 'Chrome 120', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'new', NULL, NULL),
(3, 4, 2, 'cta_button_test', 'variant_a', 'validation_error', 'Email validation failed on submit', 'Chrome Mobile', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'acknowledged', 1, 'Team notified, investigating'),
(5, 7, 3, 'nav_menu_test', 'variant_c', 'layout_error', 'Menu items overlapping on mobile viewport', 'Safari', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'investigating', 1, 'CSS fix in progress'),

-- Older failures
(7, 2, 1, 'checkout_flow_test', 'variant_b', 'network_error', 'Payment gateway timeout', 'Chrome 120', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 'resolved', 1, 'Gateway issue resolved by payment provider'),
(8, 4, 2, 'cta_button_test', 'variant_b', 'js_error', 'Undefined function trackClick', 'Chrome Mobile', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 'resolved', 1, 'Analytics script loaded, issue fixed'),
(9, 5, 2, 'signup_form_test', 'variant_a', 'validation_error', 'Password strength requirements not displayed', 'Chrome Desktop', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 'investigating', NULL, NULL),
(10, 7, 3, 'nav_menu_test', 'variant_a', 'js_error', 'TypeError: Cannot read properties of undefined', 'Chrome Desktop', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 'ignored', 1, 'Caused by browser extension, not our code'),

-- Additional failures for analytics
(2, 2, 1, 'checkout_flow_test', 'variant_a', 'js_error', 'ReferenceError: jQuery is not defined', 'Firefox', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), 'resolved', 1, 'Added jQuery to dependencies'),
(3, 4, 2, 'cta_button_test', 'variant_a', 'render_error', 'Button not visible on page load', 'Safari Mobile', DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), 'resolved', 1, 'CSS z-index issue fixed'),
(5, 7, 3, 'nav_menu_test', 'variant_b', 'js_error', 'Cannot access property before initialization', 'Chrome Mobile', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), 'resolved', 1, 'Hoisting issue corrected');

-- Insert sample failure screenshots
INSERT INTO failure_screenshots (failure_id, file_path, captured_at) VALUES
(1, 'screenshots/failure_1_20260116_143022.png', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 'screenshots/failure_2_20260116_143156.png', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 'screenshots/failure_3_20260116_144512.png', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 'screenshots/failure_4_20260115_143022.png', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(5, 'screenshots/failure_5_20260114_092334.png', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(6, 'screenshots/failure_6_20260114_092445.png', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(7, 'screenshots/failure_7_20260114_093201.png', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(8, 'screenshots/failure_8_20260112_081523.png', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(9, 'screenshots/failure_9_20260111_101234.png', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(10, 'screenshots/failure_10_20260110_154532.png', DATE_SUB(NOW(), INTERVAL 7 DAY));
