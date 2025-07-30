# tampermonkey-scripts
Tampermonkey userscripts to assist with navigating around WCR and other web apps

These scripts are provided for internal use within Esko. You are free to use, modify, and share this script with others in the organization. If you make improvements or bug fixes, please contribute them back to the original repository or author.

## Installation Instructions

### Step 1: Install Tampermonkey
1. Install the Tampermonkey browser extension:
   - **Chrome**: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - **Firefox**: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - **Safari**: [Safari Extensions](https://apps.apple.com/us/app/tampermonkey/id1482490089)
   - **Edge**: [Microsoft Store](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### Step 2: Install Scripts
For each script you want to use, click on the appropriate link below. Tampermonkey **might** automatically detect the script and prompt you to install it.

#### Available Scripts:

**WebCenter Quick Actions Script:**
- **Install Link**: [wcr-click-actions.js](https://raw.githubusercontent.com/esko-presales/tampermonkey-scripts/refs/heads/main/wcr-click-actions.js)
- **Description**: Cmd+Click (Mac) or Ctrl+Click (Win) elements for WebCenter actions
- **Features**:
  - Open attribute categories for editing
  - Skip dashboard when opening project details
  - Open workflow configurations
  - Create project tasks
  - Open task type specifications

**WebCenter Modal Menu Script:**
- **Install Link**: [wcr-modal-menu.js](https://raw.githubusercontent.com/esko-presales/tampermonkey-scripts/refs/heads/main/wcr-modal-menu.js)
- **Description**: Adds modal menu functionality to WebCenter

### Step 3: Configure Scripts
1. On first use of the WebCenter Quick Actions script, you'll be prompted to enter your initials
2. These initials will be saved and used for creating personalized workflow names
3. You can update your initials by clearing the stored data in Tampermonkey settings if needed

### Usage
Once installed, the scripts will automatically activate on matching web pages. Refer to each script's comments for specific usage instructions and keyboard shortcuts.

### Troubleshooting
- **Scripts not working**: Ensure Tampermonkey is enabled and the scripts are active
- **Permission issues**: Make sure the script URLs match the sites you're visiting
- **Updates**: Scripts will auto-update from this repository when new versions are available

### Contributing
If you make improvements or find bugs, please:
1. Fork this repository
2. Make your changes
3. Submit a pull request
4. Or contact the original author with your suggestions