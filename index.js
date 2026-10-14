const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Bot do Sr. Zayane está rodando online!');
});

app.listen(PORT, () => {
    console.log(`Servidor Web rodando na porta ${PORT}`);
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'connecting') {
            console.log('A ligar aos servidores do WhatsApp...');
        }

        if (connection === 'open') {
            console.log('✅ BOT CONECTADO COM SUCESSO AO WHATSAPP!');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`Conexão fechada (Código: ${statusCode}).`);
            
            // Só reconecta se já estiver registado/emparelhado
            if (sock.authState.creds.registered && statusCode !== DisconnectReason.loggedOut) {
                console.log('A reconectar em 5 segundos...');
                setTimeout(startBot, 5000);
            }
        }
    });

    // Solicita o código apenas se ainda NÃO estiver registado
    if (!sock.authState.creds.registered) {
        const phoneNumber = "258842477929"; 
        
        // Aguarda 6 segundos para estabilizar e pede o código
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n========================================`);
                console.log(`SEU NOVO CÓDIGO DE EMPARELHAMENTO: ${code}`);
                console.log(`========================================\n`);
            } catch (error) {
                console.error("Erro ao solicitar código de emparelhamento:", error);
            }
        }, 6000);
    }

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const sender = m.key.remoteJid;

        if (sender.endsWith('@s.whatsapp.net')) {
            console.log(`📩 Mensagem recebida de: ${sender}`);
            await sock.sendMessage(sender, { 
                text: '🤖 Olá! 🫡 Eu sou o Assistente do Sr. Zayane e eu é que estou online por enquanto.\n\nEle encontra-se offline no momento, mas assim que se conectar verá a sua mensagem. Obrigado! 😁' 
            });
            console.log(`✉️ Resposta enviada para ${sender}`);
        }
    });
}

startBot();
