const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    AttachmentBuilder,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const commands = [
    new SlashCommandBuilder()
        .setName('ticketpanel')
        .setDescription('Sendet das Ticket-Panel in den aktuellen Kanal')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('close')
        .setDescription('Schließt das aktuelle Ticket'),
    new SlashCommandBuilder()
        .setName('add')
        .setDescription('Fügt einen Benutzer zum Ticket hinzu')
        .addUserOption(option => option.setName('user').setDescription('Der hinzuzufügende Benutzer').setRequired(true)),
    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Entfernt einen Benutzer aus dem Ticket')
        .addUserOption(option => option.setName('user').setDescription('Der zu entfernende Benutzer').setRequired(true)),
    new SlashCommandBuilder()
        .setName('report')
        .setDescription('Meldet einen Spieler wegen Fehlverhaltens')
        .addUserOption(option => option.setName('user').setDescription('Der zu meldende Spieler').setRequired(true))
        .addStringOption(option => option.setName('grund').setDescription('Der Grund für die Meldung').setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

client.once('ready', async () => {
    console.log(`[ONLINE] Eingeloggt als ${client.user.tag}`);
    try {
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands }
        );
        console.log('[SUCCESS] Slash Commands erfolgreich registriert.');
    } catch (error) {
        console.error('[ERROR] Fehler beim Registrieren der Commands:', error);
    }
});

client.on('interactionCreate', async (interaction) => {

    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === 'ticketpanel') {
            const embed = new EmbedBuilder()
                .setTitle('Hier kannst du Tickets für deine Anliegen öffnen')
                .setDescription(
                    '**INFO** - Die Discord Voice-Chat-Support-Zeiten sind von **17:00 bis 21:00 Uhr**.\n\n' +
                    'Du kannst im Discord jederzeit per Befehl Fehlverhalten melden:\n' +
                    '```/report <user> <grund>```\n\n' +
                    '**Bevor du einen Bug meldest, beachte Folgendes:**\n' +
                    'Wenn du feststellst, dass du gestorben bist oder Gegenstände verschwunden sind, jedoch keine Beweise vorliegen oder das Problem nicht reproduzierbar ist, wird der Bugbericht geschlossen.\n\n' +
                    'Du willst Teil des Teams werden?\n[Jetzt als Supporter bewerben!](https://discord.gg)'
                )
                .setColor('#f1c40f');

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_topic_select')
                .setPlaceholder('Select a topic...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Antrag Entbannung').setValue('topic_entbannung').setEmoji('📄'),
                    new StringSelectMenuOptionBuilder().setLabel('Support Ticket').setValue('topic_support').setEmoji('🎫'),
                    new StringSelectMenuOptionBuilder().setLabel('Bug Ticket').setValue('topic_bug').setEmoji('🐛')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({ content: 'Ticket-Panel wird gesendet...', ephemeral: true });
            await interaction.channel.send({ embeds: [embed], components: [row] });
        }

        if (interaction.commandName === 'close') {
            await handleTicketClose(interaction);
        }

        if (interaction.commandName === 'add') {
            if (!interaction.channel.name.startsWith('ticket-')) {
                return interaction.reply({ content: 'Dieser Befehl kann nur in einem Ticket genutzt werden.', ephemeral: true });
            }
            const member = interaction.options.getMember('user');
            await interaction.channel.permissionOverwrites.edit(member.id, {
                ViewChannel: true,
                SendMessages: true,
                AttachFiles: true
            });
            await interaction.reply({ content: `${member} wurde zum Ticket hinzugefügt.` });
        }

        if (interaction.commandName === 'remove') {
            if (!interaction.channel.name.startsWith('ticket-')) {
                return interaction.reply({ content: 'Dieser Befehl kann nur in einem Ticket genutzt werden.', ephemeral: true });
            }
            const member = interaction.options.getMember('user');
            await interaction.channel.permissionOverwrites.delete(member.id);
            await interaction.reply({ content: `${member} wurde aus dem Ticket entfernt.` });
        }

        if (interaction.commandName === 'report') {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('grund');

            const reportEmbed = new EmbedBuilder()
                .setTitle('🚨 Neue Spielermeldung')
                .addFields(
                    { name: 'Gemeldeter Spieler', value: `${targetUser} (${targetUser.id})`, inline: true },
                    { name: 'Gemeldet von', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                    { name: 'Grund', value: reason, inline: false }
                )
                .setColor('#e74c3c')
                .setTimestamp();

            const reportChannel = client.channels.cache.get(config.reportChannelId);
            if (reportChannel) {
                await reportChannel.send({ embeds: [reportEmbed] });
                await interaction.reply({ content: 'Vielen Dank für deine Meldung! Das Team schaut sich das an.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Fehler: Der Report-Log-Kanal wurde nicht gefunden.', ephemeral: true });
            }
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_topic_select') {
        const selected = interaction.values[0];

        if (selected === 'topic_entbannung') {
            const modal = new ModalBuilder().setCustomId('modal_entbannung').setTitle('Antrag Entbannung');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mc_name').setLabel('Wie ist dein Minecraft Name?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ban_reason').setLabel('Bann-Grund').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('unban_text').setLabel('Entbannungsantrag-Text').setStyle(TextInputStyle.Paragraph).setMaxLength(1024).setRequired(true))
            );
            await interaction.showModal(modal);
        } else if (selected === 'topic_support') {
            const modal = new ModalBuilder().setCustomId('modal_support').setTitle('Support Ticket');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('support_subject').setLabel('Betreff / Anliegen').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('support_desc').setLabel('Genaue Beschreibung').setStyle(TextInputStyle.Paragraph).setMaxLength(1024).setRequired(true))
            );
            await interaction.showModal(modal);
        } else if (selected === 'topic_bug') {
            const modal = new ModalBuilder().setCustomId('modal_bug').setTitle('Bug Ticket');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bug_title').setLabel('Was ist der Fehler?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bug_steps').setLabel('Beschreibung').setStyle(TextInputStyle.Paragraph).setMaxLength(1024).setRequired(true))
            );
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        let fields = [];
        let ticketType = "";

        if (interaction.customId === 'modal_entbannung') {
            ticketType = 'ENTBANNUNG';
            fields = [
                { name: 'Minecraft Name:', value: interaction.fields.getTextInputValue('mc_name'), inline: true },
                { name: 'Bann-Grund:', value: interaction.fields.getTextInputValue('ban_reason'), inline: true },
                { name: 'Antragstext:', value: interaction.fields.getTextInputValue('unban_text'), inline: false }
            ];
        } else if (interaction.customId === 'modal_support') {
            ticketType = 'SUPPORT';
            fields = [
                { name: 'Betreff:', value: interaction.fields.getTextInputValue('support_subject'), inline: false },
                { name: 'Beschreibung:', value: interaction.fields.getTextInputValue('support_desc'), inline: false }
            ];
        } else if (interaction.customId === 'modal_bug') {
            ticketType = 'BUG';
            fields = [
                { name: 'Fehler:', value: interaction.fields.getTextInputValue('bug_title'), inline: false },
                { name: 'Beschreibung:', value: interaction.fields.getTextInputValue('bug_steps'), inline: false }
            ];
        }

        await createTicketChannel(interaction, ticketType, fields);
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await handleTicketClose(interaction);
    }
});

