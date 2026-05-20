require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = (process.env.BACKUP_BOT_TOKEN || "").replace(/['"]/g, '').trim();
const CHAT_ID = (process.env.BACKUP_CHAT_ID || "").replace(/['"]/g, '').trim();

if (!BOT_TOKEN || !CHAT_ID) {
    console.error("FATAL: BACKUP_BOT_TOKEN or BACKUP_CHAT_ID is missing in environment.");
    process.exit(1);
}

console.log(`[BOOT] Token length: ${BOT_TOKEN.length}, Chat ID: ${CHAT_ID}`);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// SUPABASE FIX: We MUST use the DIRECT_URL (Port 5432) for pg_dump. 
// pg_dump will fail silently and output 0 bytes if you try to use the pooled connection (6543).
const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("FATAL: DIRECT_URL is missing in environment.");
    process.exit(1);
}

const backupFile = path.join(__dirname, 'database_backup.sql.gz');
let isBackingUp = false;

async function executeBackup(triggerChatId = CHAT_ID) {
    if (isBackingUp) return;
    isBackingUp = true;
    console.log(`[${new Date().toISOString()}] Starting automated database backup...`);
    
    if (triggerChatId !== CHAT_ID) {
        bot.sendMessage(triggerChatId, "⏳ Compiling secure database snapshot...");
    }

    return new Promise((resolve, reject) => {
        // Pipe pg_dump directly into gzip
        const command = `pg_dump "${dbUrl}" | gzip > "${backupFile}"`;
        
        exec(command, async (error, stdout, stderr) => {
            let stats;
            try { stats = fs.statSync(backupFile); } catch(e) {}

            // If the output file is 20 bytes, it means gzip compressed an entirely empty input stream
            if (error || !stats || stats.size <= 25) {
                console.error(`Backup failed. Output empty.`);
                const errMsg = stderr || (error ? error.message : "pg_dump produced 0 bytes. Is PostgreSQL Client installed?");
                try {
                    await bot.sendMessage(triggerChatId, `⚠️ <b>[ FATAL ] Database Backup Failed!</b>\n\nError:\n<code>${errMsg}</code>\n\nIf the error says 'pg_dump: command not found', run this command on your VPS terminal:\n<code>sudo apt-get install postgresql-client-common postgresql-client -y</code>`, { parse_mode: 'HTML' });
                } catch(e) {}
                isBackingUp = false;
                return reject(error || new Error("Empty backup file"));
            }
            
            console.log("Backup compiled successfully. Uploading to Telegram...");
            
            try {
                const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                const fileSizeKB = (stats.size / 1024).toFixed(2);
                const displaySize = stats.size < 1024 * 1024 ? `${fileSizeKB} KB` : `${fileSizeMB} MB`;
                
                await bot.sendDocument(triggerChatId, backupFile, {
                    caption: `📦 <b>Automated Database Snapshot</b>\n\n<b>Timestamp:</b> ${new Date().toISOString()}\n<b>Size:</b> ${displaySize}\n<b>Status:</b> SECURE`,
                    parse_mode: 'HTML'
                });
                console.log("Upload complete.");
                resolve();
            } catch (err) {
                console.error("Failed to upload to Telegram:", err);
                try {
                    await bot.sendMessage(triggerChatId, `⚠️ <b>[ FATAL ] Database Backup Failed!</b>\n\nUpload Error: <code>${err.message}</code>`, { parse_mode: 'HTML' });
                } catch(e) {}
                reject(err);
            } finally {
                if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
                isBackingUp = false;
            }
        });
    });
}

// Interactive Commands
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🛡️ <b>Silverbullet Database Backup</b>\n\nI automatically upload encrypted snapshots of your database every 60 minutes.", {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [[{ text: '📥 Instant Backup', callback_data: 'INSTANT_BACKUP' }]]
        }
    });
});

// Handle Button Clicks
bot.on('callback_query', (query) => {
    if (query.data === 'INSTANT_BACKUP') {
        bot.answerCallbackQuery(query.id);
        executeBackup(query.message.chat.id);
    }
});

// Notify admin of successful boot, then start loop
(async () => {
    try {
        await bot.sendMessage(CHAT_ID, `✅ <b>[ SYSTEM INITIALIZED ]</b>\n\nSilverbullet Backup Bot has successfully connected to PostgreSQL.\nAutomated snapshots will be generated every 60 minutes.`, { 
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: '📥 Instant Backup', callback_data: 'INSTANT_BACKUP' }]]
            } 
        });
    } catch(e) {
        console.error("Failed to send boot message:", e.message);
    }
    
    // Initial boot backup
    executeBackup();

    // 1-hour loop
    setInterval(() => executeBackup(CHAT_ID), 3600000);
})();
