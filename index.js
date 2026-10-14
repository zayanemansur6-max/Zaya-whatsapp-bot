const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
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
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = "258842477929"; 
        
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n========================================`);
                console.log(`SEU CÓDIGO DE EMPARELHAMENTO: ${code}`);
                console.log(`========================================\n`);
            } catch (error) {
                console.error("Erro ao gerar o código:", error);
            }
        }, 10000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada. A reconectar...');
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ BOT CONECTADO COM SUCESSO AO WHATSAPP!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        // Se a mensagem foi enviada pelo próprio bot/conta, ignora
        if (m.key.fromMe) return;

        const sender = m.key.remoteJid;

        // Verifica se é uma conversa privada
        if (sender.endsWith('@s.whatsapp.net')) {
            console.log(`📩 Nova mensagem privada recebida de: ${sender}`);
            
            await sock.sendMessage(sender, { 
                text: '🤖 Olá! 🫡 Eu sou o Assistente do Sr. Zayane e eu é que estou online por enquanto.\n\nEle encontra-se offline no momento, mas assim que se conectar verá a sua mensagem. Obrigado! 😁' 
            });
            
            console.log(`✉️ Resposta enviada para ${sender}`);
        }
    });
}

startBot();
