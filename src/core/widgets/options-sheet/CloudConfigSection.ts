/**
 * Manages the cloud configuration section of the options sheet.
 *
 * @remarks
 * This component handles the UI for cloud provider integration, including:
 * - API key management (entry, validation, storage)
 * - Project selection and switching
 * - Dataset management (syncing, version display)
 * - Bulk page scanning functionality
 * - Connection status visualization
 */

import { createSectionGroup, resetSelectWithDefault } from './form-helpers.js';
import { clearElement } from '../../../utils/dom-helpers.js';
import type { DatasetStats } from './types.js';
import {
  cloudConfig,
  type CloudConfigState,
} from '../../../state/atoms/index.js';
import type { CloudConfigVisibility } from '../../../types/index.js';

export class CloudConfigSection {
  private element: HTMLElement | null = null;
  private apiKeyInput: HTMLInputElement | null = null;
  private projectSelect: HTMLSelectElement | null = null;
  private statusBadge: HTMLElement | null = null;
  private changeKeyLink: HTMLAnchorElement | null = null;
  private fieldVisibility: Required<CloudConfigVisibility>;

  /**
   * Event dispatchers for parent to handle
   */
  private onSaveApiKey?: (apiKey: string) => void;
  private onLoadProjects?: (apiKey: string) => void;
  private onSelectProject?: (projectId: string) => void;
  private onScanPage?: () => void;
  private onSyncDatasets?: () => void;
  private onScanUrls?: (
    urls: string[],
    onProgress: (current: number, total: number) => void
  ) => void;

  /**
   * Initializes a new instance of the CloudConfigSection class.
   *
   * @param callbacks - Set of event handlers for user actions.
   * @param callbacks.onSaveApiKey - Triggered when the user saves a new API key.
   * @param callbacks.onLoadProjects - Triggered when the user requests to refresh the project list.
   * @param callbacks.onSelectProject - Triggered when the user selects a project from the dropdown.
   * @param callbacks.onScanPage - Triggered when the user initiates a single page scan.
   * @param callbacks.onSyncDatasets - Triggered when the user requests to sync datasets.
   * @param callbacks.onScanUrls - Triggered when the user submits a list of URLs for bulk scanning.
   * @param fieldVisibility - Per-field visibility overrides.
   */
  constructor(
    callbacks: {
      onSaveApiKey?: (apiKey: string) => void;
      onLoadProjects?: (apiKey: string) => void;
      onSelectProject?: (projectId: string) => void;
      onScanPage?: () => void;
      onSyncDatasets?: () => void;
      onScanUrls?: (
        urls: string[],
        onProgress: (current: number, total: number) => void
      ) => void;
    } = {},
    fieldVisibility?: Required<CloudConfigVisibility>
  ) {
    this.onSaveApiKey = callbacks.onSaveApiKey;
    this.onLoadProjects = callbacks.onLoadProjects;
    this.onSelectProject = callbacks.onSelectProject;
    this.onScanPage = callbacks.onScanPage;
    this.onSyncDatasets = callbacks.onSyncDatasets;
    this.onScanUrls = callbacks.onScanUrls;
    this.fieldVisibility = fieldVisibility ?? {
      apiKey: true,
      projectSelector: true,
      datasetStatus: true,
      actions: true,
    };
  }

  /**
   * Creates and renders the cloud configuration section UI.
   *
   * @remarks
   * Constructs the entire section including status badges, API key input,
   * project selector, and action buttons.
   *
   * @returns The HTMLElement containing the constructed cloud configuration section.
   */
  create(): HTMLElement {
    const section = createSectionGroup('Cloud Configuration');
    section.parentElement!.className = 'fillkit-cloud-section';

    // Add status badge and change key link to title
    const titleElement = section.parentElement!.querySelector(
      '.fillkit-options-group-title'
    ) as HTMLElement;

    // Create status badge (inline with title)
    this.statusBadge = document.createElement('span');
    this.statusBadge.className =
      'fillkit-badge fillkit-badge-default fillkit-cloud-status-badge';
    this.statusBadge.textContent = 'Disconnected';
    titleElement.appendChild(this.statusBadge);

    // Create "change API key" link (right-aligned in title)
    this.changeKeyLink = document.createElement('a');
    this.changeKeyLink.className = 'fillkit-text-link';
    this.changeKeyLink.href = '#';
    this.changeKeyLink.textContent = 'Click here to change API key';
    this.changeKeyLink.style.display = 'none';
    this.changeKeyLink.onclick = e => {
      e.preventDefault();
      this.showApiKeyInput();
    };
    titleElement.appendChild(this.changeKeyLink);

    // Dataset Pills (top-level status indicators)
    const datasetStatus = this.createDatasetStatus();

    // Project Selection
    const projectSection = this.createProjectSection();

    // API Key Input
    const apiKeySection = this.createApiKeySection();

    // Save & Cancel Buttons
    const buttonGroup = this.createSaveButton();

    // Status Display
    const statusDisplay = this.createStatusDisplay();

    // Cloud Actions (Dataset Management: Scan + Refresh buttons, Bulk Scanner)
    const actionsSection = this.createActionsSection();

    if (this.fieldVisibility.datasetStatus) {
      section.appendChild(datasetStatus);
    }
    if (this.fieldVisibility.projectSelector) {
      section.appendChild(projectSection);
    }
    if (this.fieldVisibility.apiKey) {
      section.appendChild(apiKeySection);
      section.appendChild(buttonGroup);
    }
    section.appendChild(statusDisplay);
    if (this.fieldVisibility.actions) {
      section.appendChild(actionsSection);
    }

    this.element = section.parentElement as HTMLElement;
    return this.element;
  }

