// Settings page controller
class SettingsController {
  constructor() {
    this.init();
  }

  init() {
    this.loadSettings();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const form = document.getElementById('settingsForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['apiUrl', 'XApiKey', 'j7Label','j8Label','j9Label','j0Label']);

      if (result.apiUrl) {
        document.getElementById('apiUrl').value = result.apiUrl;
      }
      if (result.XApiKey) {
        document.getElementById('XApiKey').value = result.XApiKey;
      }
      if (result.j7Label) {
        document.getElementById('j7Label').value = result.j7Label;
      }
      if (result.j8Label) {
        document.getElementById('j8Label').value = result.j8Label;
      }
      if (result.j9Label) {
        document.getElementById('j9Label').value = result.j9Label;
      }
      if (result.j0Label) {
        document.getElementById('j0Label').value = result.j0Label;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showStatus('Failed to load settings', 'error');
    }
  }

  async saveSettings() {
    try {
      const apiUrl = document.getElementById('apiUrl').value.trim();
      const apiKey = document.getElementById('XApiKey').value.trim();
      const j7Label = document.getElementById('j7Label').value.trim();
      const j8Label = document.getElementById('j8Label').value.trim();
      const j9Label = document.getElementById('j9Label').value.trim();
      const j0Label = document.getElementById('j0Label').value.trim();

      if (!apiUrl || !apiKey || !j7Label || !j8Label || !j9Label || !j0Label) {
        this.showStatus('Please fill in all fields', 'error');
        return;
      }

      // Basic validation: ensure it starts with http or https
      if (!/^https?:\/\//i.test(apiUrl)) {
        this.showStatus('Please enter a valid URL starting with http or https', 'error');
        return;
      }

      // Save to storage
      await chrome.storage.local.set({
        apiUrl: apiUrl,
        XApiKey: apiKey,
        j7Label: j7Label,
        j8Label: j8Label,
        j9Label: j9Label,
        j0Label: j0Label
      });

      this.showStatus('Settings saved successfully!', 'success');

      // Test the connection
      await this.testConnection();

    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  // No connection test for generic API; keep method as placeholder if needed in future
  async testConnection() {
    return; // optional: implement a HEAD request here
  }

  showStatus(message, type) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';

    // Hide after 5 seconds
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 5000);
  }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SettingsController();
});