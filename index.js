const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

// Servidor Web para manter o Render ativo
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
        logger: pino({ level: 'silent' })
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
        }, 4000);
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
            console.log('Bot conectado com sucesso ao WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Lógica para responder a QUALQUER mensagem apenas se o utilizador estiver ausente/offline
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        
        // Ignora mensagens enviadas por você ou mensagens de status/grupos (se preferir ajustar depois)
        if (!m.message || m.key.fromMe) return;

        const sender = m.key.remoteJid;

        // Responde a qualquer mensagem recebida no privado
        if (sender.endsWith('@s.whatsapp.net')) {
            await sock.sendMessage(sender, { 
                text: '🤖Olá! 🫡 Eu sou o Assistente do Sr. Zayane. e eu é que estou online por enquanto \nEle encontra-se offline no momento, mas assim que se conectar verá a sua mensagem Obrigado😁!' 
            });
        }
    });
}

startBot();
