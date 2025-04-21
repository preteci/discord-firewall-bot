const { Client, GatewayIntentBits } = require('discord.js');
const compute = require('@google-cloud/compute');
const config = require('./config.json');

// Set up Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Set up Google Cloud Compute client
const computeClient = new compute.FirewallsClient({
  keyFilename: config.serviceAccountKeyPath
});

client.once('ready', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'addip') {
    const ip = interaction.options.getString('ip');

    // Basic IP format validation
    const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return interaction.reply({ content: '❌ Invalid IP address format.', ephemeral: true });
    }

    try {
      // Fetch current firewall rule
      const [firewall] = await computeClient.get({
        project: config.projectId,
        firewall: config.firewallRule
      });

      const existingIps = firewall.sourceRanges || [];

      if (existingIps.includes(ip)) {
        return interaction.reply({ content: `🔁 IP \`${ip}\` is already allowed.`, ephemeral: true });
      }

      const updatedIps = [...existingIps, ip];

      // Prepare updated firewall config
      const updatedFirewall = {
        ...firewall,
        sourceRanges: updatedIps
      };

      // Update the firewall rule
      await computeClient.patch({
        project: config.projectId,
        firewall: config.firewallRule,
        firewallResource: updatedFirewall
      });

      await interaction.reply({ content: `✅ IP added to firewall rule! `});

    } catch (error) {
      console.error('🚨 Error modifying firewall:', error);
      await interaction.reply({ content: '❌ Failed to add IP to firewall. Check logs for details.', ephemeral: true });
    }
  }
});

client.login(config.token);