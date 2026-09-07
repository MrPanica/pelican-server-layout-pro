# 🎮 Pelican Server Layout Pro

**English** | [Русский](#-русский)

An ergonomic, high-performance two-column dashboard layout plugin for **Pelican Panel**, primarily designed and optimized for **Source Engine** game servers (*Team Fortress 2, Counter-Strike: Source, CS:GO, Garry's Mod, Half-Life 2: Deathmatch, Left 4 Dead 2, Day of Defeat: Source*, etc.).

---

## ✨ Features (English)

- **Ergonomic 2-Column Grid Layout**:
  - **Left**: Full-height server console viewport with optimized real-time stream.
  - **Right**: 3 customizable stacked charts (CPU, Memory, Players Online) perfectly aligned with the console.
  - **Bottom**: Widescreen Network and Disk metric graphs with sleek dual-tone gradient styling.
- **Unified Server Header & Topbar Navigation**:
  - **Instant Server Switcher Dropdown**: Fast switching between servers grouped by physical nodes with live status indicators (online / offline).
  - **1-Click Copy IP & Port Chip**: Click to copy server address with visual feedback.
  - **Live Game Map Badge**: Real-time display of the current active map.
  - **Interactive Players Modal (A2S Query)**: Clickable players badge opening a rich modal showing online players, connection durations, scores/frags, and Steam IDs, sorted by session length.
- **Power Actions in Header**:
  - Integrated Start, Restart, and Stop buttons with live uptime counter `Start (15ч 3м)`.
- **Full Admin Customization**:
  - Administrative settings page in Filament to configure default chart slot positions, sidebar visibility, and uptime display.

---

## 🇷🇺 Описание (Русский)

**Pelican Server Layout Pro** — эргономичный плагин двухколоночного интерфейса управления сервером для панели **Pelican Panel**, специально спроектированный и оптимизированный для серверов на движке **Source Engine** (*Team Fortress 2, Counter-Strike: Source, CS:GO, Garry's Mod, HL2:DM, L4D2* и др.).

### Основные возможности

- **Эргономичная 2-колоночная сетка**:
  - Слева: полноразмерное окно терминала консоли на всю доступную высоту.
  - Справа: 3 настраиваемых графика метрик (CPU, Память, Игроки онлайн), выровненные по высоте терминала.
  - Снизу: широкоформатные графики сети и диска в едином стиле с мягкими двухцветными градиентами.
- **Единая панель навигации в шапке**:
  - **Выпадающий список серверов**: быстрая навигация между серверами, сгруппированными по нодам, с динамическими индикаторами статуса (онлайн / офлайн).
  - **Копирование IP:Port в 1 клик**: кликабельный чип с визуальным подтверждением копирования в буфер.
  - **Текущая карта**: отображение актуальной карты сервера.
  - **Модальное окно игроков (A2S-запрос)**: детальный список игроков с временем подключения, фрагами и очками, отсортированный по времени в игре.
- **Кнопки управления питанием в шапке**:
  - Кнопки «Start», «Restart», «Stop» прямо в верхнем баре с живым таймером аптайма `Start (15ч 3м)`.
- **Панель настроек администратора**:
  - Страница настроек в админ-панели Filament для выбора графиков боковой панели и параметров отображения.

---

## 🚀 Installation / Установка

```bash
# Clone into Pelican plugins directory
cd /var/www/pelican/plugins
git clone https://github.com/MrPanica/pelican-server-layout-pro.git

# Publish assets and clear cache
cd /var/www/pelican
php artisan filament:assets
php artisan view:clear
php artisan cache:clear
```

## 📄 License

MIT License. Developed for gaming communities running Source engine servers on Pelican Panel.