async function createTicketChannel(interaction, ticketType, extraFields) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const user = interaction.user;
    const channelName = `ticket-${ticketType.toLowerCase()}-${user.username}`;

    try {
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: config.ticketCategoryId,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: config.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle(`Ticket: ${ticketType}`)
            .setDescription(`Hallo ${user}, ein Teammitglied wird sich in Kürze um dein Anliegen kümmern.`)
            .setColor('#2ecc71')
            .setTimestamp();

        if (extraFields && extraFields.length > 0) embed.addFields(extraFields);

        const closeBtn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Ticket schließen').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await ticketChannel.send({ content: `${user} | <@&${config.supportRoleId}>`, embeds: [embed], components: [closeBtn] });
        await interaction.editReply({ content: `Dein Ticket wurde erstellt: ${ticketChannel}`, ephemeral: true });

    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: 'Fehler beim Erstellen des Tickets.', ephemeral: true });
    }
}

async function handleTicketClose(interaction) {
    const channel = interaction.channel;

    if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({ content: 'Dieser Befehl kann nur in einem Ticket-Kanal ausgeführt werden.', ephemeral: true });
    }

    await interaction.reply({ content: 'Ticket wird geschlossen ...' });

    try {
        let messages = [];
        let lastId;

        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;
            const fetched = await channel.messages.fetch(options);
            messages.push(...fetched.values());
            if (fetched.size < 100) break;
            lastId = fetched.last().id;
        }

        messages.reverse();

        let historyText = "";
        let charCount = 0;

        for (const msg of messages) {
            if (msg.author.bot && msg.embeds.length > 0) continue;
            const line = `**[${msg.createdAt.toLocaleTimeString('de-DE')}] ${msg.author.username}:** ${msg.content || '[Anhang/Bild]'}\n`;

            if (charCount + line.length > 3900) {
                historyText += `*... [Verlauf zu lang, gekürzt] ...*`;
                break;
            }
            historyText += line;
            charCount += line.length;
        }

        const ticketUserOverwrite = channel.permissionOverwrites.cache.find(
            po => po.type === 1 && po.id !== client.user.id && po.id !== config.supportRoleId
        );

        let ticketUser = null;
        if (ticketUserOverwrite) {
            ticketUser = await client.users.fetch(ticketUserOverwrite.id).catch(() => null);
        }

        const transcriptEmbed = new EmbedBuilder()
            .setTitle(`📁 Ticket Archiviert: ${channel.name}`)
            .setColor('#3498db')
            .addFields(
                { name: 'Ticket-Besitzer: ', value: ticketUser ? `${ticketUser} (${ticketUser.id})` : 'Unbekannt', inline: true },
                { name: 'Geschlossen von', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                { name: 'Nachrichten Gesamt: ', value: `${messages.length}`, inline: true },
                { name: 'Chat Verlauf', value: historyText || 'Keine Nachrichten geschrieben.' }
            )
            .setTimestamp();

        const transcriptChannel = client.channels.cache.get(config.transcriptChannelId);
        if (transcriptChannel) {
            await transcriptChannel.send({ embeds: [transcriptEmbed] });
        }

        if (ticketUser) {
            await ticketUser.send({ embeds: [transcriptEmbed] }).catch(() => console.log('DMs vom User sind deaktiviert.'));
        }

        setTimeout(async () => {
            await channel.delete().catch(() => {});
        }, 5000);

    } catch (error) {
        console.error(error);
    }
}

client.login(config.token);
