require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const compute = require('@google-cloud/compute');

// Parse the service account JSON from env
const serviceAccountKey = JSON.parse(process.env.SERVICE_ACCOUNT_KEY_JSON);

console.log(serviceAccountKey);

// Set up Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Set up Google Cloud Compute client
const computeClient = new compute.FirewallsClient({
  credentials: serviceAccountKey
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
        project: process.env.PROJECT_ID,
        firewall: process.env.FIREWALL_RULE
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
        project: process.env.PROJECT_ID,
        firewall: process.env.FIREWALL_RULE,
        firewallResource: updatedFirewall
      });

      await interaction.reply({ content: `✅ IP added to firewall rule!` });

    } catch (error) {
      console.error('🚨 Error modifying firewall:', error);
      await interaction.reply({ content: '❌ Failed to add IP to firewall. Check logs for details.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);