  /**
   * Creates the API key input field and label.
   *
   * @returns The HTMLElement containing the API key input section.
   */
  private createApiKeySection(): HTMLElement {
    const apiKeySection = document.createElement('div');
    apiKeySection.className = 'fillkit-options-section fillkit-api-key-section';

    const apiKeyLabel = document.createElement('label');
    apiKeyLabel.className = 'fillkit-options-label';
    apiKeyLabel.textContent = 'API Key';

    this.apiKeyInput = document.createElement('input');
    this.apiKeyInput.type = 'password';
    this.apiKeyInput.className = 'fillkit-options-input';
    this.apiKeyInput.name = 'cloudApiKey';
    this.apiKeyInput.placeholder = 'fk_live_xxxxxxxxxxxxxxxx';
    this.apiKeyInput.value = '';

    apiKeySection.appendChild(apiKeyLabel);
    apiKeySection.appendChild(this.apiKeyInput);

    return apiKeySection;
  }

  /**
   * Creates the project selection UI.
   *
   * @remarks
   * Includes a loading state, a dropdown for project selection, and a refresh button.
   * Initially hidden until valid credentials are provided.
   *
   * @returns The HTMLElement containing the project selection section.
   */
  private createProjectSection(): HTMLElement {
    const projectSection = document.createElement('div');
    projectSection.className =
      'fillkit-options-section fillkit-project-section';
    projectSection.style.display = 'none';

    const projectLabel = document.createElement('label');
    projectLabel.className = 'fillkit-options-label';
    projectLabel.textContent = 'Project';

    // Single Project Display
    const projectDisplay = document.createElement('div');
    projectDisplay.className = 'fillkit-alert fillkit-project-display';
    projectDisplay.style.display = 'none';
    clearElement(projectDisplay);
    const loadingSpan = document.createElement('span');
    loadingSpan.className = 'fillkit-alert-content';
    loadingSpan.textContent = 'Loading...';
    projectDisplay.appendChild(loadingSpan);

    // Multi-Project Selector
    const projectSelectorWrapper = document.createElement('div');
    projectSelectorWrapper.className = 'fillkit-input-with-button';
    projectSelectorWrapper.style.display = 'none';

    this.projectSelect = document.createElement('select');
    this.projectSelect.className = 'fillkit-options-input';
    this.projectSelect.name = 'cloudProjectId';
    resetSelectWithDefault(this.projectSelect, 'Choose a project...');
    this.projectSelect.onchange = () => this.handleProjectChange();

    const loadProjectsBtn = document.createElement('button');
    loadProjectsBtn.className = 'fillkit-btn fillkit-btn-secondary';
    loadProjectsBtn.textContent = '🔄';
    loadProjectsBtn.type = 'button';
    loadProjectsBtn.title = 'Refresh projects list';
    loadProjectsBtn.onclick = e => {
      e.preventDefault();
      if (this.onLoadProjects && this.apiKeyInput) {
        this.onLoadProjects(this.apiKeyInput.value);
      }
    };

    projectSelectorWrapper.appendChild(this.projectSelect);
    projectSelectorWrapper.appendChild(loadProjectsBtn);

    projectSection.appendChild(projectLabel);
    projectSection.appendChild(projectDisplay);
    projectSection.appendChild(projectSelectorWrapper);

    return projectSection;
  }

