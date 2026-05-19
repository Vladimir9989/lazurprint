/**
 * Скрипт миграции для переименования файлов и папок с кириллицей на латиницу
 * Запуск: node scripts/rename-images.js
 */

const fs = require('fs');
const path = require('path');

// Путь к папке с изображениями
const IMAGES_DIR = path.join(__dirname, '..', 'images', 'img', 'rs');

// Транслитерация кириллицы в латиницу
function transliterate(str) {
    const ruToEn = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
        'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
        'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
        'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
        'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
        'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
        'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
        'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
        'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
        'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
        'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch',
        'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
        'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };

    return str.split('').map(char => ruToEn[char] || char).join('');
}

// Проверка, содержит ли строка кириллицу
function containsCyrillic(str) {
    return /[а-яА-ЯёЁ]/.test(str);
}

// Безопасное переименование файла/папки
function safeRename(oldPath, newPath) {
    if (oldPath === newPath) {
        return false;
    }
    
    if (fs.existsSync(newPath)) {
        console.warn(`⚠️  Цель уже существует: ${newPath}`);
        return false;
    }
    
    try {
        fs.renameSync(oldPath, newPath);
        console.log(`✓ Переименовано: ${path.basename(oldPath)} → ${path.basename(newPath)}`);
        return true;
    } catch (error) {
        console.error(`✗ Ошибка переименования ${oldPath}: ${error.message}`);
        return false;
    }
}

// Рекурсивное переименование файлов и папок
function renameDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        console.error(`Папка не существует: ${dirPath}`);
        return;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    // Сначала обрабатываем файлы (с конца, чтобы не сбить индексы)
    for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        const oldPath = path.join(dirPath, entry.name);
        
        if (entry.isFile() && containsCyrillic(entry.name)) {
            const nameParts = entry.name.split('.');
            const ext = nameParts.pop();
            const name = nameParts.join('.');
            
            const translitName = transliterate(name);
            const newName = ext ? `${translitName}.${ext}` : translitName;
            const newPath = path.join(dirPath, newName);
            
            safeRename(oldPath, newPath);
        }
    }
    
    // Затем обрабатываем папки (сначала рекурсивно, потом переименовываем)
    const subdirs = entries.filter(e => e.isDirectory());
    
    for (const entry of subdirs) {
        const subdirPath = path.join(dirPath, entry.name);
        
        // Рекурсивно обрабатываем вложенные папки
        renameDirectory(subdirPath);
        
        // Переименовываем папку, если нужно
        if (containsCyrillic(entry.name)) {
            const translitName = transliterate(entry.name);
            const newPath = path.join(dirPath, translitName);
            
            safeRename(subdirPath, newPath);
        }
    }
}

// Обновление путей в HTML файле
function updateHtmlFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`Файл не существует: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Находим все пути к изображениям с кириллицей
    const cyrillicPattern = /src="([^"]*[а-яА-ЯёЁ][^"]*)"/g;
    let match;
    
    while ((match = cyrillicPattern.exec(content)) !== null) {
        const oldPath = match[1];
        const newPath = transliterate(oldPath);
        
        if (oldPath !== newPath) {
            content = content.replace(oldPath, newPath);
            console.log(`  Обновлён путь: ${oldPath} → ${newPath}`);
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Обновлён HTML файл: ${filePath}`);
    }
}

// Главная функция
function main() {
    console.log('=== Скрипт миграции изображений ===\n');
    console.log(`Папка изображений: ${IMAGES_DIR}\n`);
    
    if (!fs.existsSync(IMAGES_DIR)) {
        console.error(`Ошибка: Папка не существует: ${IMAGES_DIR}`);
        process.exit(1);
    }
    
    console.log('Шаг 1: Переименование папок и файлов...\n');
    renameDirectory(IMAGES_DIR);
    
    console.log('\nШаг 2: Обновление путей в HTML файлах...\n');
    
    // Обновляем каталог сувениров
    const catalogFile = path.join(__dirname, '..', 'catalog-suvenir.html');
    updateHtmlFile(catalogFile);
    
    console.log('\n=== Миграция завершена ===');
    console.log('Пожалуйста, проверьте результат и протестируйте сайт.');
}

main();
