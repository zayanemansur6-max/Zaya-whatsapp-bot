const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    });

    // Se não estiver registrado, gera o código de emparelhamento por texto
    if (!sock.authState.creds.registered) {
        // ATENÇÃO: Substitua abaixo pelo seu número completo com o código do país, sem espaços ou símbolos (Ex: 258841234567)
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

    // Resposta automática básica de teste para comandos
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const text = m.message.conversation || m.message.extendedTextMessage?.text;
        const sender = m.key.remoteJid;

        if (text === '!ping') {
            await sock.sendMessage(sender, { text: 'Olá! O bot da Zaya está online e a funcionar! 🤖' });
        }
    });
}

startBot();