  /**
   * Creates the Save and Cancel buttons for API key editing.
   *
   * @returns The HTMLElement containing the button group.
   */
  private createSaveButton(): HTMLElement {
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'fillkit-inline-group';
    buttonGroup.style.marginTop = '12px';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'fillkit-btn fillkit-btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.type = 'button';
    cancelBtn.onclick = e => {
      e.preventDefault();
      this.cancelApiKeyEdit();
    };

    const saveBtn = document.createElement('button');
    saveBtn.className = 'fillkit-btn fillkit-btn-primary';
    saveBtn.textContent = 'Save & Connect';
    saveBtn.type = 'button';
    saveBtn.onclick = e => {
      e.preventDefault();
      if (this.onSaveApiKey && this.apiKeyInput) {
        this.onSaveApiKey(this.apiKeyInput.value);
      }
    };

    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(saveBtn);

    return buttonGroup;
  }

  /**
   * Creates a container for displaying status messages.
   *
   * @returns The HTMLElement for status display.
   */
  private createStatusDisplay(): HTMLElement {
    const statusDisplay = document.createElement('div');
    statusDisplay.className = 'fillkit-cloud-status';
    statusDisplay.style.display = 'none';

    return statusDisplay;
  }

  /**
   * Creates the actions section for dataset management and scanning.
   *
   * @remarks
   * Contains buttons for "Scan This Page", "Refresh Datasets", and the bulk scanner interface.
   *
   * @returns The HTMLElement containing the actions section.
   */
  private createActionsSection(): HTMLElement {
    const actionsSection = document.createElement('div');
    actionsSection.className = 'fillkit-cloud-actions';
    actionsSection.style.display = 'none';

    const actionsTitle = document.createElement('h3');
    actionsTitle.className = 'fillkit-options-group-title';
    actionsTitle.textContent = 'Dataset Management';

    // Action buttons group (inline)
    const actionButtonsGroup = document.createElement('div');
    actionButtonsGroup.className = 'fillkit-inline-group';

    // Scan Page Button
    const scanBtn = document.createElement('button');
    scanBtn.className = 'fillkit-btn fillkit-btn-secondary';
    scanBtn.textContent = 'Scan This Page';
    scanBtn.type = 'button';
    scanBtn.onclick = e => {
      e.preventDefault();
      if (this.onScanPage) {
        this.onScanPage();
      }
    };

    // Sync Datasets Button
    const syncBtn = document.createElement('button');
    syncBtn.className = 'fillkit-btn fillkit-btn-secondary';
    syncBtn.textContent = 'Refresh Datasets';
    syncBtn.type = 'button';
    syncBtn.onclick = e => {
      e.preventDefault();
      if (this.onSyncDatasets) {
        this.onSyncDatasets();
      }
    };

    actionButtonsGroup.appendChild(scanBtn);
    actionButtonsGroup.appendChild(syncBtn);

    // Bulk Scanner Section
    const scanSection = this.createBulkScannerSection();

    actionsSection.appendChild(actionsTitle);
    actionsSection.appendChild(actionButtonsGroup);
    actionsSection.appendChild(scanSection);

    return actionsSection;
  }

  /**
   * Creates the dataset status indicators (version and last sync time).
   *
   * @returns The HTMLElement containing the dataset status pills.
   */
  private createDatasetStatus(): HTMLElement {
    const datasetStatus = document.createElement('div');
    datasetStatus.className = 'fillkit-dataset-pills';

    const createBadge = (label: string, id: string, defaultText: string) => {
      const badge = document.createElement('span');
      badge.className = 'fillkit-badge fillkit-badge-default';
      const labelSpan = document.createElement('span');
      labelSpan.style.cssText = 'text-transform: uppercase; font-size: 9px;';
      labelSpan.textContent = label;
      const valueSpan = document.createElement('span');
      valueSpan.id = id;
      valueSpan.style.marginLeft = '4px';
      valueSpan.textContent = defaultText;
      badge.appendChild(labelSpan);
      badge.appendChild(valueSpan);
      return badge;
    };

    datasetStatus.appendChild(
      createBadge('Version', 'fillkit-dataset-version', '-')
    );
    datasetStatus.appendChild(
      createBadge('Last Sync', 'fillkit-last-sync', 'Never')
    );

    return datasetStatus;
  }

  /**
   * Creates the bulk URL scanner interface.
   *
   * @remarks
   * Includes a textarea for URL input and a progress bar for scanning status.
   *
   * @returns The HTMLElement containing the bulk scanner section.
   */
  private createBulkScannerSection(): HTMLElement {
    const scanSection = document.createElement('div');
    scanSection.className = 'fillkit-scan-section';

    const scanTitle = document.createElement('div');
    scanTitle.className = 'fillkit-status-card-title';
    scanTitle.textContent = 'Bulk Page Scanner';

    const scanTextarea = document.createElement('textarea');
    scanTextarea.className = 'fillkit-options-textarea';
    scanTextarea.placeholder =
      'Enter URLs to scan (one per line):\nhttps://example.com/signup\nhttps://example.com/checkout';
    scanTextarea.rows = 4;
    scanTextarea.style.resize = 'vertical';

    const scanProgress = document.createElement('div');
    scanProgress.className = 'fillkit-alert fillkit-scan-progress';
    scanProgress.style.display = 'none';

    const scanUrlsBtn = document.createElement('button');
    scanUrlsBtn.className = 'fillkit-btn fillkit-btn-secondary';
    scanUrlsBtn.textContent = 'Scan Multiple Pages';
    scanUrlsBtn.type = 'button';
    scanUrlsBtn.onclick = e => {
      e.preventDefault();
      const urls = scanTextarea.value
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      if (urls.length > 0 && this.onScanUrls) {
        this.onScanUrls(urls, (current, total) => {
          scanProgress.style.display = 'block';
          // Build progress UI with DOM methods instead of innerHTML
          scanProgress.textContent = '';
          const header = document.createElement('div');
          header.style.cssText =
            'display: flex; justify-content: space-between; margin-bottom: 4px;';
          const labelSpan = document.createElement('span');
          labelSpan.textContent = 'Scanning URLs...';
          const countSpan = document.createElement('span');
          countSpan.textContent = `${current}/${total}`;
          header.appendChild(labelSpan);
          header.appendChild(countSpan);
          const track = document.createElement('div');
          track.className = 'fillkit-scan-progress-track';
          const fill = document.createElement('div');
          fill.className = 'fillkit-scan-progress-fill';
          fill.style.width = `${(current / total) * 100}%`;
          track.appendChild(fill);
          scanProgress.appendChild(header);
          scanProgress.appendChild(track);
        });
      }
    };

    scanSection.appendChild(scanTitle);
    scanSection.appendChild(scanTextarea);
    scanSection.appendChild(scanProgress);
    scanSection.appendChild(scanUrlsBtn);

    return scanSection;
  }

  /**
   * Handles the project selection change event.
   *
   * @remarks
   * Triggers the `onSelectProject` callback with the selected project ID.
   */
  private async handleProjectChange(): Promise<void> {
    if (!this.projectSelect || !this.onSelectProject) return;

    const projectId = this.projectSelect.value;
    if (projectId) {
      this.onSelectProject(projectId);
    }
  }

  /**
   * Transitions the UI to the API key editing state.
   *
   * @remarks
   * Shows the API key input and save/cancel buttons, hides the project selector
   * and actions, and updates the status badge to "Editing".
   */
  private showApiKeyInput(): void {
    if (!this.element) return;

    const apiKeySection = this.element.querySelector(
      '.fillkit-api-key-section'
    ) as HTMLElement;
    const buttonGroup = this.element.querySelector(
      '.fillkit-inline-group'
    ) as HTMLElement;
    const projectSection = this.element.querySelector(
      '.fillkit-project-section'
    ) as HTMLElement;
    const actionsSection = this.element.querySelector(
      '.fillkit-cloud-actions'
    ) as HTMLElement;

    // Update badge to show editing state
    if (this.statusBadge) {
      this.statusBadge.className =
        'fillkit-badge fillkit-badge-warning fillkit-cloud-status-badge';
      this.statusBadge.textContent = 'Editing';
    }

    // Hide change key link
    if (this.changeKeyLink) {
      this.changeKeyLink.style.display = 'none';
    }

    // Show input and buttons, hide other sections
    if (apiKeySection) apiKeySection.style.display = 'block';
    if (buttonGroup) buttonGroup.style.display = 'flex';
    if (projectSection) projectSection.style.display = 'none';
    if (actionsSection) actionsSection.style.display = 'none';
  }

  /**
   * Cancels the API key editing process.
   *
   * @remarks
   * Attempts to restore the previous valid state from the cloud configuration.
   * If no valid configuration exists, resets to a disconnected state.
   */
  private async cancelApiKeyEdit(): Promise<void> {
    // Try to restore previous credentials from cloudConfig atom
    const cfg = cloudConfig.get();

    if (cfg.token) {
      // Restore connected state
      this.loadCredentials(cfg);
    } else {
      // No saved credentials, just hide input section
      if (!this.element) return;

      const apiKeySection = this.element.querySelector(
        '.fillkit-api-key-section'
      ) as HTMLElement;
      const buttonGroup = this.element.querySelector(
        '.fillkit-inline-group'
      ) as HTMLElement;

      if (apiKeySection) apiKeySection.style.display = 'none';
      if (buttonGroup) buttonGroup.style.display = 'none';

      // Reset badge to disconnected
      if (this.statusBadge) {
        this.statusBadge.className =
          'fillkit-badge fillkit-badge-default fillkit-cloud-status-badge';
        this.statusBadge.textContent = 'Disconnected';
      }
    }
  }

  /**
   * Loads the provided cloud configuration into the UI.
   *
   * @remarks
   * Populates the API key, updates the project list, selects the active project,
   * and transitions the UI to the "Connected" state.
   *
   * @param creds - The current cloud configuration state.
   */
  loadCredentials(creds: CloudConfigState): void {
    if (!this.element || !this.apiKeyInput || !this.projectSelect) return;

    // Populate API key
    this.apiKeyInput.value = creds.token || '';

    // Update status badge to show connected state
    if (this.statusBadge) {
      this.statusBadge.className =
        'fillkit-badge fillkit-badge-success fillkit-cloud-status-badge';
      this.statusBadge.textContent = 'Connected';
    }

    // Show "change API key" link
    if (this.changeKeyLink) {
      this.changeKeyLink.style.display = 'inline-block';
    }

    // Hide API key input and buttons, show project section
    const apiKeySection = this.element.querySelector(
      '.fillkit-api-key-section'
    ) as HTMLElement;
    const buttonGroup = this.element.querySelector(
      '.fillkit-inline-group'
    ) as HTMLElement;
    const projectSection = this.element.querySelector(
      '.fillkit-project-section'
    ) as HTMLElement;
    const actionsSection = this.element.querySelector(
      '.fillkit-cloud-actions'
    ) as HTMLElement;

    if (apiKeySection) apiKeySection.style.display = 'none';
    if (buttonGroup) buttonGroup.style.display = 'none';
    if (projectSection) projectSection.style.display = 'block';

    // Populate project selector
    resetSelectWithDefault(this.projectSelect, 'Choose a project...');

    if (creds.projects && creds.projects.length > 0) {
      creds.projects.forEach((project: { id: string; name: string }) => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        this.projectSelect!.appendChild(option);
      });

      // Set selected project
      if (creds.projectId) {
        // Temporarily disable onchange
        const originalOnChange = this.projectSelect.onchange;
        this.projectSelect.onchange = null;
        this.projectSelect.value = creds.projectId;
        this.projectSelect.onchange = originalOnChange;
      }

      // Show project selector
      const projectSelectorWrapper = projectSection.querySelector(
        '.fillkit-input-with-button'
      ) as HTMLElement;
      if (projectSelectorWrapper) {
        projectSelectorWrapper.style.display = 'flex';
      }

      // Show actions if project is selected
      if (actionsSection && creds.projectId) {
        actionsSection.style.display = 'block';
      }
    }
  }

  /**
   * Updates the displayed dataset statistics.
   *
   * @param stats - The latest dataset statistics (version and sync timestamp).
   */
  updateDatasetStats(stats: DatasetStats): void {
    const versionEl = document.getElementById('fillkit-dataset-version');
    const syncEl = document.getElementById('fillkit-last-sync');

    if (versionEl) versionEl.textContent = stats.version || '-';
    if (syncEl) {
      syncEl.textContent = stats.lastSync
        ? new Date(stats.lastSync).toLocaleString()
        : 'Never';
    }
  }

  /**
   * Makes the cloud configuration section visible.
   */
  show(): void {
    if (this.element) {
      this.element.style.display = 'block';
    }
  }

  /**
   * Hides the cloud configuration section.
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Makes the actions section (dataset management) visible.
   */
  showActions(): void {
    if (!this.element) return;
    const actionsSection = this.element.querySelector(
      '.fillkit-cloud-actions'
    ) as HTMLElement;
    if (actionsSection) {
      actionsSection.style.display = 'block';
    }
  }

  /**
   * Hides the actions section.
   */
  hideActions(): void {
    if (!this.element) return;
    const actionsSection = this.element.querySelector(
      '.fillkit-cloud-actions'
    ) as HTMLElement;
    if (actionsSection) {
      actionsSection.style.display = 'none';
    }
  }
}
